"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function approveUser(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("users")
    .update({ approval_status: "approved", role: "member" })
    .eq("id", userId);

  if (error) {
    console.error("approveUser failed:", error.message);
    return { error: "承認に失敗しました" };
  }

  revalidatePath("/members");
  revalidatePath("/members/management");
  return { error: null };
}

export async function updateUserRole(
  userId: string,
  newRole: "member" | "admin"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // 最後の admin の降格をブロック
  if (newRole === "member") {
    const admin = createAdminClient();
    const { data: admins } = await admin
      .from("users")
      .select("id")
      .eq("role", "admin")
      .eq("approval_status", "approved");

    const adminIds = (admins ?? []).map((a) => a.id);
    if (adminIds.length === 1 && adminIds[0] === userId) {
      return {
        error:
          "最後の管理者は一般メンバーに変更できません。先に別のメンバーを管理者にしてください。",
      };
    }
  }

  const { error } = await supabase
    .from("users")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) {
    console.error("updateUserRole failed:", error.message);
    return { error: "ロール変更に失敗しました" };
  }

  revalidatePath("/members");
  revalidatePath("/members/management");
  return { error: null };
}
