import { isPersistenceEnabled, getPersistenceStatus } from '../../config/persistence.js';
import { getSnapshotRepository } from '../../repositories/index.js';
import { queueLearningAfterRefresh } from '../learning/learningAfterRefresh.js';

/**
 * refresh / load 成功後のデータセットを DB に保存（失敗しても API は落とさない）
 * @param {{ meta: object, races: object[] }} dataset
 */
export async function persistDatasetIfEnabled(dataset) {
  if (!isPersistenceEnabled()) return null;

  if (!dataset?.races?.length) {
    return null;
  }

  try {
    const repo = getSnapshotRepository();
    const result = await repo.saveLiveDataset(dataset.races, dataset.meta ?? {});
    const snapAttempts =
      (result.snapshotsCreated ?? 0) + (result.snapshotsSkipped ?? 0);
    const adviceAttempts =
      (result.adviceWritten ?? 0) + (result.adviceSkipped ?? 0);
    console.info('[snapshotPersistence] refresh persist', {
      ...result,
      snapshotSkipRate:
        snapAttempts > 0
          ? `${Math.round(((result.snapshotsSkipped ?? 0) / snapAttempts) * 100)}%`
          : 'n/a',
      adviceSkipRate:
        adviceAttempts > 0
          ? `${Math.round(((result.adviceSkipped ?? 0) / adviceAttempts) * 100)}%`
          : 'n/a',
      payloadNote:
        'prediction_payload: hash change or STORE_PREDICTION_PAYLOAD=true only',
    });
    queueLearningAfterRefresh();
    return result;
  } catch (err) {
    console.error('[snapshotPersistence] save failed (API continues)', {
      message: err.message,
      code: err.code,
    });
    return null;
  }
}

export async function getSnapshotStats(externalRaceId) {
  const status = getPersistenceStatus();

  if (!status.databaseUrlConfigured) {
    return {
      ...status,
      error: 'DATABASE_URL is not configured',
      totalSnapshots: 0,
      totalAiScores: 0,
      totalRaces: 0,
      latestCapturedAt: null,
    };
  }

  try {
    const repo = getSnapshotRepository();
    const stats = externalRaceId
      ? await repo.getStatsForRace(externalRaceId)
      : await repo.getStats();

    return {
      ...status,
      ...stats,
    };
  } catch (err) {
    return {
      ...status,
      error: err.message,
      totalSnapshots: 0,
      totalAiScores: 0,
      totalRaces: 0,
      latestCapturedAt: null,
    };
  }
}
