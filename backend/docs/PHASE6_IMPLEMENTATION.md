# Phase6-1〜6-3 実装メモ

## 概要

- **Prisma** + PostgreSQL で Live 更新後のレース状態をスナップショット保存
- `PERSIST_SNAPSHOTS=false`（既定）では **メモリキャッシュのみ**（Phase1〜5 と同じ）
- 認証・課金・DB からの一覧読み取りは **未実装**

## 追加・変更ファイル

| パス | 役割 |
|------|------|
| `prisma/schema.prisma` | 5テーブル定義 |
| `prisma/migrations/20250601120000_init_phase6/migration.sql` | 初期マイグレーション |
| `src/db/client.js` | Prisma Client シングルトン |
| `src/config/persistence.js` | `PERSIST_SNAPSHOTS` + `DATABASE_URL` 判定 |
| `src/repositories/interfaces/snapshotRepository.js` | `ISnapshotRepository` 型 |
| `src/repositories/prisma/*.js` | Racer / Race / Snapshot 永続化 |
| `src/repositories/index.js` | Repository ファクトリ |
| `src/services/persistence/snapshotPersistenceService.js` | 保存・統計（services から Prisma 直叩きしない） |
| `src/services/boatrace/raceDataService.js` | `loadRaces` / `refreshRaces` 成功後に保存フック |
| `src/routes/snapshots.js` | `GET /api/snapshots/stats` |
| `src/index.js` | ルート登録、health に persistence 状態 |
| `.env.example` | `DATABASE_URL`, `PERSIST_SNAPSHOTS` |

## 環境変数

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
PERSIST_SNAPSHOTS=true   # false なら DB 書き込みなし
```

永続化が有効になる条件: **`PERSIST_SNAPSHOTS=true` かつ `DATABASE_URL` が設定されていること**（両方必須）。

## マイグレーション

```bash
cd backend
npm install          # postinstall で prisma generate
cp .env.example .env # DATABASE_URL を実値に

# 開発（対話・新規 migration 作成時）
npm run db:migrate

# 本番 / CI（既存 SQL のみ適用）
npm run db:migrate:deploy

# 確認用 UI
npm run db:studio
```

Neon / Render Postgres では接続文字列に `?sslmode=require` を付けることが多いです。

DB 作成〜実動作確認の詳細手順: [PHASE6_DB_SETUP.md](./PHASE6_DB_SETUP.md)

接続だけ確認: `npm run db:check`

## 確認手順

1. **永続化オフ（既定）**
   - `PERSIST_SNAPSHOTS=false` で backend 起動
   - `GET http://localhost:3001/api/health` → `persistence.enabled: false`
   - フロント Live / ランキング / お気に入りが従来どおり動作

2. **永続化オン**
   - DB 作成 → `DATABASE_URL` 設定 → `npm run db:migrate:deploy`
   - `PERSIST_SNAPSHOTS=true` で再起動
   - `POST http://localhost:3001/api/races/refresh` を 1〜2 回実行
   - `GET http://localhost:3001/api/snapshots/stats` → `totalSnapshots` が増える
   - 任意: `GET .../stats?raceId=20260601-03-11`（モックの externalId）

3. **Prisma Studio**
   - `npm run db:studio` で `race_snapshots` / `ai_scores` を目視確認

## API

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/health` | `persistence` オブジェクト付き |
| GET | `/api/snapshots/stats` | 全体の件数・最新 `capturedAt` |
| GET | `/api/snapshots/stats?raceId=` | レース単位の統計 |
| GET | `/api/races/:id/history` | **Phase6-4** DBスナップショットの AI 推移 |

保存失敗時はログのみ。Live refresh の HTTP レスポンスは **失敗しない**。

## 既存機能への影響

- **フロント変更なし** — 引き続きメモリ上の `raceRepository` / Open API キャッシュから応答
- **ランキング・お気に入り** — 変更なし
- **DB 読み取り** — `GET /api/races/:id/history`（レース詳細の AI 推移のみ）
- **初回 `loadRaces`（キャッシュミス時）** も永続化オンなら保存（refresh と同様のデータセット）

## データフロー

```
refreshRaces / loadRaces (cache miss)
  → メモリ cache 更新（既存）
  → persistDatasetIfEnabled (PERSIST_SNAPSHOTS=true のみ)
       → snapshotPersistenceService
       → PrismaSnapshotRepository.saveLiveDataset
```
