import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * backend/.env を process.env に読み込む（既存の環境変数は上書きしない）
 */
export function loadBackendEnv() {
  const envPath = join(backendRoot, '.env');
  if (!existsSync(envPath)) {
    return { envPath, loaded: false };
  }

  const text = readFileSync(envPath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // .env を優先（シェルに古い PERSIST_SNAPSHOTS=false 等が残っていても上書き）
    process.env[key] = value;
  }

  return { envPath, loaded: true };
}

export function getBackendRoot() {
  return backendRoot;
}
