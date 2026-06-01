# Live取得 `fetch failed` 調査レポート

## 現象

```
[raceDataService] Live fetch failed, using mock: fetch failed
```

## 結論（要約）

| 項目 | 内容 |
|------|------|
| **直接の表示** | Node.js 18+ の `fetch()` が失敗したときの汎用メッセージ |
| **本当の原因** | ほぼ常に **`error.cause`** 側（DNS / 接続 / タイムアウト / TLS） |
| **コード上の不具合（修正済）** | `Number(process.env.BOATRACE_FETCH_RETRIES) ?? 2` は env 未設定時 **NaN** になり、**HTTP を一度も送らず** 即失敗していた |
| **今回の環境テスト** | 修正後、手動 `fetch` / `fetchLivePayload` は **200 OK** で成功 |
| **その他の推定** | 一時的なネットワーク断、サンドボックス制限、DNS 障害でも同じ `fetch failed` になる |

`fetch failed` だけでは原因特定不可。**ログ強化・retry・staleキャッシュ** で Phase4 対応済み。

---

## ① 原因候補の整理

### A. タイムアウト（timeout）

- 実装: `AbortController` + 25秒（`BOATRACE_FETCH_TIMEOUT_MS`）
- 症状: `err.name === 'AbortError'`, `timedOut: true`
- 大容量 JSON（programs 約 650KB）で遅い回線では理論上あり得る

### B. Open API 側

- ホスト: `boatraceopenapi.github.io`（GitHub Pages）
- 確認: 通常 **HTTP 200**。503/429 は retry 対象（5xx）
- 更新遅延（約30分）≠ 接続失敗

### C. fetch 設定

- ヘッダ: `Accept: application/json`, `User-Agent`
- 並列: `programs` + `previews` を **個別 retry**（片方だけ落ちてもログに残す）
- 改善: 最大 **3回試行**（既定 retry=2）、試行間 800ms×n

### D. Node fetch（undici）

- `TypeError: fetch failed` + `cause.code` が本体
- 例: `ENOTFOUND`, `ECONNREFUSED`, `ETIMEDOUT`, `UND_ERR_CONNECT_TIMEOUT`

### E. HTTPS / DNS

- `getaddrinfo ENOTFOUND` → DNS またはホスト名 typo / オフライン
- 企業プロキシ・VPN・ファイアウォールで `*.github.io` ブロックの可能性

### F. rate limit

- GitHub Pages は厳しいレート制限は稀
- 45秒ポーリング × 2 URL は通常問題にならない
- 429 受信時は HTTP エラーとしてログ（status 付き）

### G. date parameter

- `today` → `/programs/v2/today.json`（JST）
- 不正日付は `Invalid date`（fetch failed とは別メッセージ）
- **date が原因で "fetch failed" になることはほぼない**

### H. その他

- `BOATRACE_OPENAPI_BASE` の誤設定 → DNS/接続失敗
- `BOATRACE_DATA_MODE=mock` なら live は試行しない

---

## ② ログ強化（実装内容）

失敗時にコンソールへ出力:

- `programsUrl` / `previewsUrl`
- HTTP `status`（あれば）
- `error.message` / `cause.message`
- `code`（ENOTFOUND 等）
- `timedOut` 有無
- retry 試行回数
- フォールバック種別（mock / stale cache）

診断 API: `GET /api/health/fetch`

---

## ③ 安定化（実装内容）

| 対策 | 内容 |
|------|------|
| retry | 各 URL 最大 3 回（env: `BOATRACE_FETCH_RETRIES`） |
| timeout | 25秒（env: `BOATRACE_FETCH_TIMEOUT_MS`） |
| graceful fallback 1 | 過去に live 成功済みなら **stale キャッシュ** を表示 |
| graceful fallback 2 | それ以外は **モック** + UI で明示 |
| UI | `liveFetchFailed` / `fallbackReason` / `isStale` |

---

## 運用確認コマンド

```powershell
# 診断エンドポイント（backend 起動中）
curl http://localhost:3001/api/health/fetch

# 直接 Node テスト
cd backend
node -e "fetch('https://boatraceopenapi.github.io/programs/v2/today.json').then(r=>console.log(r.status)).catch(e=>console.log(e.message,e.cause))"
```

## 環境変数

| 変数 | 既定 | 説明 |
|------|------|------|
| `BOATRACE_FETCH_TIMEOUT_MS` | 25000 | 1回のタイムアウト |
| `BOATRACE_FETCH_RETRIES` | 2 | 追加リトライ回数 |
| `BOATRACE_FETCH_RETRY_DELAY_MS` | 800 | リトライ間隔基数 |
