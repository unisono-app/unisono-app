"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  const nickname = ((formData.get("nickname") as string) || "").trim() || null;
  const familyName = ((formData.get("family_name") as string) || "").trim();
  const givenName = ((formData.get("given_name") as string) || "").trim();
  const oldFamilyName =
    ((formData.get("old_family_name") as string) || "").trim() || null;
  const part = ((formData.get("part") as string) || "").trim() || null;
  const classLabel = ((formData.get("class_label") as string) || "").trim();
  const note = ((formData.get("note") as string) || "").trim() || null;

  if (!familyName || !givenName || !classLabel) {
    return { error: "必須項目をすべて入力してください" };
  }

  const { error } = await supabase
    .from("users")
    .update({
      nickname,
      family_name: familyName,
      given_name: givenName,
      old_family_name: oldFamilyName,
      part,
      class_label: classLabel,
      note,
    })
    .eq("id", user.id);

  if (error) {
    console.error("updateProfile failed:", error.message);
    return { error: "保存に失敗しました" };
  }

  revalidatePath("/profile");
  revalidatePath("/members");
  return { error: null };
}
