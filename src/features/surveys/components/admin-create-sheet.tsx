"use client";

import { useState, useTransition } from "react";
import { CalendarCheck, CalendarPlus, Dumbbell } from "lucide-react";
import { closeSurvey, endSurvey } from "../api/actions";
import { SurveyCreateModal } from "./survey-create-modal";
import { useSurvey } from "./survey-provider";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreatePractice: () => void;
};

/**
 * 管理者が練習一覧の「+」ボタンを押したときの選択シート。
 * 練習の作成と、アンケートの作成 / 締め切り / 結果公開の終了を選べる。
 */
export function AdminCreateSheet({ open, onClose, onCreatePractice }: Props) {
  const { survey } = useSurvey();
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<"close" | "end" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setConfirming(null);
    setError(null);
    onClose();
  }

  function runConfirmed() {
    if (!survey || !confirming) return;
    const action = confirming === "close" ? closeSurvey : endSurvey;
    startTransition(async () => {
      const res = await action(survey.id);
      if (res.error) {
        setError(res.error);
        return;
      }
      reset();
    });
  }

  if (creating) {
    return (
      <SurveyCreateModal
        onClose={() => {
          setCreating(false);
          reset();
        }}
      />
    );
  }
  if (!open) return null;

  const itemClass =
    "flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:bg-gray-50";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={reset}
    >
      <div
        className="w-full max-w-md space-y-2 rounded-t-xl bg-white p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="作成メニュー"
      >
        {confirming ? (
          <>
            <p className="text-sm font-medium">
              {confirming === "close"
                ? "集計を締め切りますか?"
                : "結果公開を終了しますか?"}
            </p>
            <p className="text-xs text-gray-500">
              {confirming === "close"
                ? "締め切ると回答できなくなり、結果が全員に公開されます。"
                : "終了すると、結果は管理者以外には見られなくなります。新しいアンケートを作成できるようになります。"}
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                disabled={isPending}
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={runConfirmed}
                disabled={isPending}
                className="flex-1 rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending ? "実行中…" : "実行する"}
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                reset();
                onCreatePractice();
              }}
            >
              <Dumbbell size={20} />
              練習・イベントを作成
            </button>

            {!survey && (
              <button
                type="button"
                className={itemClass}
                onClick={() => setCreating(true)}
              >
                <CalendarPlus size={20} />
                練習候補日アンケートを作成
              </button>
            )}
            {survey?.phase === "collecting" && (
              <button
                type="button"
                className={itemClass}
                onClick={() => setConfirming("close")}
              >
                <CalendarCheck size={20} />
                アンケートを締め切る(集計中)
              </button>
            )}
            {survey?.phase === "published" && (
              <button
                type="button"
                className={itemClass}
                onClick={() => setConfirming("end")}
              >
                <CalendarCheck size={20} />
                アンケートの結果公開を終了する
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
