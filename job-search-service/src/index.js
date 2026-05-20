require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const logger   = require('./utils/logger');
const { connectMongo } = require('./config/mongo');
const { connectPG }    = require('./config/pg');
const { connectRedis } = require('./config/redis');
const searchRoutes     = require('./routes/search');
const historyRoutes    = require('./routes/history');

const app  = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: m => logger.info(m.trim()) } }));

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'job-search-service' }));
app.use('/api/v1/search',       searchRoutes);
app.use('/api/v1/autocomplete', require('./routes/autocomplete'));
app.use('/api/v1/history',      historyRoutes);

app.use((err, req, res, _next) => {
  logger.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

async function bootstrap() {
  await connectMongo();
  await connectPG();
  await connectRedis();
  app.listen(PORT, () => logger.info(`Job Search Service on port ${PORT}`));
}

bootstrap().catch(err => { logger.error(err); process.exit(1); });
