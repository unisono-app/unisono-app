import { createClient } from "@/lib/supabase/server";

export type SurveyResponseStatus = "maybe" | "absent";

/** 集計中 → 結果公開中(締切後) → 公開終了 の順に進む（すべて管理者が手動で操作） */
export type SurveyPhase = "collecting" | "published";

export type SurveyDate = {
  id: string;
  candidate_date: string;
  is_priority: boolean;
};

export type ActiveSurvey = {
  id: string;
  title: string;
  phase: SurveyPhase;
  dates: SurveyDate[];
};

export type SurveyUser = {
  display_name: string;
  nickname: string | null;
  family_name: string;
  given_name: string;
  old_family_name: string | null;
};

export type SurveyDateResult = SurveyDate & {
  maybe: SurveyUser[];
  absent: SurveyUser[];
};

export type SurveyResults = {
  dates: SurveyDateResult[];
  answeredCount: number;
  /** 承認済みメンバー（member / admin）の総数。未回答人数 = memberCount - answeredCount */
  memberCount: number;
};

const USER_COLUMNS =
  "display_name, nickname, family_name, given_name, old_family_name";

/**
 * 公開終了前のアンケートを取得する（同時に存在するのは最大 1 件）。
 * RLS により、member は公開終了前のものしか取得できない。
 */
export async function getActiveSurvey(): Promise<ActiveSurvey | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("practice_surveys")
    .select(
      "id, title, closed_at, practice_survey_dates(id, candidate_date, is_priority)"
    )
    .is("ended_at", null)
    .maybeSingle();

  if (error) {
    console.error("getActiveSurvey failed:", error.message);
    return null;
  }
  if (!data) return null;

  const dates = [...(data.practice_survey_dates ?? [])].sort((a, b) =>
    a.candidate_date.localeCompare(b.candidate_date)
  );

  return {
    id: data.id,
    title: data.title,
    phase: data.closed_at ? "published" : "collecting",
    dates,
  };
}

export type MySurveyState = {
  prompted: boolean;
  answered: boolean;
  /** 自分の ○ 以外の回答（survey_date_id → status）。行がない日は ○ */
  responses: Record<string, SurveyResponseStatus>;
};

export async function getMySurveyState(
  surveyId: string,
  userId: string
): Promise<MySurveyState> {
  const supabase = await createClient();

  const [{ data: participation }, { data: rows }] = await Promise.all([
    supabase
      .from("practice_survey_participations")
      .select("prompted_at, answered_at")
      .eq("survey_id", surveyId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("practice_survey_responses")
      .select("survey_date_id, status, practice_survey_dates!inner(survey_id)")
      .eq("user_id", userId)
      .eq("practice_survey_dates.survey_id", surveyId),
  ]);

  const responses: Record<string, SurveyResponseStatus> = {};
  for (const r of rows ?? []) {
    responses[r.survey_date_id] = r.status as SurveyResponseStatus;
  }

  return {
    prompted: !!participation?.prompted_at,
    answered: !!participation?.answered_at,
    responses,
  };
}

/**
 * 集計結果を取得する。閲覧権限がない場合（集計中で未回答など）は
 * RLS により responses が空になるため、呼び出し側で phase / answered を確認すること。
 */
export async function getSurveyResults(
  survey: ActiveSurvey
): Promise<SurveyResults> {
  const supabase = await createClient();

  const [{ data: responses }, { count: answeredCount }, { count: memberCount }] =
    await Promise.all([
      supabase
        .from("practice_survey_responses")
        .select(
          `survey_date_id, status, users(${USER_COLUMNS}), practice_survey_dates!inner(survey_id)`
        )
        .eq("practice_survey_dates.survey_id", survey.id),
      supabase
        .from("practice_survey_participations")
        .select("user_id", { count: "exact", head: true })
        .eq("survey_id", survey.id)
        .not("answered_at", "is", null),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .in("role", ["member", "admin"])
        .eq("approval_status", "approved"),
    ]);

  const byDate = new Map<string, SurveyDateResult>(
    survey.dates.map((d) => [d.id, { ...d, maybe: [], absent: [] }])
  );
  for (const r of (responses ?? []) as unknown as {
    survey_date_id: string;
    status: SurveyResponseStatus;
    users: SurveyUser | null;
  }[]) {
    const target = byDate.get(r.survey_date_id);
    if (!target || !r.users) continue;
    target[r.status].push(r.users);
  }

  return {
    dates: survey.dates.map((d) => byDate.get(d.id)!),
    answeredCount: answeredCount ?? 0,
    memberCount: memberCount ?? 0,
  };
}
