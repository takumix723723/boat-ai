import { Router } from 'express';
import {
  ensureDataset,
  getDatasetMeta,
  listAiRanking,
} from '../data/raceRepository.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const date = req.query.date || 'today';
    await ensureDataset(date);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    res.json({
      meta: getDatasetMeta(),
      ranking: listAiRanking(limit),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
