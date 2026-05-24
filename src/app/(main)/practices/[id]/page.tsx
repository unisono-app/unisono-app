import { notFound } from "next/navigation";
import { getPracticeById } from "@/features/practices/api";
import {
  getMyAttendances,
  getAttendancesByPractice,
} from "@/features/attendance/api";
import { getSongList } from "@/features/songs/api";
import { getPracticeComments } from "@/features/comments/api";
import { getAppUser } from "@/lib/auth/get-current-app-user";
import { Header } from "@/components/layout/header";
import { PracticeDetailClient } from "./practice-detail-client";

export default async function PracticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await getAppUser();
  if (result.status !== "approved") return null;

  const practice = await getPracticeById(id);
  if (!practice) notFound();

  const myAttendances = await getMyAttendances(result.appUser.id, [id]);
  const attendances = await getAttendancesByPractice(id);
  const songs = await getSongList();
  const comments = await getPracticeComments(id);
  const isAdmin = result.appUser.role === "admin";

  return (
    <>
      <Header
        title={practice.category === "event" ? "イベント" : "練習"}
        backHref="/practices"
      />
      <PracticeDetailClient
        practice={practice}
        myStatus={myAttendances[id]?.status ?? null}
        attendances={attendances}
        songs={songs}
        comments={comments}
        currentUserId={result.appUser.id}
        isAdmin={isAdmin}
      />
    </>
  );
}
