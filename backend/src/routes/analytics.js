import { Router } from 'express';
import { getAccuracyAnalytics } from '../services/analytics/accuracyAnalyticsService.js';
import {
  listWeightProfiles,
  upsertWeightProfile,
} from '../services/ai/weightProfileService.js';
import { simulateProfilesAccuracy } from '../services/analytics/accuracySimulation.js';
import { optimizeWeights } from '../services/analytics/weightOptimizationService.js';

const router = Router();

/** GET /api/analytics/accuracy */
router.get('/accuracy', async (_req, res, next) => {
  try {
    const accuracy = await getAccuracyAnalytics();
    res.json({ accuracy });
  } catch (err) {
    next(err);
  }
});

/** GET /api/analytics/weights — プロファイル一覧 + 精度シミュレーション */
router.get('/weights', async (_req, res, next) => {
  try {
    const weights = await listWeightProfiles();
    if (weights.available && weights.profiles.length) {
      weights.simulations = await simulateProfilesAccuracy(weights.profiles);
    } else {
      weights.simulations = [];
    }
    res.json({ weights });
  } catch (err) {
    next(err);
  }
});

/** POST /api/analytics/weights/optimize — 過去DBで重みをランダム探索 */
router.post('/weights/optimize', async (req, res, next) => {
  try {
    const optimization = await optimizeWeights(req.body ?? {});
    res.json({ optimization });
  } catch (err) {
    next(err);
  }
});

/** POST /api/analytics/weights — プロファイル作成・更新 */
router.post('/weights', async (req, res, next) => {
  try {
    const profile = await upsertWeightProfile(req.body ?? {});
    res.json({ profile });
  } catch (err) {
    if (err.message?.includes('DATABASE_URL')) {
      return res.status(503).json({ error: err.message });
    }
    if (
      err.message?.includes('重み') ||
      err.message?.includes('name')
    ) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
