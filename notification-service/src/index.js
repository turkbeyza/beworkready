require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const logger   = require('./utils/logger');
const { connectMongo }  = require('./config/mongo');
const { connectPG }     = require('./config/pg');
const { startConsumer } = require('./queue/consumer');
const { startScheduler } = require('./jobs/scheduler');

const app  = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: m => logger.info(m.trim()) } }));

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'notification-service' }));

// Webhook endpoint to register user email for notifications
app.post('/api/v1/notifications/subscribe', require('./routes/subscribe'));
app.get('/api/v1/notifications/alerts', require('./routes/alerts'));
app.delete('/api/v1/notifications/alerts/:id', require('./routes/deleteAlert'));

app.use((err, req, res, _next) => {
  logger.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

async function bootstrap() {
  await connectMongo();
  await connectPG();
  await startConsumer();    // RabbitMQ consumer
  startScheduler();         // node-cron scheduled jobs
  app.listen(PORT, () => logger.info(`Notification Service on port ${PORT}`));
}

bootstrap().catch(err => { logger.error(err); process.exit(1); });
