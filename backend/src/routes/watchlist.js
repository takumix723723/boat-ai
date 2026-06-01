import { Router } from 'express';
import { ensureDataset, getDatasetMeta } from '../data/raceRepository.js';
import {
  parseFavoriteFilters,
  resolveWatchRules,
  DEFAULT_WATCH_RULES,
} from '../config/watchRules.js';
import { detectWatchlistEvents } from '../services/watchlist/watchlistService.js';

const router = Router();

/** GET /api/watchlist/events */
router.get('/events', async (req, res, next) => {
  try {
    const date = req.query.date || 'today';
    await ensureDataset(date);

    const rules = resolveWatchRules(req);
    const { favoriteRacerIds, favoriteVenueCodes } = parseFavoriteFilters(req);

    const { events, grouped } = detectWatchlistEvents({
      rules,
      favoriteRacerIds,
      favoriteVenueCodes,
    });

    res.json({
      meta: getDatasetMeta(),
      watchRules: rules,
      defaultRules: DEFAULT_WATCH_RULES,
      favoriteRacerCount: favoriteRacerIds.size,
      favoriteVenueCount: favoriteVenueCodes.size,
      eventCount: events.length,
      events,
      grouped,
      generatedAt: new Date().toISOString(),
      pushEnabled: false,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
