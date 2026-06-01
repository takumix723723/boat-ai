# Render 公開 — 最小手順（あなたがやることだけ）

Cursor から Render へ**直接デプロイはできません**（Render ログイン・Neon の秘密情報が必要なため）。  
リポジトリの準備は済んでいるので、以下を上から順に実施してください。

---

## 事前チェック（準備完了状況）

| 項目 | 状態 |
|------|------|
| `render.yaml` | ✅ ルートにあり（API + Static） |
| Backend build | `npm install && npm run build`（= prisma generate） |
| Backend start | `npm run start:prod`（migrate + listen） |
| Frontend build | `npm run build` → `dist/` |
| Health | `/api/health` |
| PWA | HTTPS Static でインストール可（Phase15） |
| Neon | **あなたの `DATABASE_URL` を Render に貼る** |

⚠️ **現在このフォルダは git コミット未作成**の可能性があります。Render は GitHub 連携が必要なので、先に push してください。

```powershell
cd "c:\Users\takum\OneDrive\boat ai"
git init
git add .
git commit -m "Initial commit: boat AI app"
# GitHub で空リポジトリ作成後
git remote add origin https://github.com/YOUR_USER/boat-ai.git
git push -u origin main
```

---

## あなたが必要な操作（最小 6 ステップ）

### 1. Neon（済んでいればスキップ）

1. [Neon Console](https://console.neon.tech) → プロジェクト
2. **Connection string**（Pooled 推奨）をコピー  
   例: `postgresql://...@ep-xxx.neon.tech/neondb?sslmode=require`
3. ローカルで一度でもよいなら:

   ```powershell
   cd backend
   npm run db:migrate:deploy
   ```

### 2. Render ログイン

1. https://render.com → Sign in（GitHub 連携推奨）

### 3. Blueprint 作成

1. Dashboard → **New +** → **Blueprint**
2. **Connect GitHub** → リポジトリ `boat ai` を選択
3. `render.yaml` を検出 → **Apply**
4. 作成されるサービス: `boat-ai-api`（Web）、`boat-ai-web`（Static）

### 4. Environment Variables（必須）

**boat-ai-api** → **Environment**:

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Neon の接続文字列（**必須**） |

（`PERSIST_SNAPSHOTS` / `BOATRACE_DATA_MODE` は render.yaml で既定済み）

→ **Save** → **Manual Deploy**（API）

### 5. API URL を控える → フロントに設定

1. `boat-ai-api` が **Live** になるまで待つ（初回 5〜10 分）
2. URL をコピー（例 `https://boat-ai-api.onrender.com`）
3. ブラウザで確認: `https://YOUR-API.onrender.com/api/health`  
   → `status: "ok"`, `database.ok: true` が理想

**boat-ai-web** → **Environment**:

| Key | Value |
|-----|--------|
| `VITE_API_URL` | 上記 API URL（**末尾スラッシュなし**） |

→ **Save** → **Manual Deploy**（Static・再ビルド必須）

### 6. 公開 URL を開く

- フロント: `https://boat-ai-web.onrender.com`（名前は Blueprint で付いた名称）
- レース一覧が表示されれば成功

---

## デプロイ後確認（コピペ用）

```powershell
$api = "https://YOUR-API.onrender.com"
$web = "https://YOUR-boat-ai-web.onrender.com"

Invoke-RestMethod "$api/api/health"
Invoke-RestMethod "$api/api/snapshots/stats"
# ブラウザで $web を開く
```

| 確認 | 期待 |
|------|------|
| `/api/health` | `status: ok` |
| フロント | レース一覧・下部タブ |
| PWA | Chrome「アプリをインストール」/ iPhone「ホーム画面に追加」 |

---

## 常時動作について（無料プラン）

- **15分アクセスなしで API がスリープ** → 初回アクセス 30秒〜（cold start）
- 「完全常時稼働」は有料プランが必要
- DB（Neon）と API は別サービス — **構成として問題なし**

---

## スマホ導入（PWA）

1. 公開 URL を **Safari（iPhone）** または **Chrome（Android）** で開く
2. **iPhone**: 共有 → **ホーム画面に追加**
3. **Android**: メニュー → **アプリをインストール**（または画面上部の案内）

---

## トラブル時

| 症状 | 対処 |
|------|------|
| フロントだけ API エラー | `VITE_API_URL` 誤り → 修正して **Static を再デプロイ** |
| health `degraded` | `DATABASE_URL` / Neon / `sslmode=require` |
| Blueprint 失敗 | GitHub にコードが push されているか |
| ビルド失敗 | Render Logs → `boat-ai-api` の build ログ |

詳細: [RENDER_DEPLOY.md](RENDER_DEPLOY.md)
