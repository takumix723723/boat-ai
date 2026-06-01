# UserPreferences（Phase5）

## localStorage キー

```
boat-ai-user-preferences-v1
```

## 保存 JSON 構造

```json
{
  "version": 1,
  "favoriteVenues": [
    { "venueCode": "03", "venueName": "江戸川", "addedAt": "2026-06-01T12:00:00.000Z" }
  ],
  "favoriteRacers": [
    { "racerId": "4123", "name": "山田太郎", "addedAt": "2026-06-01T12:00:00.000Z" }
  ],
  "updatedAt": "2026-06-01T12:00:00.000Z"
}
```

- **venueCode** … 安定 ID（DB: `stadiums.code`）
- **racerId** … 登録番号（DB: `racers.id`）
- **name / venueName** … 表示用キャッシュ（将来サーバー正と同期）

## アーキテクチャ

```
UI → getPreferencesService() → PreferencesService
                                    ↓
                          PreferencesProvider (interface)
                                    ↓
                    LocalStoragePreferencesAdapter  ← 現在
                    ApiPreferencesAdapter(userId)   ← 将来
```

### 主要 API

| メソッド | 用途 |
|----------|------|
| `getPreferences()` | 全体取得 |
| `savePreferences(patch)` | 部分更新 |
| `getFavoriteVenues()` | お気に入り場一覧 |
| `toggleFavoriteVenue(code, name)` | ⭐トグル |
| `getFavoriteRacers()` | お気に入り選手一覧 |
| `toggleFavoriteRacer(id, name)` | ❤️トグル |

同期: 同一タブは `boat-ai-preferences-updated`、別タブは `storage` イベント。

## 将来 DB 移行

1. `ApiPreferencesAdapter` を追加（`GET/PUT /api/users/me/preferences`）
2. `getPreferencesService(adapter)` でログイン後に差し替え
3. JSON スキーマはそのまま PostgreSQL `jsonb` または正規化:

```sql
-- 例
user_favorite_venues (user_id, venue_code, created_at)
user_favorite_racers (user_id, racer_id, created_at)
```

4. 初回ログイン時に localStorage → サーバーへマージするマイグレーション関数を1本追加するだけでよい
