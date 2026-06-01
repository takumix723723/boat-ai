import { Router } from 'express';
import { getPersistenceStatus } from '../config/persistence.js';
import { getPrisma } from '../db/client.js';

const router = Router();

/**
 * Render / 運用向けヘルスチェック
 * GET /api/health
 */
router.get('/', async (_req, res) => {
  const persistence = getPersistenceStatus();
  let database = { configured: persistence.databaseUrlConfigured, ok: null };

  if (persistence.databaseUrlConfigured) {
    try {
      await getPrisma().$queryRaw`SELECT 1`;
      database = { ...database, ok: true };
    } catch (err) {
      database = {
        ...database,
        ok: false,
        message: err.message || 'Database connection failed',
      };
    }
  } else {
    database = { ...database, ok: null, message: 'DATABASE_URL not set' };
  }

  const degraded = database.ok === false;
  res.status(degraded ? 503 : 200).json({
    status: degraded ? 'degraded' : 'ok',
    service: 'boat-ai-backend',
    version: process.env.npm_package_version ?? '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    render: process.env.RENDER === 'true',
    deploy: {
      gitCommit: process.env.RENDER_GIT_COMMIT ?? null,
      serviceId: process.env.RENDER_SERVICE_ID ?? null,
    },
    apiFeatures: {
      racePrediction: true,
      raceResult: true,
      raceHistory: true,
    },
    dataMode: process.env.BOATRACE_DATA_MODE || 'auto',
    persistence,
    database,
    timestamp: new Date().toISOString(),
  });
});

export default router;
