"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PracticeDetail } from "./index";

function autoTitleFromDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getMonth() + 1}/${date.getDate()}（${weekdays[date.getDay()]}）`;
}

function extractFields(formData: FormData) {
  const practiceDate = formData.get("practice_date") as string;
  const timeRange = formData.get("time_range") as string;
  const location = formData.get("location") as string;
  const deadline = (formData.get("deadline") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const schedule = (formData.get("schedule") as string) || null;
  const content = (formData.get("content") as string) || null;
  const categoryRaw = (formData.get("category") as string) || "practice";
  const category: "practice" | "event" =
    categoryRaw === "event" ? "event" : "practice";

  // タイトル: practice は自動生成、event は入力必須
  let title = (formData.get("title") as string) || "";
  if (category === "practice") {
    title = practiceDate ? autoTitleFromDate(practiceDate) : "";
  }

  if (!practiceDate || !timeRange || !location) {
    return { error: "必須項目をすべて入力してください" as const, fields: null, songIds: [] };
  }
  if (category === "event" && !title) {
    return { error: "イベント名を入力してください" as const, fields: null, songIds: [] };
  }

  // 紐づけ楽曲 ID（JSON）
  const songIdsRaw = (formData.get("song_ids") as string) || "[]";
  let songIds: string[] = [];
  try {
    const parsed = JSON.parse(songIdsRaw);
    if (Array.isArray(parsed)) {
      songIds = parsed.filter((s) => typeof s === "string");
    }
  } catch {
    // 無効な JSON は無視
  }

  return {
    error: null,
    fields: {
      title,
      practice_date: practiceDate,
      time_range: timeRange,
      location,
      deadline,
      notes,
      schedule,
      content,
      category,
    },
    songIds,
  };
}

async function syncPracticeSongs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  practiceId: string,
  songIds: string[]
): Promise<{ error: string | null }> {
  // 既存を削除
  const { error: deleteError } = await supabase
    .from("practice_songs")
    .delete()
    .eq("practice_id", practiceId);
  if (deleteError) {
    console.error("syncPracticeSongs (delete) failed:", deleteError.message);
    return { error: "楽曲紐づけの更新に失敗しました" };
  }

  if (songIds.length > 0) {
    const { error: insertError } = await supabase.from("practice_songs").insert(
      songIds.map((songId) => ({
        practice_id: practiceId,
        song_id: songId,
      }))
    );
    if (insertError) {
      console.error("syncPracticeSongs (insert) failed:", insertError.message);
      return { error: "楽曲紐づけの保存に失敗しました" };
    }
  }

  return { error: null };
}

export async function createPractice(formData: FormData) {
  const { error: validationError, fields, songIds } = extractFields(formData);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  const { data: inserted, error } = await supabase
    .from("practices")
    .insert({
      ...fields,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("createPractice failed:", error?.message);
    return { error: "作成に失敗しました" };
  }

  if (songIds.length > 0) {
    const result = await syncPracticeSongs(supabase, inserted.id, songIds);
    if (result.error) return result;
  }

  revalidatePath("/practices");
  return { error: null };
}

export async function updatePractice(id: string, formData: FormData) {
  const { error: validationError, fields, songIds } = extractFields(formData);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase
    .from("practices")
    .update(fields)
    .eq("id", id);

  if (error) {
    console.error("updatePractice failed:", error.message);
    return { error: "更新に失敗しました" };
  }

  const syncResult = await syncPracticeSongs(supabase, id, songIds);
  if (syncResult.error) return syncResult;

  revalidatePath("/practices");
  revalidatePath(`/practices/${id}`);
  return { error: null };
}

export async function fetchPracticeById(
  id: string
): Promise<PracticeDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("practices")
    .select(
      "id, title, practice_date, time_range, location, deadline, notes, schedule, content, category, created_by, practice_songs(song_id)"
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;

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
