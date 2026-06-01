/**
 * Boatrace Open API 向け HTTP 取得（retry / timeout / 詳細エラー）
 */

function envInt(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const DEFAULT_TIMEOUT_MS = envInt('BOATRACE_FETCH_TIMEOUT_MS', 25_000);
const DEFAULT_RETRIES = envInt('BOATRACE_FETCH_RETRIES', 2);
const RETRY_DELAY_MS = envInt('BOATRACE_FETCH_RETRY_DELAY_MS', 800);

export class OpenApiFetchError extends Error {
  /**
   * @param {string} message
   * @param {object} details
   */
  constructor(message, details) {
    super(message);
    this.name = 'OpenApiFetchError';
    this.details = details;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Node fetch の TypeError "fetch failed" から原因を抽出
 */
export function parseFetchError(err, url, timedOut = false) {
  const cause = err?.cause ?? null;
  const code = cause?.code ?? err?.code ?? null;
  const syscall = cause?.syscall ?? null;

  let category = 'unknown';
  if (timedOut || err?.name === 'AbortError') category = 'timeout';
  else if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') category = 'dns';
  else if (code === 'ECONNREFUSED' || code === 'ECONNRESET') category = 'connection';
  else if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT') category = 'timeout';
  else if (code === 'CERT_HAS_EXPIRED' || code?.startsWith?.('CERT_')) category = 'tls';
  else if (err?.message?.startsWith?.('HTTP ')) category = 'http';

  return {
    url,
    message: err?.message ?? String(err),
    causeMessage: cause?.message ?? null,
    code,
    syscall,
    category,
    timedOut,
    name: err?.name ?? null,
  };
}

/**
 * @param {string} url
 * @param {{ timeoutMs?: number, retries?: number, label?: string }} [opts]
 */
export async function fetchJsonWithRetry(url, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts.retries ?? DEFAULT_RETRIES;
  const label = opts.label ?? 'openApi';
  const attempts = maxRetries + 1;
  const errors = [];

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'boat-ai-analyst/0.3',
        },
      });

      const elapsedMs = Date.now() - startedAt;

      if (!res.ok) {
        const httpErr = new OpenApiFetchError(`HTTP ${res.status} ${res.statusText}`, {
          url,
          label,
          status: res.status,
          statusText: res.statusText,
          attempt,
          attempts,
          elapsedMs,
          timedOut: false,
          category: 'http',
        });
        errors.push(httpErr.details);
        if (attempt < attempts && res.status >= 500) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
        throw httpErr;
      }

      const body = await res.json();
      if (attempt > 1) {
        console.info(`[openApiFetch] ${label} OK after ${attempt} attempts (${elapsedMs}ms)`, url);
      }
      return { body, meta: { url, attempt, attempts, elapsedMs, status: res.status } };
    } catch (err) {
      const elapsedMs = Date.now() - startedAt;
      const timedOut = err?.name === 'AbortError';
      const parsed = parseFetchError(err, url, timedOut);
      const details = {
        ...parsed,
        label,
        attempt,
        attempts,
        elapsedMs,
      };
      errors.push(details);

      if (attempt < attempts) {
        console.warn(
          `[openApiFetch] ${label} attempt ${attempt}/${attempts} failed, retrying:`,
          JSON.stringify({
            url,
            message: parsed.message,
            code: parsed.code,
            category: parsed.category,
            timedOut: parsed.timedOut,
          })
        );
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      throw new OpenApiFetchError(
        `${label}: ${parsed.message}${parsed.code ? ` (${parsed.code})` : ''}`,
        { url, label, errors, last: details }
      );
    } finally {
      clearTimeout(timer);
    }
  }

  throw new OpenApiFetchError(`${label}: exhausted retries (no attempts)`, {
    url,
    label,
    errors,
    attempts: 0,
    misconfigured: !Number.isFinite(attempts) || attempts < 1,
  });
}

export function formatFailureForUser(details) {
  if (!details) return '実データ取得失敗 → モック使用中';

  let last = details.last;
  if (!last && Array.isArray(details.errors) && details.errors.length) {
    const nested = details.errors[details.errors.length - 1];
    last = nested?.last ?? nested?.errors?.[nested?.errors?.length - 1] ?? nested;
  }
  if (!last && details.misconfigured) {
    return '実データ取得失敗（設定エラー: リトライ回数）→ モック使用中';
  }
  if (!last) return '実データ取得失敗 → モック使用中';

  const parts = [];
  if (last.category === 'timeout' || last.timedOut) parts.push('タイムアウト');
  else if (last.category === 'dns') parts.push('DNS/ホスト名解決失敗');
  else if (last.category === 'connection') parts.push('接続失敗');
  else if (last.category === 'tls') parts.push('HTTPS証明書エラー');
  else if (last.category === 'http' && last.status) parts.push(`HTTP ${last.status}`);
  else if (last.code) parts.push(last.code);
  else parts.push(last.message);

  return `実データ取得失敗（${parts.join(' · ')}）→ モック使用中`;
}
