import { STORAGE_KEY } from './storageKeys.js';
import {
  createDefaultPreferences,
  PREFERENCES_VERSION,
} from './types.js';

/**
 * @implements {import('./types.js').PreferencesProvider}
 */
export class LocalStoragePreferencesAdapter {
  /** @returns {Promise<import('./types.js').UserPreferences>} */
  async load() {
    if (typeof localStorage === 'undefined') {
      return createDefaultPreferences();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultPreferences();
      const parsed = JSON.parse(raw);
      return normalizePreferences(parsed);
    } catch {
      return createDefaultPreferences();
    }
  }

  /** @param {import('./types.js').UserPreferences} prefs */
  async save(prefs) {
    if (typeof localStorage === 'undefined') return;
    const normalized = normalizePreferences(prefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
}

/** @param {unknown} raw */
function normalizePreferences(raw) {
  const base = createDefaultPreferences();
  if (!raw || typeof raw !== 'object') return base;

  const obj = /** @type {Record<string, unknown>} */ (raw);
  return {
    version: PREFERENCES_VERSION,
    favoriteVenues: Array.isArray(obj.favoriteVenues)
      ? obj.favoriteVenues
          .filter((v) => v?.venueCode && v?.venueName)
          .map((v) => ({
            venueCode: String(v.venueCode),
            venueName: String(v.venueName),
            addedAt: v.addedAt ? String(v.addedAt) : undefined,
          }))
      : [],
    favoriteRacers: Array.isArray(obj.favoriteRacers)
      ? obj.favoriteRacers
          .filter((r) => r?.racerId && r?.name)
          .map((r) => ({
            racerId: String(r.racerId),
            name: String(r.name),
            addedAt: r.addedAt ? String(r.addedAt) : undefined,
          }))
      : [],
    updatedAt:
      typeof obj.updatedAt === 'string'
        ? obj.updatedAt
        : new Date().toISOString(),
  };
}
