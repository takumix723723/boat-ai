import { Router } from 'express';
import { getSnapshotStats } from '../services/persistence/snapshotPersistenceService.js';

const router = Router();

/**
 * GET /api/snapshots/stats
 * GET /api/snapshots/stats?raceId=20260601-03-11
 */
router.get('/stats', async (req, res) => {
  const raceId = req.query.raceId || null;
  const stats = await getSnapshotStats(raceId);
  res.json({ stats });
});

export default router;
