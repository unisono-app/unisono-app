"use client";

import { CalendarPlus, Dumbbell } from "lucide-react";
import { useState } from "react";
import { SurveyCreateModal } from "./survey-create-modal";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreatePractice: () => void;
};

/**
 * 管理者が練習一覧の「+」ボタンを押したときの選択シート（アンケートが無いときのみ使う）。
 * 練習の作成と、アンケートの作成を選べる。
 * アンケートの編集・締め切り・結果公開の終了は、アンケートのモーダルから行う。
 */
export function AdminCreateSheet({ open, onClose, onCreatePractice }: Props) {
  const [creating, setCreating] = useState(false);

  if (creating) {
    return (
      <SurveyCreateModal
        onClose={() => {
          setCreating(false);
          onClose();
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
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-2 rounded-t-xl bg-white p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="作成メニュー"
      >
        <button
          type="button"
          className={itemClass}
          onClick={() => {
            onClose();
            onCreatePractice();
          }}
        >
          <Dumbbell size={20} />
          練習・イベントを作成
        </button>
        <button
          type="button"
          className={itemClass}
          onClick={() => setCreating(true)}
        >
          <CalendarPlus size={20} />
          練習候補日アンケートを作成
        </button>
      </div>
    </div>
  );
}
