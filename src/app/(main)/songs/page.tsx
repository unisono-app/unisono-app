import { getAppUser } from "@/lib/auth/get-current-app-user";
import { getSongs } from "@/features/songs/api";
import { Header } from "@/components/layout/header";
import { SongsPageClient } from "./songs-page-client";

export default async function SongsPage() {
  const result = await getAppUser();
  if (result.status !== "approved") return null;

  const songs = await getSongs();
  const isAdmin = result.appUser.role === "admin";

  return (
    <>
      <Header title="曲一覧" />
      <SongsPageClient songs={songs} isAdmin={isAdmin} />
    </>
  );
}
