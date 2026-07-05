import { notFound } from "next/navigation";
import { getAppUser } from "@/lib/auth/get-current-app-user";
import { getSongById, getSongParts } from "@/features/songs/api";
import { Header } from "@/components/layout/header";
import { SongDetailClient } from "./song-detail-client";

export default async function SongDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const result = await getAppUser();
  if (result.status !== "approved") return null;

  const { id } = await params;
  const song = await getSongById(id);
  if (!song) notFound();

  const parts = await getSongParts(id);
  const currentUserId = result.appUser.id;
  const myPart = parts.find((p) => p.user_id === currentUserId)?.part ?? null;

  return (
    <>
      <Header title={song.title} backHref="/songs" />
      <SongDetailClient
        song={song}
        parts={parts}
        myPart={myPart}
        currentUserId={currentUserId}
        isAdmin={result.appUser.role === "admin"}
      />
    </>
  );
}
