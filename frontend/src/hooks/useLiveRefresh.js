import { useCallback, useEffect, useRef, useState } from 'react';

/** 30〜60秒の中央値 */
export const LIVE_POLL_INTERVAL_MS = 45_000;

/**
 * 初回 load + 定期 refresh + 手動更新
 * @param {{ load: () => Promise<{ meta, races?, ranking? }>, refresh: () => Promise<{ meta, races?, ranking? }>, enabled?: boolean }} options
 */
export function useLiveRefresh({ load, refresh, enabled = true }) {
  const [meta, setMeta] = useState(null);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const mounted = useRef(true);

  const applyResult = useCallback((data) => {
    setMeta(data.meta ?? null);
    setPayload(data);
    setLastUpdated(new Date());
  }, []);

  const doRefresh = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        const data = await refresh();
        if (!mounted.current) return;
        applyResult(data);
        setError(null);
      } catch (e) {
        if (!mounted.current) return;
        if (!silent) setError(e.message);
      } finally {
        if (mounted.current) setRefreshing(false);
      }
    },
    [refresh, applyResult]
  );

  useEffect(() => {
    mounted.current = true;
    load()
      .then((data) => {
        if (!mounted.current) return;
        applyResult(data);
        setError(null);
      })
      .catch((e) => {
        if (!mounted.current) return;
        setError(e.message);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    return () => {
      mounted.current = false;
    };
  }, [load, applyResult]);

  useEffect(() => {
    if (!enabled || loading) return;
    const id = setInterval(() => doRefresh(true), LIVE_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, loading, doRefresh]);

  const manualRefresh = useCallback(() => doRefresh(false), [doRefresh]);

  return {
    meta,
    data: payload,
    payload,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh: manualRefresh,
    setData: applyResult,
    setError,
  };
}
