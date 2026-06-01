import { getPrisma } from '../../db/client.js';
import {
  getLearningMode,
  getLearningPolicy,
  isLearningEnabled,
} from '../../config/learningPolicy.js';
import { optimizeWeights } from '../analytics/weightOptimizationService.js';
import { upsertWeightProfile } from '../ai/weightProfileService.js';

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function rowToDto(row) {
  return {
    id: row.id,
    runAt: row.runAt.toISOString(),
    triggerSource: row.triggerSource,
    mode: row.mode,
    raceCount: row.raceCount,
    trialCount: row.trialCount,
    baselineAccuracy: row.baselineAccuracy,
    optimizedAccuracy: row.optimizedAccuracy,
    improvement: Number(row.improvement),
    selectedProfile: row.selectedProfile,
    status: row.status,
    applied: row.applied,
    message: row.message,
    overfitFlagged: row.overfitFlagged,
    meta: row.meta,
    createdAt: row.createdAt.toISOString(),
  };
}

async function getLastRun() {
  const prisma = getPrisma();
  return prisma.aiLearningRun.findFirst({
    orderBy: { runAt: 'desc' },
  });
}

async function isInCooldown(policy) {
  const last = await getLastRun();
  if (!last) return false;
  const ms = policy.cooldownHours * 60 * 60 * 1000;
  return Date.now() - last.runAt.getTime() < ms;
}

/**
 * @param {object} params
 */
async function persistLearningRun(params) {
  const prisma = getPrisma();
  const row = await prisma.aiLearningRun.create({
    data: {
      triggerSource: params.triggerSource,
      mode: params.mode,
      raceCount: params.raceCount,
      trialCount: params.trialCount ?? null,
      baselineAccuracy: params.baselineAccuracy,
      optimizedAccuracy: params.optimizedAccuracy,
      improvement: params.improvement,
      selectedProfile: params.selectedProfile,
      status: params.status,
      applied: params.applied ?? false,
      message: params.message ?? null,
      overfitFlagged: params.overfitFlagged ?? false,
      meta: params.meta ?? null,
    },
  });
  return rowToDto(row);
}

function isMissingLearningTable(err) {
  return err?.code === 'P2021' && String(err?.meta?.table || '').includes('ai_learning_runs');
}

export async function getLearningStatus() {
  const policy = getLearningPolicy();
  const mode = getLearningMode();

  if (!isDatabaseConfigured()) {
    return {
      available: false,
      reason: 'database_unavailable',
      message: 'DATABASE_URL が未設定のため自動学習できません。',
      policy,
      mode,
      lastRun: null,
      pendingCount: 0,
    };
  }

  try {
  const prisma = getPrisma();
  const lastRun = await getLastRun();
  const pendingCount = await prisma.aiLearningRun.count({
    where: { status: 'pending', applied: false },
  });

  return {
    available: true,
    reason: null,
    message: null,
    policy,
    mode,
    lastRun: lastRun ? rowToDto(lastRun) : null,
    pendingCount,
    schedulerNote:
      mode === 'manual'
        ? 'manual モード — スケジューラは停止'
        : policy.schedulerEnabled
          ? `1日1回（UTC ${policy.dailyHourUtc}:00 頃）+ refresh 後の条件付き`
          : 'スケジューラ無効',
    pushEnabled: false,
  };
  } catch (err) {
    if (isMissingLearningTable(err)) {
      return {
        available: false,
        reason: 'migration_required',
        message: 'ai_learning_runs テーブルがありません。npm run db:migrate:deploy を実行してください。',
        policy,
        mode,
        lastRun: null,
        pendingCount: 0,
      };
    }
    throw err;
  }
}

/**
 * @param {{ limit?: number }} [options]
 */
export async function listLearningRuns(options = {}) {
  if (!isDatabaseConfigured()) {
    return {
      available: false,
      runs: [],
      message: 'DATABASE_URL が未設定です。',
    };
  }

  try {
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 20));
    const prisma = getPrisma();
    const rows = await prisma.aiLearningRun.findMany({
      orderBy: { runAt: 'desc' },
      take: limit,
    });

    return {
      available: true,
      runs: rows.map(rowToDto),
    };
  } catch (err) {
    if (isMissingLearningTable(err)) {
      return { available: false, runs: [], message: err.message };
    }
    throw err;
  }
}

/**
 * 自動学習パイプライン
 * @param {{ trigger?: string, force?: boolean, trials?: number }} [options]
 */
export async function runAutoLearning(options = {}) {
  const startedAt = Date.now();
  const policy = getLearningPolicy();
  const mode = getLearningMode();
  const trigger = options.trigger || 'manual';

  if (!isLearningEnabled()) {
    return {
      ok: false,
      skipped: true,
      reason: 'learning_disabled',
      message: 'AI_LEARNING_ENABLED=false',
    };
  }

  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      skipped: true,
      reason: 'database_unavailable',
      message: 'DATABASE_URL が未設定です。',
    };
  }

  if (mode === 'manual' && !options.force) {
    return {
      ok: false,
      skipped: true,
      reason: 'manual_mode',
      message:
        'AI_LEARNING_MODE=manual です。POST /api/learning/run に force:true で手動実行できます。',
    };
  }

  if (!options.force && (await isInCooldown(policy))) {
    return {
      ok: false,
      skipped: true,
      reason: 'cooldown',
      message: `前回実行から ${policy.cooldownHours} 時間以内のためスキップ`,
    };
  }

  const trials = options.trials ?? policy.autoTrials;
  const optimization = await optimizeWeights({ trials });

  if (!optimization.available) {
    const run = await persistLearningRun({
      triggerSource: trigger,
      mode,
      raceCount: optimization.analyzedRaces ?? 0,
      trialCount: 0,
      baselineAccuracy: {},
      optimizedAccuracy: {},
      improvement: 0,
      selectedProfile: {},
      status: 'failed',
      applied: false,
      message: optimization.message || '最適化不可',
      meta: { reason: optimization.reason, elapsedMs: Date.now() - startedAt },
    });
    return { ok: false, skipped: false, run, optimization };
  }

  const raceCount = optimization.analyzedRaces ?? 0;
  if (raceCount < policy.minRaces) {
    const run = await persistLearningRun({
      triggerSource: trigger,
      mode,
      raceCount,
      trialCount: optimization.trialCount,
      baselineAccuracy: optimization.baselineOnSplit?.train ?? optimization.baseline ?? {},
      optimizedAccuracy: optimization.trainAccuracy ?? {},
      improvement: 0,
      selectedProfile: {},
      status: 'skipped',
      applied: false,
      message: `分析レース数不足（${raceCount} < ${policy.minRaces}）`,
      meta: { elapsedMs: Date.now() - startedAt },
    });
    return {
      ok: false,
      skipped: true,
      reason: 'insufficient_races',
      run,
      optimization,
    };
  }

  const last = await getLastRun();
  if (
    !options.force &&
    last &&
    raceCount - last.raceCount < policy.minNewRacesSinceLastRun &&
    trigger !== 'manual'
  ) {
    return {
      ok: false,
      skipped: true,
      reason: 'no_new_races',
      message: `新規結果レースの増分が不足（${raceCount - last.raceCount} < ${policy.minNewRacesSinceLastRun}）`,
      raceCount,
      lastRaceCount: last.raceCount,
    };
  }

  const baselineAcc =
    optimization.baselineOnSplit?.train ?? optimization.baseline ?? {};
  const optimizedAcc = optimization.trainAccuracy ?? {};
  const improvement =
    optimization.improvement?.aiTop1WinRateDelta ??
    (optimizedAcc.aiTop1WinRate ?? 0) - (baselineAcc.aiTop1WinRate ?? 0);

  const testRaceCount = optimization.splitCounts?.test ?? 0;
  const overfitFlagged =
    Boolean(optimization.overfitWarning?.flagged) && testRaceCount >= 3;

  if (overfitFlagged) {
    const run = await persistLearningRun({
      triggerSource: trigger,
      mode,
      raceCount,
      trialCount: optimization.trialCount,
      baselineAccuracy: baselineAcc,
      optimizedAccuracy: optimizedAcc,
      improvement,
      selectedProfile: optimization.bestProfile ?? {},
      status: 'skipped',
      applied: false,
      overfitFlagged: true,
      message: optimization.overfitWarning?.message || '過学習の疑い',
      meta: {
        overfitWarning: optimization.overfitWarning,
        testAccuracy: optimization.testAccuracy,
        elapsedMs: Date.now() - startedAt,
      },
    });
    return { ok: false, skipped: true, run, optimization };
  }

  if (improvement < policy.minImprovementPt) {
    const run = await persistLearningRun({
      triggerSource: trigger,
      mode,
      raceCount,
      trialCount: optimization.trialCount,
      baselineAccuracy: baselineAcc,
      optimizedAccuracy: optimizedAcc,
      improvement,
      selectedProfile: optimization.bestProfile ?? {},
      status: 'skipped',
      applied: false,
      message: `改善幅不足（+${improvement.toFixed(1)}pt < +${policy.minImprovementPt}pt）`,
      meta: { elapsedMs: Date.now() - startedAt },
    });
    return {
      ok: false,
      skipped: true,
      reason: 'insufficient_improvement',
      run,
      optimization,
    };
  }

  const best = optimization.bestProfile;
  const profileName =
    best?.suggestedSaveName || `learn-${Date.now().toString(36).slice(-6)}`;
  const selectedProfile = {
    name: profileName,
    label: best?.label || `自動学習 ${new Date().toISOString().slice(0, 10)}`,
    weights: best?.weights ?? {},
  };

  let applied = false;
  let status = 'pending';

  if (mode === 'auto') {
    await upsertWeightProfile({
      name: profileName,
      label: selectedProfile.label,
      weights: selectedProfile.weights,
      setActive: true,
    });
    applied = true;
    status = 'applied';
  } else if (mode === 'suggest') {
    await upsertWeightProfile({
      name: profileName,
      label: selectedProfile.label,
      weights: selectedProfile.weights,
      setActive: false,
    });
    status = 'pending';
  }

  const run = await persistLearningRun({
    triggerSource: trigger,
    mode,
    raceCount,
    trialCount: optimization.trialCount,
    baselineAccuracy: baselineAcc,
    optimizedAccuracy: optimizedAcc,
    improvement,
    selectedProfile,
    status,
    applied,
    message:
      mode === 'auto'
        ? `改善 +${improvement.toFixed(1)}pt — プロファイルを自動採用`
        : `改善 +${improvement.toFixed(1)}pt — 候補を保存（要確認）`,
    meta: {
      testAccuracy: optimization.testAccuracy,
      validation: optimization.validation,
      elapsedMs: Date.now() - startedAt,
    },
  });

  return {
    ok: true,
    skipped: false,
    run,
    optimization: {
      analyzedRaces: optimization.analyzedRaces,
      improvement: optimization.improvement,
      trainAccuracy: optimization.trainAccuracy,
      testAccuracy: optimization.testAccuracy,
    },
  };
}

/**
 * pending 候補を手動採用（2段階の第2段階）
 */
export async function applyLearningRun(runId) {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not configured');
  }

  const prisma = getPrisma();
  const row = await prisma.aiLearningRun.findUnique({ where: { id: runId } });
  if (!row) {
    throw new Error('Learning run not found');
  }
  if (row.applied) {
    throw new Error('Already applied');
  }
  if (row.status !== 'pending') {
    throw new Error(`Cannot apply status: ${row.status}`);
  }

  const profile = row.selectedProfile;
  if (!profile?.weights || !profile?.name) {
    throw new Error('Invalid selectedProfile on run');
  }

  const saved = await upsertWeightProfile({
    name: profile.name,
    label: profile.label || profile.name,
    weights: profile.weights,
    setActive: true,
  });

  const updated = await prisma.aiLearningRun.update({
    where: { id: runId },
    data: {
      applied: true,
      status: 'applied',
      message: `${row.message || ''} · 手動採用`.trim(),
    },
  });

  return { run: rowToDto(updated), profile: saved };
}
