const cron    = require('node-cron');
const logger  = require('../utils/logger');
const mailer  = require('../utils/mailer');
const { getPool } = require('../config/pg');
const Subscription = require('../models/Subscription');
const Search  = require('../models/Search');

// ── Helpers ───────────────────────────────────────────────────────────────────

function jobMatchesSubscription(job, sub) {
  // Keyword check (empty = match all)
  if (sub.keyword) {
    const kw = sub.keyword.toLowerCase();
    const inTitle = job.title?.toLowerCase().includes(kw);
    const inDesc  = job.description?.toLowerCase().includes(kw);
    if (!inTitle && !inDesc) return false;
  }
  // City check (empty = match all)
  if (sub.city && sub.city.toLowerCase() !== (job.city || '').toLowerCase()) return false;
  // Country check (empty = match all)
  if (sub.country && sub.country.toLowerCase() !== (job.country || '').toLowerCase()) return false;
  // Working type check (empty = match all)
  if (sub.working_type && sub.working_type !== job.working_type) return false;
  // Salary check (0 = no minimum)
  if (sub.salary_min > 0) {
    if (!job.salary_max && !job.salary_min) return false;
    if (job.salary_max && job.salary_max < sub.salary_min) return false;
  }
  return true;
}

function buildJobHtml(jobs, introText, baseUrl) {
  const items = jobs.map(j => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
        <a href="${baseUrl}/jobs/${j.id}" style="font-weight:bold;color:#2563eb;text-decoration:none;">${j.title}</a><br/>
        <span style="color:#6b7280;font-size:13px;">${j.company_name || ''} · ${j.city || ''}, ${j.country || ''} · ${j.working_type || ''}</span>
        ${j.salary_min ? `<br/><span style="color:#16a34a;font-size:12px;">💰 ${Number(j.salary_min).toLocaleString()} - ${Number(j.salary_max || 0).toLocaleString()} ${j.currency || 'TRY'}</span>` : ''}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:24px;color:#fff;">
          <h1 style="margin:0;font-size:22px;">Be Work Ready</h1>
          <p style="margin:8px 0 0;opacity:0.9;">${introText}</p>
        </div>
        <div style="padding:20px;">
          <table style="width:100%;border-collapse:collapse;">
            ${items}
          </table>
          <p style="text-align:center;margin-top:24px;">
            <a href="${baseUrl}" style="background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
              View All Jobs
            </a>
          </p>
        </div>
        <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">
          You received this email because you created a job alert on Be Work Ready.
          <br/>To stop receiving alerts, manage your notifications in Settings.
        </div>
      </div>
    </body>
    </html>
  `;
}

// ── Scheduled Task 1: Job Alert Notifications ─────────────────────────────────
// Runs every hour — processes new job postings from last hour against all active alerts
// ──────────────────────────────────────────────────────────────────────────────
async function runJobAlertTask() {
  logger.info('[Scheduler] Running: Job Alert Notification Task');
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost';

  try {
    const pool = getPool();

    // Get new jobs from the last 1 hour (cron runs every hour)
    const newJobsRes = await pool.query(
      `SELECT id, title, description, company_name, city, country, working_type,
              salary_min, salary_max, currency, created_at
       FROM jobs
       WHERE is_active = TRUE
         AND created_at >= NOW() - INTERVAL '1 hour'
       ORDER BY created_at DESC
       LIMIT 50`
    );

    const newJobs = newJobsRes.rows;
    if (!newJobs.length) {
      logger.info('[Scheduler][Job Alert] No new jobs in the last hour. Skipping.');
      return;
    }
    logger.info(`[Scheduler][Job Alert] Found ${newJobs.length} new job(s) to process.`);

    // Get ALL active alert subscriptions
    const allSubs = await Subscription.find({ is_active: true });
    if (!allSubs.length) {
      logger.info('[Scheduler][Job Alert] No active subscriptions. Skipping.');
      return;
    }

    // For each subscription, find matching new jobs
    const emailMap = new Map(); // email → matching jobs[]
    for (const sub of allSubs) {
      const matching = newJobs.filter(job => jobMatchesSubscription(job, sub));
      if (!matching.length) continue;

      if (!emailMap.has(sub.email)) {
        emailMap.set(sub.email, []);
      }
      // Merge, deduplicate by job ID
      const existing = emailMap.get(sub.email);
      for (const job of matching) {
        if (!existing.find(j => j.id === job.id)) {
          existing.push(job);
        }
      }
    }

    // Send emails
    let sentCount = 0;
    for (const [email, jobs] of emailMap) {
      try {
        const subject = jobs.length === 1
          ? `[Job Alert] New Match: ${jobs[0].title}`
          : `[Job Alert] ${jobs.length} New Jobs Match Your Alerts`;

        await mailer.sendEmail({
          to: email,
          subject,
          html: buildJobHtml(jobs, `We found ${jobs.length} new job(s) matching your alerts!`, baseUrl),
        });
        sentCount++;
        logger.info(`[Scheduler][Job Alert] Sent ${jobs.length} job(s) to ${email}`);
      } catch (mailErr) {
        logger.error(`[Scheduler][Job Alert] Failed to send to ${email}: ${mailErr.message}`);
      }
    }

    logger.info(`[Scheduler][Job Alert] Completed. Sent emails to ${sentCount} user(s).`);
  } catch (err) {
    logger.error(`[Scheduler][Job Alert] Error: ${err.message}`);
  }
}

// ── Scheduled Task 2: Related Job Recommendations Based on Search History ────
// Runs every 6 hours — reads search history from MongoDB, finds matching jobs, sends emails
// ──────────────────────────────────────────────────────────────────────────────
async function runRelatedJobNotificationTask() {
  logger.info('[Scheduler] Running: Related Job Notification Task (Search History)');
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost';

  try {
    const pool = getPool();

    // Get users who searched in the last 48 hours
    // Group by userId, collect their search queries and cities
    const recentSearches = await Search.aggregate([
      {
        $match: {
          timestamp: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: '$userId',
          userEmail: { $last: '$userEmail' },
          queries: { $addToSet: '$query' },
          cities: { $addToSet: '$city' },
          workingTypes: { $addToSet: '$workingType' },
        }
      },
      { $limit: 200 }
    ]);

    if (!recentSearches.length) {
      logger.info('[Scheduler][Related Jobs] No recent search history. Skipping.');
      return;
    }
    logger.info(`[Scheduler][Related Jobs] Processing ${recentSearches.length} user(s) with recent searches.`);

    let sentCount = 0;

    for (const userSearch of recentSearches) {
      // Skip if no email available
      if (!userSearch.userEmail && !userSearch._id) continue;

      const queries = (userSearch.queries || []).filter(Boolean);
      const cities = (userSearch.cities || []).filter(Boolean);

      // Build flexible SQL query to find matching jobs
      const values = [];
      const conditions = ['is_active = TRUE'];

      // Title matching (any keyword)
      if (queries.length > 0) {
        const titleConds = queries.map(q => {
          values.push(`%${q}%`);
          return `LOWER(title) LIKE LOWER($${values.length})`;
        });
        conditions.push(`(${titleConds.join(' OR ')})`);
      }

      // City matching (if cities available)
      if (cities.length > 0) {
        const cityConds = cities.map(c => {
          values.push(c);
          return `LOWER(city) = LOWER($${values.length})`;
        });
        conditions.push(`(${cityConds.join(' OR ')})`);
      }

      if (!queries.length && !cities.length) continue;

      // Only include recent jobs (last 7 days)
      conditions.push(`created_at >= NOW() - INTERVAL '7 days'`);

      const where = `WHERE ${conditions.join(' AND ')}`;
      const jobRes = await pool.query(
        `SELECT id, title, description, company_name, city, country, working_type,
                salary_min, salary_max, currency, created_at
         FROM jobs ${where}
         ORDER BY created_at DESC
         LIMIT 5`,
        values
      );

      if (!jobRes.rows.length) continue;

      const emailTarget = userSearch.userEmail;
      if (!emailTarget) {
        logger.info(`[Scheduler][Related Jobs] No email for user ${userSearch._id}, skipping.`);
        continue;
      }

      try {
        await mailer.sendEmail({
          to: emailTarget,
          subject: `[Be Work Ready] New Jobs Based on Your Recent Searches`,
          html: buildJobHtml(
            jobRes.rows,
            `Based on your recent job searches, here are ${jobRes.rows.length} new matching position(s)!`,
            baseUrl
          ),
        });
        sentCount++;
        logger.info(`[Scheduler][Related Jobs] Sent ${jobRes.rows.length} recommendation(s) to ${emailTarget}`);
      } catch (mailErr) {
        logger.error(`[Scheduler][Related Jobs] Failed to send to ${emailTarget}: ${mailErr.message}`);
      }
    }

    logger.info(`[Scheduler][Related Jobs] Completed. Sent emails to ${sentCount} user(s).`);
  } catch (err) {
    logger.error(`[Scheduler][Related Jobs] Error: ${err.message}`);
  }
}

// ── Start All Scheduled Tasks ─────────────────────────────────────────────────
function startScheduler() {
  // Task 1: Job Alert — runs every hour at minute 0
  cron.schedule('0 * * * *', runJobAlertTask);

  // Task 2: Related Job Recommendations — runs every 6 hours
  cron.schedule('0 */6 * * *', runRelatedJobNotificationTask);

  logger.info('[Scheduler] All tasks started:');
  logger.info('[Scheduler]   → Job Alert Notification: every hour');
  logger.info('[Scheduler]   → Related Job Recommendations: every 6 hours');
}

module.exports = { startScheduler };
