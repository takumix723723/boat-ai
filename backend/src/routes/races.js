import { Router } from 'express';
import {
  ensureDataset,
  reloadDataset,
  listRaces,
  getRaceById,
  updateLastMinute,
  updateExhibition,
  getDatasetMeta,
} from '../data/raceRepository.js';
import { getRaceHistory } from '../services/persistence/raceHistoryService.js';
import { getRaceResult } from '../services/results/raceResultService.js';
import { buildRacePrediction } from '../services/prediction/racePredictionService.js';

const router = Router();

async function loadMiddleware(req, _res, next) {
  try {
    const date = req.query.date || 'today';
    await ensureDataset(date);
    next();
  } catch (err) {
    next(err);
  }
}

/** GET /api/races - レース一覧 */
router.get('/', loadMiddleware, (_req, res) => {
  res.json({
    meta: getDatasetMeta(),
    races: listRaces(),
  });
});

/** POST /api/races/refresh - キャッシュ破棄して再取得 */
router.post('/refresh', async (req, res, next) => {
  try {
    const date = req.query.date || 'today';
    const data = await reloadDataset(date);
    res.json({ meta: data.meta, races: listRaces() });
  } catch (err) {
    next(err);
  }
});

/** GET /api/races/:id/result - 着順とAI検証 */
router.get('/:id/result', loadMiddleware, async (req, res, next) => {
  try {
    const memoryRace = getRaceById(req.params.id);
    if (!memoryRace) {
      return res.status(404).json({ error: 'Race not found' });
    }
    const result = await getRaceResult(req.params.id, memoryRace);
    res.json({ result });
  } catch (err) {
    next(err);
  }
});

/** GET /api/races/:id/prediction - AI買い目・印・推定オッズ */
router.get('/:id/prediction', loadMiddleware, (req, res, next) => {
  try {
    const race = getRaceById(req.params.id);
    if (!race) {
      return res.status(404).json({ error: 'Race not found' });
    }
    res.json({
      meta: getDatasetMeta(),
      prediction: buildRacePrediction(race),
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/races/:id/history - DBスナップショットのAI推移 */
router.get('/:id/history', async (req, res, next) => {
  try {
    const history = await getRaceHistory(req.params.id);
    res.json({ history });
  } catch (err) {
    next(err);
  }
});

/** GET /api/races/:id - レース詳細 */
router.get('/:id', loadMiddleware, (req, res) => {
  const race = getRaceById(req.params.id);
  if (!race) {
    return res.status(404).json({ error: 'Race not found' });
  }
  res.json({ meta: getDatasetMeta(), race });
});

/** PATCH /api/races/:id/last-minute */
router.patch('/:id/last-minute', loadMiddleware, (req, res) => {
  const race = updateLastMinute(req.params.id, req.body);
  if (!race) {
    return res.status(404).json({ error: 'Race not found' });
  }
  res.json({ meta: getDatasetMeta(), race });
});

/** PATCH /api/races/:id/exhibition/:lane */
router.patch('/:id/exhibition/:lane', loadMiddleware, (req, res) => {
  const lane = parseInt(req.params.lane, 10);
  if (Number.isNaN(lane) || lane < 1 || lane > 6) {
    return res.status(400).json({ error: 'Invalid lane' });
  }
  const race = updateExhibition(req.params.id, lane, req.body);
  if (!race) {
    return res.status(404).json({ error: 'Race not found' });
  }
  res.json({ meta: getDatasetMeta(), race });
});

export default router;
