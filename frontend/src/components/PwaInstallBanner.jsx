import { useEffect, useState } from 'react';
import './PwaInstallBanner.css';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

const DISMISS_KEY = 'boat-ai-pwa-install-dismissed';

/**
 * ホーム画面に追加の案内（Push 未実装）
 * @param {{ hiddenOnScroll?: boolean }} props
 */
export default function PwaInstallBanner({ hiddenOnScroll = true }) {
  const [visible, setVisible] = useState(false);
  const [scrollHidden, setScrollHidden] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [mode, setMode] = useState('ios'); // ios | android

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    if (isIos()) {
      setMode('ios');
      setVisible(true);
      return;
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setMode('android');
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  useEffect(() => {
    if (!hiddenOnScroll || !visible) return undefined;

    const onScroll = () => {
      setScrollHidden(window.scrollY > 48);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hiddenOnScroll, visible]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const onInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (!visible || scrollHidden) return null;

  return (
    <div
      className="pwa-install-banner"
      role="region"
      aria-label="アプリのインストール案内"
    >
      <div className="pwa-install-inner">
        <p className="pwa-install-title">アプリとして使う</p>
        {mode === 'ios' ? (
          <p className="pwa-install-text">
            iPhone: 共有 <span className="pwa-install-icon">⎋</span> →{' '}
            <strong>ホーム画面に追加</strong>
          </p>
        ) : (
          <>
            <p className="pwa-install-text">
              Android / Chrome: 下のボタン、またはメニューから「アプリをインストール」
            </p>
            {deferredPrompt && (
              <button
                type="button"
                className="pwa-install-btn"
                onClick={onInstallClick}
              >
                インストール
              </button>
            )}
          </>
        )}
        <p className="pwa-install-note">Push通知は未対応 · データはオンライン取得</p>
        <button
          type="button"
          className="pwa-install-dismiss"
          onClick={dismiss}
          aria-label="閉じる"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
