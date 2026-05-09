"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceStatus, AttendanceWithUser } from "./index";

export async function upsertAttendance(
  practiceId: string,
  status: AttendanceStatus
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "認証が必要です" };

  const { error } = await supabase.from("practice_attendances").upsert(
    {
      practice_id: practiceId,
      user_id: user.id,
      status,
    },
    { onConflict: "practice_id,user_id" }
  );

  if (error) {
    console.error("upsertAttendance failed:", error.message);
    return { error: "出欠の保存に失敗しました" };
  }

  revalidatePath("/practices");
  return { error: null };
}

export async function fetchAttendancesByPractice(
  practiceId: string
): Promise<AttendanceWithUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("practice_attendances")
    .select(
      "practice_id, user_id, status, note, users(display_name, nickname, family_name, given_name, part)"
    )
    .eq("practice_id", practiceId);

  if (error || !data) return [];
  return data as unknown as AttendanceWithUser[];
}
