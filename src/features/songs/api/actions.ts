"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SongWithPerformances } from "./index";

type PerformanceInput = { year: number; event: string };

type SongFields = {
  title: string;
  composer: string | null;
  arranger: string | null;
  year: number | null;
  score_url: string | null;
  arrangements: string[] | null;
};

function parseFields(formData: FormData): {
  error: string | null;
  fields: SongFields | null;
  performances: PerformanceInput[];
} {
  const title = ((formData.get("title") as string) || "").trim();
  const composer = ((formData.get("composer") as string) || "").trim() || null;
  const arranger = ((formData.get("arranger") as string) || "").trim() || null;
  const yearStr = (formData.get("year") as string) || "";
  const year = yearStr ? Number(yearStr) : null;
  const scoreUrl =
    ((formData.get("score_url") as string) || "").trim() || null;
  // 編成（パート一覧）: hidden input "arrangements" に JSON 文字列が入っている
  const arrangementsJson = (formData.get("arrangements") as string) || "[]";
  let arrangements: string[] | null = null;
  try {
    const parsed = JSON.parse(arrangementsJson);
    if (Array.isArray(parsed)) {
      const cleaned = parsed
        .map((s) => String(s).trim())
        .filter((s) => s.length > 0);
      arrangements = cleaned.length > 0 ? cleaned : null;
    }
  } catch {
    return { error: "編成データが不正です", fields: null, performances: [] };
  }

  if (!title) {
    return { error: "タイトルを入力してください", fields: null, performances: [] };
  }
  if (year !== null && !Number.isFinite(year)) {
    return { error: "作曲年は数値で入力してください", fields: null, performances: [] };
  }

  // 演奏履歴: hidden input "performances" に JSON 文字列が入っている
  const performancesJson = (formData.get("performances") as string) || "[]";
  let performances: PerformanceInput[] = [];
  try {
    const parsed = JSON.parse(performancesJson);
    if (Array.isArray(parsed)) {
      performances = parsed
        .map((p) => ({
          year: Number(p.year),
          event: String(p.event || "").trim(),
        }))
        .filter((p) => Number.isFinite(p.year) && p.event.length > 0);
    }
  } catch {
    return {
      error: "演奏履歴のデータが不正です",
      fields: null,
      performances: [],
    };
  }

  return {
    error: null,
    fields: {
      title,
      composer,
      arranger,
      year: year ?? null,
      score_url: scoreUrl,
      arrangements,
    },
    performances,
  };
}

export async function createSong(formData: FormData) {
  const parsed = parseFields(formData);
  if (parsed.error || !parsed.fields) {
    return { error: parsed.error ?? "入力エラー" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { data: inserted, error } = await supabase
    .from("songs")
    .insert(parsed.fields)
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("createSong failed:", error?.message);
    return { error: "作成に失敗しました" };
  }

  if (parsed.performances.length > 0) {
    const { error: perfError } = await supabase
      .from("song_performances")
      .insert(
        parsed.performances.map((p) => ({
          song_id: inserted.id,
          year: p.year,
          event: p.event,
        }))
      );
    if (perfError) {
      console.error("createSong (performances) failed:", perfError.message);
      // 楽曲自体は作成済みなのでエラーで止めず続行
    }
  }

  revalidatePath("/songs");
  return { error: null };
}

export async function updateSong(id: string, formData: FormData) {
  const parsed = parseFields(formData);
  if (parsed.error || !parsed.fields) {
    return { error: parsed.error ?? "入力エラー" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("songs")
    .update(parsed.fields)
    .eq("id", id);

  if (error) {
    console.error("updateSong failed:", error.message);
    return { error: "更新に失敗しました" };
  }

  // 編成から外れたパートに登録済みのメンバー登録をクリア（整合性維持）
  const validParts = parsed.fields.arrangements ?? [];
  if (validParts.length === 0) {
    await supabase.from("song_user_parts").delete().eq("song_id", id);
  } else {
    const { data: registered } = await supabase
      .from("song_user_parts")
      .select("part")
      .eq("song_id", id);
    const orphanParts = Array.from(
      new Set(
        (registered ?? [])
          .map((r) => r.part as string)
          .filter((p) => !validParts.includes(p))
      )
    );
    if (orphanParts.length > 0) {
      await supabase
        .from("song_user_parts")
        .delete()
        .eq("song_id", id)
        .in("part", orphanParts);
    }
  }

  // 演奏履歴を delete → insert で同期
  const { error: deleteError } = await supabase
    .from("song_performances")
    .delete()
    .eq("song_id", id);
  if (deleteError) {
    console.error("updateSong (delete performances) failed:", deleteError.message);
    return { error: "演奏履歴の更新に失敗しました" };
  }

  if (parsed.performances.length > 0) {
    const { error: perfError } = await supabase.from("song_performances").insert(
      parsed.performances.map((p) => ({
        song_id: id,
        year: p.year,
        event: p.event,
      }))
    );
    if (perfError) {
      console.error("updateSong (insert performances) failed:", perfError.message);
      return { error: "演奏履歴の保存に失敗しました" };
    }
  }

  revalidatePath("/songs");
  return { error: null };
}

export async function deleteSong(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  // 関連する song_performances を先に削除
  await supabase.from("song_performances").delete().eq("song_id", id);

  const { error } = await supabase.from("songs").delete().eq("id", id);
  if (error) {
    console.error("deleteSong failed:", error.message);
    return { error: "削除に失敗しました" };
  }

  revalidatePath("/songs");
  return { error: null };
}

/** 自分の、指定楽曲でのパートを登録/更新（part が空なら登録解除） */
export async function setMySongPart(songId: string, part: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const trimmed = (part ?? "").trim();

  // 空 → 自分の登録を解除
  if (!trimmed) {
    const { error } = await supabase
      .from("song_user_parts")
      .delete()
      .eq("song_id", songId)
      .eq("user_id", user.id);
    if (error) {
      console.error("setMySongPart (clear) failed:", error.message);
      return { error: "登録解除に失敗しました" };
    }
    revalidatePath(`/songs/${songId}`);
    return { error: null };
  }

  // 編成（arrangements）に含まれるパートかを検証
  const { data: song } = await supabase
    .from("songs")
    .select("arrangements")
    .eq("id", songId)
    .single();
  const arrangements = (song?.arrangements as string[] | null) ?? [];
  if (!arrangements.includes(trimmed)) {
    return { error: "編成に存在しないパートです" };
  }

  const { error } = await supabase
    .from("song_user_parts")
    .upsert(
      { song_id: songId, user_id: user.id, part: trimmed },
      { onConflict: "song_id,user_id" }
    );
  if (error) {
    console.error("setMySongPart failed:", error.message);
    return { error: "登録に失敗しました" };
  }

  revalidatePath(`/songs/${songId}`);
  return { error: null };
}

export async function fetchSongById(
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
