require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const logger  = require('./utils/logger');
const { connectDB }      = require('./config/db');
const { connectRedis }   = require('./config/redis');
const { connectRabbitMQ } = require('./config/rabbitmq');
const jobRoutes  = require('./routes/jobs');
const applyRoutes = require('./routes/apply');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: m => logger.info(m.trim()) } }));

// Routes
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'job-posting-service' }));
app.use('/api/v1/jobs',  jobRoutes);
app.use('/api/v1/apply', applyRoutes);

// Error handler
app.use((err, req, res, _next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message });
});

async function bootstrap() {
  await connectDB();
  await connectRedis();
  await connectRabbitMQ();
  app.listen(PORT, () => logger.info(`Job Posting Service on port ${PORT}`));
}

bootstrap().catch(err => { logger.error(err); process.exit(1); });
