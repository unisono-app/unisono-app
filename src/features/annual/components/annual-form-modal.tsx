"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  addAnnualScheduleVersion,
  updateAnnualScheduleVersion,
} from "../api/actions";
import type { AnnualScheduleVersion } from "../api";

type Props = {
  /** 編集モード時に既存のバージョン情報を渡す */
  version?: AnnualScheduleVersion;
  /** 新規作成モード時のデフォルト年度 */
  defaultYear?: number;
  open: boolean;
  onClose: () => void;
};

export function AnnualFormModal({
  version,
  defaultYear,
  open,
  onClose,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const isEdit = !!version;
  const title = isEdit ? "バージョンを編集" : "新版を追加";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const yearStr = formData.get("year") as string;
    const pdfUrl = (formData.get("pdf_url") as string).trim();
    const fileLabel = ((formData.get("file_label") as string) || "").trim() || null;
    const year = Number(yearStr);

    startTransition(async () => {
      const result = isEdit
        ? await updateAnnualScheduleVersion(version!.id, pdfUrl, fileLabel)
        : await addAnnualScheduleVersion(year, pdfUrl, fileLabel);

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

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-lg space-y-4 px-4 py-4"
      >
        <div>
          <label htmlFor="year" className="block text-sm font-medium">
            年度 <span className="text-red-500">*</span>
          </label>
          <input
            id="year"
            name="year"
            type="number"
            required
            disabled={isEdit}
            defaultValue={version?.year ?? defaultYear}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100"
          />
          {isEdit && (
            <p className="mt-1 text-xs text-gray-500">
              年度は変更できません（バージョン {version!.version_number} を編集中）
            </p>
          )}
        </div>

        <div>
          <label htmlFor="pdf_url" className="block text-sm font-medium">
            Google Drive 共有 URL <span className="text-red-500">*</span>
          </label>
          <input
            id="pdf_url"
            name="pdf_url"
            type="url"
            required
            placeholder="https://drive.google.com/file/d/.../view"
            defaultValue={version?.pdf_url}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            「リンクを知っている全員が閲覧可能」に設定した URL を貼り付け
          </p>
        </div>

        <div>
          <label htmlFor="file_label" className="block text-sm font-medium">
            ラベル
          </label>
          <input
            id="file_label"
            name="file_label"
            type="text"
            placeholder="例: 5月更新版、ファイル名"
            defaultValue={version?.file_label ?? ""}
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
