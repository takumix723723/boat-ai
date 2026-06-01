import { useEffect, useState } from 'react';
import { fetchRacerIntelligence } from '../api/client';
import './RacerIntelligenceModal.css';

function formatPct(v) {
  if (v == null || Number.isNaN(v)) return '—';
  return `${v}%`;
}

/**
 * @param {{ racerId: string, name: string, onClose: () => void }} props
 */
export default function RacerIntelligenceModal({ racerId, name, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchRacerIntelligence(racerId)
      .then(setData)
      .catch((err) => setError(err.message || '取得失敗'))
      .finally(() => setLoading(false));
  }, [racerId]);

  const intel = data?.intelligence;
  const m = intel?.metrics;

  return (
    <div className="racer-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="racer-modal card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="racer-modal-title"
      >
        <header className="racer-modal-head">
          <div>
            <h2 id="racer-modal-title" className="racer-modal-title">
              選手カルテ
            </h2>
            <p className="racer-modal-sub">
              {data?.profile?.name ?? name} · {racerId}
            </p>
          </div>
          <button type="button" className="racer-modal-close" onClick={onClose}>
            ✕
          </button>
        </header>

        {loading && <p className="racer-modal-muted">集計中…</p>}
        {error && <p className="racer-modal-error">{error}</p>}

        {!loading && !error && intel && (
          <>
            {(intel.insufficientData || data?.insufficientData) && (
              <p className="racer-modal-warn">
                {data?.message ?? intel.confidence?.message}
              </p>
            )}
            {m && (
              <>
                <p className="racer-modal-confidence">
                  信頼度: {intel.confidence?.level} — {intel.confidence?.message}
                  （{m?.sampleCount}レース）
                </p>

                {intel.tags?.length > 0 && (
                  <div className="racer-modal-tags">
                    {intel.tags.map((t) => (
                      <span
                        key={t.id}
                        className={`racer-tag racer-tag--${t.tone ?? 'muted'}`}
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="racer-modal-grid">
                  <div className="racer-modal-stat">
                    <span className="label">ST平均</span>
                    <span className="value">{m?.avgSt ?? '—'}</span>
                  </div>
                  <div className="racer-modal-stat">
                    <span className="label">イン信頼度</span>
                    <span className="value">{intel.innerTrust?.label}</span>
                    <span className="sub">
                      1コース勝率 {formatPct(m?.innerWinRate)}
                    </span>
                  </div>
                  <div className="racer-modal-stat">
                    <span className="label">AI相性</span>
                    <span className="value">{intel.aiCompatibility?.label}</span>
                    <span className="sub">
                      AI1位的中 {formatPct(m?.aiTop1HitRate)}
                    </span>
                  </div>
                  <div className="racer-modal-stat">
                    <span className="label">最近傾向</span>
                    <span className="value">
                      {intel.recentTrend?.label ?? '—'}
                    </span>
                    <span className="sub">
                      近{m?.sampleCount != null ? Math.min(5, m.sampleCount) : '—'}
                      走 平均着 {intel.recentTrend?.avgPlace ?? '—'}
                    </span>
                  </div>
                </div>

                <table className="racer-modal-table">
                  <tbody>
                    <tr>
                      <th>1着率</th>
                      <td>{formatPct(m?.winRate)}</td>
                    </tr>
                    <tr>
                      <th>連対率</th>
                      <td>{formatPct(m?.placeRate)}</td>
                    </tr>
                    <tr>
                      <th>AI Top3率</th>
                      <td>{formatPct(m?.aiTop3HitRate)}</td>
                    </tr>
                  </tbody>
                </table>

                {m?.byLane?.length > 0 && (
                  <>
                    <h3 className="racer-modal-h3">コース別</h3>
                    <table className="racer-modal-table racer-modal-table--lanes">
                      <thead>
                        <tr>
                          <th>枠</th>
                          <th>出走</th>
                          <th>1着</th>
                          <th>勝率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.byLane.map((row) => (
                          <tr key={row.lane}>
                            <td>{row.lane}</td>
                            <td>{row.starts}</td>
                            <td>{row.wins}</td>
                            <td>{formatPct(row.winRate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}
          </>
        )}

        {!loading && !error && !intel && (
          <p className="racer-modal-muted">{data?.message ?? 'データなし'}</p>
        )}
      </div>
    </div>
  );
}
