"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createPracticeComment(
  practiceId: string,
  body: string,
  isAnonymous: boolean
) {
  const trimmed = body.trim();
  if (!trimmed) return { error: "コメントを入力してください" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase.from("practice_comments").insert({
    practice_id: practiceId,
    user_id: user.id,
    is_anonymous: isAnonymous,
    body: trimmed,
  });

  if (error) {
    console.error("createPracticeComment failed:", error.message);
    return { error: "投稿に失敗しました" };
  }

  revalidatePath(`/practices/${practiceId}`);
  return { error: null };
}

export async function deletePracticeComment(commentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // 練習IDを取得（revalidate 用）
  const { data: comment } = await supabase
    .from("practice_comments")
    .select("practice_id")
    .eq("id", commentId)
    .single();

  const { error } = await supabase
    .from("practice_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    console.error("deletePracticeComment failed:", error.message);
    return { error: "削除に失敗しました" };
  }

  if (comment) revalidatePath(`/practices/${comment.practice_id}`);
  return { error: null };
}

export async function createAnnualScheduleComment(
  year: number,
  body: string,
  isAnonymous: boolean
) {
  const trimmed = body.trim();
  if (!trimmed) return { error: "コメントを入力してください" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase.from("annual_schedule_comments").insert({
    year,
    user_id: user.id,
    is_anonymous: isAnonymous,
    body: trimmed,
  });

  if (error) {
    console.error("createAnnualScheduleComment failed:", error.message);
    return { error: "投稿に失敗しました" };
  }

  revalidatePath("/pdfview");
  return { error: null };
}

export async function deleteAnnualScheduleComment(commentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("annual_schedule_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    console.error("deleteAnnualScheduleComment failed:", error.message);
    return { error: "削除に失敗しました" };
  }

  revalidatePath("/pdfview");
  return { error: null };
}
