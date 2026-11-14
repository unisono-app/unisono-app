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
- `main`・`develop`・`release/**` への直接 push は禁止。必ず PR 経由でマージする

## ブランチ運用フロー

複数の機能追加・改修を月単位でまとめて確認してからリリースするため、`develop` と作業ブランチの間に月次の統合ブランチ `release/YYYY-MM`（例: `release/2026-11`）を挟む。

```
main ← develop ← release/YYYY-MM ← 作業ブランチ（feat/fix/…）
```

- **`main`**: リリース済み（本番・Vercel 本番デプロイ対象）。
- **`develop`**: **常にリリース可能な線**（`main` と同等＋緊急修正）。月次ブランチの分岐元であり、緊急修正の経路。
- **`release/YYYY-MM`**: その月の機能追加・改修を集約して確認する統合ブランチ。`develop` から作成する。
- **作業ブランチ**: 月次ブランチから分岐し、月次ブランチへ PR でマージする。

手順:

1. 月初に最新の `develop` から `release/YYYY-MM` を作成して push する（ルールセットの対象は `release/**`）。
2. 着手前に `git switch -c <type>/<short-description> origin/release/YYYY-MM` で作業ブランチを作成する（1 機能 = 1 ブランチ = 1 PR）。
3. 作業ブランチ → `release/YYYY-MM` へ PR を作成し、セルフレビュー後にマージする。マージ後はローカルの月次ブランチを `git pull --ff-only` で同期し、マージ済みの作業ブランチを削除する。
4. 月内の確認が取れたら `release/YYYY-MM` → `main` へリリース PR を作成する。マージ後、`main` → `develop` の PR で `develop` を `main` に揃える。

緊急修正（脆弱性対応など、月次のリリースを待てないもの）:

1. `develop` から作業ブランチを切り、`develop` へ PR → `develop` → `main` へリリース PR。
2. リリース後、`release/YYYY-MM` に `git merge origin/develop` で取り込み、月次ブランチを最新に保つ。

DB（Supabase）に関する注意:

- Supabase は本番 1 つのみで、`supabase db push` は即座に本番へ反映される。月内はコードのリリースより DB が先行する。
- そのためマイグレーションは、稼働中の本番コードを壊さない**加算的なもの**（nullable カラム追加など）に限る。カラム削除・改名・型変更などの破壊的変更は、リリースと同時に行う。

Vercel: `develop` と `release/*` の Preview デプロイは `vercel.json` で無効化している（認証・admin 操作が Preview では動かないため、確認はローカルで行う）。

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
