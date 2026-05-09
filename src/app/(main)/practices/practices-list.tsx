"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { fetchPracticeById } from "@/features/practices/api/actions";
import { upsertAttendance, fetchAttendancesByPractice } from "@/features/attendance/api/actions";
import type { PracticeDetail } from "@/features/practices/api";
import type { AttendanceStatus, AttendanceWithUser } from "@/features/attendance/api";
import type { PracticeItem } from "./practices-page-client";

type Props = {
  items: PracticeItem[];
  initialScrollIndex: number;
  onEdit: (practice: PracticeDetail) => void;
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = weekdays[date.getDay()];
  return `${m}/${d}（${w}）`;
}

const statusConfig = {
  attending: { label: "出席", activeClass: "bg-green-500 text-white", inactiveClass: "bg-gray-100 text-gray-500" },
  undecided: { label: "未定", activeClass: "bg-yellow-400 text-white", inactiveClass: "bg-gray-100 text-gray-500" },
  absent: { label: "欠席", activeClass: "bg-gray-400 text-white", inactiveClass: "bg-gray-100 text-gray-500" },
} as const;

function AttendanceButtons({
  practiceId,
  currentStatus,
}: {
  practiceId: string;
  currentStatus: AttendanceStatus | null;
}) {
  const [optimistic, setOptimistic] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setOptimistic(currentStatus);
  }, [currentStatus]);

  function handleClick(status: AttendanceStatus) {
    setOptimistic(status);
    startTransition(async () => {
      await upsertAttendance(practiceId, status);
    });
  }

  return (
    <div className="flex gap-2 mt-2">
      {(Object.keys(statusConfig) as AttendanceStatus[]).map((status) => {
        const config = statusConfig[status];
        const isActive = optimistic === status;
        return (
          <button
            key={status}
            onClick={() => handleClick(status)}
            disabled={isPending}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              isActive ? config.activeClass : config.inactiveClass
            }`}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
}

function AttendanceAccordion({ practiceId }: { practiceId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<AttendanceWithUser[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    if (!open && !data) {
      startTransition(async () => {
        const result = await fetchAttendancesByPractice(practiceId);
        setData(result);
      });
    }
    setOpen((prev) => !prev);
  }

  const summary = data
    ? {
        attending: data.filter((a) => a.status === "attending").length,
        undecided: data.filter((a) => a.status === "undecided").length,
        absent: data.filter((a) => a.status === "absent").length,
      }
    : null;

  return (
    <div className="mt-2">
      <button
        onClick={toggle}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        {summary
          ? `出席${summary.attending} / 未定${summary.undecided} / 欠席${summary.absent}`
          : "出欠一覧"}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="mt-2 space-y-1">
          {isPending && (
            <p className="text-xs text-gray-400">読み込み中...</p>
          )}
          {data && data.length === 0 && (
            <p className="text-xs text-gray-400">回答なし</p>
          )}
          {data &&
            data.length > 0 &&
            (["attending", "undecided", "absent"] as AttendanceStatus[]).map(
              (status) => {
                const group = data.filter((a) => a.status === status);
                if (group.length === 0) return null;
                return (
                  <div key={status} className="text-xs">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 font-medium ${
                        status === "attending"
                          ? "bg-green-100 text-green-700"
                          : status === "undecided"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {statusConfig[status].label}（{group.length}）
                    </span>
                    <div className="mt-0.5 ml-1 text-gray-500">
                      {group
                        .map((a) => a.users?.nickname || a.users?.display_name || "—")
                        .join("、")}
                    </div>
                  </div>
                );
              }
            )}
        </div>
      )}
    </div>
  );
}

export function PracticesList({ items, initialScrollIndex, onEdit }: Props) {
  const scrollTargetRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (initialScrollIndex >= 0 && scrollTargetRef.current) {
      scrollTargetRef.current.scrollIntoView({ block: "start" });
    }
  }, [initialScrollIndex]);

  const today = new Date().toISOString().split("T")[0];

  function handleEdit(id: string) {
    startTransition(async () => {
      const detail = await fetchPracticeById(id);
      if (detail) onEdit(detail);
    });
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isPast = item.date < today;
        return (
          <div
            key={item.id}
            ref={index === initialScrollIndex ? scrollTargetRef : undefined}
            className={`rounded-lg border p-3 ${
              isPast
                ? "border-gray-200 bg-gray-50 opacity-60"
                : item.category === "event"
                  ? "border-l-4 border-l-purple-500 border-y-gray-300 border-r-gray-300 bg-purple-50"
                  : "border-gray-300 bg-white"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2 flex-wrap">
                {item.category === "event" && (
                  <span className="rounded bg-purple-500 px-1.5 py-0.5 text-xs font-medium text-white">
                    {item.title}
                  </span>
                )}
                <span className="text-base font-semibold">
                  {formatDate(item.date)}
                </span>
                <span className="text-sm text-gray-500">{item.timeRange}</span>
              </div>
              <button
                onClick={() => handleEdit(item.id)}
                disabled={isPending}
                className="p-1 text-gray-400 hover:text-black transition-colors"
                aria-label="編集"
              >
                <Pencil size={16} />
              </button>
            </div>
            <div className="mt-1 text-sm text-gray-600">{item.location}</div>
            {item.songs.length > 0 && (
              <div className="mt-1 text-sm text-gray-500">
                {item.songs.join("、")}
              </div>
            )}

            <AttendanceButtons
              practiceId={item.id}
              currentStatus={item.myStatus}
            />

            <AttendanceAccordion practiceId={item.id} />
          </div>
        );
      })}
    </div>
  );
}
