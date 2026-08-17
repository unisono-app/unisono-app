/**
 * 氏名の表示形式を組み立てる。
 * 旧姓が設定されている場合は「姓（旧姓） 名」、なければ「姓 名」。
 * 併記は「今の姓（旧姓）」の順（例: 佐藤（田中） 花子）。
 */
export function formatMemberName(
  familyName: string,
  givenName: string,
  oldFamilyName?: string | null
): string {
  const trimmedOld = oldFamilyName?.trim();
  const family = trimmedOld ? `${familyName}（${trimmedOld}）` : familyName;
  return `${family} ${givenName}`;
}

type MemberNameParts = {
  nickname?: string | null;
  family_name?: string | null;
  given_name?: string | null;
  old_family_name?: string | null;
};

/**
 * ユーザー判別の統一表示名。
 * ニックネームがあればニックネーム、なければ「姓（旧姓） 名」を返す。
 * LINE 表示名（display_name）は判別表示には使わない。
 */
export function memberDisplayName(
  user: MemberNameParts | null | undefined
): string {
  if (!user) return "—";
  if (user.nickname) return user.nickname;
  if (user.family_name && user.given_name) {
    return formatMemberName(
      user.family_name,
      user.given_name,
      user.old_family_name
    );
  }
  return "—";
}
