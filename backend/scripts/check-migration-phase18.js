/**
 * phase18 migration / race_bet_advice テーブル確認
 * Usage: cd backend && node scripts/check-migration-phase18.js
 */
import { PrismaClient } from '@prisma/client';
import { loadBackendEnv } from './loadEnv.js';

loadBackendEnv();

const TARGET = '20250602120000_phase18_race_bet_advice';

const prisma = new PrismaClient({ log: ['error'] });

try {
  const migrations = await prisma.$queryRaw`
    SELECT migration_name, finished_at
    FROM "_prisma_migrations"
    ORDER BY finished_at DESC
    LIMIT 10
  `;
  const table = await prisma.$queryRaw`
    SELECT to_regclass('public.race_bet_advice') AS race_bet_advice_table
  `;

  console.log('=== migrations (latest 10) ===');
  for (const row of migrations) {
    const at = row.finished_at?.toISOString?.() ?? row.finished_at;
    console.log(`  ${row.migration_name} | finished_at: ${at}`);
  }

  const phase18 = migrations.find((m) => m.migration_name === TARGET);
  console.log('\n=== ① phase18 ===');
  if (phase18?.finished_at) {
    console.log(`  OK: ${TARGET}`);
    console.log(`  finished_at: ${phase18.finished_at.toISOString?.() ?? phase18.finished_at}`);
  } else {
    console.log(`  MISSING or no finished_at: ${TARGET}`);
  }

  const reg = table[0]?.race_bet_advice_table;
  console.log('\n=== ② race_bet_advice_table ===');
  console.log(`  to_regclass: ${reg ?? 'null'}`);
  console.log(reg ? '  OK: table exists' : '  MISSING: table is null');
} catch (err) {
  console.error('\n[check-migration-phase18] ERROR:', err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
