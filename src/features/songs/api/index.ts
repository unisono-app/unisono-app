import { createClient } from "@/lib/supabase/server";

export type Performance = {
  id: string;
  song_id: string;
  year: number;
  event: string;
};

export type SongWithPerformances = {
  id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
  year: number | null;
  score_url: string | null;
  arrangements: string[] | null;
  created_at: string;
  song_performances: Performance[];
};

export async function getSongs(): Promise<SongWithPerformances[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("songs")
    .select(
      "id, title, composer, arranger, year, score_url, arrangements, created_at, song_performances(id, song_id, year, event)"
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("getSongs failed:", error?.message);
    return [];
  }

  return data as SongWithPerformances[];
}

export type SongOption = {
  id: string;
  title: string;
  composer: string | null;
  arranger: string | null;
};

/** 楽曲選択UI用の軽量リスト */
export async function getSongList(): Promise<SongOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("songs")
    .select("id, title, composer, arranger")
    .order("title", { ascending: true });

  if (error || !data) return [];
  return data as SongOption[];
}

export type SongPartAssignment = {
  user_id: string;
  part: string;
  users: {
    family_name: string;
    given_name: string;
    old_family_name: string | null;
    nickname: string | null;
    avatar_url: string | null;
  } | null;
};

/** 指定楽曲のメンバー別パート登録一覧 */
export async function getSongParts(
  songId: string
): Promise<SongPartAssignment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("song_user_parts")
    .select(
      "user_id, part, users(family_name, given_name, old_family_name, nickname, avatar_url)"
    )
    .eq("song_id", songId);

  if (error || !data) {
    console.error("getSongParts failed:", error?.message);
    return [];
  }

  return data as unknown as SongPartAssignment[];
}

export async function getSongById(
  id: string
): Promise<SongWithPerformances | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("songs")
    .select(
      "id, title, composer, arranger, year, score_url, arrangements, created_at, song_performances(id, song_id, year, event)"
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as SongWithPerformances;
}
