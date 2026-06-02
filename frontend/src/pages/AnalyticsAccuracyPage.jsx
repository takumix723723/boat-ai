import { useEffect, useState } from 'react';
import { fetchAccuracyAnalytics } from '../api/client';
import PerformanceDashboard from '../components/PerformanceDashboard';
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

function LearningTab({ data, loading, error, onReload, weightsRefresh, onWeightsApplied }) {
  if (loading) {
    return <div className="loading">順位精度を集計中…</div>;
  }

  if (error) {
    return (
      <>
        <div className="error-box">{error}</div>
        <button type="button" className="analytics-retry" onClick={onReload}>
          再読み込み
        </button>
      </>
    );
  }

  if (!data?.available) {
    return (
      <>
        <p className="analytics-empty">
          {data?.message ?? '順位精度分析を利用できません'}
        </p>
        <p className="analytics-tab-note">
          こちらは「AI順位」と実着順の一致度です。買い目成績とは別指標です。
        </p>
        {data?.reason === 'database_unavailable' && (
          <p className="analytics-hint">
            バックエンドに DATABASE_URL を設定し、結果付きレースを DB
            保存してください。
          </p>
        )}
        <AiLearningSection />
        <button type="button" className="analytics-retry" onClick={onReload}>
          再読み込み
        </button>
      </>
    );
  }

  const hasData = (data.analyzedRaces ?? 0) > 0;

  return (
    <>
      <p className="analytics-tab-note">
        順位予測精度（AI1位勝率・Top3等）。買い目の的中率は「成績」タブを参照してください。
      </p>

      <AiLearningSection onApplied={onWeightsApplied} />
      <AiWeightOptimizeSection onSaved={onWeightsApplied} />
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

          {data.venueBreakdown?.length > 0 && (
            <section className="analytics-venues card">
              <h2 className="analytics-section-title">場別（順位精度）</h2>
              <div className="analytics-table-wrap">
                <table className="analytics-table analytics-table--venues">
                  <thead>
                    <tr>
                      <th>場</th>
                      <th>レース</th>
                      <th>1位勝率</th>
                      <th>Top3命中</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.venueBreakdown.map((v) => (
                      <tr key={v.venueCode}>
                        <td>{v.venueName}</td>
                        <td>{v.analyzedRaces}</td>
                        <td>{formatPct(v.aiTop1WinRate)}</td>
                        <td>{formatPct(v.aiTop3HitRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      <button type="button" className="analytics-retry" onClick={onReload}>
        再集計
      </button>
    </>
  );
}

export default function AnalyticsAccuracyPage() {
  const [tab, setTab] = useState('performance');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [weightsRefresh, setWeightsRefresh] = useState(0);

  const loadLearning = () => {
    setLoading(true);
    setError(null);
    fetchAccuracyAnalytics()
      .then((res) => setData(res.accuracy ?? null))
      .catch((err) => setError(err.message || '取得に失敗しました'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tab === 'learning') loadLearning();
  }, [tab]);

  return (
    <div className="page analytics-page">
      <h1 className="page-title">分析</h1>

      <div className="analytics-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'performance'}
          className={`analytics-tab-btn ${tab === 'performance' ? 'active' : ''}`}
          onClick={() => setTab('performance')}
        >
          成績
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'learning'}
          className={`analytics-tab-btn ${tab === 'learning' ? 'active' : ''}`}
          onClick={() => setTab('learning')}
        >
          学習
        </button>
      </div>

      {tab === 'performance' ? (
        <PerformanceDashboard />
      ) : (
        <LearningTab
          data={data}
          loading={loading}
          error={error}
          onReload={loadLearning}
          weightsRefresh={weightsRefresh}
          onWeightsApplied={() => setWeightsRefresh((k) => k + 1)}
        />
      )}
    </div>
  );
}
