const { Pool } = require('pg');
const logger   = require('../utils/logger');

let pool;

async function connectDB() {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query('SELECT 1'); // verify
  logger.info('PostgreSQL connected');

  // Run schema migration
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title            VARCHAR(255) NOT NULL,
      description      TEXT         NOT NULL,
      city             VARCHAR(100),
      country          VARCHAR(100),
      town             VARCHAR(100),
      working_type     VARCHAR(50)  CHECK (working_type IN ('fulltime','parttime','remote','hybrid','contract')),
      company_name     VARCHAR(255),
      company_logo_url TEXT,
      salary_min       NUMERIC,
      salary_max       NUMERIC,
      currency         VARCHAR(10)  DEFAULT 'TRY',
      posted_by_uid    VARCHAR(255),
      is_active        BOOLEAN      DEFAULT TRUE,
      application_count INTEGER     DEFAULT 0,
      created_at       TIMESTAMPTZ  DEFAULT NOW(),
      updated_at       TIMESTAMPTZ  DEFAULT NOW()
    );

    -- Ensure town column exists if table was already created
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS town VARCHAR(100);

    CREATE TABLE IF NOT EXISTS applications (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id     UUID         REFERENCES jobs(id) ON DELETE CASCADE,
      user_uid   VARCHAR(255) NOT NULL,
      user_email VARCHAR(255),
      cover_note TEXT,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_city        ON jobs (city);
    CREATE INDEX IF NOT EXISTS idx_jobs_country     ON jobs (country);
    CREATE INDEX IF NOT EXISTS idx_jobs_town        ON jobs (town);
    CREATE INDEX IF NOT EXISTS idx_jobs_working_type ON jobs (working_type);
    CREATE INDEX IF NOT EXISTS idx_jobs_is_active   ON jobs (is_active);
    CREATE INDEX IF NOT EXISTS idx_jobs_created_at  ON jobs (created_at DESC);
  `);
  logger.info('Database schema ready');
}

function getPool() {
  if (!pool) throw new Error('DB not initialized');
  return pool;
}

module.exports = { connectDB, getPool };
