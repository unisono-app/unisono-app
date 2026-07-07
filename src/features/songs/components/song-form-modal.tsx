"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2 } from "lucide-react";
import {
  createSong,
  updateSong,
  deleteSong,
} from "../api/actions";
import type { SongWithPerformances } from "../api";
import { DEFAULT_SONG_PARTS } from "../constants";

type Props = {
  song?: SongWithPerformances;
  open: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  /** 削除完了時の処理。未指定なら onClose + refresh。詳細ページから使う際に一覧へ遷移させる用途 */
  onDeleted?: () => void;
};

const EVENT_NAME_OPTIONS = [
  "コンクール",
  "ロビコン",
  "風待ち/虹晴れ",
  "葡萄園",
  "その他",
];

type PerformanceRow = { year: string; event: string };

export function SongFormModal({ song, open, onClose, isAdmin, onDeleted }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [performances, setPerformances] = useState<PerformanceRow[]>(
    song?.song_performances?.map((p) => ({
      year: String(p.year),
      event: p.event,
    })) ?? []
  );
  const [parts, setParts] = useState<string[]>(
    song?.arrangements ?? [...DEFAULT_SONG_PARTS]
  );
  const [partInput, setPartInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!open) return null;

  const isEdit = !!song;
  const title = isEdit ? "楽曲を編集" : "楽曲を追加";

  function addPerformance() {
    const currentYear = new Date().getFullYear();
    setPerformances((prev) => [
      ...prev,
      { year: String(currentYear), event: "" },
    ]);
  }

  function removePerformance(index: number) {
    setPerformances((prev) => prev.filter((_, i) => i !== index));
  }

  function addPart() {
    const value = partInput.trim();
    if (!value) return;
    setParts((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setPartInput("");
  }

  function removePart(index: number) {
    setParts((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePerformance(
    index: number,
    field: keyof PerformanceRow,
    value: string
  ) {
    setPerformances((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    // performances を JSON 化して formData に追加
    const validPerformances = performances
      .map((p) => ({ year: Number(p.year), event: p.event.trim() }))
      .filter((p) => Number.isFinite(p.year) && p.event.length > 0);
    formData.set("performances", JSON.stringify(validPerformances));
    // 編成（パート一覧）を JSON 化して formData に追加
    formData.set("arrangements", JSON.stringify(parts));

    startTransition(async () => {
      const result = isEdit
        ? await updateSong(song!.id, formData)
        : await createSong(formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  function handleDelete() {
    if (!song) return;
    startTransition(async () => {
      const result = await deleteSong(song.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (onDeleted) {
        onDeleted();
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

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-lg space-y-4 px-4 py-4"
      >
        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={song?.title}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="composer" className="block text-sm font-medium">
            作曲者
          </label>
          <input
            id="composer"
            name="composer"
            type="text"
            defaultValue={song?.composer ?? ""}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="arranger" className="block text-sm font-medium">
            編曲者
          </label>
          <input
            id="arranger"
            name="arranger"
            type="text"
            defaultValue={song?.arranger ?? ""}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="year" className="block text-sm font-medium">
            作曲年
          </label>
          <input
            id="year"
            name="year"
            type="number"
            defaultValue={song?.year ?? ""}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="score_url" className="block text-sm font-medium">
            楽譜 URL
          </label>
          <input
            id="score_url"
            name="score_url"
            type="url"
            defaultValue={song?.score_url ?? ""}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="part-input" className="block text-sm font-medium">
            編成（パート）
          </label>
          <p className="mt-0.5 text-xs text-gray-500">
            パートを1つずつ追加してください（例: Alto 1st, Prim 1st, A.cem）
          </p>
          <div className="mt-1 flex gap-2">
            <input
              id="part-input"
              type="text"
              value={partInput}
              onChange={(e) => setPartInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addPart();
                }
              }}
              placeholder="例: Alto 1st"
              className="flex-1 rounded border border-gray-300 px-3 py-2"
            />
            <button
              type="button"
              onClick={addPart}
              className="flex items-center gap-1 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Plus size={14} />
              追加
            </button>
          </div>
          {parts.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {parts.map((p, index) => (
                <li
                  key={p}
                  className="flex items-center gap-1 rounded-full bg-gray-100 py-1 pl-3 pr-1 text-sm"
                >
                  {p}
                  <button
                    type="button"
                    onClick={() => removePart(index)}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-600"
                    aria-label={`${p} を削除`}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">演奏履歴</label>
          <div className="space-y-2">
            {performances.map((p, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="number"
                  value={p.year}
                  onChange={(e) =>
                    updatePerformance(index, "year", e.target.value)
                  }
                  placeholder="年"
                  className="w-24 rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="text"
                  value={p.event}
                  onChange={(e) =>
                    updatePerformance(index, "event", e.target.value)
                  }
                  list="event-name-options"
                  placeholder="イベント名"
                  className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removePerformance(index)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  aria-label="削除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addPerformance}
              className="flex items-center gap-1 rounded border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              <Plus size={14} />
              演奏履歴を追加
            </button>
          </div>
          <datalist id="event-name-options">
            {EVENT_NAME_OPTIONS.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-black px-4 py-3 text-white font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {isPending ? "保存中..." : "保存"}
        </button>

        {/* 削除（admin のみ、編集時のみ） */}
        {isEdit && isAdmin && (
          <div className="border-t pt-4">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
                この楽曲を削除
              </button>
            ) : (
              <div className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-3">
                <p className="text-sm text-red-700">
                  本当に削除しますか？演奏履歴も同時に削除されます。
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex-1 rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    削除する
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
