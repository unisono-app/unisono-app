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

/** 指定IDの楽曲の編成（パート一覧）を取得（練習詳細のパート集計用） */
export async function getSongsByIds(
  ids: string[]
): Promise<{ id: string; title: string; arrangements: string[] | null }[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("songs")
    .select("id, title, arrangements")
    .in("id", ids);

  if (error || !data) {
    console.error("getSongsByIds failed:", error?.message);
    return [];
  }

  return data as { id: string; title: string; arrangements: string[] | null }[];
}

/** 指定楽曲群のメンバー別パート登録（練習詳細のパート集計用） */
export async function getSongUserParts(
  songIds: string[]
): Promise<{ song_id: string; user_id: string; part: string }[]> {
  if (songIds.length === 0) return [];
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("song_user_parts")
    .select("song_id, user_id, part")
    .in("song_id", songIds);

  if (error || !data) {
    console.error("getSongUserParts failed:", error?.message);
    return [];
  }

  return data as { song_id: string; user_id: string; part: string }[];
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
