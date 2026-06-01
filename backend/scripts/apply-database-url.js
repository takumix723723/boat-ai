/**
 * Neon の Connection string を .env に書き込む
 * 使い方: node scripts/apply-database-url.js "postgresql://..."
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(backendRoot, '.env');

const url = process.argv[2]?.trim();

if (!url || !url.startsWith('postgresql://')) {
  console.error('[apply-database-url] Usage: node scripts/apply-database-url.js "postgresql://..."');
  process.exit(1);
}

if (!existsSync(envPath)) {
  console.error('[apply-database-url] .env not found. Run from backend after copying .env.example');
  process.exit(1);
}

const { loadBackendEnv } = await import('./loadEnv.js');
loadBackendEnv();

const persist = process.env.PERSIST_SNAPSHOTS === 'true' ? 'true' : 'true';
const boatrace = process.env.BOATRACE_DATA_MODE || 'mock';

const text = [
  `PORT=${process.env.PORT || '3001'}`,
  `BOATRACE_DATA_MODE=${boatrace}`,
  `PERSIST_SNAPSHOTS=${persist}`,
  `DATABASE_URL=${url}`,
  '',
].join('\n');

writeFileSync(envPath, text, 'utf8');
console.log('[apply-database-url] OK: DATABASE_URL を .env に保存しました（パスワードは表示しません）');
