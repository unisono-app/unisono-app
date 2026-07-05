"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLineUid } from "@/lib/auth/get-current-app-user";

export async function registerUser(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const lineUid = getLineUid(user);
  if (!lineUid) {
    redirect("/login");
  }

  const displayName = user.user_metadata?.display_name ?? "";
  const avatarUrl = user.user_metadata?.avatar_url ?? null;

  // 既存レコードチェック（冪等性）
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("users")
    .select("id, approval_status")
    .eq("line_uid", lineUid)
    .single();

  if (existing) {
    if (existing.approval_status === "approved") {
      redirect("/practices");
    }
    redirect("/approval-pending");
  }

  // フォームデータ取得
  const nickname = (formData.get("nickname") as string) || null;
  const familyName = formData.get("family_name") as string;
  const givenName = formData.get("given_name") as string;
  const oldFamilyName = (formData.get("old_family_name") as string) || null;
  const part = (formData.get("part") as string) || null;
  const classLabel = formData.get("class_label") as string;
  const note = (formData.get("note") as string) || null;

  if (!familyName || !givenName || !classLabel) {
    return { error: "必須項目をすべて入力してください" };
  }

  const { error } = await admin.from("users").insert({
    id: user.id,
    line_uid: lineUid,
    display_name: displayName,
    avatar_url: avatarUrl,
    nickname,
    family_name: familyName,
    given_name: givenName,
    old_family_name: oldFamilyName,
    part,
    class_label: classLabel,
    note,
  });

  if (error) {
    if (error.code === "23505") {
      redirect("/approval-pending");
    }
    console.error("Register: INSERT failed", error.message);
    return { error: "登録に失敗しました。もう一度お試しください。" };
  }

  redirect("/approval-pending");
}
