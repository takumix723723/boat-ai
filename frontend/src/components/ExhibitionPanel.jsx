import './ExhibitionPanel.css';

function fmtTime(t) {
  if (t == null) return '—';
  return t.toFixed(2);
}

function fmtSt(st) {
  if (st == null) return '—';
  return st.toFixed(2);
}

export default function ExhibitionPanel({ entries }) {
  const sorted = [...entries].sort((a, b) => a.lane - b.lane);
  const hasData = sorted.some((e) => e.exhibitionTime != null || e.st != null);

  return (
    <section className="exhibition-panel card">
      <h2 className="section-title">展示情報</h2>
      {!hasData ? (
        <p className="empty-hint">展示前 — 更新後にAI点数が再計算されます</p>
      ) : (
        <div className="exhibition-grid">
          {sorted.map((e) => (
            <div key={e.lane} className="exhibition-row">
              <span className={`lane-dot lane-${e.lane}`}>{e.lane}</span>
              <div className="exhibition-stats">
                <div>
                  <span className="stat-label">展示T</span>
                  <span className="stat-value">{fmtTime(e.exhibitionTime)}</span>
                </div>
                <div>
                  <span className="stat-label">ST</span>
                  <span className="stat-value">{fmtSt(e.st)}</span>
                </div>
                <div>
                  <span className="stat-label">チルト</span>
                  <span className="stat-value">
                    {e.tilt != null ? e.tilt : '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
