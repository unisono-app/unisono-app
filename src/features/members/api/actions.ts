"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUser } from "@/lib/auth/get-current-app-user";
import { registerUserToExistingSongs } from "@/features/songs/api/backfill";

export async function approveUser(userId: string) {
  // 呼び出し元の権限チェック（DB の RLS と多層防御）
  const current = await getAppUser();
  if (
    current.status !== "approved" ||
    !["member", "admin"].includes(current.appUser.role)
  ) {
    return { error: "承認権限がありません" };
  }

  const admin = createAdminClient();
  const { data: target, error: fetchError } = await admin
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();
  if (fetchError || !target) {
    return { error: "対象ユーザーが見つかりません" };
  }

  // provisional_member のときだけ member へ昇格し、既存の role は変更しない
  const update: { approval_status: "approved"; role?: "member" } = {
    approval_status: "approved",
  };
  if (target.role === "provisional_member") {
    update.role = "member";
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update(update)
    .eq("id", userId);

  if (error) {
    console.error("approveUser failed:", error.message);
    return { error: "承認に失敗しました" };
  }

  // 【暫定対応】受け入れ期間中は、承認時に既存の全楽曲へ担当パートを自動登録する。
  // 期間終了後は環境変数 BACKFILL_ON_APPROVE を外す（恒久仕様は新規楽曲追加時のみ登録）。
  if (process.env.BACKFILL_ON_APPROVE === "true") {
    await registerUserToExistingSongs(userId);
    revalidatePath("/songs");
  }

  revalidatePath("/members");
  revalidatePath("/members/management");
  return { error: null };
}

export async function updateUserRole(
  userId: string,
  newRole: "member" | "admin"
) {
  // 呼び出し元が admin であることを要求（DB の RLS と多層防御）
  const current = await getAppUser();
  if (current.status !== "approved" || current.appUser.role !== "admin") {
    return { error: "この操作には管理者権限が必要です" };
  }

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

  const supabase = await createClient();
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
