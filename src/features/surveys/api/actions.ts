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

/** 形式だけでなく、実在する日付か（2026-02-31 などを除く）を確認する */
function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

type SurveyInput = {
  title: string;
  dates: { date: string; isPriority: boolean }[];
};

/** 入力を検証し、RPC に渡す形へ整える（同じ日付は後勝ちで 1 件にする） */
function normalizeSurveyInput(
  input: SurveyInput
):
  | { ok: false; error: string }
  | {
      ok: true;
      title: string;
      dates: { candidate_date: string; is_priority: boolean }[];
    } {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "タイトルを入力してください" };

  const unique = new Map<string, boolean>();
  for (const d of input.dates) {
    if (!isRealDate(d.date)) {
      return { ok: false, error: "日付の形式が不正です" };
    }
    unique.set(d.date, d.isPriority);
  }
  if (unique.size === 0) {
    return { ok: false, error: "候補日を 1 つ以上選んでください" };
  }

  return {
    ok: true,
    title,
    dates: [...unique].map(([candidate_date, is_priority]) => ({
      candidate_date,
      is_priority,
    })),
  };
}

/**
 * アンケートを作成する（= 集計開始）。公開終了前のアンケートがあるときは作成できない。
 * 作成と候補日の登録は 1 つの RPC（トランザクション）で行う。
 */
export async function createSurvey(input: SurveyInput) {
  if (!(await requireAdmin())) return { error: "管理者のみ実行できます" };

  const normalized = normalizeSurveyInput(input);
  if (!normalized.ok) return { error: normalized.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_practice_survey", {
    p_title: normalized.title,
    p_dates: normalized.dates,
  });

  if (error) {
    // 23505: 公開終了前のアンケートが既にある（部分 UNIQUE インデックス違反）
    if (error.code === "23505") {
      return {
        error:
          "公開終了前のアンケートがあります。結果公開を終了してから作成してください",
      };
    }
    console.error("createSurvey failed:", error.message);
    return { error: "作成に失敗しました" };
  }

  revalidateSurvey();
  return { error: null };
}

/**
 * 集計中のアンケート（タイトル・候補日）を編集する。
 * 削除した候補日に付いていた回答も一緒に消える。
 * 1 つの RPC（トランザクション）で行うため、途中で失敗しても一部だけ反映されることはない。
 */
export async function updateSurvey(surveyId: string, input: SurveyInput) {
  if (!(await requireAdmin())) return { error: "管理者のみ実行できます" };

  const normalized = normalizeSurveyInput(input);
  if (!normalized.ok) return { error: normalized.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_practice_survey", {
    p_survey_id: surveyId,
    p_title: normalized.title,
    p_dates: normalized.dates,
  });

  if (error) {
    if (error.message.includes("not collecting")) {
      return {
        error:
          "集計中のアンケートのみ編集できます。締め切られた可能性があるため、画面を更新してください",
      };
    }
    console.error("updateSurvey failed:", error.message);
    return { error: "更新に失敗しました" };
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
