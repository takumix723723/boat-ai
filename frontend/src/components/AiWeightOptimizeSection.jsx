import { useState } from 'react';
import {
  optimizeWeightProfiles,
  updateWeightProfiles,
} from '../api/client';
import './AiWeightOptimizeSection.css';

function formatPct(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}

function formatDelta(value) {
  if (value == null || Number.isNaN(value)) return '';
  const sign = value > 0 ? '+' : '';
  return ` (${sign}${Math.round(value)}pt)`;
}

export default function AiWeightOptimizeSection({ onSaved }) {
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [trials, setTrials] = useState(64);

  const runOptimize = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await optimizeWeightProfiles({ trials: Number(trials) || 64 });
      setResult(res.optimization ?? null);
    } catch (err) {
      setError(err.message || '最適化に失敗しました');
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  const handleSaveBest = async () => {
    const best = result?.bestProfile;
    if (!best?.weights) return;
    setSaving(true);
    setError(null);
    try {
      const name =
        best.suggestedSaveName ||
        `optimized-${Date.now().toString(36).slice(-6)}`;
      await updateWeightProfiles({
        name,
        label: best.label || '最適化候補',
        weights: best.weights,
        setActive: false,
      });
      onSaved?.();
    } catch (err) {
      setError(err.message || '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ai-optimize card">
      <h2 className="analytics-section-title">重み最適化</h2>
      <p className="analytics-hint">
        Train で探索 → Test で検証（ランダム 70/30 分割・4レース以上）。ML
        なし・自動反映なし。
      </p>

      <div className="ai-optimize-controls">
        <label>
          試行数
          <input
            type="number"
            min={16}
            max={100}
            step={8}
            value={trials}
            onChange={(e) => setTrials(e.target.value)}
            disabled={running}
          />
        </label>
        <button
          type="button"
          className="analytics-retry"
          onClick={runOptimize}
          disabled={running}
        >
          {running ? '探索中…' : '最適化を実行'}
        </button>
      </div>

      {error && <p className="analytics-empty">{error}</p>}

      {result && !running && (
        <div className="ai-optimize-results">
          {!result.available ? (
            <p className="analytics-empty">{result.message}</p>
          ) : result.analyzedRaces === 0 ? (
            <p className="analytics-empty">{result.message}</p>
          ) : (
            <>
              <p className="ai-optimize-meta">
                {result.method} · {result.uniqueCandidates} 案 ·{' '}
                {result.elapsedMs}ms · 全 {result.analyzedRaces} レース
                {result.splitCounts?.train != null &&
                  ` · Train ${result.splitCounts.train} / Test ${result.splitCounts.test}`}
              </p>

              {result.validation?.message && (
                <p className="analytics-hint">{result.validation.message}</p>
              )}

              {result.overfitWarning?.flagged && (
                <div className="ai-optimize-warn" role="alert">
                  <strong>過学習の可能性</strong>
                  <p>{result.overfitWarning.message}</p>
                </div>
              )}

              <div className="ai-optimize-compare ai-optimize-compare--triple">
                <div className="ai-optimize-box">
                  <span className="ai-optimize-box-label">Train Top1</span>
                  <span className="ai-optimize-box-value">
                    {formatPct(result.trainAccuracy?.aiTop1WinRate)}
                  </span>
                  <span className="ai-optimize-box-sub">探索データ</span>
                </div>
                <div className="ai-optimize-box ai-optimize-box--test">
                  <span className="ai-optimize-box-label">Test Top1</span>
                  <span className="ai-optimize-box-value">
                    {formatPct(result.testAccuracy?.aiTop1WinRate)}
                  </span>
                  <span className="ai-optimize-box-sub">未使用データ</span>
                </div>
                <div className="ai-optimize-box ai-optimize-box--best">
                  <span className="ai-optimize-box-label">現在→Train</span>
                  <span className="ai-optimize-box-value">
                    {formatPct(result.baselineOnSplit?.train?.aiTop1WinRate)}
                  </span>
                  <span className="ai-optimize-box-sub">稼働プロファイル</span>
                </div>
              </div>

              {result.splitRatio && (
                <p className="analytics-hint">
                  分割比率: Train {result.splitRatio.trainPercent}% / Test{' '}
                  {result.splitRatio.testPercent}%
                </p>
              )}

              <div className="analytics-table-wrap">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>候補</th>
                      <th>AI1位(Train)</th>
                      <th>Top3命中</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.testedProfiles?.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.label ?? row.name ?? `#${idx + 1}`}</td>
                        <td>{formatPct(row.aiTop1WinRate)}</td>
                        <td>{formatPct(row.aiTop3HitRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="analytics-retry ai-optimize-save"
                onClick={handleSaveBest}
                disabled={saving}
              >
                {saving ? '保存中…' : '最適候補をプロファイルとして保存（任意）'}
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
