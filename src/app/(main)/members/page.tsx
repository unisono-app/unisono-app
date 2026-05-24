import Link from "next/link";
import { Settings } from "lucide-react";
import { getApprovedUsers, groupByPart } from "@/features/users/api";
import { getEvents } from "@/features/practices/api";
import { Header } from "@/components/layout/header";
import { MembersClient } from "./members-client";

export default async function MembersPage() {
  const users = await getApprovedUsers();
  const groups = groupByPart(users);
  const events = await getEvents();

  return (
    <>
      <Header title="メンバー" />
      <div>
        <div className="flex items-center justify-end px-4 pt-3">
          <Link
            href="/members/management"
            className="flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
          >
            <Settings size={14} />
            管理
          </Link>
        </div>

        {users.length === 0 ? (
          <div className="px-4 py-4">
            <p className="pt-20 text-center text-sm text-gray-400">
              メンバーがいません
            </p>
          </div>
        ) : (
          <MembersClient groups={groups} events={events} />
        )}
      </div>
    </>
  );
}
