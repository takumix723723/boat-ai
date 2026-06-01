# Phase 13 — Render 本番デプロイ手順

ローカル開発だけでなく、**常時動く競艇AI**として運用するための手順です。  
課金プランの変更・ユーザー認証・Git Push の自動化は不要 — **無料枠 + 手動デプロイ**を前提にしています。

---

## PWA（Phase 15）

フロントは **PWA 対応済み**（`vite-plugin-pwa`）。Static Site の HTTPS 配信でそのまま利用できます。

- Service Worker は **フロントのみ**（API は `VITE_API_URL` の別オリジン → オフラインキャッシュなし）
- 詳細: [PWA.md](PWA.md)

---

## 1. 構成イメージ

```
[スマホ/PCブラウザ]
        │
        ▼
┌─────────────────────┐     ┌─────────────────────┐
│  boat-ai-web        │     │  boat-ai-api        │
│  Render Static Site │────▶│  Render Web Service │
│  (React / Vite)     │ API │  (Express + Prisma) │
└─────────────────────┘     └──────────┬──────────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │  Neon PostgreSQL    │
                            │  (DATABASE_URL)     │
                            └─────────────────────┘
```

| サービス | Render 種別 | ルートディレクトリ | ビルド | 起動 |
|----------|-------------|-------------------|--------|------|
| **boat-ai-api** | Web Service (Node) | `backend` | `npm install && npm run build` | `npm run start:prod` |
| **boat-ai-web** | Static Site | `frontend` | `npm install && npm run build` | （静的配信） |

リポジトリ直下の [`render.yaml`](../render.yaml) を Blueprint として使えます（後述）。

---

## 2. 事前準備

1. **GitHub** にこのリポジトリを push（または Render が読める Git ホスト）
2. **Neon** で PostgreSQL プロジェクトを作成  
   - Connection string をコピー（`?sslmode=require` 付き推奨）
3. **Render** アカウント（https://render.com）

ローカルで DB が動くことを確認しておくと安心です:

```bash
cd backend
cp .env.example .env
# DATABASE_URL を Neon の URL に設定
npm run db:check
npm run db:migrate:deploy
```

---

## 3. Neon（データベース）

1. Neon Console → プロジェクト → **Connection string**（Pooled 推奨）
2. 形式例:

   ```
   postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
   ```

3. この文字列を後で Render の `DATABASE_URL` に貼る

マイグレーションは **API 起動時**（`start-production.js`）にバックグラウンドで `prisma migrate deploy` を試行します。  
P1002（advisory lock）でタイムアウトしても **HTTP サーバーは起動します**。  
初回スキーマ適用は Render Shell またはローカルから `npm run db:migrate:deploy` を推奨。

---

## 4. Backend（boat-ai-api）を Render に作る

### 方法 A: Blueprint（render.yaml）

1. Render Dashboard → **New** → **Blueprint**
2. リポジトリを接続 → `render.yaml` を検出
3. 作成後、**boat-ai-api** の Environment で `DATABASE_URL` を手動入力
4. **Deploy**（または Manual Deploy）

### 方法 B: 手動で Web Service を作る

1. **New** → **Web Service**
2. リポジトリを選択
3. 次のように設定:

| 項目 | 値 |
|------|-----|
| Name | `boat-ai-api`（任意） |
| Region | Singapore など（日本に近いリージョン） |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start:prod` |
| Health Check Path | `/api/health` |

4. **Environment**（Environment Variables）に以下を追加:

| Key | Value | 必須 |
|-----|-------|------|
| `DATABASE_URL` | Neon の接続文字列 | ✅ |
| `PERSIST_SNAPSHOTS` | `true` | ✅ |
| `BOATRACE_DATA_MODE` | `auto` | 推奨 |
| `NODE_ENV` | `production` | 任意（Render が付与することも） |

`PORT` は Render が自動設定するため **設定不要**。

5. **Create Web Service** → 初回ビルド完了まで待つ（5〜10分）

6. デプロイ URL をメモ（例: `https://boat-ai-api.onrender.com`）

### 環境変数の詳細

テンプレート: [`backend/.env.production.example`](../backend/.env.production.example)

| 変数 | 本番の推奨 | 説明 |
|------|------------|------|
| `DATABASE_URL` | Neon URL | Prisma / スナップショット保存 |
| `PERSIST_SNAPSHOTS` | `true` | refresh 後に DB 保存 |
| `BOATRACE_DATA_MODE` | `auto` | 実データ優先、失敗時モック |
| `BOATRACE_FETCH_TIMEOUT_MS` | `30000` | cold start 時の余裕（任意） |
| `PRISMA_LOG` | `true` | 障害時のみ（任意） |

---

## 5. Frontend（boat-ai-web）を Render に作る

1. **New** → **Static Site**
2. 同じリポジトリ
3. 設定:

| 項目 | 値 |
|------|-----|
| Name | `boat-ai-web` |
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

4. **Environment**:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | **手順4の API URL**（例 `https://boat-ai-api.onrender.com`） |

⚠️ **重要**: Vite はビルド時に `VITE_API_URL` を JS に埋め込みます。  
API の URL を変えたら **Static Site を再デプロイ**してください。

5. **Create Static Site**

SPA のため、ルーティングは `render.yaml` の rewrite または `frontend/public/_redirects` で `index.html` にフォールバックします。

テンプレート: [`frontend/.env.production.example`](../frontend/.env.production.example)

---

## 6. デプロイ後の動作確認

### 6.1 ブラウザ

1. フロント URL を開く（例: `https://boat-ai-web.onrender.com`）
2. レース一覧が表示されること
3. レース詳細 → **更新** または Live 待ちで refresh が走ること

### 6.2 API（curl / PowerShell）

```powershell
$api = "https://YOUR-API.onrender.com"

# health（DB 接続含む）
Invoke-RestMethod "$api/api/health"

# スナップショット統計
Invoke-RestMethod "$api/api/snapshots/stats"

# 精度分析
Invoke-RestMethod "$api/api/analytics/accuracy"

# データ取得 + DB保存（初回は30秒〜かかることがある）
Invoke-RestMethod "$api/api/races/refresh?date=today" -Method POST
```

### 6.3 自動スクリプト（ローカルから）

```bash
cd backend
API_URL=https://YOUR-API.onrender.com npm run verify:prod
```

チェック項目:

| 項目 | エンドポイント | 期待 |
|------|----------------|------|
| health | `GET /api/health` | `status: ok`, `database.ok: true` |
| snapshots | `GET /api/snapshots/stats` | エラーなし（件数0でも可） |
| analytics | `GET /api/analytics/accuracy` | JSON 返却 |
| refresh | `POST /api/races/refresh` | 200、レース配列 |

補助: `GET /api/health/fetch` — 外部 API 取得診断

---

## 7. 無料プランの注意

- **スピンダウン**: 15分アクセスなしで API が停止 → 次アクセスで cold start（数十秒）
- **常時稼働**が必要なら有料プランが必要（今回は対象外）
- Neon 無料枠も接続数・容量に上限あり

定期運用のイメージ:

- ユーザーが開くたびにフロントが API を叩く → スピンアップ
- または外部の cron（将来）で `POST /refresh` を定期実行

---

## 8. トラブルシューティング

| 症状 | 確認 |
|------|------|
| フロントだけ真っ白 / API エラー | `VITE_API_URL` が正しいか、**再ビルド**したか |
| health が `degraded` | `DATABASE_URL`、Neon の IP 許可、`sslmode=require` |
| `persistence.enabled: false` | `PERSIST_SNAPSHOTS=true` と `DATABASE_URL` 両方 |
| migrate 失敗で起動しない | Render Logs の Prisma エラー、Neon に DB 存在するか |
| refresh がタイムアウト | cold start → 再試行、`BOATRACE_FETCH_TIMEOUT_MS` を増やす |
| CORS エラー | 現状 `cors()` は全許可。問題時は API URL をフロントと一致確認 |

Render Logs: Dashboard → 各サービス → **Logs**

---

## 9. ファイル一覧（Phase 13）

| ファイル | 役割 |
|----------|------|
| `render.yaml` | Blueprint（API + Static） |
| `backend/package.json` | `start:prod`, `build`, `verify:prod` |
| `backend/src/routes/health.js` | DB 付きヘルス |
| `backend/.env.production.example` | 本番 env テンプレ |
| `frontend/.env.production.example` | `VITE_API_URL` テンプレ |
| `frontend/public/_redirects` | SPA フォールバック |
| `backend/scripts/verify-production.js` | スモークテスト |
| `docs/RENDER_DEPLOY.md` | 本ドキュメント |

---

## 10. まだやらないこと（意図的）

- ユーザー認証 / 課金
- GitHub → Render の自動デプロイ必須化（手動 Deploy で可）
- 本格 ML・自動重み変更

次のフェーズで cron 常時 refresh や有料常時起動を検討できます。
