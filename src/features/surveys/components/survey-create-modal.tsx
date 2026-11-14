"use client";

import { useState, useTransition } from "react";
import { Star, X } from "lucide-react";
import { createSurvey } from "../api/actions";

type Props = {
  onClose: () => void;
};

type DateEntry = { date: string; isPriority: boolean };

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`;
}

/** 管理者用: アンケート（候補日）の作成。作成 = 集計開始 */
export function SurveyCreateModal({ onClose }: Props) {
  const [title, setTitle] = useState("練習候補日アンケート");
  const [entries, setEntries] = useState<DateEntry[]>([]);
  const [pickedDate, setPickedDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function addDate() {
    if (!pickedDate || entries.some((e) => e.date === pickedDate)) return;
    setEntries((prev) =>
      [...prev, { date: pickedDate, isPriority: false }].sort((a, b) =>
        a.date.localeCompare(b.date)
      )
    );
    setPickedDate("");
  }

  function togglePriority(date: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.date === date ? { ...e, isPriority: !e.isPriority } : e
      )
    );
  }

  function removeDate(date: string) {
    setEntries((prev) => prev.filter((e) => e.date !== date));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await createSurvey({
        title,
        dates: entries.map((e) => ({
          date: e.date,
          isPriority: e.isPriority,
        })),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-gray-500 hover:text-black"
          aria-label="閉じる"
        >
          <X size={24} />
        </button>
        <h2 className="text-base font-semibold">アンケートを作成</h2>
        <div className="w-8" />
      </div>

      <div className="space-y-5 p-4">
        <div>
          <label htmlFor="survey-title" className="block text-sm font-medium">
            タイトル
          </label>
          <input
            id="survey-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="survey-date" className="block text-sm font-medium">
            候補日
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="survey-date"
              type="date"
              value={pickedDate}
              onChange={(e) => setPickedDate(e.target.value)}
              className="block min-w-0 flex-1 rounded border border-gray-300 px-3 py-2"
            />
            <button
              type="button"
              onClick={addDate}
              disabled={!pickedDate}
              className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              追加
            </button>
          </div>

          {entries.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">
              日付を選んで「追加」してください
            </p>
          ) : (
            <>
              <p className="mt-3 text-xs text-gray-500">
                星を付けた日は「有力候補」として目立たせます
              </p>
              <ul className="mt-1 space-y-2">
                {entries.map((e) => (
                  <li
                    key={e.date}
                    className="flex items-center justify-between rounded border border-gray-200 px-3 py-2"
                  >
                    <span className="text-sm">{formatDate(e.date)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => togglePriority(e.date)}
                        aria-pressed={e.isPriority}
                        aria-label="有力候補にする"
                        className="p-1"
                      >
                        <Star
                          size={20}
                          className={
                            e.isPriority
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDate(e.date)}
                        aria-label="削除"
                        className="p-1 text-gray-400 hover:text-black"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || entries.length === 0 || !title.trim()}
          className="w-full rounded bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
        >
          {isPending ? "作成中…" : "作成して集計を開始"}
        </button>
      </div>
    </div>
  );
}
