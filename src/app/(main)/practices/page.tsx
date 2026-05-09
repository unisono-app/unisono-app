import { getPractices, getSongTitles } from "@/features/practices/api";
import { getMyAttendances } from "@/features/attendance/api";
import { getSongList } from "@/features/songs/api";
import { getAppUser } from "@/lib/auth/get-current-app-user";
import { PracticesPageClient } from "./practices-page-client";

export default async function PracticesPage() {
  const result = await getAppUser();
  if (result.status !== "approved") return null;

  const practices = await getPractices();
  const practiceIds = practices.map((p) => p.id);

  const myAttendances = await getMyAttendances(
    result.appUser.id,
    practiceIds
  );

  const songs = await getSongList();

  const today = new Date().toISOString().split("T")[0];
  const upcomingIndex = practices.findIndex((p) => p.practice_date >= today);

  const items = practices.map((p) => ({
    id: p.id,
    date: p.practice_date,
    timeRange: p.time_range,
    location: p.location,
    songs: getSongTitles(p),
    myStatus: myAttendances[p.id]?.status ?? null,
    category: p.category,
    title: p.title,
  }));

  return (
    <PracticesPageClient
      items={items}
      initialScrollIndex={upcomingIndex}
      songs={songs}
    />
  );
}
