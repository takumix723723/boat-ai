import { formatMotorDisplay } from '../utils/motorDisplay';
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
              <th>モーター号機</th>
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
                  <span className="motor-display">{formatMotorDisplay(e.motor)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
