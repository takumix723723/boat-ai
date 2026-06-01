# Phase6 DB 実動作確認ガイド（Neon 前提）

新機能の追加は行わず、**スナップショットが DB に保存されること**だけを確認する手順です。

---

## 1. 現在の接続準備状況（このリポジトリ）

| 項目 | 状態 |
|------|------|
| `backend/.env` | **未作成**（`.env.example` のみ） |
| `DATABASE_URL` | **未設定** |
| `PERSIST_SNAPSHOTS` | 例では `false`（保存オフ） |
| Prisma schema / migration | 済（`npm run db:migrate:deploy` は DB 作成後に実行） |

ローカル API は **メモリキャッシュのみ**で動作します。`GET /api/snapshots/stats` は `DATABASE_URL is not configured` を返します（想定どおり）。

### Neon と Render Postgres、どちらを使う？

| 用途 | 推奨 |
|------|------|
| **今（ローカル実動作確認）** | **Neon** |
| **将来（本番 API を Render に載せる）** | Render Web + **Neon** または **Render Postgres** |

**今の構成では Neon を推奨します。**

- 無料枠で始めやすく、ブラウザだけで DB 作成できる（Docker 不要）
- 接続文字列を `.env` に貼るだけで、ローカルの `npm run dev` と Prisma がそのまま使える
- 本番も Render Web から **外部の Neon** に繋ぐ構成が一般的（DB と API を別サービスに分離）

**Render Postgres** は、API も DB もすべて Render 内に閉じたいとき向け。開発用に Render だけ触るより、まず Neon で schema / 保存確認を済ませる方が手順が少ないです。

---

## 2. Neon で DB 作成〜接続（初心者向け）

### 2-1. Neon でプロジェクト作成

1. https://neon.tech にアクセスし、アカウント作成（GitHub ログイン可）
2. **New Project** をクリック
3. 名前例: `boat-ai-dev`、リージョンは **Asia (Singapore)** など近いものを選択
4. 作成完了まで待つ（数十秒）

### 2-2. 接続 URL の取得場所

1. Neon ダッシュボードで対象プロジェクトを開く
2. 左メニュー **Dashboard** または **Connection Details**
3. **Connection string** を表示
4. 形式例（値はあなたの画面のものを使う）:

   ```
   postgresql://USER:PASSWORD@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

   - **Pooled** と **Direct** がある場合  
     - ローカル開発・Prisma migrate: まず **Direct**（またはデフォルトの非 pooled）で問題ないことが多い  
     - 本番の高並行時は pooled URL を検討（Phase6 確認ではどちらでも可）

5. **コピー** ボタンで全文コピー（パスワードが含まれるので他人に送らない）

### 2-3. `.env` を作る

Cursor が `backend/.env` を用意済みの場合は **DATABASE_URL の行だけ** 設定すればよい。

手動で作る場合:

```powershell
cd "c:\Users\takum\OneDrive\boat ai\backend"
Copy-Item .env.example .env
```

**URL をコマンドで入れる（推奨・チャットに貼る場合も Cursor が代行可）:**

```powershell
npm run db:set-url -- "postgresql://USER:PASSWORD@ep-xxxx.neon.tech/neondb?sslmode=require"
```

`.env` をエディタで開き、次を設定:

```env
PORT=3001
BOATRACE_DATA_MODE=mock

# Neon からコピーした文字列をそのまま貼る（引用符は不要）
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx....neon.tech/neondb?sslmode=require

# 実動作確認では true にする
PERSIST_SNAPSHOTS=true
```

- `mock` にすると Open API 不要でレースデータが入り、保存確認がしやすい
- 実データで試す場合は `BOATRACE_DATA_MODE=auto` でも可

**注意:** `.env` は Git にコミットしない（`.gitignore` 済み）。

### 2-4. マイグレーション（テーブル作成）

```powershell
cd "c:\Users\takum\OneDrive\boat ai\backend"
npm install
npm run db:migrate:deploy
```

成功すると `Applying migration 20250601120000_init_phase6` のような表示が出ます。

### 2-5. 接続だけ先に確認

```powershell
npm run db:check
```

期待する出力例:

```
[check-db] OK: PostgreSQL に接続できました
[check-db] Table counts
  racers:         0
  ...
```

### 2-6. API 起動確認

```powershell
npm run dev
```

別ターミナル:

```powershell
Invoke-RestMethod http://localhost:3001/api/health | ConvertTo-Json
```

`persistence.enabled` が **`true`** であること。

---

## 3. DB 接続後の検証手順

### 3-1. refresh でスナップショット保存

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3001/api/races/refresh"
```

もう一度実行すると、同じレースの `sequence` が 2, 3... と増えます。

### 3-2. 件数 API

```powershell
Invoke-RestMethod http://localhost:3001/api/snapshots/stats | ConvertTo-Json -Depth 5
```

確認ポイント:

- `stats.enabled`: `true`
- `stats.totalSnapshots`: refresh のたびに **レース数分ずつ** 増える（mock ならレース数 × refresh 回数）
- `stats.latestCapturedAt`: 直近の ISO 時刻

レース単位:

```powershell
# モックの id は GET /api/races で先頭レースの id を確認
Invoke-RestMethod "http://localhost:3001/api/snapshots/stats?raceId=20260601-toda-11"
```

### 3-3. Prisma Studio

```powershell
cd backend
npm run db:studio
```

ブラウザで `race_snapshots` / `ai_scores` に行が増えていることを確認。

### 3-4. `totalSnapshots` が増えないとき

| 確認 | 対処 |
|------|------|
| `GET /api/health` の `persistence.enabled` | `false` なら `.env` で `PERSIST_SNAPSHOTS=true` と `DATABASE_URL` を設定し **API 再起動** |
| `npm run db:check` | 接続・マイグレーション失敗なら URL / `db:migrate:deploy` |
| refresh の HTTP | 200 で返っているか（500 なら別問題） |
| backend コンソール | `[snapshotPersistence] saved` が出るか / `save failed` が出ていないか |
| `BOATRACE_DATA_MODE=mock` | レース 0 件なら保存されない。mock または live でデータありを確認 |
| stats の `error` フィールド | `DATABASE_URL is not configured` などメッセージを読む |
| Neon ダッシュボード | プロジェクトが **Suspended** になっていないか |

保存失敗時も **refresh API 自体は 200** のままです。必ずサーバーログを見てください。

---

## 4. コマンド一覧

| コマンド | 意味 |
|----------|------|
| `npm run db:check` | 接続 + テーブル件数確認 |
| `npm run db:migrate:deploy` | 本番相当の migration 適用 |
| `npm run db:studio` | ブラウザでデータ閲覧 |
| `npm run dev` | API 起動（`.env` を読むのは Node 起動時の環境。Prisma CLI は自動で `.env`） |

**補足:** `npm run dev` / `npm start` は起動時に `backend/.env` を自動読み込みします（`src/index.js`）。`.env` を変更したら **API を再起動**してください。

`npm run db:check` と `prisma migrate` も同じ `.env` を参照します（`scripts/loadEnv.js`）。

---

## 5. 失敗時の見方

### `npm run db:check`

- `DATABASE_URL が設定されていません` → `.env` 未作成 or 変数名 typo
- `P1001` / `Can't reach database server` → URL 誤り、Neon 停止、ファイアウォール
- `relation "race_snapshots" does not exist` → `npm run db:migrate:deploy` 未実行

### `npm run db:migrate:deploy`

- `Environment variable not found: DATABASE_URL` → `.env` が backend に無い、または Prisma が読めないパス

### API / refresh

- `[snapshotPersistence] save failed` → ログの `message` / `code` を確認（トランザクションタイムアウト、制約違反など）

### stats API

```json
"enabled": false
```

→ `PERSIST_SNAPSHOTS` または `DATABASE_URL` がプロセスに渡っていない（API 再起動・env 読み込みを確認）

---

## 6. スコープ外（実装しない）

- Phase6-4 以降の DB **読み取り** API
- 選手カルテ本格化
- 認証・課金
