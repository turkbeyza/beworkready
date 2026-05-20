const nodemailer = require('nodemailer');
const logger     = require('./logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  try {
    if (!process.env.SMTP_USER) {
      logger.warn(`[Mailer] SMTP not configured. Would send to ${to}: ${subject}`);
      return;
    }
    const info = await getTransporter().sendMail({
      from: `"Be Work Ready" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    });
    logger.info(`[Mailer] Email sent: ${info.messageId} → ${to}`);
  } catch (err) {
    logger.error(`[Mailer] Failed to send to ${to}: ${err.message}`);
  }
}

module.exports = { sendEmail };
