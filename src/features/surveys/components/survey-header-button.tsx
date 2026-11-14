"use client";

import { CalendarCheck } from "lucide-react";
import { useSurvey } from "./survey-provider";

/** ヘッダーのアンケートボタン。集計中・結果公開中のアンケートがあるときだけ表示する */
export function SurveyHeaderButton() {
  const { available, needsAnswer, open } = useSurvey();
  if (!available) return null;

  return (
    <button
      type="button"
      onClick={open}
      className="relative flex-shrink-0 p-1 text-gray-600 hover:text-black"
      aria-label={
        needsAnswer ? "練習候補日アンケート(未回答)" : "練習候補日アンケート"
      }
    >
      <CalendarCheck size={22} />
      {needsAnswer && (
        <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border border-white bg-red-500" />
      )}
    </button>
  );
}
