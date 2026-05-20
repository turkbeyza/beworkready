const { createClient } = require('redis');
const logger = require('../utils/logger');
let client;
async function connectRedis() {
  client = createClient({ url: process.env.REDIS_URL });
  client.on('error', e => logger.error('Redis:', e));
  await client.connect();
  logger.info('Redis connected');
}
function getRedis() { return client; }
module.exports = { connectRedis, getRedis };
