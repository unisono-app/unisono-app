import { getAppUser } from "@/lib/auth/get-current-app-user";
import { getSongs } from "@/features/songs/api";
import { SongsPageClient } from "./songs-page-client";

export default async function SongsPage() {
  const result = await getAppUser();
  if (result.status !== "approved") return null;

  const songs = await getSongs();
  const isAdmin = result.appUser.role === "admin";

  return <SongsPageClient songs={songs} isAdmin={isAdmin} />;
}
