/**
 * Phase6: DB スナップショット永続化設定
 */

export function isPersistenceEnabled() {
  const flag = process.env.PERSIST_SNAPSHOTS === 'true';
  const hasDb = Boolean(process.env.DATABASE_URL?.trim());
  return flag && hasDb;
}

export function getPersistenceStatus() {
  return {
    persistSnapshots: process.env.PERSIST_SNAPSHOTS === 'true',
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL?.trim()),
    enabled: isPersistenceEnabled(),
  };
}
