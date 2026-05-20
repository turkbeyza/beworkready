const { getPool }  = require('../config/pg');
const { getRedis } = require('../config/redis');

/**
 * GET /api/v1/autocomplete?q=&field=title|city
 */
async function autocomplete(req, res) {
  const { q = '', field = 'title' } = req.query;
  if (!q || q.length < 2) return res.json({ success: true, data: [] });

  const allowedFields = ['title', 'city', 'company_name', 'town'];
  if (!allowedFields.includes(field)) {
    return res.status(400).json({ success: false, message: 'Invalid field parameter.' });
  }

  const cacheKey = `autocomplete:${field}:${q.toLowerCase()}`;
  const redis = getRedis();
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return res.json({ success: true, cached: true, data: JSON.parse(cached) });
  }

  const pool = getPool();
  const result = await pool.query(
    `SELECT DISTINCT ${field} as value FROM jobs
     WHERE is_active = TRUE AND LOWER(${field}) LIKE LOWER($1)
     ORDER BY ${field} LIMIT 10`,
    [`${q}%`]
  );

  const data = result.rows.map(r => r.value);
  if (redis) await redis.setEx(cacheKey, 120, JSON.stringify(data));
  res.json({ success: true, cached: false, data });
}

module.exports = { autocomplete };
