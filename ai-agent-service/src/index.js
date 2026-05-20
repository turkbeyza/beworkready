require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const logger      = require('./utils/logger');
const agentRoutes = require('./routes/agent');

const app  = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: m => logger.info(m.trim()) } }));

// AI endpoint rate limiting (more restrictive)
app.use('/api/v1/ai', rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many AI requests.' },
}));

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'ai-agent-service' }));
app.use('/api/v1/ai', agentRoutes);

app.use((err, req, res, _next) => {
  logger.error(err.stack);
  res.status(500).json({ success: false, message: err.message });
});

app.listen(PORT, () => logger.info(`AI Agent Service on port ${PORT}`));
