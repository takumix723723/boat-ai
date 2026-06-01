import { useEffect, useState } from 'react';
import { fetchRaceResult } from '../api/client';
import RaceInfoHeader from './RaceInfoHeader';
import {
  isResultDisplayable,
  RESULT_PENDING_MESSAGE,
} from '../utils/raceResultDisplay';
import './RaceResultSection.css';
import './RaceInfoHeader.css';

/**
 * @param {{ raceId: string, race?: object|null, meta?: object|null, refreshKey?: string|number|null }} props
 */
export default function RaceResultSection({
  raceId,
  race = null,
  meta = null,
  refreshKey = null,
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [resultMeta, setResultMeta] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchRaceResult(raceId)
      .then((res) => {
        if (!cancelled) {
          setData(res.result ?? null);
          setResultMeta(res.meta ?? meta ?? null);
        }
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
  }, [raceId, refreshKey, meta]);

  const displayMeta = resultMeta ?? meta;
  const showResults = isResultDisplayable(data, displayMeta);

  if (loading) {
    return (
      <section className="race-result card">
        <RaceInfoHeader
          race={race}
          meta={meta}
          sectionTitle="結果 / AI検証"
        />
        <p className="race-result-muted">読み込み中…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="race-result card">
        <RaceInfoHeader
          race={race}
          meta={meta}
          sectionTitle="結果 / AI検証"
        />
        <p className="race-result-empty">{error}</p>
      </section>
    );
  }

  if (!showResults) {
    return (
      <section className="race-result card">
        <RaceInfoHeader
          race={race}
          meta={meta}
          sectionTitle="結果 / AI検証"
        />
        <p className="race-result-empty race-result-pending">
          {data?.message ?? RESULT_PENDING_MESSAGE}
        </p>
        <p className="race-result-hint">
          公式着順はレース終了後、Open API（results）に結果が載った時点で表示します。
        </p>
      </section>
    );
  }

  const { placements, aiVerification } = data;

  return (
    <section className="race-result card">
      <RaceInfoHeader
        race={race}
        meta={meta}
        sectionTitle="結果 / AI検証"
      />
      <p className="race-result-sub">
        公式着順（Open API）
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
                    className={
                      row.hitWin ? 'race-result-row--hit hit-row' : undefined
                    }
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
