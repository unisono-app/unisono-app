import { redirect } from "next/navigation";
import { getMyProfile } from "@/features/users/api";
import { Header } from "@/components/layout/header";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  return (
    <>
      <Header title="プロフィール" backHref="/practices" />
      <ProfileForm profile={profile} />
    </>
  );
}
