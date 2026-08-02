---
paths:
  - "supabase/migrations/**"
  - "src/features/**/api/**"
---

# Supabase マイグレーション / RLS

## マイグレーション

- 手順: `supabase migration new <name>` → SQL 記述 → `supabase db push`（DB Password は環境変数 `SUPABASE_DB_PASSWORD` で自動読込）。
- **適用済みのマイグレーションは編集しない**。修正・是正は必ず新しいマイグレーションファイルを追加する（本番とリポジトリの乖離を防ぐ）。
- データ変更マイグレーションは、適用前に本番の実データに対して読み取りのみで結果件数を検証してから push する。

## RLS ヘルパー（再利用する）

- `is_admin()` / `is_approved_member()`（他に `user_role_of()` / `user_approval_of()` / `user_row_of()`）。
- 新テーブルの RLS は per-user 所有パターン（`practice_attendances`）を踏襲: SELECT = `is_approved_member()`、INSERT/UPDATE/DELETE = `auth.uid() = user_id AND is_approved_member()`。

## `users` 書き込みの RLS（厳格化済み）

- role 変更 = admin のみ / approval_status 変更 = approved member のみ。
- **他人のプロフィール項目の変更は admin でも RLS で拒否**（RESTRICTIVE ポリシー(c)）。自分自身の行（own row）更新は許可。
- RLS を跨ぐ正当な特権操作（他ユーザー分の書き込み等）は、admin クライアント（service_role）＋アプリ側の権限チェックで行う。呼び出し元の権限は Server Action 側で必ず検証する。

## 例外・監視

- 例外は自動で Sentry に送信される（無料枠 5,000 errors/月）。想定内のエラーは throw せず握って返す。
