@AGENTS.md

# UnisOno App — 開発規則

## プロジェクト概要

クラシックギター合奏の社会人団体「UnisOno」の専用Webアプリ。
技術スタック: Next.js (App Router) + Supabase + Vercel。
詳細は `docs/` 配下のドキュメントを参照。

## ブランチ命名規則

```
<type>/<short-description>
```

| type | 用途 | 例 |
|------|------|-----|
| feat | 新機能 | `feat/practice-list` |
| fix | バグ修正 | `fix/attendance-update-error` |
| docs | ドキュメントのみ | `docs/add-dev-guide` |
| refactor | リファクタリング | `refactor/extract-auth-utils` |
| chore | 設定・依存関係等 | `chore/update-dependencies` |

- 英語小文字 + ハイフン区切り
- `main`・`develop` への直接 push は禁止。必ず PR 経由でマージする

## ブランチ運用フロー

継続的な開発のため、`main` と作業ブランチの間に統合ブランチ `develop`（リリース前開発ブランチ）を挟む。

```
main ← develop ← 作業ブランチ（feat/fix/…）
```

- **`main`**: リリース済み（本番相当・Vercel 本番デプロイ対象）。直接 push 禁止。
- **`develop`**: リリース前開発ブランチ。次リリースの統合先。直接 push 禁止。
- **作業ブランチ**: `develop` から分岐し、`develop` へ PR でマージする。

手順:

1. 着手前に `git switch -c <type>/<short-description> origin/develop` で作業ブランチを作成する（1 機能 = 1 ブランチ = 1 PR）。
2. 作業ブランチ → `develop` へ PR を作成し、セルフレビュー後にマージする。
3. マージ後はローカル `develop` を `git pull --ff-only origin develop` で同期し、マージ済みの作業ブランチを削除する。
4. リリース時に `develop` → `main` へ PR を作成し、まとめてリリースする。`main` への反映はこの経路のみとする。

## コミットメッセージ規則

```
<type>: <summary>
```

- type はブランチ命名規則と同じ（feat, fix, docs, refactor, chore）
- summary は英語で簡潔に（50文字以内目安）
- 本文が必要な場合は空行を挟んで日本語で補足可

例:
```
feat: add practice list page
fix: correct attendance status update logic
docs: update design requirements for song management
```

## PR 規則

- タイトル: コミットメッセージと同じ `<type>: <summary>` 形式
- 本文: 変更内容の要約 + テスト方針を記載
- main ブランチに向けて作成する
- セルフレビューを行ってからマージする
