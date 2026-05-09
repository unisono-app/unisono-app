"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Star } from "lucide-react";
import { setCurrentVersion } from "@/features/annual/api/actions";
import { AnnualFormModal } from "@/features/annual/components/annual-form-modal";
import { googleDriveUrlToEmbed } from "@/features/annual/utils";
import type { AnnualScheduleVersion } from "@/features/annual/api";
import { CommentSection } from "@/features/comments/components/comment-section";
import {
  createAnnualScheduleComment,
  deleteAnnualScheduleComment,
} from "@/features/comments/api/actions";
import type { Comment } from "@/features/comments/api";

type Props = {
  isAdmin: boolean;
  initialYear: number;
  currentFiscalYear: number;
  yearsRegistered: number[];
  initialVersions: AnnualScheduleVersion[];
  initialComments: Comment[];
  currentUserId: string;
};

export function AnnualClient({
  isAdmin,
  initialYear,
  currentFiscalYear,
  yearsRegistered,
  initialVersions,
  initialComments,
  currentUserId,
}: Props) {
  const [year, setYear] = useState(initialYear);
  const [versions, setVersions] = useState(initialVersions);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    initialVersions.find((v) => v.is_current)?.id ?? null
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AnnualScheduleVersion | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  // 年度切替: ナビゲーションする（page.tsx で再取得）
  function handleYearChange(newYear: number) {
    setYear(newYear);
    // searchParams を更新してリロード
    const url = new URL(window.location.href);
    url.searchParams.set("year", String(newYear));
    window.location.href = url.toString();
  }

  function handleSetCurrent(scheduleId: string) {
    startTransition(async () => {
      const result = await setCurrentVersion(scheduleId);
      if (!result.error) {
        setVersions((prev) =>
          prev.map((v) => ({ ...v, is_current: v.id === scheduleId }))
        );
      }
    });
  }

  const selectedVersion = versions.find((v) => v.id === selectedVersionId);
  const embedUrl = selectedVersion
    ? googleDriveUrlToEmbed(selectedVersion.pdf_url)
    : null;

  // 年度ドロップダウン用: 登録済み年度 + 現年度（重複なし、降順）
  const yearOptions = Array.from(
    new Set([currentFiscalYear, ...yearsRegistered])
  ).sort((a, b) => b - a);

  return (
    <div className="px-4 py-4 space-y-4">
      {/* 年度選択 + 新版追加 */}
      <div className="flex items-center justify-between gap-2">
        <select
          value={year}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}年度
            </option>
          ))}
        </select>

        {isAdmin && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1 rounded bg-black px-3 py-1.5 text-sm text-white hover:bg-gray-800"
          >
            <Plus size={14} />
            新版を追加
          </button>
        )}
      </div>

      {/* バージョン切替 */}
      {versions.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            バージョン
          </label>
          <div className="space-y-1">
            {versions.map((v) => {
              const isSelected = selectedVersionId === v.id;
              return (
                <div
                  key={v.id}
                  className={`flex items-center gap-2 rounded border px-3 py-2 ${
                    isSelected
                      ? "border-black bg-gray-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <button
                    onClick={() => setSelectedVersionId(v.id)}
                    className="flex flex-1 items-center gap-2 text-left text-sm"
                  >
                    <span className="font-medium">v{v.version_number}</span>
                    {v.file_label && (
                      <span className="text-gray-600">{v.file_label}</span>
                    )}
                    {v.is_current && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                        現版
                      </span>
                    )}
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      {!v.is_current && (
                        <button
                          onClick={() => handleSetCurrent(v.id)}
                          disabled={isPending}
                          className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                          aria-label="現版にする"
                        >
                          <Star size={12} />
                          現版にする
                        </button>
                      )}
                      <button
                        onClick={() => setEditTarget(v)}
                        className="p-1 text-gray-400 hover:text-black"
                        aria-label="編集"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PDF + コメント (縦/横レスポンシブ) */}
      <div className="flex flex-col gap-4 landscape:flex-row">
        {/* PDF 表示 */}
        <div className="landscape:flex-1">
          {versions.length === 0 ? (
            <div className="pt-20 text-center">
              <p className="text-sm text-gray-400">
                {year}年度のスケジュールが登録されていません
              </p>
              {isAdmin && (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="mt-4 inline-flex items-center gap-1 rounded bg-black px-3 py-1.5 text-sm text-white hover:bg-gray-800"
                >
                  <Plus size={14} />
                  登録する
                </button>
              )}
            </div>
          ) : embedUrl ? (
            <div className="aspect-[3/4] w-full landscape:aspect-auto landscape:h-[80vh]">
              <iframe
                src={embedUrl}
                className="h-full w-full rounded border border-gray-300"
                allow="autoplay"
              />
            </div>
          ) : (
            <p className="pt-10 text-center text-sm text-red-600">
              PDF URL が無効です。Google Drive の共有URLを確認してください。
            </p>
          )}
        </div>

        {/* コメント */}
        <div className="landscape:w-80 landscape:flex-shrink-0 landscape:overflow-y-auto landscape:max-h-[80vh] landscape:border-l landscape:pl-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">コメント</h2>
          <CommentSection
            comments={initialComments}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onCreate={(body, isAnonymous) =>
              createAnnualScheduleComment(year, body, isAnonymous)
            }
            onDelete={deleteAnnualScheduleComment}
          />
        </div>
      </div>

      {/* 新版追加モーダル */}
      <AnnualFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultYear={year}
      />

      {/* 編集モーダル */}
      <AnnualFormModal
        key={editTarget?.id ?? "edit"}
        version={editTarget ?? undefined}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
      />
    </div>
  );
}
