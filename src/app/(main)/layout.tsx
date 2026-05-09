import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/auth/get-current-app-user";
import { NavBar } from "@/components/layout/nav-bar";
import { ProfileButton } from "@/components/layout/profile-button";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getAppUser();

  if (result.status === "unauthenticated") redirect("/login");
  if (result.status === "unregistered") redirect("/register");
  if (result.status === "pending") redirect("/approval-pending");

  const { appUser } = result;

  return (
    <>
      <ProfileButton
        avatarUrl={appUser.avatar_url}
        displayName={appUser.display_name}
      />
      <main
        className="
          pb-16
          landscape:pb-0 landscape:pl-16
        "
      >
        {children}
      </main>
      <NavBar />
    </>
  );
}
