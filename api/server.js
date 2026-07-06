import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { applyCloudDefaults } from './config/applyDefaults.js';
import { connectDB } from './config/db.js';
import authRouter from './routes/auth.js';
import campaignsRouter from './routes/campaigns.js';
import syncRouter from './routes/sync.js';

dotenv.config({ override: true });
applyCloudDefaults();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
if (isProduction) {
  app.set('trust proxy', 1);
}

function resolveCorsOrigin() {
  const configured = process.env.CORS_ORIGIN?.trim();
  if (configured === '*' || !configured) {
    return true;
  }
  return configured.split(',').map((origin) => origin.trim()).filter(Boolean);
}

const corsOrigin = resolveCorsOrigin();
const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin(origin, callback) {
    if (!origin || origin.startsWith('file://')) {
      callback(null, true);
      return;
    }
    if (corsOrigin === true) {
      callback(null, true);
      return;
    }
    if (corsOrigin.includes(origin) || (!isProduction && devOrigins.includes(origin))) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '50mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/auth', authRouter);
app.use('/campaigns', campaignsRouter);
app.use('/sync', syncRouter);

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
