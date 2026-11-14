"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  /** 選択中の日付（YYYY-MM-DD） */
  selected: string[];
  onToggle: (date: string) => void;
  /** この日付（YYYY-MM-DD）より前は選択不可。未指定なら制限なし */
  minDate?: string;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** ローカル日付を YYYY-MM-DD にする（toISOString は UTC のためずれる） */
export function toDateString(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 複数の日付をタップで選択 / 解除できる月表示カレンダー */
export function MultiDateCalendar({ selected, onToggle, minDate }: Props) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function moveMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const selectedSet = new Set(selected);

  return (
    <div className="rounded border border-gray-200 p-2">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          className="p-1 text-gray-600 hover:text-black"
          aria-label="前の月"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium">
          {cursor.year}年{cursor.month + 1}月
        </span>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          className="p-1 text-gray-600 hover:text-black"
          aria-label="次の月"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`py-1 ${
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-500"
            }`}
          >
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} />;
          const dateStr = toDateString(cursor.year, cursor.month, day);
          const isSelected = selectedSet.has(dateStr);
          const disabled = !!minDate && dateStr < minDate;
          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(dateStr)}
              aria-pressed={isSelected}
              aria-label={`${cursor.month + 1}月${day}日`}
              className={`mx-auto h-9 w-9 rounded-full text-sm transition-colors ${
                isSelected
                  ? "bg-black text-white"
                  : disabled
                    ? "text-gray-300"
                    : "text-gray-800 hover:bg-gray-100"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
