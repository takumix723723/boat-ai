import './DataSourceBanner.css';

export default function DataSourceBanner({
  meta,
  onRefresh,
  refreshing,
  lastUpdated,
  showLiveNotice = true,
}) {
  if (!meta) return null;

  const isLive = meta.dataSource === 'live' && !meta.liveFetchFailed;
  const isMock = meta.dataSource === 'mock' || meta.liveFetchFailed;
  const isStale = meta.isStale === true;

  const fetched = meta.fetchedAt
    ? new Date(meta.fetchedAt).toLocaleTimeString('ja-JP')
    : '—';
  const clientUpdated = lastUpdated
    ? lastUpdated.toLocaleTimeString('ja-JP')
    : null;

  return (
    <div
      className={`data-banner ${isMock ? 'mock' : isStale ? 'stale' : 'live'}`}
    >
      <div className="data-banner-row">
        <div className="data-banner-main">
          <span className="data-banner-tag">
            {isMock ? 'モック' : isStale ? '実データ(キャッシュ)' : '実データ'}
          </span>
          {refreshing && (
            <span className="data-banner-spinner" aria-label="更新中" />
          )}
          <span className="data-banner-text">
            {meta.sourceProvider}
            {meta.raceDate ? ` · ${meta.raceDate}` : ''}
          </span>
        </div>
        {onRefresh && (
          <button
            type="button"
            className="data-banner-refresh"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? '更新中…' : '再取得'}
          </button>
        )}
      </div>

      <div className="data-banner-sub">
        <span>最終更新 {clientUpdated ?? fetched}</span>
        {meta.fetchedAt && clientUpdated && clientUpdated !== fetched && (
          <span> · 取得 {fetched}</span>
        )}
        {meta.programsCount != null && (
          <span> · {meta.programsCount}レース</span>
        )}
      </div>

      {meta.liveFetchFailed && meta.fallbackReason && (
        <p className="data-banner-fallback" role="alert">
          {meta.fallbackReason}
        </p>
      )}

      {isStale && meta.fallbackReason && !meta.liveFetchFailed && (
        <p className="data-banner-stale" role="status">
          {meta.fallbackReason}
        </p>
      )}

      {showLiveNotice && (
        <p className="data-banner-notice">
          {meta.liveNotice ??
            'データは最大30分程度遅れる場合があります'}
        </p>
      )}
    </div>
  );
}
