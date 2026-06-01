import './EntryTable.css';

export default function EntryTable({ entries }) {
  const sorted = [...entries].sort((a, b) => a.lane - b.lane);

  return (
    <section className="entry-table card">
      <h2 className="section-title">出走表</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>枠</th>
              <th>選手</th>
              <th>級</th>
              <th>支部</th>
              <th>モーター</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => (
              <tr key={e.lane}>
                <td>
                  <span className={`lane-dot lane-${e.lane}`}>{e.lane}</span>
                </td>
                <td className="name-cell">{e.name}</td>
                <td>{e.rank}</td>
                <td>{e.branch}</td>
                <td className="motor-cell">
                  {e.motor?.score != null ? (
                    <span className="motor-score">{e.motor.score}</span>
                  ) : e.motor?.rate2nd != null ? (
                    <span className="motor-rate">{e.motor.rate2nd}%</span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
