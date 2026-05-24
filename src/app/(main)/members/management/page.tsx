import { getAppUser } from "@/lib/auth/get-current-app-user";
import { getAllMembers } from "@/features/members/api";
import { Header } from "@/components/layout/header";
import { ManagementClient } from "./management-client";

export default async function MembersManagementPage() {
  const result = await getAppUser();
  if (result.status !== "approved") return null;

  const isAdmin = result.appUser.role === "admin";
  const members = await getAllMembers();

  return (
    <>
      <Header title="メンバー管理" backHref="/members" />
      <div className="px-4 py-4 space-y-4">
        <ManagementClient
          members={members}
          isAdmin={isAdmin}
          currentUserId={result.appUser.id}
        />
      </div>
    </>
  );
}
