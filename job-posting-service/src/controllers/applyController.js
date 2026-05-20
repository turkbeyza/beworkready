const { getPool }  = require('../config/db');
const { publish }  = require('../config/rabbitmq');
const logger       = require('../utils/logger');

async function applyToJob(req, res) {
  const userUid   = req.headers['x-user-uid'];
  const userEmail = req.headers['x-user-email'];
  const { job_id, cover_note } = req.body;

  if (!job_id) return res.status(400).json({ success: false, message: 'job_id is required.' });

  const pool = getPool();

  // Check job exists
  const jobRes = await pool.query('SELECT id, title, company_name FROM jobs WHERE id = $1 AND is_active = TRUE', [job_id]);
  if (!jobRes.rows.length) return res.status(404).json({ success: false, message: 'Job not found.' });

  // Prevent duplicate application
  const dupRes = await pool.query(
    'SELECT id FROM applications WHERE job_id = $1 AND user_uid = $2',
    [job_id, userUid]
  );
  if (dupRes.rows.length) return res.status(409).json({ success: false, message: 'You have already applied to this job.' });

  // Insert application
  const appRes = await pool.query(
    `INSERT INTO applications (job_id, user_uid, user_email, cover_note) VALUES ($1,$2,$3,$4) RETURNING *`,
    [job_id, userUid, userEmail, cover_note]
  );

  // Increment counter
  await pool.query('UPDATE jobs SET application_count = application_count + 1 WHERE id = $1', [job_id]);

  // Publish event for notification service
  publish('job.application', {
    application: appRes.rows[0],
    job: jobRes.rows[0],
    userEmail,
  });

  logger.info(`Application submitted: job=${job_id} user=${userUid}`);
  res.status(201).json({ success: true, data: appRes.rows[0] });
}

module.exports = { applyToJob };
