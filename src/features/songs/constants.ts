/** 楽曲追加時にデフォルトで設定する編成（パート一覧）。表示順を兼ねる。 */
export const DEFAULT_SONG_PARTS = [
  "Alto1",
  "Alto2",
  "Prim",
  "A.Cem.",
  "Bass",
  "CG",
  "指揮",
] as const;

/**
 * プロフィールのパート（PART_OPTIONS）→ 楽曲の編成パート（DEFAULT_SONG_PARTS）の対応。
 * 楽曲追加時に、各ユーザーのプロフィールパートからこの曲でのパートを自動登録するために使う。
 */
export const PROFILE_TO_SONG_PART: Record<string, string> = {
  "1st": "Alto1",
  "2nd": "Alto2",
  Prim: "Prim",
  "A.cem.": "A.Cem.",
  Bass: "Bass",
  CG: "CG",
  指揮: "指揮",
};
