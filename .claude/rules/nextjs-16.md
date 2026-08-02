---
paths:
  - "**/*.{ts,tsx}"
---

# Next.js 16 の注意

- このプロジェクトの Next.js は破壊的変更を含み、API・規約・ファイル構成が学習データと異なる場合がある。**コードを書く前に `node_modules/next/dist/docs/` の該当ガイドを読む**（`@AGENTS.md` と同旨）。
- 非推奨（deprecation）警告には従う。
- `middleware.ts` は `src/proxy.ts` にリネーム済み（Next.js 16）。ミドルウェア相当の処理は `src/proxy.ts` に置く。
- `next.config.ts` は `withSentryConfig` でラップ済み（編集時は維持する）。`src/app/global-error.tsx` が全体のエラーバウンダリ。
- ローカル開発は IPv4 優先が必須（`package.json` の dev に `NODE_OPTIONS='--dns-result-order=ipv4first'` 設定済み。IPv6 タイムアウト対策）。
