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
