import { useEffect, useState } from 'react';
import {
  parseClosedAt,
  getUrgency,
  formatCountdown,
  urgencyIcon,
} from '../utils/raceTime';
import './RaceDeadline.css';

export default function RaceDeadline({ closedAt, startTime, raceDate }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const closedAtMs = parseClosedAt(closedAt, startTime, raceDate);
  const urgency = getUrgency(closedAtMs, now);
  const icon = urgencyIcon(urgency);
  const countdown = formatCountdown(closedAtMs, now);

  return (
    <div className={`race-deadline urgency-${urgency}`}>
      {icon && <span className="urgency-icon" aria-hidden>{icon}</span>}
      <div className="race-deadline-text">
        <span className="countdown">{countdown}</span>
        {startTime && startTime !== '—' && (
          <span className="start-label">{startTime} 締切</span>
        )}
      </div>
    </div>
  );
}
