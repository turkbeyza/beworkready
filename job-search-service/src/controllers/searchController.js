const { getPool }  = require('../config/pg');
const { getRedis } = require('../config/redis');
const Search       = require('../models/Search');
const logger       = require('../utils/logger');

const CACHE_TTL = 60; // 1 minute for search results

/**
 * GET /api/v1/search?title=&city=&country=&working_type=&page=&limit=
 */
async function searchJobs(req, res) {
  const { title, city, country, town, working_type, salary_min, salary_max, page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const userId    = req.headers['x-user-uid'];
  const userEmail = req.headers['x-user-email'] || '';

  const cacheKey = `search:${JSON.stringify(req.query)}`;
  const redis = getRedis();
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      // Still save history even for cached results
      if (userId && (title || city)) {
        Search.create({ userId, userEmail, query: title || '', city, country, town, workingType: working_type }).catch(() => {});
      }
      return res.json({ success: true, cached: true, ...JSON.parse(cached) });
    }
  }

  const conditions = ['is_active = TRUE'];
  const values     = [];

  if (title) {
    values.push(`%${title}%`);
    conditions.push(`(
      LOWER(title) LIKE LOWER($${values.length}) OR 
      LOWER(description) LIKE LOWER($${values.length}) OR
      LOWER(company_name) LIKE LOWER($${values.length}) OR
      LOWER(city) LIKE LOWER($${values.length}) OR
      LOWER(country) LIKE LOWER($${values.length}) OR
      LOWER(town) LIKE LOWER($${values.length})
    )`);
  }
  if (city) {
    values.push(`%${city}%`);
    conditions.push(`LOWER(city) LIKE LOWER($${values.length})`);
  }
  if (country) {
    values.push(country);
    conditions.push(`LOWER(country) = LOWER($${values.length})`);
  }
  if (town) {
    values.push(`%${town}%`);
    conditions.push(`LOWER(town) LIKE LOWER($${values.length})`);
  }
  if (working_type) {
    values.push(working_type);
    conditions.push(`working_type = $${values.length}`);
  }
  if (salary_min && !isNaN(salary_min)) {
    values.push(Number(salary_min));
    conditions.push(`salary_min >= $${values.length}`);
  }
  if (salary_max && !isNaN(salary_max)) {
    values.push(Number(salary_max));
    conditions.push(`salary_max <= $${values.length}`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const pool = getPool();
  const [dataRes, countRes] = await Promise.all([
    pool.query(
      `SELECT id, title, company_name, company_logo_url, city, country, town, working_type,
              salary_min, salary_max, currency, created_at, application_count, description
       FROM jobs ${where} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
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

  if (redis) await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(payload));

  // Save search history to MongoDB (non-blocking)
  if (userId && (title || city)) {
    Search.create({ userId, userEmail, query: title || '', city: city || '', country, town, workingType: working_type }).catch(e =>
      logger.warn(`Could not save search history: ${e.message}`)
    );
  }

  res.json({ success: true, cached: false, ...payload });
}

module.exports = { searchJobs };
