import type { AttendanceWithUser } from "./api";

export function formatMemberName(
  user: AttendanceWithUser["users"] | null | undefined
): string {
  if (!user) return "—";
  if (user.nickname) return user.nickname;
  if (user.family_name && user.given_name) {
    return `${user.family_name} ${user.given_name}`;
  }
  return user.display_name || "—";
}

/**
 * パート別一覧などのコンパクト表示用の氏名ラベルを、渡した並び順どおりに返す。
 * 通常は姓のみ。同一リスト内に同姓が複数いる場合のみ「姓 名」で区別する。
 */
export function rosterLabels(members: AttendanceWithUser[]): string[] {
  const familyCount = new Map<string, number>();
  for (const m of members) {
    const f = m.users?.family_name ?? "";
    familyCount.set(f, (familyCount.get(f) ?? 0) + 1);
  }
  return members.map((m) => {
    const u = m.users;
    if (!u || !u.family_name) return u?.display_name || "—";
    const isDuplicate = (familyCount.get(u.family_name) ?? 0) > 1;
    return isDuplicate && u.given_name
      ? `${u.family_name} ${u.given_name}`
      : u.family_name;
  });
}
