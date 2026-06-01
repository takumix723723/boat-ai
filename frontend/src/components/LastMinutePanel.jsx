import { useState } from 'react';
import './LastMinutePanel.css';

const WIND_OPTIONS = ['', '向い風 2m', '追い風 3m', '逆風 1m', '無風'];
const WAVE_OPTIONS = ['', '静穏', 'やや高', '高波'];

export default function LastMinutePanel({ lastMinute, onUpdate, editable = true }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    weather: lastMinute?.weather ?? '',
    wind: lastMinute?.wind ?? '',
    wave: lastMinute?.wave ?? '',
    remark: lastMinute?.remark ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!onUpdate) return;
    setSaving(true);
    try {
      await onUpdate({
        weather: form.weather || null,
        wind: form.wind || null,
        wave: form.wave || null,
        remark: form.remark || null,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="last-minute card">
      <div className="lm-header">
        <h2 className="section-title">直前情報</h2>
        {editable && onUpdate && (
          <button
            type="button"
            className="lm-edit-btn"
            onClick={() => (editing ? handleSave() : setEditing(true))}
            disabled={saving}
          >
            {saving ? '更新中…' : editing ? '反映' : '編集'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="lm-form">
          <label>
            天候
            <input
              value={form.weather}
              onChange={(e) => setForm({ ...form, weather: e.target.value })}
              placeholder="晴"
            />
          </label>
          <label>
            風
            <select
              value={form.wind}
              onChange={(e) => setForm({ ...form, wind: e.target.value })}
            >
              {WIND_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w || '選択'}
                </option>
              ))}
            </select>
          </label>
          <label>
            波
            <select
              value={form.wave}
              onChange={(e) => setForm({ ...form, wave: e.target.value })}
            >
              {WAVE_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w || '選択'}
                </option>
              ))}
            </select>
          </label>
          <label>
            備考
            <input
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
              placeholder="水面状況など"
            />
          </label>
        </div>
      ) : (
        <dl className="lm-list">
          <div>
            <dt>天候</dt>
            <dd>{lastMinute?.weather ?? '—'}</dd>
          </div>
          <div>
            <dt>風</dt>
            <dd>{lastMinute?.wind ?? '—'}</dd>
          </div>
          <div>
            <dt>波</dt>
            <dd>{lastMinute?.wave ?? '—'}</dd>
          </div>
          <div>
            <dt>備考</dt>
            <dd>{lastMinute?.remark ?? '—'}</dd>
          </div>
        </dl>
      )}

      {lastMinute?.updatedAt && (
        <p className="lm-updated">
          更新: {new Date(lastMinute.updatedAt).toLocaleTimeString('ja-JP')}
        </p>
      )}
    </section>
  );
}
