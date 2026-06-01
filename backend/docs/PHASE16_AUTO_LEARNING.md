# Phase 16 — Auto Learning

## 概要

過去の結果付きスナップショットから `optimizeWeights`（ランダム探索）を自動実行し、改善時のみ重み候補を保存します。本格 ML は使いません。

## DB

```bash
cd backend
npm run db:migrate:deploy
```

テーブル: `ai_learning_runs`

## モード（`AI_LEARNING_MODE`）

| モード | 動作 |
|--------|------|
| `manual` | 自動実行なし（`POST /api/learning/run` + `force:true` のみ） |
| `suggest` | **既定** — 改善時に候補プロファイル保存（`pending`）、手動採用 |
| `auto` | 改善時に `setActive: true` で自動採用 |

## スケジューラ

- **1日1回**: `learningScheduler.js` — UTC `AI_LEARNING_DAILY_HOUR_UTC`（既定 19 = JST 04:00 頃）
- **refresh 後**: `snapshotPersistence` 成功 → 60秒デバウンス → 条件満たせば実行

## 安全条件

- 過学習警告時はスキップ
- 改善幅 `< AI_LEARNING_MIN_IMPROVEMENT`（既定 1pt）はスキップ
- クールダウン `AI_LEARNING_COOLDOWN_HOURS`（既定 12h）
- refresh トリガー: 前回比 `AI_LEARNING_MIN_NEW_RACES` 以上の増分

## API

- `GET /api/learning/status`
- `GET /api/learning/runs`
- `POST /api/learning/run` — body: `{ force?, trials? }`
- `POST /api/learning/runs/:id/apply` — pending を採用
