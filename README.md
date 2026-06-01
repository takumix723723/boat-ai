# 競艇AIアナリスト (Boat Race AI Analyst)

AIがレースを総合分析する競艇アプリ（Phase1 MVP）。

## 構成

```
boat-ai/
├── backend/     # Node.js + Express API
└── frontend/    # React (Vite) スマホUI優先
```

## Phase1 / Phase2 機能

- レース一覧（締切順・カウントダウン・場フィルタ）
- AIランキング（本日の高評価艇 TOP50）
- **Live（Phase4）**: 45秒自動更新・AI再採点・点数変動表示（+/-）
- **User（Phase5）**: お気に入り場⭐・選手❤️（localStorage / 将来DB対応）

詳細: [frontend/docs/PREFERENCES.md](frontend/docs/PREFERENCES.md)

### Phase6（Data）

- PostgreSQL + Prisma スナップショット保存
- 設計: [backend/docs/PHASE6_DATA_DESIGN.md](backend/docs/PHASE6_DATA_DESIGN.md)
- DB接続・実動作確認: [backend/docs/PHASE6_DB_SETUP.md](backend/docs/PHASE6_DB_SETUP.md)
- 履歴表示（6-4）: レース詳細 `GET /api/races/:id/history` + 「AI推移」UI
- 結果検証（7）: `GET /api/races/:id/result` + 「結果 / AI検証」UI
- 精度分析（8）: `GET /api/analytics/accuracy` + 「AI精度」ページ
- 重み基盤（9）: `ai_weight_profiles` + `GET/POST /api/analytics/weights` + 精度シミュレーション
- 重み最適化（10）: `POST /api/analytics/weights/optimize`（ランダム探索）
- 最適化検証（11）: Train/Test 分割 + 過学習警告
- 選手カルテ（12）: `GET /api/racers/:id/intelligence` — ST平均・イン信頼度・AI相性・近走傾向（DB/モック集計、重み変更なし）
- **本番運用（13）**: Render + Neon — [docs/RENDER_DEPLOY.md](docs/RENDER_DEPLOY.md)、[`render.yaml`](render.yaml)
- **Watchlist（14）**: `GET /api/watchlist/events` — お気に入り・AI急上昇・締切・高評価（アプリ内通知、Push未実装）
- **PWA（15）**: インストール可能 · シェルオフライン — [docs/PWA.md](docs/PWA.md)（Push未実装）
- **自動学習（16）**: `ai_learning_runs` + `GET/POST /api/learning/*` — 重み自動探索・suggest/auto（本格MLなし）
- **実データ自動取得** + 失敗時モック
- 出走表・展示情報・直前情報（Boatrace Open API）
- 直前情報の手動上書き（メモリ）
- AI点数（0〜100、仮ロジック）

データ取得の詳細: [backend/docs/DATA_SOURCES.md](backend/docs/DATA_SOURCES.md)

## セットアップ

### Backend

```bash
cd backend
npm install
cp .env.example .env   # DATABASE_URL を設定後
npm run db:check       # DB接続確認（任意）
npm run dev
```

API: http://localhost:3001

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: http://localhost:5173

## 環境変数

### ローカル

| 変数 | 場所 | 説明 |
|------|------|------|
| `PORT` | backend | APIポート（既定 3001） |
| `BOATRACE_DATA_MODE` | backend | `auto` / `live` / `mock` |
| `DATABASE_URL` | backend | PostgreSQL 接続文字列 |
| `PERSIST_SNAPSHOTS` | backend | `true` で refresh 後に DB 保存 |

例: `backend/.env.example` / `frontend/.env.example`

### 本番（Render）

| 変数 | サービス | 説明 |
|------|----------|------|
| `DATABASE_URL` | boat-ai-api | Neon 接続文字列 |
| `PERSIST_SNAPSHOTS` | boat-ai-api | `true` 推奨 |
| `BOATRACE_DATA_MODE` | boat-ai-api | `auto` 推奨 |
| `VITE_API_URL` | boat-ai-web | API の URL（ビルド時に埋め込み） |

詳細テンプレ: `backend/.env.production.example` / `frontend/.env.production.example`

## デプロイ（Render + Neon）

初心者向け手順: **[docs/RENDER_DEPLOY.md](docs/RENDER_DEPLOY.md)**

| サービス | Root | Build | Start / Publish |
|----------|------|-------|-----------------|
| API | `backend` | `npm install && npm run build` | `npm run start:prod` |
| UI | `frontend` | `npm install && npm run build` | `dist`（Static Site） |

- Health: `GET /api/health`（DB 接続チェック付き）
- デプロイ確認: `API_URL=https://xxx.onrender.com npm run verify:prod`（backend 内）
- Blueprint: リポジトリ直下の `render.yaml`

## 将来拡張（構造のみ意識）

- `backend/src/services/` … AIスコア・データ取得
- `backend/src/data/` … 将来DB・選手マスタ
- `frontend/src/types/` … 点数変化履歴など
