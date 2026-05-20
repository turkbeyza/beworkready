const mongoose = require('mongoose');
const logger   = require('../utils/logger');
async function connectMongo() {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('MongoDB connected');
}
module.exports = { connectMongo };
