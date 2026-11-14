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

/**
 * 集計中のアンケート（タイトル・候補日）を編集する。
 * 削除した候補日に付いていた回答も一緒に消える。
 * 複数の更新を順に実行する（途中で失敗した場合は一部だけ反映されうる）。
 */
export async function updateSurvey(
  surveyId: string,
  input: {
    title: string;
    dates: { date: string; isPriority: boolean }[];
  }
) {
  if (!(await requireAdmin())) return { error: "管理者のみ実行できます" };

  const title = input.title.trim();
  if (!title) return { error: "タイトルを入力してください" };

  const next = new Map<string, boolean>();
  for (const d of input.dates) {
    if (!DATE_PATTERN.test(d.date)) return { error: "日付の形式が不正です" };
    next.set(d.date, d.isPriority);
  }
  if (next.size === 0) return { error: "候補日を 1 つ以上選んでください" };

  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from("practice_survey_dates")
    .select("id, candidate_date, is_priority")
    .eq("survey_id", surveyId);
  if (fetchError || !current) {
    console.error("updateSurvey (fetch) failed:", fetchError?.message);
    return { error: "アンケートの取得に失敗しました" };
  }

  const currentByDate = new Map(current.map((c) => [c.candidate_date, c]));
  const toInsert = [...next].filter(([date]) => !currentByDate.has(date));
  const toDelete = current.filter((c) => !next.has(c.candidate_date));
  const toUpdate = current.filter(
    (c) => next.has(c.candidate_date) && next.get(c.candidate_date) !== c.is_priority
  );

  if (toInsert.length > 0) {
    const { error } = await supabase.from("practice_survey_dates").insert(
      toInsert.map(([date, isPriority]) => ({
        survey_id: surveyId,
        candidate_date: date,
        is_priority: isPriority,
      }))
    );
    if (error) {
      console.error("updateSurvey (insert) failed:", error.message);
      return { error: "候補日の追加に失敗しました" };
    }
  }

  for (const c of toUpdate) {
    const { error } = await supabase
      .from("practice_survey_dates")
      .update({ is_priority: next.get(c.candidate_date) })
      .eq("id", c.id);
    if (error) {
      console.error("updateSurvey (update) failed:", error.message);
      return { error: "候補日の更新に失敗しました" };
    }
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("practice_survey_dates")
      .delete()
      .in(
        "id",
        toDelete.map((c) => c.id)
      );
    if (error) {
      console.error("updateSurvey (delete) failed:", error.message);
      return { error: "候補日の削除に失敗しました" };
    }
  }

  const { error: titleError } = await supabase
    .from("practice_surveys")
    .update({ title })
    .eq("id", surveyId)
    .is("closed_at", null)
    .is("ended_at", null);
  if (titleError) {
    console.error("updateSurvey (title) failed:", titleError.message);
    return { error: "タイトルの更新に失敗しました" };
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

/** 締め切ったアンケートの集計を再開する（結果公開中のみ。公開終了後は再開できない） */
export async function reopenSurvey(surveyId: string) {
  if (!(await requireAdmin())) return { error: "管理者のみ実行できます" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("practice_surveys")
    .update({ closed_at: null })
    .eq("id", surveyId)
    .not("closed_at", "is", null)
    .is("ended_at", null);

  if (error) {
    console.error("reopenSurvey failed:", error.message);
    return { error: "集計の再開に失敗しました" };
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
