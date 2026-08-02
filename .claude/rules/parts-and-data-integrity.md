---
paths:
  - "src/features/songs/**"
  - "src/features/users/**"
---

# パート / データ整合の規約

## パートの対応関係

- プロフィール所属パート `PART_OPTIONS`（`1st, 2nd, Prim, A.cem., Bass, CG, 指揮`）と、楽曲編成パートは別概念。
- プロフィール → 楽曲編成パートの対応は `src/features/songs/constants.ts` の `PROFILE_TO_SONG_PART`（`1st→Alto1 / 2nd→Alto2 / Prim→Prim / A.cem.→A.Cem. / Bass→Bass / CG→CG / 指揮→指揮`）。
- 楽曲追加時のデフォルト編成は `DEFAULT_SONG_PARTS`。

## 自動登録のルール

- 楽曲の編成パートへの各メンバー自動登録は **approved メンバーのみ**、**編成に含まれるパートのみ**、**既存登録は上書きしない**（`ignoreDuplicates` / `ON CONFLICT DO NOTHING`）。
- **Prim 例外**: 編成に `Prim` が無い曲（`Prim1`/`Prim2` を使う曲）では、プロフィール Prim のメンバーは登録しない。
- 承認時の既存全楽曲への登録は暫定対応で、環境変数 `BACKFILL_ON_APPROVE=true` のときのみ有効（受け入れ期間終了時にフラグを外す）。恒久仕様は「新規楽曲追加時のみ登録」。

## 既知の未対応

- 既存の approved ユーザーが後からプロフィールのパートを変更しても、`song_user_parts` は自動追従しない。パート変更に伴う再同期が必要な場合は個別対応（過去に「指揮」でデータ是正マイグレーションを実施した経緯あり）。
