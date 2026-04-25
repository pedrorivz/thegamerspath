import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import Redis from 'ioredis';
import authRouter from './routes/auth';
import libraryRouter from './routes/library';
import { createGamesRouter } from './routes/games';
import backupRouter from './routes/backup';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const REDIS_URL = process.env.REDIS_URL;
const IS_PROD = process.env.NODE_ENV === 'production';

// Redis (optional — gracefully degrades if not available)
let redis: Redis | null = null;
if (REDIS_URL) {
  redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  redis.connect().catch(() => {
    console.warn('[Redis] Não foi possível conectar. Continuando sem cache.');
    redis = null;
  });
} else {
  console.log('[Redis] REDIS_URL não configurada. Cache desativado.');
}

// Middleware
app.use(cors({
  origin: IS_PROD ? false : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/library', libraryRouter);
app.use('/api/games', createGamesRouter(redis));
app.use('/api/backup', backupRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', redis: redis !== null, timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (IS_PROD) {
  const DIST_PATH = path.join(__dirname, '../dist');
  app.use(express.static(DIST_PATH));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🎮 The Gamer's Path server rodando em http://localhost:${PORT}`);
  console.log(`📦 Ambiente: ${IS_PROD ? 'production' : 'development'}`);
  console.log(`🗃️  SQLite: ${process.env.DATA_DIR || path.join(__dirname, 'data')}/tgp.db`);
  console.log(`⚡ Redis: ${redis ? 'conectado' : 'desativado'}\n`);
});
