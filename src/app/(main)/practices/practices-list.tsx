"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { fetchPracticeById } from "@/features/practices/api/actions";
import type { PracticeDetail } from "@/features/practices/api";
import { AttendanceButtons } from "@/features/attendance/components/attendance-buttons";
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

export function PracticesList({ items, initialScrollIndex, onEdit }: Props) {
  const router = useRouter();
  const scrollTargetRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (initialScrollIndex >= 0 && scrollTargetRef.current) {
      scrollTargetRef.current.scrollIntoView({ block: "start" });
    }
  }, [initialScrollIndex]);

  const today = new Date().toISOString().split("T")[0];

  function handleEdit(e: React.MouseEvent, id: string) {
    e.stopPropagation();
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
            onClick={() => router.push(`/practices/${item.id}`)}
            className={`scroll-mt-16 cursor-pointer rounded-lg border p-3 transition-colors hover:border-gray-400 active:bg-gray-100 ${
              isPast
                ? "border-gray-200 bg-gray-50 opacity-60"
                : item.category === "event"
                  ? "border-l-4 border-l-purple-500 border-y-gray-300 border-r-gray-300 bg-purple-50"
                  : "border-gray-300 bg-white"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2 flex-wrap">
                {item.category === "event" ? (
                  <span className="rounded bg-purple-500 px-1.5 py-0.5 text-xs font-medium text-white">
                    {item.title}
                  </span>
                ) : (
                  <span className="rounded bg-green-600 px-1.5 py-0.5 text-xs font-medium text-white">
                    練習
                  </span>
                )}
                <span className="text-base font-semibold">
                  {formatDate(item.date)}
                </span>
                <span className="text-sm text-gray-500">{item.timeRange}</span>
              </div>
              <button
                onClick={(e) => handleEdit(e, item.id)}
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

            <div className="mt-2">
              <AttendanceButtons
                practiceId={item.id}
                currentStatus={item.myStatus}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
