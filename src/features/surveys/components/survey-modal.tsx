"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Pencil, Star, X } from "lucide-react";
import { memberDisplayName } from "@/features/users/format";
import { submitSurveyAnswer } from "../api/actions";
import { SurveyCreateModal } from "./survey-create-modal";
import type {
  ActiveSurvey,
  MySurveyState,
  SurveyDateResult,
  SurveyResults,
  SurveyResponseStatus,
} from "../api";

type Choice = "ok" | SurveyResponseStatus;

type Props = {
  survey: ActiveSurvey;
  myState: MySurveyState;
  /** 閲覧権限がない（集計中で未回答）場合は null */
  results: SurveyResults | null;
  /** 管理者のみ、集計中のアンケートを編集できる */
  isAdmin: boolean;
  /** 「後で答える」「閉じる」 */
  onClose: () => void;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`;
}

function DateLabel({
  date,
  isPriority,
}: {
  date: string;
  isPriority: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 font-medium">
      {formatDate(date)}
      {isPriority && (
        <Star
          size={16}
          className="fill-yellow-400 text-yellow-400"
          aria-label="有力候補"
        />
      )}
    </span>
  );
}

const CHOICES: { value: Choice; label: string; active: string }[] = [
  { value: "ok", label: "○", active: "border-black bg-black text-white" },
  {
    value: "maybe",
    label: "△",
    active: "border-yellow-500 bg-yellow-500 text-white",
  },
  {
    value: "absent",
    label: "×",
    active: "border-red-500 bg-red-500 text-white",
  },
];

export function SurveyModal({
  survey,
  myState,
  results,
  isAdmin,
  onClose,
}: Props) {
  const collecting = survey.phase === "collecting";
  const [mode, setMode] = useState<"form" | "results">(
    collecting && !myState.answered ? "form" : "results"
  );
  const [choices, setChoices] = useState<Record<string, Choice>>(() => {
    const init: Record<string, Choice> = {};
    for (const d of survey.dates) init[d.id] = myState.responses[d.id] ?? "ok";
    return init;
  });
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    // 編集で候補日が増えた場合など、未設定の日は ○ 扱い
    const entries = survey.dates.flatMap((d) => {
      const choice = choices[d.id] ?? "ok";
      return choice === "ok"
        ? []
        : [{ surveyDateId: d.id, status: choice as SurveyResponseStatus }];
    });
    startTransition(async () => {
      const res = await submitSurveyAnswer(survey.id, entries);
      if (res.error) {
        setError(res.error);
        return;
      }
      setMode("results");
    });
  }

  const showForm = mode === "form" && collecting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="練習候補日アンケート"
    >
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-xl bg-white sm:rounded-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{survey.title}</h2>
            <p className="text-xs text-gray-500">
              {collecting ? "集計中" : "結果公開中"}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            {isAdmin && collecting && (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="p-1 text-gray-500 hover:text-black"
                aria-label="アンケートを編集"
              >
                <Pencil size={20} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-black"
              aria-label="閉じる"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-3">
          {showForm ? (
            <>
              <p className="mb-3 text-sm text-gray-600">
                参加不可日を×で回答してください
              </p>
              <ul className="space-y-2">
                {survey.dates.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded border border-gray-200 px-3 py-2"
                  >
                    <DateLabel
                      date={d.candidate_date}
                      isPriority={d.is_priority}
                    />
                    <div className="flex gap-1">
                      {CHOICES.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() =>
                            setChoices((prev) => ({ ...prev, [d.id]: c.value }))
                          }
                          aria-pressed={(choices[d.id] ?? "ok") === c.value}
                          className={`h-9 w-9 rounded border text-base transition-colors ${
                            (choices[d.id] ?? "ok") === c.value
                              ? c.active
                              : "border-gray-300 bg-white text-gray-500"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </>
          ) : results ? (
            <ResultsView results={results} />
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">
              読み込み中…
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t px-4 py-3">
          {showForm ? (
            <>
              <button
                type="button"
                onClick={myState.answered ? () => setMode("results") : onClose}
                disabled={isPending}
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
              >
                {myState.answered ? "キャンセル" : "後で答える"}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-1 rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending ? "送信中…" : "回答する"}
              </button>
            </>
          ) : (
            <>
              {collecting && (
                <button
                  type="button"
                  onClick={() => setMode("form")}
                  className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700"
                >
                  回答を修正
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded bg-black px-3 py-2 text-sm font-medium text-white"
              >
                閉じる
              </button>
            </>
          )}
        </div>
      </div>
      {editOpen && (
        <SurveyCreateModal
          editing={survey}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}

function ResultsView({ results }: { results: SurveyResults }) {
  const [sort, setSort] = useState<"date" | "easy">("date");
  const unanswered = Math.max(results.memberCount - results.answeredCount, 0);

  const rows = [...results.dates].sort((a, b) => {
    if (sort === "easy") {
      return (
        a.absent.length - b.absent.length ||
        a.maybe.length - b.maybe.length ||
        a.candidate_date.localeCompare(b.candidate_date)
      );
    }
    return a.candidate_date.localeCompare(b.candidate_date);
  });

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          回答済み {results.answeredCount}人 / 未回答 {unanswered}人
        </p>
        <div className="flex overflow-hidden rounded border border-gray-300 text-xs">
          {(
            [
              ["date", "日付順"],
              ["easy", "参加しやすい順"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSort(value)}
              aria-pressed={sort === value}
              className={`px-2 py-1 ${
                sort === value ? "bg-black text-white" : "bg-white text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <ResultRow key={r.id} row={r} answeredCount={results.answeredCount} />
        ))}
      </ul>
    </>
  );
}

function ResultRow({
  row,
  answeredCount,
}: {
  row: SurveyDateResult;
  answeredCount: number;
}) {
  const [open, setOpen] = useState(false);
  const ok = Math.max(answeredCount - row.maybe.length - row.absent.length, 0);
  const hasNames = row.absent.length > 0 || row.maybe.length > 0;
  return (
    <li
      className={`rounded border ${
        row.is_priority
          ? "border-yellow-300 bg-yellow-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={() => hasNames && setOpen((v) => !v)}
        aria-expanded={hasNames ? open : undefined}
        aria-label={hasNames ? "回答者の名前を開閉" : undefined}
        disabled={!hasNames}
        className="flex w-full items-center gap-1 px-2 py-2 text-left disabled:cursor-default"
      >
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-gray-500">
          {hasNames && (
            <ChevronRight
              size={16}
              className={`transition-transform ${open ? "rotate-90" : ""}`}
            />
          )}
        </span>
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <DateLabel date={row.candidate_date} isPriority={row.is_priority} />
          <span className="text-sm tabular-nums text-gray-700">
            ○ {ok}　<span className="text-yellow-600">△ {row.maybe.length}</span>
            　<span className="text-red-600">× {row.absent.length}</span>
          </span>
        </span>
      </button>
      {hasNames && open && (
        <div className="space-y-0.5 border-t border-gray-100 px-3 pb-2 pt-1.5 pl-8">
          {row.absent.length > 0 && (
            <p className="text-xs text-red-600">
              ×: {row.absent.map((u) => memberDisplayName(u)).join("、")}
            </p>
          )}
          {row.maybe.length > 0 && (
            <p className="text-xs text-yellow-700">
              △: {row.maybe.map((u) => memberDisplayName(u)).join("、")}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
