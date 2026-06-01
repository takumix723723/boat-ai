/**
 * API ベース URL（Vite ビルド時 env + 本番フォールバック）
 * VITE_API_URL 未設定の Static ビルドで /api が boat-ai-web 向きになり 404 になるのを防ぐ
 */
const DEFAULT_PROD_API = 'https://boat-ai-api.onrender.com';

export function resolveApiBase() {
  const fromEnv = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (fromEnv) return fromEnv;

  if (import.meta.env.PROD) {
    const fallback = (import.meta.env.VITE_API_FALLBACK_URL || DEFAULT_PROD_API)
      .trim()
      .replace(/\/+$/, '');
    return fallback;
  }

  return '';
}

/** デバッグ表示用 */
export function getApiBaseDebug() {
  const fromEnv = (import.meta.env.VITE_API_URL || '').trim();
  const base = resolveApiBase();
  let source = 'dev-proxy';
  if (fromEnv) source = 'VITE_API_URL';
  else if (import.meta.env.PROD) source = 'VITE_API_FALLBACK_URL/default';

  return {
    base,
    viteEnv: fromEnv || '(empty)',
    source,
    mode: import.meta.env.MODE,
  };
}

export function buildApiUrl(path) {
  const base = resolveApiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
