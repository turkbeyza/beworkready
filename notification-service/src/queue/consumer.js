const amqp   = require('amqplib');
const logger  = require('../utils/logger');
const mailer  = require('../utils/mailer');
const Subscription = require('../models/Subscription');

const EXCHANGE = 'beworkready';
const QUEUES = {
  NEW_JOB:     'new_job_posted',
  APPLICATION: 'job_application',
};

async function startConsumer() {
  const conn    = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await conn.createChannel();

  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(QUEUES.NEW_JOB,     { durable: true });
  await channel.assertQueue(QUEUES.APPLICATION, { durable: true });
  await channel.bindQueue(QUEUES.NEW_JOB,     EXCHANGE, 'job.new');
  await channel.bindQueue(QUEUES.APPLICATION, EXCHANGE, 'job.application');

  channel.prefetch(1);

  // ── NEW JOB ────────────────────────────────────────────────────────────────
  channel.consume(QUEUES.NEW_JOB, async (msg) => {
    if (!msg) return;
    try {
      const job = JSON.parse(msg.content.toString());
      logger.info(`[Queue] New job posted: ${job.id} - ${job.title}`);

      // Find matching subscriptions (Empty string means 'Any')
      const query = {
        $and: [
          { $or: [{ city: '' }, { city: { $regex: new RegExp(`^${job.city}$`, 'i') } }] },
          { $or: [{ working_type: '' }, { working_type: job.working_type }] }
        ]
      };
      
      let matchedSubs = await Subscription.find(query);

      // Filter by keyword and salary_min
      matchedSubs = matchedSubs.filter(sub => {
        let keywordMatch = true;
        if (sub.keyword) {
          keywordMatch = job.title.toLowerCase().includes(sub.keyword.toLowerCase()) || 
               (job.description && job.description.toLowerCase().includes(sub.keyword.toLowerCase()));
        }
        
        let salaryMatch = true;
        if (sub.salary_min > 0) {
          // If job has a max salary and it's less than user's min, skip.
          // If job has a min salary and it's greater/equal, fine.
          // If job doesn't specify salary, it might be ignored or matched. Let's strictly match:
          if (!job.salary_max && !job.salary_min) salaryMatch = false; // or true if you want to be lenient
          else if (job.salary_max && job.salary_max < sub.salary_min) salaryMatch = false;
        }

        return keywordMatch && salaryMatch;
      });

      // Remove duplicates by email
      const uniqueEmails = [...new Set(matchedSubs.map(s => s.email))];

      for (const email of uniqueEmails) {
        await mailer.sendEmail({
          to: email,
          subject: `[Job Alert] New Match: ${job.title}`,
          html: `
            <h2>Job Alert: New Job Posted!</h2>
            <p><strong>${job.title}</strong> at ${job.company_name || 'a company'}</p>
            <p>Location: ${job.city}, ${job.country}</p>
            <p>Type: ${job.working_type}</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost'}/jobs/${job.id}">View Job Details</a>
          `,
        });
      }
      logger.info(`[Queue] Sent job alerts for ${job.id} to ${uniqueEmails.length} users.`);

      channel.ack(msg);
    } catch (err) {
      logger.error(`[Queue] Error processing new job: ${err.message}`);
      channel.nack(msg, false, false); // dead-letter
    }
  });

  // ── APPLICATION ────────────────────────────────────────────────────────────
  channel.consume(QUEUES.APPLICATION, async (msg) => {
    if (!msg) return;
    try {
      const { application, job, userEmail } = JSON.parse(msg.content.toString());
      logger.info(`[Queue] Application received: job=${job.id} user=${application.user_uid}`);

      if (userEmail) {
        await mailer.sendEmail({
          to:      userEmail,
          subject: `[Be Work Ready] Application Confirmed: ${job.title}`,
          html: `
            <h2>Application Received!</h2>
            <p>You successfully applied to <strong>${job.title}</strong>
               at ${job.company_name || 'the company'}.</p>
            <p>We will keep you updated. Good luck! 🚀</p>
          `,
        });
      }

      channel.ack(msg);
    } catch (err) {
      logger.error(`[Queue] Error processing application: ${err.message}`);
      channel.nack(msg, false, false);
    }
  });

  logger.info('RabbitMQ consumers started');
}

module.exports = { startConsumer };
