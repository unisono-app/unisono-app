import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/auth/get-current-app-user";
import { NavBar } from "@/components/layout/nav-bar";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getAppUser();

  if (result.status === "unauthenticated") redirect("/login");
  if (result.status === "unregistered") redirect("/register");
  if (result.status === "pending") redirect("/approval-pending");

  return (
    <>
      <main
        className="
          pt-12 pb-16
          landscape:pb-0 landscape:pl-16
        "
      >
        <AnnouncementBanner />
        {children}
      </main>
      <NavBar />
    </>
  );
}
