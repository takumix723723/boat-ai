# Phase 15 — PWA / スマホアプリ化

Web を **インストール可能なアプリ**として使えるようにした構成です。  
**Push 通知・認証は未実装**です。

---

## 構成（Render との相性）

| 層 | ホスト | PWA との関係 |
|----|--------|----------------|
| フロント | Render **Static Site** | Service Worker のスコープは **フロントのオリジンのみ** |
| API | Render **Web Service**（別 URL） | `VITE_API_URL` で fetch — SW はキャッシュしない |

→ **Static + API 分離は PWA として問題なし**。  
オフライン時はシェル（UI）のみ表示し、API は既存のエラー表示に任せます。

本番では必ず **HTTPS**（Render 既定）で配信してください。

---

## 追加ファイル

| ファイル | 役割 |
|----------|------|
| `frontend/vite.config.js` | `vite-plugin-pwa`（manifest + Workbox） |
| `frontend/public/pwa-192x192.png` | マニフェスト用アイコン（仮） |
| `frontend/public/pwa-512x512.png` | 同上 |
| `frontend/public/apple-touch-icon.png` | iOS ホーム画面 |
| `frontend/public/favicon.svg` | ブラウザタブ |
| `frontend/src/components/PwaInstallBanner.jsx` | インストール案内 UI |

ビルド後: `dist/sw.js`, `dist/manifest.webmanifest` が自動生成されます。

---

## オフライン範囲

| 対象 | オフライン |
|------|------------|
| `index.html` / JS / CSS | ✅ precache（シェル） |
| アイコン・静的アセット | ✅ precache |
| SPA ルート（`/watch` 等） | ✅ `navigateFallback` → `index.html` |
| `/api/*`（同一オリジン） | 対象外（本番は別ドメイン） |
| バックエンド API | ❌ キャッシュしない（オンライン必須） |

---

## インストール確認方法

### Android（Chrome）

1. `npm run build && npm run preview` または Render の本番 URL（HTTPS）
2. 上部バナー「インストール」、またはメニュー → **アプリをインストール**
3. ホーム画面のアイコンから起動 → ステータスバーがアプリ表示（`standalone`）

### iPhone（Safari）

1. 本番または preview を **Safari** で開く（Chrome iOS は制限あり）
2. 共有 → **ホーム画面に追加**
3. 追加したアイコンから起動 → ブラウザ UI が消える

### 開発者ツール

- Chrome DevTools → **Application** → Manifest / Service Workers
- Lighthouse → PWA チェック

### スタンドアロン判定

```js
window.matchMedia('(display-mode: standalone)').matches
```

---

## ローカル開発

```bash
cd frontend
npm run dev
```

`devOptions.enabled: true` のため開発中も SW が有効です。挙動が怪しいときは Application → Clear storage。

---

## 未実装（意図的）

- Web Push / FCM
- バックグラウンド同期
- API のオフラインキャッシュ
- ネイティブストア配信

---

## アイコン差し替え

`frontend/public/pwa-512x512.png` を差し替え → 同内容を `pwa-192x192.png` / `apple-touch-icon.png` にも反映 → 再ビルド。
