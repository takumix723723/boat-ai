import { Link, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import PwaInstallBanner from './PwaInstallBanner';
import './Layout.css';

const ROOT_PATHS = ['/', '/watch', '/ranking', '/analytics'];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const isRoot = ROOT_PATHS.includes(pathname);

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-icon">AI</span>
          <div>
            <span className="brand-title">競艇AIアナリスト</span>
            <span className="brand-sub">総合レース分析</span>
          </div>
        </Link>
        {!isRoot && (
          <Link to="/" className="back-link">
            一覧
          </Link>
        )}
      </header>
      <PwaInstallBanner />
      <main className="app-main">{children}</main>
      <BottomNav />
    </div>
  );
}
