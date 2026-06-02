# データ取得（Phase2）

## 取得先

| データ | 取得先 | エンドポイント（v2） |
|--------|--------|----------------------|
| 出走表・レース一覧 | [Boatrace Open API for Programs](https://github.com/BoatraceOpenAPI/programs) | `https://boatraceopenapi.github.io/programs/v2/today.json` |
| 展示・直前（気象含む） | [Boatrace Open API for Previews](https://github.com/BoatraceOpenAPI/previews) | `https://boatraceopenapi.github.io/previews/v2/today.json` |
| レース結果（着順） | [Boatrace Open API for Results](https://github.com/BoatraceOpenAPI/results) | `https://boatraceopenapi.github.io/results/v2/today.json` |

- **性質**: ボートレース公式サイトを元にした **非公式** オープンデータ（MIT）
- **更新間隔**: 約 **30分**（GitHub Actions cron、リアルタイムではない）
- **正確性**: 保証なし。障害時はアプリ内モックへフォールバック

### 公式サイト直接スクレイピングについて

`www.boatrace.jp` の HTML スクレイピングは **Phase2では未採用** です。

- 利用規約・負荷・HTML変更リスクが大きい
- Boatrace Open API が出走表・直前を JSON 化済み
- 取得ロジックは `backend/src/services/boatrace/` に集約しており、将来スクレイパー追加時も `normalizer.js` 経由で同一 `Race` モデルに統合可能

## 取得方法（実装）

```
openApiClient.js   → HTTP GET（Node 標準 fetch）
normalizer.js      → programs + previews を統合 Race 型へ変換
raceDataService.js → 取得・キャッシュ・フォールバック
raceRepository.js  → API 層向けインメモリ参照・手動更新
```

1. 当日（JST）の `programs` / `previews` / `results` を取得（results は失敗しても続行）
2. `race_date` + `race_stadium_number` + `race_number` で結合
3. `applyAiScoresToRace` で AI 点数付与
4. 失敗時: `mockRaces.js` へフォールバック（`BOATRACE_DATA_MODE=auto` 時）

## 制限

| 項目 | 内容 |
|------|------|
| 遅延 | 最大約30分のラグ |
| 日付 | v2 programs は **2025-05-01以降** のデータ想定 |
| 非開催日 | 空配列 → フォールバックの可能性 |
| モーター | `motorNo`（表示）+ `rate2nd`/`rate3rd`。AIモーター因子は2連/3連のみ |
| 選手成績 | Open API の全国/当地 1着・2連・3連 → `racerStats` → AI選手力因子 |
| 級 | `racer_class_number` → A1/A2/B1/B2 → AI級因子（スコア表は calibration_json） |
| 支部名 | 番号マップ未登録は `支部{n}` 表示 |
| 手動編集 | PATCH 直前情報はメモリ上書き（永続化なし） |

## 必要ライブラリ

**追加 npm 依存なし**（Node 18+ の `fetch` のみ）。

| 用途 | ライブラリ |
|------|------------|
| HTTP | 標準 `fetch` |
| API サーバー | `express`, `cors`（既存） |

将来スクレイピングを足す場合の候補: `cheerio`（HTMLパース）、`playwright`（JS描画ページ）— いずれも **現時点では未導入**。

## 環境変数

| 変数 | 既定 | 説明 |
|------|------|------|
| `BOATRACE_DATA_MODE` | `auto` | `auto` / `live` / `mock` |
| `BOATRACE_OPENAPI_BASE` | `https://boatraceopenapi.github.io` | API ベース URL |
| `BOATRACE_CACHE_TTL_MS` | `300000` | メモリキャッシュ TTL（ms） |

## API

- `GET /api/races?date=today` — 一覧 + `meta`（`closedAt`, `topScoreDelta` 含む）
- `GET /api/races/:id?date=today` — 詳細（各艇 `scoreDelta` 含む）
- `POST /api/races/refresh?date=today` — 強制再取得・前回比較で再採点
- `GET /api/ranking?limit=50` — AIランキング（`scoreDelta` 含む）

## Live更新（Phase4）

- フロントは **45秒** ごとに `POST /api/races/refresh` を実行
- バックエンドは前回キャッシュとマージし `previousAiScore` / `scoreDelta` を付与
- 非公式APIの更新遅延（最大約30分）を UI で明示
