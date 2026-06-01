import { useEffect, useState } from 'react';
import { fetchWeightProfiles, updateWeightProfiles } from '../api/client';
import './AiWeightsSection.css';

const FACTOR_KEYS = [
  'st',
  'exhibitionTime',
  'lane',
  'motor',
  'course',
  'lastMinute',
];

function formatPct(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value)}%`;
}

function emptyForm(labels) {
  return {
    name: '',
    label: '',
    setActive: false,
    weights: Object.fromEntries(FACTOR_KEYS.map((k) => [k, '0.2'])),
  };
}

export default function AiWeightsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchWeightProfiles()
      .then((res) => {
        const w = res.weights ?? null;
        setData(w);
        const active = w?.activeProfile;
        if (active) {
          setForm({
            id: active.id,
            name: active.name,
            label: active.label,
            setActive: true,
            weights: { ...active.weights },
          });
        } else {
          setForm(emptyForm(w?.factorLabels));
        }
      })
      .catch((err) => setError(err.message || '取得に失敗'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const weights = {};
      for (const key of FACTOR_KEYS) {
        weights[key] = Number(form.weights[key]);
      }
      await updateWeightProfiles({
        id: form.id || undefined,
        name: form.name || undefined,
        label: form.label,
        weights,
        setActive: form.setActive,
      });
      load();
    } catch (err) {
      setError(err.message || '保存に失敗');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="ai-weights card">
        <h2 className="analytics-section-title">AI重み</h2>
        <p className="analytics-hint">読み込み中…</p>
      </section>
    );
  }

  if (!data?.available) {
    return (
      <section className="ai-weights card">
        <h2 className="analytics-section-title">AI重み</h2>
        <p className="analytics-empty">{data?.message ?? '利用できません'}</p>
      </section>
    );
  }

  const labels = data.factorLabels ?? {};

  return (
    <section className="ai-weights card">
      <h2 className="analytics-section-title">AI重み</h2>
      <p className="analytics-hint">
        各因子スコア（0–100）の重み付き平均で総合点を算出。保存後の Live
        採点に反映（MLなし）。
      </p>

      {error && <p className="analytics-empty">{error}</p>}

      {data.simulations?.length > 0 && (
        <>
          <h3 className="ai-weights-h3">精度シミュレーション</h3>
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>プロファイル</th>
                  <th>AI1位勝率</th>
                  <th>Top3命中</th>
                  <th>レース数</th>
                </tr>
              </thead>
              <tbody>
                {data.simulations.map((s) => (
                  <tr
                    key={s.profileId}
                    className={s.isActive ? 'ai-weights-row--active' : undefined}
                  >
                    <td>
                      {s.label}
                      {s.isActive && (
                        <span className="ai-weights-badge">稼働中</span>
                      )}
                    </td>
                    <td>{formatPct(s.aiTop1WinRate)}</td>
                    <td>{formatPct(s.aiTop3HitRate)}</td>
                    <td>{s.analyzedRaces}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {form && (
        <form className="ai-weights-form" onSubmit={handleSave}>
          <h3 className="ai-weights-h3">重み編集</h3>
          <div className="ai-weights-fields">
            <label>
              識別名（英数字）
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="profile-b"
                disabled={Boolean(form.id && form.name === 'default')}
              />
            </label>
            <label>
              表示名
              <input
                type="text"
                value={form.label}
                onChange={(e) =>
                  setForm({ ...form, label: e.target.value })
                }
              />
            </label>
          </div>
          <div className="ai-weights-grid">
            {FACTOR_KEYS.map((key) => (
              <label key={key}>
                {labels[key] ?? key}
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={form.weights[key]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      weights: {
                        ...form.weights,
                        [key]: e.target.value,
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
          <label className="ai-weights-check">
            <input
              type="checkbox"
              checked={form.setActive}
              onChange={(e) =>
                setForm({ ...form, setActive: e.target.checked })
              }
            />
            Live採点の稼働プロファイルにする
          </label>
          <button type="submit" className="analytics-retry" disabled={saving}>
            {saving ? '保存中…' : '重みを保存'}
          </button>
        </form>
      )}

      {data.profiles?.length > 0 && (
        <details className="analytics-formulas">
          <summary>登録プロファイル一覧</summary>
          <ul>
            {data.profiles.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="ai-weights-link"
                  onClick={() =>
                    setForm({
                      id: p.id,
                      name: p.name,
                      label: p.label,
                      setActive: p.isActive,
                      weights: { ...p.weights },
                    })
                  }
                >
                  {p.label} ({p.name})
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
