import { getLearningPolicy, isLearningSchedulerEnabled } from '../../config/learningPolicy.js';
import { runAutoLearning } from './autoLearningService.js';

let started = false;
let dailyTimer = null;

function msUntilUtcHour(hourUtc) {
  const now = new Date();
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hourUtc,
      0,
      0,
      0
    )
  );
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

async function runScheduled() {
  try {
    console.info('[learningScheduler] daily run start');
    const result = await runAutoLearning({ trigger: 'cron' });
    console.info('[learningScheduler] done', {
      ok: result.ok,
      skipped: result.skipped,
      reason: result.reason,
      status: result.run?.status,
    });
  } catch (err) {
    console.error('[learningScheduler] failed', err.message);
  }
}

/**
 * Render / Node 常駐向け: 1日1回の自動学習
 */
export function startLearningScheduler() {
  if (started) return;
  if (!isLearningSchedulerEnabled()) {
    console.info('[learningScheduler] disabled (mode or env)');
    return;
  }

  const policy = getLearningPolicy();
  const delay = msUntilUtcHour(policy.dailyHourUtc);

  started = true;
  console.info(
    `[learningScheduler] first run in ${Math.round(delay / 60000)} min (UTC ${policy.dailyHourUtc}:00)`
  );

  setTimeout(() => {
    runScheduled();
    dailyTimer = setInterval(runScheduled, 24 * 60 * 60 * 1000);
  }, delay);
}

export function stopLearningScheduler() {
  if (dailyTimer) clearInterval(dailyTimer);
  dailyTimer = null;
  started = false;
}
