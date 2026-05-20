const amqp   = require('amqplib');
const logger = require('../utils/logger');

let channel;

const EXCHANGE = 'beworkready';
const QUEUES = {
  NEW_JOB:      'new_job_posted',
  APPLICATION:  'job_application',
};

async function connectRabbitMQ() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(QUEUES.NEW_JOB,     { durable: true });
  await channel.assertQueue(QUEUES.APPLICATION, { durable: true });
  await channel.bindQueue(QUEUES.NEW_JOB,     EXCHANGE, 'job.new');
  await channel.bindQueue(QUEUES.APPLICATION, EXCHANGE, 'job.application');
  logger.info('RabbitMQ connected');
}

function publish(routingKey, payload) {
  if (!channel) throw new Error('RabbitMQ not initialized');
  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true });
}

module.exports = { connectRabbitMQ, publish, QUEUES, EXCHANGE };
