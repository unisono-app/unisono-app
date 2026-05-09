import { redirect } from "next/navigation";
import { getMyProfile } from "@/features/users/api";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  return <ProfileForm profile={profile} />;
}
