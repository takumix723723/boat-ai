# Phase6 Data基盤 — 設計レビュー

> 認証・課金・全選手マスタの本格運用は Phase6 範囲外。  
> 目的: Live更新ごとに「その時点のAI・展示・直前」を蓄積し、後から「展示後+12点」を追跡可能にする。

---

## 1. Prisma vs Drizzle 比較

| 観点 | Prisma | Drizzle |
|------|--------|---------|
| **学習コスト** | 低（スキーマ宣言 → 自動マイグレーション） | 中（SQLに近い、スキーマをTSで書く） |
| **マイグレーション** | `prisma migrate` 成熟、履歴が明確 | `drizzle-kit generate` 良好、SQLが読める |
| **型安全** | 生成 Client が強力 | TS推論がネイティブで軽い |
| **JSONB / 履歴** | `Json` 型サポート | `jsonb` サポート |
| **複雑な分析SQL** | rawQuery 必要になりがち | SQLライクで組みやすい |
| **バンドル・起動** | やや重い（生成Client） | 軽量 |
| **Render相性** | 公式ガイド・事例多数 | `pg` + 問題なし |
| **ESM (type: module)** | Prisma 5+ で対応 | もともとESM向き |
| **Repository層** | Clientをラップする形 | 同様 |
| **ローカル開発** | `DATABASE_URL` のみで可（後述） | 同様 |

### ローカル開発（Docker 不要）

いずれも **PostgreSQL の接続文字列だけ** で動く。

| 手段 | 用途 |
|------|------|
| **Neon**（無料枠） | 開発用DBをクラウドに1つ（推奨・Docker不要） |
| **Render PostgreSQL** | 本番と同じ環境で開発 |
| **Windows ローカル Postgres** | 既に入っている場合のみ |

`.env` に `DATABASE_URL=postgresql://...` を置き、ORMはローカル・Renderで同じ。

---

## 2. 推奨: **Prisma**

### 選定理由（Phase6 に Prisma を第一推奨）

1. **最小スキーマを最速で固められる** — 5テーブル + リレーション + マイグレーションが1本道  
2. **Render デプロイの情報が多い** — Build: `prisma generate`、Release: `prisma migrate deploy`  
3. **スナップショット + JSONB** — `ai_scores.breakdown` / `score_delta` を Json でそのまま保存し、既存 `aiScore.js` と形状を揃えやすい  
4. **Repository の薄いラップで十分** — いまの `raceRepository.js`（メモリ）と役割を分離しやすい  
5. **Prisma Studio** — スナップショット履歴の目視確認が容易（デバッグ価値大）

### Drizzle を選ぶべきタイミング（将来）

- 的中率・回収率など **集計SQLが大量** になる Phase7 以降  
- DBチューニングを **生SQLで厳密に** 回したいとき  

Phase6 は「まず確実に溜める」が主目的のため **Prisma で十分**。

---

## 3. スキーマ案（最小5テーブル + 関係）

### ER 概要

```mermaid
erDiagram
  racers ||--o{ race_entries : ""
  races ||--o{ race_entries : ""
  races ||--o{ race_snapshots : ""
  race_snapshots ||--o{ ai_scores : ""
  race_entries ||--o{ ai_scores : ""

  racers {
    string id PK
    string name
    string rank
    string branch
  }

  races {
    uuid id PK
    string external_id UK
    date race_date
    string venue_code
    int race_no
  }

  race_entries {
    uuid id PK
    uuid race_id FK
    int lane
    string racer_id FK
    json motor
  }

  race_snapshots {
    uuid id PK
    uuid race_id FK
    timestamptz captured_at
    int sequence
    json last_minute
    json meta
  }

  ai_scores {
    uuid id PK
    uuid snapshot_id FK
    uuid race_entry_id FK
    int total
    int previous_total
    json breakdown
    json score_delta
    decimal st
    decimal exhibition_time
  }
```

### テーブル定義（論理）

#### `racers` — 選手マスタ（将来拡張の核）

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | VARCHAR PK | 登録番号（`racerId`） |
| `name` | VARCHAR | 最新表示名 |
| `rank` | VARCHAR | A1/B1 等 |
| `branch` | VARCHAR | 支部 |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

> Phase6 では出走表取り込み時に upsert。将来「イン強い」等は別テーブル `racer_traits`。

#### `races` — レース identity（1日1場1R）

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | UUID PK | 内部ID |
| `external_id` | VARCHAR UK | 既存 `20260601-03-11` |
| `race_date` | DATE | |
| `venue_code` | CHAR(2) | |
| `venue_name` | VARCHAR | |
| `race_no` | SMALLINT | |
| `grade` | VARCHAR | |
| `closed_at` | TIMESTAMPTZ NULL | 締切 |
| UK | | `(race_date, venue_code, race_no)` |

> レースの「現在表示用」最新状態は **最新 snapshot** から組み立てる（`races` に status を持たせてもよいが、履歴は snapshot 側が正）。

#### `race_entries` — 出走表（レース×枠×選手）

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | UUID PK | |
| `race_id` | UUID FK | |
| `lane` | SMALLINT | 1-6 |
| `racer_id` | VARCHAR FK → racers | |
| `motor` | JSONB | rate2nd, rate3rd, score, note |
| UK | | `(race_id, lane)` |

> 1レース6行。プログラム取得時に upsert。

#### `race_snapshots` — **Live更新1回 = 1スナップショット（レース単位）**

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | UUID PK | |
| `race_id` | UUID FK | |
| `captured_at` | TIMESTAMPTZ | 取得時刻（API `fetchedAt`） |
| `sequence` | INT | レース内連番 1,2,3… |
| `status` | VARCHAR | 出走前/直前/展示済 |
| `start_time` | VARCHAR | 表示用 |
| `last_minute` | JSONB | 天候・風・波・備考 |
| `data_source` | VARCHAR | live / mock |
| `meta` | JSONB | sourceProvider, programsCount 等 |
| IDX | | `(race_id, captured_at)` |

> **展示・直前の「その時点」** はスナップショットに紐づく `ai_scores` 行に保持。

#### `ai_scores` — **艇×スナップショット×AI（履歴の核心）**

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | UUID PK | |
| `snapshot_id` | UUID FK | |
| `race_entry_id` | UUID FK | |
| `total` | SMALLINT | 0-100 |
| `previous_total` | SMALLINT NULL | 前回スナップショットの total |
| `breakdown` | JSONB | st, exhibitionTime, lane, motor, course, lastMinute |
| `score_delta` | JSONB NULL | diff, direction, reason（既存 scoreDelta） |
| `st` | DECIMAL NULL | 検索・集計用に非正規化 |
| `exhibition_time` | DECIMAL NULL | 同上 |
| `tilt` | DECIMAL NULL | 同上 |
| UK | | `(snapshot_id, race_entry_id)` |

### 「展示後に +12点」を追跡するクエリイメージ

```sql
-- 同一艇のスナップショット間差分
SELECT
  s.captured_at,
  a.total,
  a.previous_total,
  (a.total - a.previous_total) AS diff,
  a.score_delta
FROM ai_scores a
JOIN race_snapshots s ON s.id = a.snapshot_id
JOIN race_entries e ON e.id = a.race_entry_id
WHERE e.race_id = :raceId AND e.lane = :lane
ORDER BY s.captured_at;
```

`previous_total` は **保存時** に「同一 `race_entry_id` の直前 snapshot の total」から埋める（いまの `raceMerge.js` と同じ思想をDB化）。

---

## 4. スナップショット設計（重要）

### フロー（Live `refreshRaces` 成功時）

```
Open API → normalize → applyAiScoresToRace (メモリ)
         → SnapshotRepository.saveDataset(races[])
              1. upsert racers
              2. upsert races (by external_id)
              3. upsert race_entries
              4. insert race_snapshots (+ sequence)
              5. insert ai_scores (previous_total from last snapshot)
```

### 原則

| 原則 | 内容 |
|------|------|
| **追記中心** | snapshot / ai_scores は基本 INSERT（UPDATE しない） |
| **冪等性** | 同一 `captured_at` ±数秒の重複は `ON CONFLICT DO NOTHING` または hash キーでスキップ |
| **モックは区別** | `data_source=mock` で保存可（分析時にフィルタ） |
| **読み取り** | Phase6 初期は **書き込みのみ** でも可。表示は既存メモリのまま → 段階移行 |

### sequence の決め方

```sql
SELECT COALESCE(MAX(sequence), 0) + 1 FROM race_snapshots WHERE race_id = ?
```

### 変更検知（将来 UI）

- `score_delta` JSON に既に `+12 展示好転` がある → そのまま永続化  
- スナップショット間で `exhibition_time` が NULL → 値ありに変わったタイミング = 展示確定

---

## 5. Repository 層

### ディレクトリ案

```
backend/src/
  db/
    prisma/schema.prisma    # または drizzle/schema.ts
    client.js               # PrismaClient singleton
  repositories/
    interfaces/             # TypeScript化後は .ts
      IRacerRepository.js
      IRaceRepository.js
      ISnapshotRepository.js
    prisma/
      PrismaRacerRepository.js
      PrismaRaceRepository.js
      PrismaSnapshotRepository.js
    memory/
      MemoryRaceRepository.js   # 既存（段階的に縮小）
  services/
    boatrace/raceDataService.js  # 取得は現状維持
    persistence/
      snapshotPersistenceService.js  # refresh後に repository 呼ぶ
```

### 依存の向き（重要）

```
routes → raceRepository (読み取り・API用・当面メモリ)
       → snapshotPersistenceService → ISnapshotRepository → Prisma

raceDataService (Live取得) → merge → applyAiScore
                          → snapshotPersistenceService.save()
```

**services に SQL を直書きしない。**

### インターフェース例

```javascript
// ISnapshotRepository
saveLiveDataset(races[])      // 全レース一括（トランザクション）
getLatestSnapshot(raceId)
getScoreHistory(raceEntryId)  // Phase6 末 or Phase7
```

---

## 6. Migration 方針

### Prisma の場合

| 環境 | コマンド |
|------|----------|
| 開発 | `npx prisma migrate dev --name init_phase6` |
| Render 本番 | `npx prisma migrate deploy`（Release Command） |
| 生成 | `npx prisma generate`（build 時） |

### ルール

1. **破壊的変更は新 migration** — 既存 migration は編集しない  
2. **初期データ** — `prisma/seed.js` は任意（racers は実データ取り込みで自然増）  
3. **ロールバック** — 本番は forward のみ。開発は `migrate reset` 可（Neon 開発DBのみ）  
4. **DATABASE_URL** — Render の Internal URL / Neon の pooled URL を使用  

### 環境変数（追加）

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
PERSIST_SNAPSHOTS=true   # Phase6: false なら書き込みスキップ（既存動作維持）
```

---

## 7. Phase6 実装計画（段階）

| Step | 内容 | 成果 |
|------|------|------|
| **6-1** | Prisma 導入、`schema.prisma`、初回 migrate、Neon or Render DB | DB 接続確認 |
| **6-2** | `db/client.js` + Repository 3種（racer, race, snapshot） | 書き込みパス完成 |
| **6-3** | `refreshRaces` 成功後に `saveLiveDataset`（フラグ付き） | **履歴が溜まる** |
| **6-4** | 診断 API `GET /api/admin/snapshots?raceId=`（読み取り最小） | 蓄積確認 |
| **6-5** | ドキュメント・`.env.example`・Render build 手順 | デプロイ可能 |

**Phase6 でやらないこと**

- 認証 / ユーザー別 preferences DB 化  
- 課金 / API の読み取りを DB 一本化（表示はメモリ維持可）  
- モーター履歴・場別成績・本格選手カルテ  

### 既存機能への影響

| 機能 | Phase6 |
|------|--------|
| Live 45秒更新 | 維持 + 裏で snapshot INSERT |
| お気に入り localStorage | 変更なし |
| AI 点数ロジック | 変更なし（保存前に計算済み） |
| モック fallback | `data_source=mock` で保存可（分析フィルタ） |

---

## 8. Render 構成メモ

```yaml
# イメージ
services:
  - type: web
    buildCommand: cd backend && npm install && npx prisma generate
    startCommand: cd backend && npx prisma migrate deploy && node src/index.js
  - type: pserv  # PostgreSQL
    name: boat-ai-db
```

Web サービスから DB は **Internal Database URL** を `DATABASE_URL` に設定。

---

## 9. 次のアクション（承認後）

1. Prisma 採用で問題なければ **6-1 から実装**  
2. Neon 開発用 URL または Render Postgres を用意  
3. `PERSIST_SNAPSHOTS=true` で refresh 後に行数増えることを確認  

質問・変更希望（例: Drizzle 希望、`race_snapshots` を JSON 一括のみに簡略化）があれば指示ください。
