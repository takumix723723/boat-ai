/**
 * UserPreferences — 将来 DB / API にそのままマッピング可能な形
 * @typedef {Object} FavoriteVenue
 * @property {string} venueCode - 競艇場コード "01"〜"24"
 * @property {string} venueName
 * @property {string} [addedAt]
 *
 * @typedef {Object} FavoriteRacer
 * @property {string} racerId - 登録番号
 * @property {string} name
 * @property {string} [addedAt]
 *
 * @typedef {Object} UserPreferences
 * @property {number} version
 * @property {FavoriteVenue[]} favoriteVenues
 * @property {FavoriteRacer[]} favoriteRacers
 * @property {string} updatedAt
 */

export const PREFERENCES_VERSION = 1;

/** @returns {UserPreferences} */
export function createDefaultPreferences() {
  return {
    version: PREFERENCES_VERSION,
    favoriteVenues: [],
    favoriteRacers: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * PreferencesProvider — localStorage / 将来 RemoteApiPreferencesAdapter
 * @typedef {Object} PreferencesProvider
 * @property {() => Promise<UserPreferences>} load
 * @property {(prefs: UserPreferences) => Promise<void>} save
 */

export const PREFERENCES_EVENT = 'boat-ai-preferences-updated';
