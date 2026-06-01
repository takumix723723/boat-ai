import { useEffect, useState } from 'react';
import { fetchAccuracyAnalytics } from '../api/client';
import AiWeightsSection from '../components/AiWeightsSection';
import AiWeightOptimizeSection from '../components/AiWeightOptimizeSection';
import AiLearningSection from '../components/AiLearningSection';
import './AnalyticsAccuracyPage.css';

function formatPct(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}

function formatNum(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return '—';
  return Number(value).toFixed(digits);
}

export default function AnalyticsAccuracyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [weightsRefresh, setWeightsRefresh] = useState(0);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchAccuracyAnalytics()
      .then((res) => setData(res.accuracy ?? null))
      .catch((err) => setError(err.message || '取得に失敗しました'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="page loading">AI精度を集計中…</div>;
  }

  if (error) {
    return (
      <div className="page analytics-page">
        <h1 className="page-title">AI精度</h1>
        <div className="error-box">{error}</div>
        <button type="button" className="analytics-retry" onClick={load}>
          再読み込み
        </button>
      </div>
    );
  }

  if (!data?.available) {
    return (
      <div className="page analytics-page">
        <h1 className="page-title">AI精度</h1>
        <p className="analytics-empty">
          {data?.message ?? '精度分析を利用できません'}
        </p>
        {data?.reason === 'database_unavailable' && (
          <p className="analytics-hint">
            バックエンドに DATABASE_URL を設定し、結果付きレースを DB
            保存してください。
          </p>
        )}
        <AiLearningSection />
        <button type="button" className="analytics-retry" onClick={load}>
          再読み込み
        </button>
      </div>
    );
  }

  const hasData = (data.analyzedRaces ?? 0) > 0;

  return (
    <div className="page analytics-page">
      <h1 className="page-title">AI精度</h1>
      <p className="page-sub">
        DB保存済みの結果とスナップショットから集計 · 重みプロファイルで精度比較
      </p>

      <AiLearningSection onApplied={() => setWeightsRefresh((k) => k + 1)} />

      <AiWeightOptimizeSection onSaved={() => setWeightsRefresh((k) => k + 1)} />

      <AiWeightsSection key={weightsRefresh} />

      {!hasData ? (
        <>
          <p className="analytics-empty">
            {data.message ?? '分析対象のレースがありません'}
          </p>
          <p className="analytics-hint">
            PERSIST_SNAPSHOTS=true で refresh し、レース結果が入った後に再度開いてください。
          </p>
        </>
      ) : (
        <>
          <div className="analytics-kpi card">
            <div className="analytics-kpi-item">
              <span className="analytics-kpi-label">AI1位勝率</span>
              <span className="analytics-kpi-value">
                {formatPct(data.aiTop1WinRate)}
              </span>
              <span className="analytics-kpi-sub">
                {data.aiTop1Wins} / {data.analyzedRaces} レース
              </span>
            </div>
            <div className="analytics-kpi-item">
              <span className="analytics-kpi-label">Top3命中率</span>
              <span className="analytics-kpi-value">
                {formatPct(data.aiTop3HitRate)}
              </span>
              <span className="analytics-kpi-sub">
                実1着がAI上位3に含まれる · {data.aiTop3WinnerHits} /{' '}
                {data.analyzedRaces}
              </span>
            </div>
            <div className="analytics-kpi-item">
              <span className="analytics-kpi-label">Top3着内平均</span>
              <span className="analytics-kpi-value">
                {formatNum(data.top3HitAverage, 2)}
              </span>
              <span className="analytics-kpi-sub">0〜3（AI上位3のうち実3着内）</span>
            </div>
            <div className="analytics-kpi-item">
              <span className="analytics-kpi-label">順位差平均</span>
              <span className="analytics-kpi-value">
                {formatNum(data.rankDiffAverage, 2)}
              </span>
              <span className="analytics-kpi-sub">|AI順位−実着順| が小さいほど良</span>
            </div>
          </div>

          <div className="analytics-summary card">
            <table className="analytics-table">
              <tbody>
                <tr>
                  <th>分析レース数</th>
                  <td>{data.analyzedRaces}</td>
                </tr>
                <tr>
                  <th>分析艇数</th>
                  <td>{data.analyzedEntries}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {data.venueBreakdown?.length > 0 && (
            <section className="analytics-venues card">
              <h2 className="analytics-section-title">場別</h2>
              <div className="analytics-table-wrap">
                <table className="analytics-table analytics-table--venues">
                  <thead>
                    <tr>
                      <th>場</th>
                      <th>レース</th>
                      <th>1位勝率</th>
                      <th>Top3命中</th>
                      <th>Top3着内</th>
                      <th>順位差</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.venueBreakdown.map((v) => (
                      <tr key={v.venueCode}>
                        <td>{v.venueName}</td>
                        <td>{v.analyzedRaces}</td>
                        <td>{formatPct(v.aiTop1WinRate)}</td>
                        <td>{formatPct(v.aiTop3HitRate)}</td>
                        <td>{formatNum(v.top3HitAverage, 2)}</td>
                        <td>{formatNum(v.rankDiffAverage, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {data.formulas && (
            <details className="analytics-formulas">
              <summary>計算式</summary>
              <ul>
                <li>
                  <strong>AI1位勝率:</strong> {data.formulas.aiTop1WinRate}
                </li>
                <li>
                  <strong>Top3命中率:</strong> {data.formulas.aiTop3HitRate}
                </li>
                <li>
                  <strong>Top3着内平均:</strong> {data.formulas.top3HitAverage}
                </li>
                <li>
                  <strong>順位差平均:</strong> {data.formulas.rankDiffAverage}
                </li>
              </ul>
            </details>
          )}
        </>
      )}

      <button type="button" className="analytics-retry" onClick={load}>
        再集計
      </button>
    </div>
  );
}
