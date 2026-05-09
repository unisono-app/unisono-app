import { createClient } from "@/lib/supabase/server";

export type AnnualScheduleVersion = {
  id: string;
  year: number;
  version_number: number;
  file_label: string | null;
  pdf_url: string;
  is_current: boolean;
  created_at: string;
};

/** 指定年度の全バージョン（version_number 降順） */
export async function getVersionsByYear(
  year: number
): Promise<AnnualScheduleVersion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("annual_schedules")
    .select(
      "id, year, version_number, file_label, pdf_url, is_current, created_at"
    )
    .eq("year", year)
    .order("version_number", { ascending: false });

  if (error || !data) return [];
  return data as AnnualScheduleVersion[];
}

/** スケジュール登録済みの年度一覧（降順） */
export async function getYearsWithSchedule(): Promise<number[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("annual_schedules")
    .select("year")
    .order("year", { ascending: false });

  if (error || !data) return [];

  const seen = new Set<number>();
  const result: number[] = [];
  for (const row of data as { year: number }[]) {
    if (!seen.has(row.year)) {
      seen.add(row.year);
      result.push(row.year);
    }
  }
  return result;
}
