import { createClient } from "@/lib/supabase/server";

export type AttendanceStatus = "attending" | "undecided" | "absent";

export type MyAttendance = {
  practice_id: string;
  status: AttendanceStatus;
  note: string | null;
};

export type AttendanceWithUser = {
  practice_id: string;
  user_id: string;
  status: AttendanceStatus;
  note: string | null;
  users: {
    display_name: string;
    nickname: string | null;
    family_name: string;
    given_name: string;
    old_family_name: string | null;
    part: string;
  };
};


export async function getMyAttendances(
  userId: string,
  practiceIds: string[]
): Promise<Record<string, MyAttendance>> {
  if (practiceIds.length === 0) return {};

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("practice_attendances")
    .select("practice_id, status, note")
    .eq("user_id", userId)
    .in("practice_id", practiceIds);

  if (error || !data) return {};

  const map: Record<string, MyAttendance> = {};
  for (const row of data) {
    map[row.practice_id] = row as MyAttendance;
  }
  return map;
}

export async function getAttendancesByPractice(
  practiceId: string
): Promise<AttendanceWithUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("practice_attendances")
    .select(
      "practice_id, user_id, status, note, users(display_name, nickname, family_name, given_name, old_family_name, part)"
    )
    .eq("practice_id", practiceId);

  if (error || !data) return [];

  return data as unknown as AttendanceWithUser[];
}
