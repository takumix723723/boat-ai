import { getSnapshotRepository } from '../../repositories/index.js';

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * @param {string} externalRaceId
 */
export async function getRaceHistory(externalRaceId) {
  if (!isDatabaseConfigured()) {
    return {
      raceId: externalRaceId,
      available: false,
      reason: 'database_unavailable',
      message: 'DATABASE_URL が未設定のため履歴を取得できません。',
      snapshots: [],
      snapshotCount: 0,
    };
  }

  try {
    const repo = getSnapshotRepository();
    const data = await repo.getRaceHistory(externalRaceId);

    if (!data.found) {
      return {
        raceId: externalRaceId,
        available: false,
        reason: 'race_not_found',
        message: 'このレースの保存履歴はまだありません。',
        snapshots: [],
        snapshotCount: 0,
      };
    }

    if (!data.snapshots.length) {
      return {
        raceId: data.raceId,
        venueName: data.venueName,
        raceNo: data.raceNo,
        available: false,
        reason: 'no_snapshots',
        message:
          'スナップショットがありません。PERSIST_SNAPSHOTS=true で Live 更新すると蓄積されます。',
        snapshots: [],
        snapshotCount: 0,
      };
    }

    return {
      raceId: data.raceId,
      venueName: data.venueName,
      raceNo: data.raceNo,
      available: true,
      reason: null,
      message: null,
      snapshots: data.snapshots,
      snapshotCount: data.snapshots.length,
    };
  } catch (err) {
    console.error('[raceHistory] fetch failed', { raceId: externalRaceId, message: err.message });
    return {
      raceId: externalRaceId,
      available: false,
      reason: 'error',
      message: '履歴の取得に失敗しました。',
      snapshots: [],
      snapshotCount: 0,
    };
  }
}
