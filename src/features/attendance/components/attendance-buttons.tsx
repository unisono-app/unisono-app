"use client";

import { useEffect, useState, useTransition } from "react";
import { upsertAttendance } from "../api/actions";
import type { AttendanceStatus } from "../api";

const statusConfig: Record<
  AttendanceStatus,
  { label: string; activeClass: string; inactiveClass: string }
> = {
  attending: {
    label: "出席",
    activeClass: "bg-green-500 text-white",
    inactiveClass: "bg-gray-100 text-gray-500",
  },
  undecided: {
    label: "未定",
    activeClass: "bg-yellow-400 text-white",
    inactiveClass: "bg-gray-100 text-gray-500",
  },
  absent: {
    label: "欠席",
    activeClass: "bg-gray-400 text-white",
    inactiveClass: "bg-gray-100 text-gray-500",
  },
};

type Props = {
  practiceId: string;
  currentStatus: AttendanceStatus | null;
  size?: "sm" | "md";
};

export function AttendanceButtons({
  practiceId,
  currentStatus,
  size = "sm",
}: Props) {
  const [optimistic, setOptimistic] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setOptimistic(currentStatus);
  }, [currentStatus]);

  function handleClick(e: React.MouseEvent, status: AttendanceStatus) {
    e.stopPropagation();
    e.preventDefault();
    setOptimistic(status);
    startTransition(async () => {
      await upsertAttendance(practiceId, status);
    });
  }

  const padding = size === "md" ? "px-4 py-2 text-sm" : "px-3 py-1 text-xs";

  return (
    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
      {(Object.keys(statusConfig) as AttendanceStatus[]).map((status) => {
        const config = statusConfig[status];
        const isActive = optimistic === status;
        return (
          <button
            key={status}
            onClick={(e) => handleClick(e, status)}
            disabled={isPending}
            className={`rounded-full font-medium transition-colors ${padding} ${
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
