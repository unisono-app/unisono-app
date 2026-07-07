"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SongsList } from "./songs-list";
import { SongFormModal } from "@/features/songs/components/song-form-modal";
import type { SongWithPerformances } from "@/features/songs/api";

type Props = {
  songs: SongWithPerformances[];
  myParts: Record<string, string>;
  isAdmin: boolean;
};

export function SongsPageClient({ songs, myParts, isAdmin }: Props) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="px-4 py-4">
      {songs.length === 0 ? (
        <p className="pt-20 text-center text-sm text-gray-400">
          楽曲が登録されていません
        </p>
      ) : (
        <SongsList songs={songs} myParts={myParts} />
      )}

      {/* 新規追加 FAB */}
      <button
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg hover:bg-gray-800 transition-colors landscape:bottom-4"
        aria-label="楽曲を追加"
      >
        <Plus size={24} />
      </button>

      {/* 作成モーダル */}
      <SongFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        isAdmin={isAdmin}
      />
    </div>
  );
}
