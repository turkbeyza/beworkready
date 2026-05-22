const { getPool }   = require('../config/db');
const { getRedis }  = require('../config/redis');
const { publish }   = require('../config/rabbitmq');
const logger        = require('../utils/logger');

const CACHE_TTL = 300; // 5 minutes

// ── List Jobs (with pagination) ───────────────────────────────────────────────
async function listJobs(req, res) {
  const { page = 1, limit = 10, city, country, working_type } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const cacheKey = `jobs:list:${JSON.stringify(req.query)}`;
  const redis = getRedis();
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success: true, cached: true, ...JSON.parse(cached) });

  const conditions = ['is_active = TRUE'];
  const values     = [];
  if (city)         { values.push(city);         conditions.push(`LOWER(city) = LOWER($${values.length})`); }
  if (country)      { values.push(country);      conditions.push(`LOWER(country) = LOWER($${values.length})`); }
  if (working_type) { values.push(working_type); conditions.push(`working_type = $${values.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const pool = getPool();
  const [dataRes, countRes] = await Promise.all([
    pool.query(
      `SELECT * FROM jobs ${where} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) FROM jobs ${where}`, values),
  ]);

  const payload = {
    data:  dataRes.rows,
    total: Number(countRes.rows[0].count),
    page:  Number(page),
    limit: Number(limit),
  };

  await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(payload));
  res.json({ success: true, cached: false, ...payload });
}

// ── Get Single Job ────────────────────────────────────────────────────────────
async function getJob(req, res) {
  const { id } = req.params;
  const uid = req.headers['x-user-uid'] || 'public';
  const cacheKey = `jobs:single:${id}:${uid}`;
  const redis = getRedis();
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success: true, cached: true, data: JSON.parse(cached) });

  const pool = getPool();
  const result = await pool.query('SELECT * FROM jobs WHERE id = $1 AND is_active = TRUE', [id]);
  if (!result.rows.length) return res.status(404).json({ success: false, message: 'Job not found.' });

  const job = result.rows[0];

  // Check if job is saved by the current user
  let isSaved = false;
  if (uid !== 'public') {
    const savedCheck = await pool.query('SELECT 1 FROM saved_jobs WHERE job_id = $1 AND user_uid = $2', [id, uid]);
    isSaved = savedCheck.rows.length > 0;
  }

  // Related jobs — match by title similarity, same city, or same working_type
  const titleWords = (job.title || '').split(/\s+/).filter(w => w.length > 2);
  let titleConditions = '';
  const relatedValues = [id, job.city, job.working_type];
  if (titleWords.length > 0) {
    const likeClauses = titleWords.map((w, i) => {
      relatedValues.push(`%${w}%`);
      return `title ILIKE $${relatedValues.length}`;
    });
    titleConditions = `OR (${likeClauses.join(' OR ')})`;
  }

  // Prioritize same city first, then title keyword matches, then recency
  let scoreOrder = `ORDER BY (CASE WHEN LOWER(city) = LOWER($2) THEN 1 ELSE 0 END) DESC`;
  if (titleWords.length > 0) {
    const titleCheck = titleWords.map((w, i) => {
      return `(CASE WHEN title ILIKE $${4 + i} THEN 1 ELSE 0 END)`;
    }).join(' + ');
    scoreOrder = `ORDER BY (CASE WHEN LOWER(city) = LOWER($2) THEN 1 ELSE 0 END) DESC, (${titleCheck}) DESC, created_at DESC`;
  } else {
    scoreOrder = `ORDER BY (CASE WHEN LOWER(city) = LOWER($2) THEN 1 ELSE 0 END) DESC, created_at DESC`;
  }

  const related = await pool.query(
    `SELECT id, title, company_name, company_logo_url, city, working_type, salary_min, salary_max, currency, created_at, description
     FROM jobs WHERE is_active = TRUE AND id != $1
       AND (city = $2 OR working_type = $3 ${titleConditions})
     ${scoreOrder} LIMIT 5`,
    relatedValues
  );

  const payload = { ...job, is_saved: isSaved, related_jobs: related.rows };
  await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(payload));
  res.json({ success: true, cached: false, data: payload });
}

// ── Save Job ──────────────────────────────────────────────────────────────────
async function saveJob(req, res) {
  const { id } = req.params;
  const uid = req.headers['x-user-uid'];
  if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const pool = getPool();
  try {
    // Verify job exists
    const jobCheck = await pool.query('SELECT 1 FROM jobs WHERE id = $1 AND is_active = TRUE', [id]);
    if (!jobCheck.rows.length) return res.status(404).json({ success: false, message: 'Job not found.' });

    await pool.query(
      'INSERT INTO saved_jobs (job_id, user_uid) VALUES ($1, $2) ON CONFLICT (user_uid, job_id) DO NOTHING',
      [id, uid]
    );

    // Invalidate user specific details cache
    const redis = getRedis();
    await redis.del(`jobs:single:${id}:${uid}`);

    res.json({ success: true, message: 'Job saved successfully' });
  } catch (err) {
    logger.error(`Error saving job: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to save job.' });
  }
}

// ── Unsave Job ────────────────────────────────────────────────────────────────
async function unsaveJob(req, res) {
  const { id } = req.params;
  const uid = req.headers['x-user-uid'];
  if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const pool = getPool();
  try {
    await pool.query('DELETE FROM saved_jobs WHERE job_id = $1 AND user_uid = $2', [id, uid]);

    // Invalidate user specific details cache
    const redis = getRedis();
    await redis.del(`jobs:single:${id}:${uid}`);

    res.json({ success: true, message: 'Job unsaved successfully' });
  } catch (err) {
    logger.error(`Error unsaving job: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to unsave job.' });
  }
}

// ── Get Saved Jobs ────────────────────────────────────────────────────────────
async function getSavedJobs(req, res) {
  const uid = req.headers['x-user-uid'];
  if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const pool = getPool();
  try {
    const result = await pool.query(
      `SELECT j.id, j.title, j.company_name, j.company_logo_url, j.city, j.country, j.town, j.working_type, j.salary_min, j.salary_max, j.currency, j.created_at
       FROM jobs j
       JOIN saved_jobs s ON j.id = s.job_id
       WHERE s.user_uid = $1 AND j.is_active = TRUE
       ORDER BY s.saved_at DESC`,
      [uid]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error(`Error getting saved jobs: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to load saved jobs.' });
  }
}


// Helper to invalidate all job list and search caches
async function clearAllJobCaches(redis, jobId) {
  try {
    if (jobId) {
      await redis.del(`jobs:single:${jobId}`);
    }
    // Retrieve and delete wildcard keys
    const jobKeys = await redis.keys('jobs:*');
    const searchKeys = await redis.keys('search:*');
    const allKeys = [...jobKeys, ...searchKeys];
    if (allKeys.length > 0) {
      await redis.del(allKeys);
    }
    logger.info(`Invalidated ${allKeys.length} Redis cache keys for job actions`);
  } catch (err) {
    logger.error(`Failed to clear job caches: ${err.message}`);
  }
}

// ── Create Job ────────────────────────────────────────────────────────────────
async function createJob(req, res) {
  const uid = req.headers['x-user-uid'];
  const {
    title, description, city, country, town, working_type,
    company_name, company_logo_url, salary_min, salary_max, currency
  } = req.body;

  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO jobs (title, description, city, country, town, working_type, company_name, company_logo_url,
                       salary_min, salary_max, currency, posted_by_uid)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [title, description, city, country, town || '', working_type, company_name, company_logo_url, salary_min, salary_max, currency || 'TRY', uid]
  );

  const job = result.rows[0];

  // Invalidate cache
  const redis = getRedis();
  await clearAllJobCaches(redis, null);

  // Publish to RabbitMQ
  publish('job.new', job);

  logger.info(`New job created: ${job.id}`);
  res.status(201).json({ success: true, data: job });
}

// ── Update Job ────────────────────────────────────────────────────────────────
async function updateJob(req, res) {
  const { id } = req.params;
  const uid    = req.headers['x-user-uid'];
  const fields = ['title','description','city','country','town','working_type','company_name',
                  'company_logo_url','salary_min','salary_max','is_active'];

  const updates = [];
  const values  = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      values.push(req.body[f]);
      updates.push(`${f} = $${values.length}`);
    }
  });
  if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update.' });

  updates.push(`updated_at = NOW()`);
  values.push(id, uid);

  const pool = getPool();
  const result = await pool.query(
    `UPDATE jobs SET ${updates.join(', ')} WHERE id = $${values.length - 1} AND posted_by_uid = $${values.length} RETURNING *`,
    values
  );
  if (!result.rows.length) return res.status(404).json({ success: false, message: 'Job not found or unauthorized.' });

  // Invalidate cache
  const redis = getRedis();
  await clearAllJobCaches(redis, id);

  res.json({ success: true, data: result.rows[0] });
}

// ── Get Jobs by City (for Home Page) ─────────────────────────────────────────
async function getJobsByCity(req, res) {
  const { city } = req.params;
  const limit = 10;
  const cacheKey = `jobs:city:${city}`;
  const redis = getRedis();
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success: true, cached: true, data: JSON.parse(cached) });

  const pool = getPool();
  const result = await pool.query(
    `SELECT id, title, company_name, company_logo_url, city, working_type, salary_min, salary_max, currency, created_at
     FROM jobs WHERE is_active = TRUE AND LOWER(city) = LOWER($1) ORDER BY created_at DESC LIMIT $2`,
    [city, limit]
  );

  await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(result.rows));
  res.json({ success: true, cached: false, data: result.rows });
}

// ── Get Jobs Posted By Current Company ────────────────────────────────────────
async function getMyPostedJobs(req, res) {
  const uid = req.headers['x-user-uid'];
  if (!uid) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const pool = getPool();
  
  // Get all jobs posted by this company
  const jobsRes = await pool.query(
    `SELECT id, title, description, city, country, town, working_type, company_name, company_logo_url,
            salary_min, salary_max, currency, is_active, application_count, created_at 
     FROM jobs WHERE posted_by_uid = $1 ORDER BY created_at DESC`,
    [uid]
  );

  const jobs = jobsRes.rows;

  // Get applications for these jobs
  if (jobs.length > 0) {
    const jobIds = jobs.map(j => j.id);
    const appsRes = await pool.query(
      `SELECT id, job_id, user_uid, user_email, cover_note, applied_at 
       FROM applications WHERE job_id = ANY($1) ORDER BY applied_at DESC`,
      [jobIds]
    );

    const apps = appsRes.rows;
    // Attach applications to jobs
    jobs.forEach(job => {
      job.applications = apps.filter(a => a.job_id === job.id);
    });
  }

  res.json({ success: true, data: jobs });
}

// ── Delete Job ──────────────────────────────────────────────────────────────────
async function deleteJob(req, res) {
  const { id } = req.params;
  const uid = req.headers['x-user-uid'];

  const pool = getPool();
  const result = await pool.query(
    `DELETE FROM jobs WHERE id = $1 AND posted_by_uid = $2 RETURNING *`,
    [id, uid]
  );

  if (!result.rows.length) {
    return res.status(404).json({ success: false, message: 'Job not found or unauthorized.' });
  }

  // Invalidate cache
  const redis = getRedis();
  await clearAllJobCaches(redis, id);

  res.json({ success: true, message: 'Job deleted successfully' });
}

module.exports = { listJobs, getJob, createJob, updateJob, getJobsByCity, getMyPostedJobs, deleteJob, saveJob, unsaveJob, getSavedJobs };
