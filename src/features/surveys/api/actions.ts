"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAppUser } from "@/lib/auth/get-current-app-user";
import type { SurveyResponseStatus } from "./index";

/** ヘッダー・レイアウトにも影響するため、全体を再検証する */
function revalidateSurvey() {
  revalidatePath("/", "layout");
}

async function requireAdmin() {
  const result = await getAppUser();
  if (result.status !== "approved" || result.appUser.role !== "admin") {
    return null;
  }
  return result.appUser;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** アンケートを作成する（= 集計開始）。公開終了前のアンケートがあるときは作成できない */
export async function createSurvey(input: {
  title: string;
  dates: { date: string; isPriority: boolean }[];
}) {
  const admin = await requireAdmin();
  if (!admin) return { error: "管理者のみ実行できます" };

  const title = input.title.trim();
  if (!title) return { error: "タイトルを入力してください" };

  const unique = new Map<string, boolean>();
  for (const d of input.dates) {
    if (!DATE_PATTERN.test(d.date)) return { error: "日付の形式が不正です" };
    unique.set(d.date, d.isPriority);
  }
  if (unique.size === 0) return { error: "候補日を 1 つ以上選んでください" };

  const supabase = await createClient();

  const { data: survey, error } = await supabase
    .from("practice_surveys")
    .insert({ title, created_by: admin.id })
    .select("id")
    .single();

  if (error || !survey) {
    // 23505: 公開終了前のアンケートが既にある（部分 UNIQUE インデックス違反）
    if (error?.code === "23505") {
      return {
        error:
          "公開終了前のアンケートがあります。結果公開を終了してから作成してください",
      };
    }
    console.error("createSurvey failed:", error?.message);
    return { error: "作成に失敗しました" };
  }

  const { error: datesError } = await supabase
    .from("practice_survey_dates")
    .insert(
      [...unique].map(([date, isPriority]) => ({
        survey_id: survey.id,
        candidate_date: date,
        is_priority: isPriority,
      }))
    );

  if (datesError) {
    console.error("createSurvey (dates) failed:", datesError.message);
    // 日付なしのアンケートを残さない（admin は削除ポリシーがないため終了扱いにする）
    await supabase
      .from("practice_surveys")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", survey.id);
    return { error: "候補日の保存に失敗しました" };
  }

  revalidateSurvey();
  return { error: null };
}

/** 集計を締め切り、結果を全員に公開する */
export async function closeSurvey(surveyId: string) {
  if (!(await requireAdmin())) return { error: "管理者のみ実行できます" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("practice_surveys")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", surveyId)
    .is("closed_at", null)
    .is("ended_at", null);

  if (error) {
    console.error("closeSurvey failed:", error.message);
    return { error: "締め切りに失敗しました" };
  }
  revalidateSurvey();
  return { error: null };
}

/** 結果公開を終了する（以降、閲覧できるのは管理者のみ） */
export async function endSurvey(surveyId: string) {
  if (!(await requireAdmin())) return { error: "管理者のみ実行できます" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("practice_surveys")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", surveyId)
    .not("closed_at", "is", null)
    .is("ended_at", null);

  if (error) {
    console.error("endSurvey failed:", error.message);
    return { error: "公開終了に失敗しました" };
  }
  revalidateSurvey();
  return { error: null };
}

/** 回答を保存する。entries には ○ 以外（△ / ×）の日だけを渡す */
export async function submitSurveyAnswer(
  surveyId: string,
  entries: { surveyDateId: string; status: SurveyResponseStatus }[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase.rpc("submit_practice_survey_answer", {
    p_survey_id: surveyId,
    p_entries: entries.map((e) => ({
      survey_date_id: e.surveyDateId,
      status: e.status,
    })),
  });

  if (error) {
    console.error("submitSurveyAnswer failed:", error.message);
    return { error: "回答の保存に失敗しました" };
  }
  revalidateSurvey();
  return { error: null };
}

/** 「後で答える」: 初回ポップアップを表示済みとして記録する（既にあれば何もしない） */
export async function markSurveyPrompted(surveyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase.from("practice_survey_participations").upsert(
    {
      survey_id: surveyId,
      user_id: user.id,
      prompted_at: new Date().toISOString(),
    },
    { onConflict: "survey_id,user_id", ignoreDuplicates: true }
  );

  if (error) {
    console.error("markSurveyPrompted failed:", error.message);
    return { error: "保存に失敗しました" };
  }
  revalidateSurvey();
  return { error: null };
}
