import { createClient } from "@/lib/supabase/server";

export type PracticeCategory = "practice" | "event";

export type Practice = {
  id: string;
  slug: string | null;
  title: string;
  practice_date: string;
  time_range: string;
  location: string;
  category: PracticeCategory;
  practice_songs: { songs: { title: string } | { title: string }[] | null }[];
};

export async function getPractices(): Promise<Practice[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("practices")
    .select(
      "id, slug, title, practice_date, time_range, location, category, practice_songs(songs(title))"
    )
    .order("practice_date", { ascending: true });

  if (error) {
    console.error("getPractices failed:", error.message);
    return [];
  }

  return (data as Practice[]) ?? [];
}

export function getSongTitles(practice: Practice): string[] {
  return practice.practice_songs.flatMap((ps) => {
    if (!ps.songs) return [];
    if (Array.isArray(ps.songs)) return ps.songs.map((s) => s.title);
    return [ps.songs.title];
  });
}

export type PracticeDetail = {
  id: string;
  slug: string | null;
  title: string;
  practice_date: string;
  time_range: string;
  location: string;
  deadline: string | null;
  notes: string | null;
  schedule: string | null;
  content: string | null;
  recording_url: string | null;
  category: PracticeCategory;
  created_by: string;
  song_ids: string[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** URL の識別子（slug または旧 uuid）で練習を取得する */
export async function getPracticeByKey(
  key: string
): Promise<PracticeDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("practices")
    .select(
      "id, slug, title, practice_date, time_range, location, deadline, notes, schedule, content, recording_url, category, created_by, practice_songs(song_id)"
    )
    .eq(isUuid(key) ? "id" : "slug", key)
    .single();

  if (error || !data) {
    return null;
  }

  const raw = data as { practice_songs?: { song_id: string }[] } & Record<
    string,
    unknown
  >;
  const songIds = (raw.practice_songs ?? []).map((ps) => ps.song_id);

  return {
    ...(data as Omit<PracticeDetail, "song_ids">),
    song_ids: songIds,
  } as PracticeDetail;
}

export type EventSummary = {
  id: string;
  practice_date: string;
  title: string;
};

/** 今年度（4/1〜翌3/31）以降のイベントを取得 */
export async function getEvents(): Promise<EventSummary[]> {
  const supabase = await createClient();

  const now = new Date();
  const fiscalYearStart =
    now.getMonth() + 1 >= 4
      ? `${now.getFullYear()}-04-01`
      : `${now.getFullYear() - 1}-04-01`;

  const { data, error } = await supabase
    .from("practices")
    .select("id, practice_date, title")
    .eq("category", "event")
    .gte("practice_date", fiscalYearStart)
    .order("practice_date", { ascending: true });

  if (error) {
    console.error("getEvents failed:", error.message);
    return [];
  }

  return (data as EventSummary[]) ?? [];
}
