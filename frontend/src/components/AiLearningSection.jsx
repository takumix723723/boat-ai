import { useCallback, useEffect, useState } from 'react';
import {
  applyLearningRun,
  fetchLearningRuns,
  fetchLearningStatus,
  runAutoLearning,
} from '../api/client';
import './AiLearningSection.css';

function formatPct(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}

function formatPt(value) {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(1)}pt`;
}

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const MODE_LABELS = {
  manual: '手動のみ',
  suggest: '候補提案（推奨）',
  auto: '改善時自動採用',
};

const STATUS_LABELS = {
  pending: '候補',
  applied: '採用済',
  skipped: 'スキップ',
  failed: '失敗',
};

export default function AiLearningSection({ onApplied }) {
  const [status, setStatus] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [st, rn] = await Promise.all([
        fetchLearningStatus(),
        fetchLearningRuns(10),
      ]);
      setStatus(st.status ?? null);
      setRuns(rn.runs ?? []);
    } catch (err) {
      setError(err.message || '取得失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRun = async (force = false) => {
    setRunning(true);
    setError(null);
    try {
      await runAutoLearning({ force });
      await load();
      onApplied?.();
    } catch (err) {
      setError(err.message || '学習実行に失敗');
    } finally {
      setRunning(false);
    }
  };

  const handleApply = async (runId) => {
    setApplyingId(runId);
    setError(null);
    try {
      await applyLearningRun(runId);
      await load();
      onApplied?.();
    } catch (err) {
      setError(err.message || '採用に失敗');
    } finally {
      setApplyingId(null);
    }
  };

  if (loading && !status) {
    return (
      <section className="ai-learning card">
        <p className="analytics-hint">AI成長データを読み込み中…</p>
      </section>
    );
  }

  const last = status?.lastRun;
  const policy = status?.policy;

  return (
    <section className="ai-learning card">
      <h2 className="analytics-section-title">AI成長 / Learning</h2>
      <p className="analytics-hint">
        過去結果から重みを自動探索 · 本格MLなし · Push未実装
      </p>

      {!status?.available && (
        <p className="analytics-empty">
          {status?.message ?? '自動学習は利用できません'}
        </p>
      )}

      {status?.available && (
        <>
          <div className="ai-learning-kpi">
            <div className="ai-learning-kpi-item">
              <span className="label">現在モード</span>
              <span className="value">
                {MODE_LABELS[status.mode] ?? status.mode}
              </span>
            </div>
            <div className="ai-learning-kpi-item">
              <span className="label">最終学習</span>
              <span className="value">{formatWhen(last?.runAt)}</span>
            </div>
            <div className="ai-learning-kpi-item">
              <span className="label">改善幅</span>
              <span className="value">
                {last ? formatPt(last.improvement) : '—'}
              </span>
              <span className="sub">
                {last
                  ? `1位勝率 ${formatPct(last.baselineAccuracy?.aiTop1WinRate)} → ${formatPct(last.optimizedAccuracy?.aiTop1WinRate)}`
                  : 'まだ実行なし'}
              </span>
            </div>
            <div className="ai-learning-kpi-item">
              <span className="label">候補待ち</span>
              <span className="value">{status.pendingCount ?? 0}</span>
            </div>
          </div>

          <p className="ai-learning-scheduler">{status.schedulerNote}</p>

          <div className="ai-learning-actions">
            <button
              type="button"
              className="ai-learning-run-btn"
              disabled={running}
              onClick={() => handleRun(false)}
            >
              {running ? '学習中…' : '学習を実行'}
            </button>
            <button
              type="button"
              className="ai-learning-run-btn secondary"
              disabled={running}
              onClick={() => handleRun(true)}
            >
              強制実行
            </button>
          </div>

          {policy && (
            <p className="analytics-hint ai-learning-policy">
              閾値: 改善≥+{policy.minImprovementPt}pt · レース≥
              {policy.minRaces} · 試行{policy.autoTrials} · クールダウン
              {policy.cooldownHours}h
            </p>
          )}
        </>
      )}

      {error && <p className="ai-learning-error">{error}</p>}

      {runs.length > 0 && (
        <div className="ai-learning-history">
          <h3 className="ai-learning-history-title">学習履歴</h3>
          <ul className="ai-learning-run-list">
            {runs.map((run) => (
              <li key={run.id} className={`ai-learning-run ai-learning-run--${run.status}`}>
                <div className="ai-learning-run-head">
                  <span className="ai-learning-run-status">
                    {STATUS_LABELS[run.status] ?? run.status}
                  </span>
                  <span className="ai-learning-run-time">
                    {formatWhen(run.runAt)}
                  </span>
                </div>
                <p className="ai-learning-run-msg">{run.message || '—'}</p>
                <p className="ai-learning-run-meta">
                  {run.triggerSource} · {run.raceCount}レース ·{' '}
                  {formatPt(run.improvement)}
                  {run.overfitFlagged && ' · 過学習注意'}
                </p>
                {run.status === 'pending' && !run.applied && (
                  <button
                    type="button"
                    className="ai-learning-apply-btn"
                    disabled={applyingId === run.id}
                    onClick={() => handleApply(run.id)}
                  >
                    {applyingId === run.id ? '採用中…' : '候補を採用'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" className="analytics-retry subtle" onClick={load}>
        履歴を更新
      </button>
    </section>
  );
}
