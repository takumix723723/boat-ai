/**
 * Render / 本番起動: HTTP サーバーを先に立ち上げ、migrate deploy は非ブロック。
 * P1002（advisory lock）で起動が止まるのを防ぐ。
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBackendEnv } from './loadEnv.js';

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

loadBackendEnv();

function runMigrateNonBlocking() {
  if (process.env.MIGRATE_ON_STARTUP === 'false') {
    console.log('[startup] MIGRATE_ON_STARTUP=false — skipping migrate deploy');
    return;
  }

  const timeoutMs = Number(process.env.MIGRATE_DEPLOY_TIMEOUT_MS) || 20000;
  console.log(
    `[startup] migrate deploy in background (timeout ${timeoutMs}ms, failures do not block API)`
  );

  const child = spawn('npm', ['run', 'db:migrate:deploy'], {
    cwd: backendRoot,
    env: process.env,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let finished = false;

  const done = (message) => {
    if (finished) return;
    finished = true;
    console.warn(message);
  };

  const timer = setTimeout(() => {
    done(
      `[startup] migrate deploy timed out after ${timeoutMs}ms (e.g. P1002 advisory lock) — API continues`
    );
    try {
      child.kill('SIGTERM');
    } catch {
      /* ignore */
    }
  }, timeoutMs);

  child.stdout?.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr?.on('data', (chunk) => process.stderr.write(chunk));

  child.on('error', (err) => {
    clearTimeout(timer);
    done(`[startup] migrate deploy spawn error: ${err.message}`);
  });

  child.on('close', (code) => {
    clearTimeout(timer);
    if (finished) return;
    finished = true;
    if (code === 0) {
      console.log('[startup] migrate deploy completed successfully');
    } else {
      console.warn(
        `[startup] migrate deploy exited with code ${code} — API already running`
      );
    }
  });
}

console.log('[startup] launching Boat AI API (non-blocking production start)');
runMigrateNonBlocking();

await import('../src/index.js');
