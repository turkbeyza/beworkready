const amqp   = require('amqplib');
const logger  = require('../utils/logger');
const mailer  = require('../utils/mailer');
const Subscription = require('../models/Subscription');

const EXCHANGE = 'beworkready';
const QUEUES = {
  NEW_JOB:     'new_job_posted',
  APPLICATION: 'job_application',
};

// ── Email Template ─────────────────────────────────────────────────────────────
function buildAlertEmail(job, baseUrl) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:24px;color:#fff;">
      <h1 style="margin:0;font-size:20px;">🔔 Job Alert — New Match!</h1>
      <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">A new job matching your alert was just posted</p>
    </div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">${job.title}</h2>
      <p style="margin:0 0 4px;color:#6b7280;font-size:14px;">
        🏢 <strong>${job.company_name || 'Confidential Company'}</strong>
      </p>
      <p style="margin:0 0 4px;color:#6b7280;font-size:14px;">
        📍 ${job.city || ''}${job.country ? ', ' + job.country : ''}&nbsp;&nbsp;
        💼 ${job.working_type || ''}
        ${job.salary_min ? `&nbsp;&nbsp;💰 ${Number(job.salary_min).toLocaleString()} ${job.currency || 'TRY'}+` : ''}
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
      ${job.description ? `<p style="font-size:13px;color:#374151;line-height:1.6;">${job.description.substring(0, 200)}...</p>` : ''}
      <a href="${baseUrl}/jobs/${job.id}"
         style="display:inline-block;margin-top:16px;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">
        View Job &amp; Apply
      </a>
    </div>
    <div style="background:#f3f4f6;padding:14px;text-align:center;font-size:12px;color:#9ca3af;">
      You received this because you set up a job alert on <strong>Be Work Ready</strong>.
      Manage alerts in your <a href="${baseUrl}/alerts" style="color:#2563eb;">Alerts Settings</a>.
    </div>
  </div>
</body>
</html>`;
}

// ── Match a job against a subscription ─────────────────────────────────────────
function jobMatchesSub(job, sub) {
  // Keyword: empty = match all
  if (sub.keyword) {
    const kw = sub.keyword.toLowerCase();
    const inTitle = (job.title || '').toLowerCase().includes(kw);
    const inDesc  = (job.description || '').toLowerCase().includes(kw);
    if (!inTitle && !inDesc) return false;
  }
  // City: empty = match all
  if (sub.city && sub.city.toLowerCase() !== (job.city || '').toLowerCase()) return false;
  // Country: empty = match all
  if (sub.country && sub.country.toLowerCase() !== (job.country || '').toLowerCase()) return false;
  // Working type: empty = match all
  if (sub.working_type && sub.working_type !== job.working_type) return false;
  // Salary: 0 = no minimum
  if (sub.salary_min > 0) {
    if (!job.salary_max && !job.salary_min) return false;
    if (job.salary_max && job.salary_max < sub.salary_min) return false;
  }
  return true;
}

async function startConsumer() {
  const conn    = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await conn.createChannel();
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost';

  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(QUEUES.NEW_JOB,     { durable: true });
  await channel.assertQueue(QUEUES.APPLICATION, { durable: true });
  await channel.bindQueue(QUEUES.NEW_JOB,     EXCHANGE, 'job.new');
  await channel.bindQueue(QUEUES.APPLICATION, EXCHANGE, 'job.application');

  channel.prefetch(5); // process up to 5 messages concurrently

  // ── NEW JOB → Real-time Job Alert Notifications ────────────────────────────
  // Architecture: Job Posting Service publishes to RabbitMQ 'job.new' routing key.
  // This consumer reads from the queue immediately (real-time) and:
  //   1. Loads ALL active subscriptions from MongoDB
  //   2. Filters by keyword, city, country, working_type, salary_min
  //   3. Sends personalized email alerts to matching users
  channel.consume(QUEUES.NEW_JOB, async (msg) => {
    if (!msg) return;
    try {
      const job = JSON.parse(msg.content.toString());
      logger.info(`[Consumer] New job received: "${job.title}" (${job.id})`);

      // Load all ACTIVE subscriptions (is_active: { $ne: false } handles legacy docs without the field)
      const allActiveSubs = await Subscription.find({ is_active: { $ne: false } }).lean();

      if (!allActiveSubs.length) {
        logger.info('[Consumer] No active subscriptions, skipping alerts.');
        channel.ack(msg);
        return;
      }

      // Match subscriptions against this job
      const matchedSubs = allActiveSubs.filter(sub => jobMatchesSub(job, sub));

      // De-duplicate by email (one email per new job, even if user has multiple matching alerts)
      const uniqueEmails = [...new Set(matchedSubs.map(s => s.email))];

      logger.info(`[Consumer] "${job.title}" matched ${uniqueEmails.length} subscriber(s).`);

      // Send emails in parallel (batched to avoid overwhelming mail server)
      const BATCH_SIZE = 10;
      for (let i = 0; i < uniqueEmails.length; i += BATCH_SIZE) {
        const batch = uniqueEmails.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(email =>
            mailer.sendEmail({
              to: email,
              subject: `🔔 [Job Alert] ${job.title} — ${job.company_name || 'New Posting'}`,
              html: buildAlertEmail(job, baseUrl),
            }).then(() => {
              logger.info(`[Consumer] Alert sent to ${email} for job "${job.title}"`);
            }).catch(err => {
              logger.error(`[Consumer] Failed to send to ${email}: ${err.message}`);
            })
          )
        );
      }

      channel.ack(msg);
    } catch (err) {
      logger.error(`[Consumer] Error processing new job message: ${err.message}`);
      channel.nack(msg, false, false); // dead-letter, don't requeue
    }
  });

  // ── JOB APPLICATION → Confirmation Email to Applicant ─────────────────────
  channel.consume(QUEUES.APPLICATION, async (msg) => {
    if (!msg) return;
    try {
      const { application, job, userEmail } = JSON.parse(msg.content.toString());
      logger.info(`[Consumer] Application received: job="${job?.title}" user=${application?.user_uid}`);

      if (userEmail && job) {
        await mailer.sendEmail({
          to:      userEmail,
          subject: `✅ Application Confirmed: ${job.title}`,
          html: `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#16a34a,#0891b2);padding:24px;color:#fff;">
      <h1 style="margin:0;font-size:20px;">✅ Application Submitted!</h1>
    </div>
    <div style="padding:24px;">
      <p style="font-size:15px;color:#111827;">
        Your application for <strong>${job.title}</strong> at <strong>${job.company_name || 'the company'}</strong> has been received!
      </p>
      <p style="color:#6b7280;font-size:14px;">📍 ${job.city || ''}, ${job.country || ''}</p>
      <p style="color:#6b7280;font-size:14px;">We will keep you updated on your application status. Good luck! 🚀</p>
      <a href="${process.env.FRONTEND_URL || 'http://localhost'}/jobs/${job.id}"
         style="display:inline-block;margin-top:16px;background:#16a34a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
        View Job Posting
      </a>
    </div>
  </div>
</body>
</html>`,
        });
      }

      channel.ack(msg);
    } catch (err) {
      logger.error(`[Consumer] Error processing application message: ${err.message}`);
      channel.nack(msg, false, false);
    }
  });

  logger.info('[Consumer] RabbitMQ consumers started — listening for job.new and job.application events');
}

module.exports = { startConsumer };
