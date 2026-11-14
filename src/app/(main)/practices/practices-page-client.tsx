"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PracticesList } from "./practices-list";
import { PracticeFormModal } from "@/features/practices/components/practice-form-modal";
import type { PracticeDetail } from "@/features/practices/api";
import type { AttendanceStatus } from "@/features/attendance/api";
import type { PracticeCategory } from "@/features/practices/api";
import type { SongOption } from "@/features/songs/api";
import { AdminCreateSheet } from "@/features/surveys/components/admin-create-sheet";

export type PracticeItem = {
  id: string;
  slug: string | null;
  date: string;
  timeRange: string;
  location: string;
  songs: string[];
  myStatus: AttendanceStatus | null;
  category: PracticeCategory;
  title: string;
};

type Props = {
  items: PracticeItem[];
  initialScrollIndex: number;
  songs: SongOption[];
  isAdmin: boolean;
};

export function PracticesPageClient({
  items,
  initialScrollIndex,
  songs,
  isAdmin,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [adminSheetOpen, setAdminSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PracticeDetail | null>(null);

  return (
    <div className="px-4 py-4">
      {items.length === 0 && !createOpen ? (
        <p className="pt-20 text-center text-sm text-gray-400">
          練習予定はありません
        </p>
      ) : (
        <PracticesList
          items={items}
          initialScrollIndex={initialScrollIndex}
          onEdit={setEditTarget}
        />
      )}

      {/* 新規作成 FAB */}
      <button
        onClick={() =>
          isAdmin ? setAdminSheetOpen(true) : setCreateOpen(true)
        }
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg hover:bg-gray-800 transition-colors landscape:bottom-4"
        aria-label={isAdmin ? "作成メニューを開く" : "練習を作成"}
      >
        <Plus size={24} />
      </button>

      {/* 管理者: 練習 / アンケートの選択シート */}
      {isAdmin && (
        <AdminCreateSheet
          open={adminSheetOpen}
          onClose={() => setAdminSheetOpen(false)}
          onCreatePractice={() => setCreateOpen(true)}
        />
      )}

      {/* 作成モーダル */}
      <PracticeFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        songs={songs}
      />

      {/* 編集モーダル */}
      <PracticeFormModal
        key={editTarget?.id ?? "edit"}
        practice={editTarget ?? undefined}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        songs={songs}
      />
    </div>
  );
}
