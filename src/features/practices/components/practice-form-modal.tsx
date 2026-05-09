"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createPractice, updatePractice } from "../api/actions";
import type { PracticeDetail } from "../api";

type Props = {
  practice?: PracticeDetail;
  open: boolean;
  onClose: () => void;
};

const EVENT_NAME_OPTIONS = [
  "コンクール",
  "ロビコン",
  "風待ち/虹晴れ",
  "葡萄園",
  "その他",
];

export function PracticeFormModal({ practice, open, onClose }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<"practice" | "event">(
    practice?.category ?? "practice"
  );

  if (!open) return null;

  const isEdit = !!practice;
  const title = isEdit
    ? category === "event"
      ? "イベントを編集"
      : "練習を編集"
    : category === "event"
      ? "イベントを作成"
      : "練習を作成";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = isEdit
        ? await updatePractice(practice!.id, formData)
        : await createPractice(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      onClose();
      router.refresh();
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
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="w-8" />
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4 px-4 py-4">
        <div>
          <label className="block text-sm font-medium mb-1">種別</label>
          <div className="flex gap-2">
            {(["practice", "event"] as const).map((c) => (
              <label
                key={c}
                className={`flex-1 cursor-pointer rounded border px-3 py-2 text-center text-sm transition-colors ${
                  category === c
                    ? "border-black bg-black text-white"
                    : "border-gray-300 bg-white text-gray-600"
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={c}
                  checked={category === c}
                  onChange={() => setCategory(c)}
                  className="sr-only"
                />
                {c === "practice" ? "練習" : "イベント"}
              </label>
            ))}
          </div>
        </div>

        {category === "event" && (
          <div>
            <label htmlFor="title" className="block text-sm font-medium">
              イベント名 <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              list="event-name-options"
              defaultValue={practice?.title ?? ""}
              placeholder="例: コンクール"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            />
            <datalist id="event-name-options">
              {EVENT_NAME_OPTIONS.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
        )}

        <div>
          <label htmlFor="practice_date" className="block text-sm font-medium">
            日付 <span className="text-red-500">*</span>
          </label>
          <input
            id="practice_date"
            name="practice_date"
            type="date"
            required
            defaultValue={practice?.practice_date}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="time_range" className="block text-sm font-medium">
            時間帯 <span className="text-red-500">*</span>
          </label>
          <input
            id="time_range"
            name="time_range"
            type="text"
            required
            placeholder="例: 13:00〜17:00"
            defaultValue={practice?.time_range}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium">
            場所 <span className="text-red-500">*</span>
          </label>
          <input
            id="location"
            name="location"
            type="text"
            required
            defaultValue={practice?.location}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="deadline" className="block text-sm font-medium">
            出欠回答締切
          </label>
          <input
            id="deadline"
            name="deadline"
            type="datetime-local"
            defaultValue={practice?.deadline?.slice(0, 16)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium">
            備考
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={practice?.notes ?? ""}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="schedule" className="block text-sm font-medium">
            タイムスケジュール
          </label>
          <textarea
            id="schedule"
            name="schedule"
            rows={4}
            placeholder={"例:\n13:00 集合\n13:30 合奏\n15:00 休憩"}
            defaultValue={practice?.schedule ?? ""}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-medium">
            練習内容
          </label>
          <textarea
            id="content"
            name="content"
            rows={4}
            placeholder={"例:\n・新曲の譜読み\n・コンクール曲の通し練習"}
            defaultValue={practice?.content ?? ""}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-black px-4 py-3 text-white font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {isPending ? "保存中..." : "保存"}
        </button>
      </form>
    </div>
  );
}
