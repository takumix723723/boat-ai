/**
 * DB 接続確認（Phase6 実動作確認用）
 *
 * 使い方: cd backend && npm run db:check
 */
import { PrismaClient } from '@prisma/client';
import { loadBackendEnv, getBackendRoot } from './loadEnv.js';

loadBackendEnv();

const DATABASE_URL = process.env.DATABASE_URL?.trim();
const PERSIST = process.env.PERSIST_SNAPSHOTS === 'true';

function fail(message, hints = []) {
  console.error('\n[check-db] FAILED');
  console.error(message);
  for (const h of hints) {
    console.error(`  → ${h}`);
  }
  process.exit(1);
}

function ok(message) {
  console.log(`[check-db] OK: ${message}`);
}

if (!DATABASE_URL) {
  fail(
    'DATABASE_URL が設定されていません。',
    [
      `${getBackendRoot()}\\.env を作成してください（.env.example をコピー可）`,
      'Neon の Connection string を DATABASE_URL= に貼り付け',
      '手順: backend/docs/PHASE6_DB_SETUP.md',
    ]
  );
}

// パスワード等をログに出さない（ホスト名だけ表示）
let hostHint = '(parse error)';
try {
  const u = new URL(DATABASE_URL.replace(/^postgresql:/, 'http:'));
  hostHint = u.hostname;
} catch {
  hostHint = '(invalid URL format)';
}

console.log('[check-db] Connecting...');
console.log(`  host: ${hostHint}`);
console.log(`  PERSIST_SNAPSHOTS: ${PERSIST ? 'true' : 'false (DB保存はオフ)'}`);

if (!PERSIST) {
  console.warn(
    '[check-db] WARN: PERSIST_SNAPSHOTS が true ではありません。接続は確認できますが refresh では DB に書き込まれません。'
  );
}

const prisma = new PrismaClient({
  log: ['error'],
});

try {
  await prisma.$connect();
  ok('PostgreSQL に接続できました');

  const [racers, races, snapshots, aiScores] = await Promise.all([
    prisma.racer.count(),
    prisma.race.count(),
    prisma.raceSnapshot.count(),
    prisma.aiScore.count(),
  ]);

  console.log('\n[check-db] Table counts');
  console.log(`  racers:         ${racers}`);
  console.log(`  races:          ${races}`);
  console.log(`  race_snapshots: ${snapshots}`);
  console.log(`  ai_scores:      ${aiScores}`);

  const latest = await prisma.raceSnapshot.findFirst({
    orderBy: { capturedAt: 'desc' },
    select: { capturedAt: true, sequence: true },
  });

  if (latest) {
    console.log(
      `  latest snapshot: ${latest.capturedAt.toISOString()} (sequence ${latest.sequence})`
    );
  } else {
    console.log('  latest snapshot: (none yet — run POST /api/races/refresh after enabling persistence)');
  }

  console.log('\n[check-db] All checks passed.');
} catch (err) {
  fail(err.message || String(err), [
    'DATABASE_URL の typo / 期限切れパスワードを確認',
    'Neon なら sslmode=require を URL 末尾に付ける',
    'マイグレーション未適用なら: npm run db:migrate:deploy',
    'Neon プロジェクトが Suspend していないかダッシュボードで確認',
  ]);
} finally {
  await prisma.$disconnect();
}
