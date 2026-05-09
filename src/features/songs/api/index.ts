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
