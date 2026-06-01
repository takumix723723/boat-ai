/**
 * 本番デプロイ後の簡易スモークテスト
 * Usage: API_URL=https://your-api.onrender.com node scripts/verify-production.js
 */
const base = (process.env.API_URL || process.argv[2] || '').replace(/\/$/, '');

if (!base) {
  console.error('Usage: API_URL=https://xxx.onrender.com node scripts/verify-production.js');
  process.exit(1);
}

const checks = [
  { name: 'health', path: '/api/health', method: 'GET' },
  { name: 'snapshots stats', path: '/api/snapshots/stats', method: 'GET' },
  { name: 'analytics accuracy', path: '/api/analytics/accuracy', method: 'GET' },
];

async function run() {
  console.log(`[verify] API base: ${base}\n`);
  let failed = 0;

  for (const c of checks) {
    const url = `${base}${c.path}`;
    try {
      const res = await fetch(url, { method: c.method });
      const body = await res.json().catch(() => ({}));
      const ok = res.ok;
      console.log(`${ok ? 'OK' : 'FAIL'} ${c.name} ${res.status} ${url}`);
      if (!ok) {
        console.log('  ', JSON.stringify(body).slice(0, 200));
        failed += 1;
      } else if (c.name === 'health') {
        console.log('   status:', body.status, '| db:', body.database?.ok);
        console.log('   persistence:', body.persistence?.enabled);
      }
    } catch (err) {
      console.log(`FAIL ${c.name} ${url}`);
      console.log('  ', err.message);
      failed += 1;
    }
  }

  console.log('\n[verify] refresh (POST) — 初回は数十秒かかることがあります');
  try {
    const res = await fetch(`${base}/api/races/refresh?date=today`, {
      method: 'POST',
    });
    const body = await res.json().catch(() => ({}));
    const ok = res.ok;
    console.log(`${ok ? 'OK' : 'FAIL'} refresh ${res.status}`);
    if (ok) {
      console.log('   races:', body?.races?.length ?? body?.meta?.raceCount ?? '(see response)');
    } else {
      console.log('  ', JSON.stringify(body).slice(0, 200));
      failed += 1;
    }
  } catch (err) {
    console.log('FAIL refresh');
    console.log('  ', err.message);
    failed += 1;
  }

  console.log(failed === 0 ? '\n[verify] All checks passed.' : `\n[verify] ${failed} check(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

run();
