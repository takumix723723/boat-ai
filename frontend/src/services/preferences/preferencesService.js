import { LocalStoragePreferencesAdapter } from './LocalStoragePreferencesAdapter.js';
import { createDefaultPreferences, PREFERENCES_EVENT } from './types.js';

/**
 * UserPreferences サービス（UI はここ経由のみアクセス）
 */
export class PreferencesService {
  /** @param {import('./types.js').PreferencesProvider} provider */
  constructor(provider) {
    this.provider = provider;
  }

  async getPreferences() {
    return this.provider.load();
  }

  /** @param {Partial<import('./types.js').UserPreferences>} patch */
  async savePreferences(patch) {
    const current = await this.provider.load();
    const next = {
      ...current,
      ...patch,
      favoriteVenues: patch.favoriteVenues ?? current.favoriteVenues,
      favoriteRacers: patch.favoriteRacers ?? current.favoriteRacers,
      updatedAt: new Date().toISOString(),
    };
    await this.provider.save(next);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PREFERENCES_EVENT, { detail: next }));
    }
    return next;
  }

  async getFavoriteVenues() {
    const prefs = await this.getPreferences();
    return prefs.favoriteVenues;
  }

  async getFavoriteRacers() {
    const prefs = await this.getPreferences();
    return prefs.favoriteRacers;
  }

  /** @param {string} venueCode @param {string} venueName */
  async isFavoriteVenue(venueCode) {
    const venues = await this.getFavoriteVenues();
    return venues.some((v) => v.venueCode === venueCode);
  }

  /** @param {string} racerId */
  async isFavoriteRacer(racerId) {
    const racers = await this.getFavoriteRacers();
    return racers.some((r) => r.racerId === racerId);
  }

  /** @param {string} venueCode @param {string} venueName */
  async toggleFavoriteVenue(venueCode, venueName) {
    const prefs = await this.getPreferences();
    const exists = prefs.favoriteVenues.some((v) => v.venueCode === venueCode);
    const favoriteVenues = exists
      ? prefs.favoriteVenues.filter((v) => v.venueCode !== venueCode)
      : [
          ...prefs.favoriteVenues,
          {
            venueCode,
            venueName,
            addedAt: new Date().toISOString(),
          },
        ];
    return this.savePreferences({ favoriteVenues });
  }

  /** @param {string} racerId @param {string} name */
  async toggleFavoriteRacer(racerId, name) {
    const prefs = await this.getPreferences();
    const exists = prefs.favoriteRacers.some((r) => r.racerId === racerId);
    const favoriteRacers = exists
      ? prefs.favoriteRacers.filter((r) => r.racerId !== racerId)
      : [
          ...prefs.favoriteRacers,
          { racerId, name, addedAt: new Date().toISOString() },
        ];
    return this.savePreferences({ favoriteRacers });
  }
}

let singleton = null;

/** @returns {PreferencesService} */
export function getPreferencesService() {
  if (!singleton) {
    singleton = new PreferencesService(new LocalStoragePreferencesAdapter());
  }
  return singleton;
}

/**
 * 将来: getPreferencesService(new ApiPreferencesAdapter(userId))
 */
export function resetPreferencesService() {
  singleton = null;
}

export { createDefaultPreferences };
