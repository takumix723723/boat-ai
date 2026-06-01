import { useEffect, useState } from 'react';
import { fetchRaceResult } from '../api/client';
import './RaceResultSection.css';

/**
 * @param {{ raceId: string, refreshKey?: string|number|null }} props
 */
export default function RaceResultSection({ raceId, refreshKey = null }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchRaceResult(raceId)
      .then((res) => {
        if (!cancelled) setData(res.result ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || '結果の取得に失敗しました');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [raceId, refreshKey]);

  if (loading) {
    return (
      <section className="race-result card">
        <h2 className="race-result-title">結果 / AI検証</h2>
        <p className="race-result-muted">読み込み中…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="race-result card">
        <h2 className="race-result-title">結果 / AI検証</h2>
        <p className="race-result-empty">{error}</p>
      </section>
    );
  }

  if (!data?.available) {
    return (
      <section className="race-result card">
        <h2 className="race-result-title">結果 / AI検証</h2>
        <p className="race-result-empty">
          {data?.message ?? 'レース結果はまだ取得できていません'}
        </p>
        <p className="race-result-hint">
          レース確定後、Open API（results）の更新を待つか、しばらくしてから再読み込みしてください。
        </p>
      </section>
    );
  }

  const { placements, aiVerification } = data;

  return (
    <section className="race-result card">
      <h2 className="race-result-title">結果 / AI検証</h2>
      <p className="race-result-sub">
        {data.source === 'mock' ? 'モック結果' : '公式着順（Open API）'}
        {data.savedToDb ? ' · DB保存済み' : ' · DB未保存'}
        {data.predictionCapturedAt
          ? ` · 予想基準 ${new Date(data.predictionCapturedAt).toLocaleString('ja-JP', {
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}`
          : ''}
      </p>

      {aiVerification?.summary && (
        <p
          className={`race-result-summary ${aiVerification.topAiGotWin ? 'race-result-summary--hit' : ''}`}
        >
          {aiVerification.summary}
        </p>
      )}

      <h3 className="race-result-h3">着順</h3>
      <div className="race-result-table-wrap">
        <table className="race-result-table">
          <thead>
            <tr>
              <th>着</th>
              <th>艇</th>
              <th>選手</th>
              <th>ST</th>
            </tr>
          </thead>
          <tbody>
            {placements.map((p) => (
              <tr key={p.place}>
                <td>{p.place}着</td>
                <td>{p.lane}号艇</td>
                <td>{p.name}</td>
                <td>
                  {p.startTiming != null ? Number(p.startTiming).toFixed(2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {aiVerification?.comparisons?.length > 0 && (
        <>
          <h3 className="race-result-h3">AI予想 vs 実着順</h3>
          <p className="race-result-hint">
            AI上位3艇のうち実際の3着以内: {aiVerification.top3HitCount} / 3
          </p>
          <div className="race-result-table-wrap">
            <table className="race-result-table">
              <thead>
                <tr>
                  <th>AI順</th>
                  <th>艇</th>
                  <th>選手</th>
                  <th>AI点</th>
                  <th>実着</th>
                </tr>
              </thead>
              <tbody>
                {aiVerification.comparisons.map((row) => (
                  <tr
                    key={row.lane}
                    className={row.hitWin ? 'race-result-row--win' : undefined}
                  >
                    <td>{row.aiRank}</td>
                    <td>{row.lane}号艇</td>
                    <td>{row.name}</td>
                    <td className="race-result-score">{row.aiTotal}</td>
                    <td>
                      {row.actualPlace != null ? `${row.actualPlace}着` : '—'}
                      {row.hitWin && (
                        <span className="race-result-badge">的中</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
