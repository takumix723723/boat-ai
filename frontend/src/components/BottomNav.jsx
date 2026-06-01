import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const tabs = [
  { to: '/', label: 'レース', icon: '🏁' },
  { to: '/watch', label: '通知', icon: '🔔' },
  { to: '/ranking', label: 'AIランク', icon: '📊' },
  { to: '/analytics', label: '精度', icon: '🎯' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="メインメニュー">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <span className="bottom-nav-icon" aria-hidden>
            {tab.icon}
          </span>
          <span className="bottom-nav-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
