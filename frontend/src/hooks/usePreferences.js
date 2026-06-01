import { useCallback, useEffect, useState } from 'react';
import {
  getPreferencesService,
  PREFERENCES_EVENT,
} from '../services/preferences';

/**
 * @returns {{
 *   prefs: import('../services/preferences/types.js').UserPreferences | null,
 *   loading: boolean,
 *   favoriteVenueCodes: Set<string>,
 *   favoriteRacerIds: Set<string>,
 *   toggleVenue: (code: string, name: string) => Promise<void>,
 *   toggleRacer: (id: string, name: string) => Promise<void>,
 *   isFavoriteVenue: (code: string) => boolean,
 *   isFavoriteRacer: (id: string) => boolean,
 *   reload: () => Promise<void>,
 * }}
 */
export function usePreferences() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const service = getPreferencesService();
    const data = await service.getPreferences();
    setPrefs(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onUpdate = (e) => {
      if (e.detail) setPrefs(e.detail);
      else reload();
    };
    const onStorage = (e) => {
      if (e.key === 'boat-ai-user-preferences-v1') reload();
    };
    window.addEventListener(PREFERENCES_EVENT, onUpdate);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PREFERENCES_EVENT, onUpdate);
      window.removeEventListener('storage', onStorage);
    };
  }, [reload]);

  const favoriteVenueCodes = new Set(
    prefs?.favoriteVenues?.map((v) => v.venueCode) ?? []
  );
  const favoriteRacerIds = new Set(
    prefs?.favoriteRacers?.map((r) => r.racerId) ?? []
  );

  const toggleVenue = useCallback(async (venueCode, venueName) => {
    const service = getPreferencesService();
    const next = await service.toggleFavoriteVenue(venueCode, venueName);
    setPrefs(next);
  }, []);

  const toggleRacer = useCallback(async (racerId, name) => {
    const service = getPreferencesService();
    const next = await service.toggleFavoriteRacer(racerId, name);
    setPrefs(next);
  }, []);

  return {
    prefs,
    loading,
    favoriteVenueCodes,
    favoriteRacerIds,
    toggleVenue,
    toggleRacer,
    isFavoriteVenue: (code) => favoriteVenueCodes.has(code),
    isFavoriteRacer: (id) => favoriteRacerIds.has(id),
    reload,
  };
}
