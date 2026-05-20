const cron   = require('node-cron');
const logger  = require('../utils/logger');
const mailer  = require('../utils/mailer');
const { getPool } = require('../config/pg');
const Search  = require('../models/Search');

function startScheduler() {
  // ── Job 1: New job digest (every day at 09:00) ────────────────────────────
  cron.schedule('0 9 * * *', async () => {
    logger.info('[Scheduler] Running: daily new job digest');
    try {
      const pool = getPool();

      // Get jobs posted in the last 24 hours
      const result = await pool.query(
        `SELECT id, title, company_name, city, country, working_type
         FROM jobs WHERE is_active = TRUE
           AND created_at >= NOW() - INTERVAL '24 hours'
         ORDER BY created_at DESC LIMIT 20`
      );

      if (!result.rows.length) {
        logger.info('[Scheduler] No new jobs in last 24h, skipping digest.');
        return;
      }

      const jobList = result.rows
        .map(j => `<li><strong>${j.title}</strong> - ${j.company_name || ''} (${j.city}, ${j.working_type})</li>`)
        .join('');

      // In production: query subscribed users from DB and send personalised emails
      // Demo: send to admin
      if (process.env.ADMIN_EMAIL) {
        await mailer.sendEmail({
          to:      process.env.ADMIN_EMAIL,
          subject: `[Be Work Ready] Daily Job Digest - ${new Date().toDateString()}`,
          html: `<h2>New Jobs Today</h2><ul>${jobList}</ul>`,
        });
      }

      logger.info(`[Scheduler] Daily digest sent with ${result.rows.length} jobs.`);
    } catch (err) {
      logger.error(`[Scheduler] Daily digest error: ${err.message}`);
    }
  });

  // ── Job 2: Personalised recommendations based on search history (every 6h) ─
  cron.schedule('0 */6 * * *', async () => {
    logger.info('[Scheduler] Running: personalised job recommendations');
    try {
      // Get unique users who searched in the last 7 days
      const recentUsers = await Search.aggregate([
        { $match: { timestamp: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } } },
        { $group: { _id: '$userId', queries: { $addToSet: '$query' }, cities: { $addToSet: '$city' } } },
        { $limit: 100 },
      ]);

      const pool = getPool();

      for (const user of recentUsers) {
        const queries = user.queries.filter(Boolean);
        const cities  = user.cities.filter(Boolean);
        if (!queries.length) continue;

        // Build a query for matching jobs
        const titleConditions = queries.map((_, i) => `LOWER(title) LIKE LOWER($${i + 1})`).join(' OR ');
        const values = queries.map(q => `%${q}%`);

        const jobRes = await pool.query(
          `SELECT id, title, company_name, city, working_type
           FROM jobs WHERE is_active = TRUE AND (${titleConditions})
           ORDER BY created_at DESC LIMIT 5`,
          values
        );

        if (!jobRes.rows.length) continue;

        // In production: look up user email from Firebase Admin by UID
        // and send a personalised email. For now we log.
        logger.info(`[Scheduler] Would send ${jobRes.rows.length} recommendations to user ${user._id}`);
      }
    } catch (err) {
      logger.error(`[Scheduler] Recommendation error: ${err.message}`);
    }
  });

  logger.info('Scheduler started (daily digest @ 09:00, recommendations every 6h)');
}

module.exports = { startScheduler };
