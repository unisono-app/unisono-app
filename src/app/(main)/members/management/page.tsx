import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAppUser } from "@/lib/auth/get-current-app-user";
import { getAllMembers } from "@/features/members/api";
import { ManagementClient } from "./management-client";

export default async function MembersManagementPage() {
  const result = await getAppUser();
  if (result.status !== "approved") return null;

  const isAdmin = result.appUser.role === "admin";
  const members = await getAllMembers();

  return (
    <div className="px-4 py-4 space-y-4">
      <Link
        href="/members"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-black"
      >
        <ArrowLeft size={18} />
        戻る
      </Link>

      <h1 className="text-lg font-bold">メンバー管理</h1>

      <ManagementClient
        members={members}
        isAdmin={isAdmin}
        currentUserId={result.appUser.id}
      />
    </div>
  );
}
