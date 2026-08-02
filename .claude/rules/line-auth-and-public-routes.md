---
paths:
  - "src/lib/auth/**"
  - "src/proxy.ts"
  - "src/app/auth/**"
  - "src/app/login/**"
  - "src/app/register/**"
---

# LINE 認証 / 公開ルート

## LINE Login（手動 OAuth 実装）

- Supabase Custom OIDC は LINE の HS256 署名と非互換のため、手動 OAuth で実装している。
- フロー: `auth/login` → LINE → `auth/callback` で code 交換 → `admin.createUser` + `generateLink` + `verifyOtp` でセッション作成。
- Auth の email は `line_${lineUid}@unisono.local` を小文字化して使う（Supabase が内部で lowercase 化するため）。
- 既存ユーザーの照合は `public.users.line_uid` で行う（`listUsers` は ERR_CONNECTION_CLOSED の原因になるため使わない。フォールバック用途のみ）。

## 公開（未認証）ルート

- 新しい未認証ルートを追加したら **`src/proxy.ts` の matcher 除外に必ず追加する**（でないと未認証で `/login` にリダイレクトされる）。既存除外例: `api/health`, `monitoring`。
- `/monitoring` は Sentry トンネルの予約ルート（機能では使わない）。
- `src/proxy.ts` はセッション更新＋粗い導線制御のみ（Next.js 16 で `middleware.ts` からリネーム済み）。
