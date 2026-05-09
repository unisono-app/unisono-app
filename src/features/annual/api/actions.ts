"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** 新版を追加: 既存の現版を旧版に降格し、新規レコードを is_current=true で挿入 */
export async function addAnnualScheduleVersion(
  year: number,
  pdfUrl: string,
  fileLabel: string | null
) {
  if (!year || !pdfUrl) {
    return { error: "年度と PDF URL は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const admin = createAdminClient();

  // 既存の最大 version_number を取得
  const { data: maxRows } = await admin
    .from("annual_schedules")
    .select("version_number")
    .eq("year", year)
    .order("version_number", { ascending: false })
    .limit(1);

  const nextVersion =
    maxRows && maxRows.length > 0 ? maxRows[0].version_number + 1 : 1;

  // 既存の現版を降格
  const { error: demoteError } = await admin
    .from("annual_schedules")
    .update({ is_current: false })
    .eq("year", year)
    .eq("is_current", true);
  if (demoteError) {
    console.error("addAnnualScheduleVersion (demote) failed:", demoteError.message);
    return { error: "既存版の更新に失敗しました" };
  }

  // 新版を挿入
  const { error: insertError } = await admin.from("annual_schedules").insert({
    year,
    version_number: nextVersion,
    file_label: fileLabel,
    pdf_url: pdfUrl,
    is_current: true,
  });

  if (insertError) {
    console.error("addAnnualScheduleVersion (insert) failed:", insertError.message);
    return { error: "新版の追加に失敗しました" };
  }

  revalidatePath("/annual");
  return { error: null };
}

/** 既存版を編集（URL とラベルのみ） */
export async function updateAnnualScheduleVersion(
  scheduleId: string,
  pdfUrl: string,
  fileLabel: string | null
) {
  if (!pdfUrl) return { error: "PDF URL は必須です" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("annual_schedules")
    .update({ pdf_url: pdfUrl, file_label: fileLabel })
    .eq("id", scheduleId);

  if (error) {
    console.error("updateAnnualScheduleVersion failed:", error.message);
    return { error: "更新に失敗しました" };
  }

  revalidatePath("/annual");
  return { error: null };
}

/** 現版を切り替え: 指定 ID を is_current=true に、他を false に */
export async function setCurrentVersion(scheduleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const admin = createAdminClient();

  // 対象の年度を取得
  const { data: target, error: getError } = await admin
    .from("annual_schedules")
    .select("year")
    .eq("id", scheduleId)
    .single();
  if (getError || !target) return { error: "対象が見つかりません" };

  // 同一年度の既存現版を降格
  const { error: demoteError } = await admin
    .from("annual_schedules")
    .update({ is_current: false })
    .eq("year", target.year)
    .eq("is_current", true);
  if (demoteError) {
    console.error("setCurrentVersion (demote) failed:", demoteError.message);
    return { error: "既存版の更新に失敗しました" };
  }

  // 対象を現版に
  const { error: promoteError } = await admin
    .from("annual_schedules")
    .update({ is_current: true })
    .eq("id", scheduleId);
  if (promoteError) {
    console.error("setCurrentVersion (promote) failed:", promoteError.message);
    return { error: "現版設定に失敗しました" };
  }

  revalidatePath("/annual");
  return { error: null };
}
