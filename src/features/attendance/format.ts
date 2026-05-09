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
