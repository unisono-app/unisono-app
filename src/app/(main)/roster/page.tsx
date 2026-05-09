import { getApprovedUsers, groupByPart } from "@/features/users/api";
import { getEvents } from "@/features/practices/api";
import { RosterClient } from "./roster-client";

export default async function RosterPage() {
  const users = await getApprovedUsers();
  const groups = groupByPart(users);
  const events = await getEvents();

  if (users.length === 0) {
    return (
      <div className="px-4 py-4">
        <p className="pt-20 text-center text-sm text-gray-400">
          メンバーがいません
        </p>
      </div>
    );
  }

  return <RosterClient groups={groups} events={events} />;
}
