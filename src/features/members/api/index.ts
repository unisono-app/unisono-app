import { createClient } from "@/lib/supabase/server";

export type ManagedMember = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  nickname: string | null;
  family_name: string;
  given_name: string;
  old_family_name: string | null;
  part: string | null;
  class_label: string | null;
  role: "provisional_member" | "member" | "admin";
  approval_status: "pending" | "approved";
  created_at: string;
};

export async function getAllMembers(): Promise<ManagedMember[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, display_name, avatar_url, nickname, family_name, given_name, old_family_name, part, class_label, role, approval_status, created_at"
    )
    .order("approval_status", { ascending: true }) // pending → approved
    .order("created_at", { ascending: true });

  if (error || !data) {
    console.error("getAllMembers failed:", error?.message);
    return [];
  }
  return data as ManagedMember[];
}
