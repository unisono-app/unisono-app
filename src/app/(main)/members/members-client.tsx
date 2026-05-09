"use client";

import { useState, useTransition } from "react";
import { MessageSquare } from "lucide-react";
import { fetchAttendancesByPractice } from "@/features/attendance/api/actions";
import type { AttendanceStatus } from "@/features/attendance/api";
import type { RosterUser } from "@/features/users/api";
import type { EventSummary } from "@/features/practices/api";

type Props = {
  groups: { part: string; members: RosterUser[] }[];
  events: EventSummary[];
};

const statusConfig: Record<
  AttendanceStatus,
  { label: string; className: string }
> = {
  attending: {
    label: "出席",
    className: "bg-green-100 text-green-700",
  },
  undecided: {
    label: "未定",
    className: "bg-yellow-100 text-yellow-700",
  },
  absent: {
    label: "欠席",
    className: "bg-gray-100 text-gray-600",
  },
};

function formatEventLabel(e: EventSummary): string {
  const date = new Date(e.practice_date + "T00:00:00");
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d} ${e.title}`;
}

export function MembersClient({ groups, events }: Props) {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [statusByUser, setStatusByUser] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [attendingOnly, setAttendingOnly] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleEventChange(eventId: string) {
    setSelectedEventId(eventId);
    if (!eventId) {
      setStatusByUser({});
      setAttendingOnly(false);
      return;
    }
    startTransition(async () => {
      const attendances = await fetchAttendancesByPractice(eventId);
      const map: Record<string, AttendanceStatus> = {};
      for (const a of attendances) {
        map[a.user_id] = a.status;
      }
      setStatusByUser(map);
    });
  }

  // 表示するメンバーをフィルタリング
  const filteredGroups = groups
    .map(({ part, members }) => ({
      part,
      members:
        selectedEventId && attendingOnly
          ? members.filter((u) => statusByUser[u.id] === "attending")
          : members,
    }))
    .filter((g) => g.members.length > 0);

  return (
    <div className="px-4 py-4 space-y-4">
      {events.length > 0 && (
        <div className="space-y-2">
          <div>
            <label
              htmlFor="event-select"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              イベント別出欠を表示
            </label>
            <select
              id="event-select"
              value={selectedEventId}
              onChange={(e) => handleEventChange(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">表示しない</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {formatEventLabel(e)}
                </option>
              ))}
            </select>
          </div>

          {selectedEventId && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={attendingOnly}
                onChange={(e) => setAttendingOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              参加予定者のみ表示
            </label>
          )}
        </div>
      )}

      {filteredGroups.length === 0 && selectedEventId && attendingOnly ? (
        <p className="pt-10 text-center text-sm text-gray-400">
          参加予定者がいません
        </p>
      ) : (
        filteredGroups.map(({ part, members }) => (
          <section key={part}>
            <h2 className="text-sm font-bold text-gray-700 border-b border-gray-200 pb-1 mb-2">
              {part}
            </h2>
            <ul className="space-y-2">
              {members.map((u) => {
                const status = selectedEventId
                  ? (statusByUser[u.id] ?? null)
                  : null;
                const showLabel = !!selectedEventId && !isPending;
                return (
                  <li key={u.id} className="flex items-start gap-3">
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt={u.display_name}
                        className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-sm font-medium text-white flex-shrink-0">
                        {u.family_name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {u.family_name} {u.given_name}
                        </span>
                        {u.nickname && (
                          <span className="text-xs text-gray-500">
                            {u.nickname}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {u.class_label}
                        </span>
                        {showLabel && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                              status
                                ? statusConfig[status].className
                                : "bg-gray-50 text-gray-400 border border-gray-200"
                            }`}
                          >
                            {status ? statusConfig[status].label : "未回答"}
                          </span>
                        )}
                      </div>
                      {u.note && (
                        <div className="mt-0.5 flex items-start gap-1 text-xs text-gray-500">
                          <MessageSquare
                            size={12}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <span>{u.note}</span>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
