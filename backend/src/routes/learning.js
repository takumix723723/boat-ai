import { Router } from 'express';
import {
  getLearningStatus,
  listLearningRuns,
  runAutoLearning,
  applyLearningRun,
} from '../services/learning/autoLearningService.js';

const router = Router();

/** GET /api/learning/status */
router.get('/status', async (_req, res, next) => {
  try {
    const status = await getLearningStatus();
    res.json({ status });
  } catch (err) {
    next(err);
  }
});

/** GET /api/learning/runs */
router.get('/runs', async (req, res, next) => {
  try {
    const limit = req.query.limit;
    const result = await listLearningRuns({ limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** POST /api/learning/run */
router.post('/run', async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const result = await runAutoLearning({
      trigger: 'manual',
      force: Boolean(body.force),
      trials: body.trials,
    });
    res.json({ learning: result });
  } catch (err) {
    next(err);
  }
});

/** POST /api/learning/runs/:id/apply — pending 候補を採用 */
router.post('/runs/:id/apply', async (req, res, next) => {
  try {
    const applied = await applyLearningRun(req.params.id);
    res.json(applied);
  } catch (err) {
    if (
      err.message?.includes('not found') ||
      err.message?.includes('Cannot apply') ||
      err.message?.includes('Already applied')
    ) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
