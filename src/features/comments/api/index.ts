import { createClient } from "@/lib/supabase/server";

export type Comment = {
  id: string;
  user_id: string;
  is_anonymous: boolean;
  body: string;
  created_at: string;
  users: {
    display_name: string;
    nickname: string | null;
    family_name: string;
    given_name: string;
    old_family_name: string | null;
    avatar_url: string | null;
  } | null;
};

const SELECT_COLUMNS =
  "id, user_id, is_anonymous, body, created_at, users(display_name, nickname, family_name, given_name, old_family_name, avatar_url)";

export async function getPracticeComments(
  practiceId: string
): Promise<Comment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("practice_comments")
    .select(SELECT_COLUMNS)
    .eq("practice_id", practiceId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as unknown as Comment[];
}

export async function getAnnualScheduleComments(
  year: number
): Promise<Comment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("annual_schedule_comments")
    .select(SELECT_COLUMNS)
    .eq("year", year)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as unknown as Comment[];
}
