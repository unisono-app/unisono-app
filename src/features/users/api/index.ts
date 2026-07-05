import { createClient } from "@/lib/supabase/server";

export type RosterUser = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  nickname: string | null;
  family_name: string;
  given_name: string;
  old_family_name: string | null;
  part: string;
  class_label: string;
  note: string | null;
};

export async function getApprovedUsers(): Promise<RosterUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select(
      "id, display_name, avatar_url, nickname, family_name, given_name, old_family_name, part, class_label, note"
    )
    .eq("approval_status", "approved")
    .order("part", { ascending: true })
    .order("class_label", { ascending: true })
    .order("family_name", { ascending: true });

  if (error || !data) {
    console.error("getApprovedUsers failed:", error?.message);
    return [];
  }

  return data as RosterUser[];
}

const PART_ORDER = ["1st", "2nd", "Prim", "A.cem.", "Bass", "CG"];

export function groupByPart(
  users: RosterUser[]
): { part: string; members: RosterUser[] }[] {
  const map = new Map<string, RosterUser[]>();
  for (const u of users) {
    const list = map.get(u.part) ?? [];
    list.push(u);
    map.set(u.part, list);
  }

  // 既知のパート順 → 未知のパート（アルファベット順）の順で並べる
  const known = PART_ORDER.filter((p) => map.has(p)).map((part) => ({
    part,
    members: map.get(part)!,
  }));
  const unknown = Array.from(map.keys())
    .filter((p) => !PART_ORDER.includes(p))
    .sort()
    .map((part) => ({ part, members: map.get(part)! }));

  return [...known, ...unknown];
}

export type UserProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  nickname: string | null;
  family_name: string;
  given_name: string;
  old_family_name: string | null;
  part: string;
  class_label: string;
  affiliation: string | null;
  note: string | null;
};

export async function getMyProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select(
      "id, display_name, avatar_url, nickname, family_name, given_name, old_family_name, part, class_label, affiliation, note"
    )
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}
