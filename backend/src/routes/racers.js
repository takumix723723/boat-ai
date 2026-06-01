import { Router } from 'express';
import { getRacerIntelligence } from '../services/racers/racerIntelligenceService.js';

const router = Router();

/** GET /api/racers/:id/intelligence */
router.get('/:id/intelligence', async (req, res, next) => {
  try {
    const result = await getRacerIntelligence(req.params.id);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
