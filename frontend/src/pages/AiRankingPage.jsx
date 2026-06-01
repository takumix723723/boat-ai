import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRanking, refreshRaces } from '../api/client';
import DataSourceBanner from '../components/DataSourceBanner';
import TopReasons from '../components/TopReasons';
import ScoreDeltaBadge from '../components/ScoreDeltaBadge';
import FavoriteButton from '../components/FavoriteButton';
import { useLiveRefresh, LIVE_POLL_INTERVAL_MS } from '../hooks/useLiveRefresh';
import { usePreferences } from '../hooks/usePreferences';
import './AiRankingPage.css';

export default function AiRankingPage() {
  const [racerFilter, setRacerFilter] = useState('all');
  const { favoriteRacerIds, toggleRacer, isFavoriteRacer } = usePreferences();

  const loadRanking = useCallback(() => fetchRanking(50), []);

  const refreshRanking = useCallback(async () => {
    await refreshRaces();
    return fetchRanking(50);
  }, []);

  const { meta, data, loading, refreshing, error, lastUpdated, refresh } =
    useLiveRefresh({
      load: loadRanking,
      refresh: refreshRanking,
    });

  const ranking = data?.ranking ?? [];

  const displayed = useMemo(() => {
    if (racerFilter !== 'favorites') return ranking;
    return ranking.filter((item) => favoriteRacerIds.has(item.racerId));
  }, [ranking, racerFilter, favoriteRacerIds]);

  if (loading && ranking.length === 0) {
    return <div className="page loading">AIランキング集計中…</div>;
  }
  if (error && ranking.length === 0) {
    return <div className="page error-box">{error}</div>;
  }

  return (
    <div className="page ranking-page">
      <h1 className="page-title">AIランキング</h1>
      <p className="page-sub">
        本日の高評価艇 · {LIVE_POLL_INTERVAL_MS / 1000}秒ごとに更新
      </p>

      <DataSourceBanner
        meta={meta}
        onRefresh={refresh}
        refreshing={refreshing}
        lastUpdated={lastUpdated}
      />

      {refreshing && (
        <div className="live-refresh-bar" aria-live="polite">
          <span className="data-banner-spinner" />
          再採点しています…
        </div>
      )}

      <div className="ranking-filter" role="tablist" aria-label="選手フィルタ">
        <button
          type="button"
          role="tab"
          aria-selected={racerFilter === 'all'}
          className={`ranking-filter-chip ${racerFilter === 'all' ? 'active' : ''}`}
          onClick={() => setRacerFilter('all')}
        >
          すべて
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={racerFilter === 'favorites'}
          className={`ranking-filter-chip ${racerFilter === 'favorites' ? 'active' : ''}`}
          onClick={() => setRacerFilter('favorites')}
        >
          ❤️ お気に入り
          {favoriteRacerIds.size > 0 && (
            <span className="ranking-filter-count">{favoriteRacerIds.size}</span>
          )}
        </button>
      </div>

      <ol className="ranking-list">
        {displayed.map((item, index) => {
          const racerFav = isFavoriteRacer(item.racerId);
          return (
            <li key={`${item.raceId}-${item.lane}`}>
              <Link
                to={`/race/${item.raceId}`}
                className={`ranking-item ${index < 3 && racerFilter === 'all' ? `rank-${index + 1}` : ''} ${racerFav ? 'is-fav-racer' : ''}`}
              >
                <div className="ranking-rank">
                  {racerFilter === 'favorites' ? '❤️' : index + 1}
                </div>
                <div className={`lane-dot lane-${item.lane}`}>{item.lane}</div>
                <div className="ranking-body">
                  <div className="ranking-head">
                    <span className="ranking-name">{item.name}</span>
                    <div className="ranking-head-actions">
                      <FavoriteButton
                        kind="racer"
                        size="sm"
                        active={racerFav}
                        onToggle={() => toggleRacer(item.racerId, item.name)}
                      />
                      <div className="ranking-score-col">
                        <span className="ranking-score">{item.aiTotal}</span>
                        {item.scoreDelta && (
                          <ScoreDeltaBadge delta={item.scoreDelta} size="sm" />
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="ranking-meta">
                    {item.venueName} {item.raceNo}R · {item.rank} · {item.branch}
                  </p>
                  <TopReasons reasons={item.topReasons} compact />
                </div>
                <span className="chevron">›</span>
              </Link>
            </li>
          );
        })}
      </ol>

      {displayed.length === 0 && !loading && (
        <p className="empty-list">
          {racerFilter === 'favorites'
            ? 'お気に入り選手がランキングにいません。❤️をタップして登録してください。'
            : 'ランキングデータがありません'}
        </p>
      )}
    </div>
  );
}
