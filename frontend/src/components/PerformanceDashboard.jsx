import { useCallback, useEffect, useState } from 'react';
import { fetchPredictionPerformance } from '../api/client';
import './PerformanceDashboard.css';

const PERIODS = [
  { id: 'today', label: '今日' },
  { id: '7d', label: '7日' },
  { id: 'all', label: '累計' },
];

function formatPct(rate) {
  if (rate == null || Number.isNaN(rate)) return '—';
  return `${rate}%`;
}

function StatCard({ title, emoji, metric, sub }) {
  const { hits, total, rate } = metric ?? {};
  const bar =
    rate != null ? Math.min(100, Math.max(0, rate)) : 0;

  return (
    <article className="perf-card">
      <div className="perf-card-head">
        <span className="perf-card-title">
          {emoji} {title}
        </span>
        <span className="perf-card-rate">{formatPct(rate)}</span>
      </div>
      <p className="perf-card-count">
        <strong>
          {hits ?? 0}/{total ?? 0}
        </strong>{' '}
        的中
      </p>
      <div className="perf-bar" aria-hidden>
        <div className="perf-bar-fill" style={{ width: `${bar}%` }} />
      </div>
      {sub && <p className="perf-card-sub">{sub}</p>}
    </article>
  );
}

export default function PerformanceDashboard() {
  const [period, setPeriod] = useState('today');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchPredictionPerformance(period)
      .then((res) => setData(res.performance ?? null))
      .catch((err) => setError(err.message || '取得に失敗'))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <p className="perf-loading">成績を集計中…</p>;
  }

  if (error) {
    return (
      <div className="perf-error">
        <p>{error}</p>
        <button type="button" className="analytics-retry" onClick={load}>
          再読み込み
        </button>
      </div>
    );
  }

  if (!data?.available) {
    return (
      <div className="perf-empty">
        <p>{data?.message ?? '成績を表示できません'}</p>
        {data?.reason === 'database_unavailable' && (
          <p className="analytics-hint">
            DATABASE_URL と PERSIST_SNAPSHOTS=true で refresh すると蓄積されます。
          </p>
        )}
      </div>
    );
  }

  const s = data.summary ?? {};

  return (
    <div className="performance-dashboard">
      <div className="perf-period" role="tablist" aria-label="集計期間">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={period === p.id}
            className={`perf-period-btn ${period === p.id ? 'active' : ''}`}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="perf-hero card">
        <p className="perf-hero-question">今日はAI調子いい？</p>
        <p className="perf-hero-line">
          {data.headline ?? '—'}
        </p>
        <p className="perf-hero-sub">
          {data.periodLabel} · {data.scopeLabel ?? '全予想'} · 検証用
        </p>
      </div>

      <div className="perf-grid">
        <StatCard title="単勝AI本命" emoji="◎" metric={s.honmeiWin} />
        <StatCard title="本命3連単" emoji="🔥" metric={s.honmeiTrifecta} />
        <StatCard
          title="フォーメーション"
          emoji="📊"
          metric={s.formation}
          sub={
            s.formation?.avgPoints != null
              ? `平均 ${s.formation.avgPoints}点 · 回収率${s.formation.roiLabel ?? '未対応'}`
              : null
          }
        />
        <StatCard
          title="BOX（3艇）"
          emoji="🎲"
          metric={s.box}
          sub={
            s.box?.avgPoints != null
              ? `平均 ${s.box.avgPoints}点 · 2艇以下は参考${data.boxReferenceOnly ?? 0}件`
              : `2艇以下参考 ${data.boxReferenceOnly ?? 0}件`
          }
        />
        <StatCard title="穴狙い" emoji="💥" metric={s.ana} />
      </div>

      {(data.pendingCount ?? 0) > 0 && (
        <p className="perf-pending">結果待ち {data.pendingCount}レース</p>
      )}

      {data.byConfidence?.length > 0 && (
        <section className="perf-section card">
          <h2 className="analytics-section-title">自信度別（本命1着）</h2>
          <ul className="perf-conf-list">
            {data.byConfidence.map((c) => (
              <li key={c.tier}>
                <span>{c.label}</span>
                <span>
                  {c.honmeiWin?.hits}/{c.honmeiWin?.total}{' '}
                  {formatPct(c.honmeiWin?.rate)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.byVenue?.length > 0 && (
        <section className="perf-section card">
          <h2 className="analytics-section-title">場別</h2>
          <div className="analytics-table-wrap">
            <table className="analytics-table analytics-table--venues">
              <thead>
                <tr>
                  <th>場</th>
                  <th>本命</th>
                  <th>フォーメ</th>
                  <th>BOX</th>
                </tr>
              </thead>
              <tbody>
                {data.byVenue.map((v) => (
                  <tr key={v.venueCode}>
                    <td>{v.venueName}</td>
                    <td>
                      {v.honmeiWin?.hits}/{v.honmeiWin?.total}{' '}
                      {formatPct(v.honmeiWinRate)}
                    </td>
                    <td>
                      {v.formation?.hits}/{v.formation?.total}{' '}
                      {formatPct(v.formationRate)}
                    </td>
                    <td>
                      {v.box?.hits}/{v.box?.total} {formatPct(v.boxRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="perf-disclaimer">{data.disclaimer}</p>

      <button type="button" className="analytics-retry" onClick={load}>
        再集計
      </button>
    </div>
  );
}
