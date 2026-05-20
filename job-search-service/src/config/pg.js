const { Pool } = require('pg');
const logger   = require('../utils/logger');

let pool;
async function connectPG() {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query('SELECT 1');
  logger.info('PostgreSQL connected (read-only for search)');
}
function getPool() {
  if (!pool) throw new Error('PG not initialized');
  return pool;
}
module.exports = { connectPG, getPool };
