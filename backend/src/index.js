import { loadBackendEnv } from '../scripts/loadEnv.js';
import express from 'express';
import cors from 'cors';

loadBackendEnv();
import { refreshActiveWeightsCache } from './services/ai/weightProfileService.js';
import racesRouter from './routes/races.js';
import rankingRouter from './routes/ranking.js';
import snapshotsRouter from './routes/snapshots.js';
import analyticsRouter from './routes/analytics.js';
import racersRouter from './routes/racers.js';
import watchlistRouter from './routes/watchlist.js';
import learningRouter from './routes/learning.js';
import healthRouter from './routes/health.js';
import { startLearningScheduler } from './services/learning/learningScheduler.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'boat-ai-backend',
    health: '/api/health',
    docs: 'See docs/RENDER_DEPLOY.md',
  });
});

app.use('/api/health', healthRouter);

app.get('/api/health/fetch', async (_req, res, next) => {
  try {
    const { diagnoseLiveFetch } = await import(
      './services/boatrace/raceDataService.js'
    );
    const result = await diagnoseLiveFetch('today');
    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.use('/api/races', racesRouter);
app.use('/api/ranking', rankingRouter);
app.use('/api/snapshots', snapshotsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/racers', racersRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/learning', learningRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

refreshActiveWeightsCache().finally(() => {
  startLearningScheduler();
  app.listen(PORT, HOST, () => {
    console.log(`Boat AI API running on http://${HOST}:${PORT}`);
    console.log(
      `  mode=${process.env.BOATRACE_DATA_MODE || 'auto'} persist=${process.env.PERSIST_SNAPSHOTS === 'true'} learn=${process.env.AI_LEARNING_MODE || 'suggest'}`
    );
  });
});
