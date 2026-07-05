"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { setMySongPart } from "@/features/songs/api/actions";
import { SongFormModal } from "@/features/songs/components/song-form-modal";
import { formatMemberName } from "@/features/users/format";
import type {
  SongWithPerformances,
  SongPartAssignment,
} from "@/features/songs/api";

type Props = {
  song: SongWithPerformances;
  parts: SongPartAssignment[];
  myPart: string | null;
  currentUserId: string;
  isAdmin: boolean;
};

function memberLabel(a: SongPartAssignment): string {
  const u = a.users;
  if (!u) return "—";
  if (u.nickname) return u.nickname;
  return formatMemberName(u.family_name, u.given_name, u.old_family_name);
}

export function SongDetailClient({
  song,
  parts,
  myPart,
  currentUserId,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState(myPart ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const arrangements = song.arrangements ?? [];

  function handleSavePart() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await setMySongPart(song.id, selected || null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  }

  // パート → メンバー のグルーピング
  const byPart = new Map<string, SongPartAssignment[]>();
  for (const a of parts) {
    const list = byPart.get(a.part) ?? [];
    list.push(a);
    byPart.set(a.part, list);
  }

  const credits = [
    song.composer ? `${song.composer} 作` : null,
    song.arranger ? `${song.arranger} 編` : null,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <div className="space-y-6 px-4 py-4">
      {/* 楽曲情報 */}
      <section className="space-y-1">
        {credits && <p className="text-sm text-gray-600">{credits}</p>}
        {song.year && <p className="text-sm text-gray-600">{song.year}年</p>}
        {song.score_url && (
          <a
            href={song.score_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-blue-600 underline"
          >
            楽譜を開く
          </a>
        )}
        {song.song_performances.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {song.song_performances
              .slice()
              .sort((a, b) => b.year - a.year)
              .map((p) => (
                <span
                  key={p.id}
                  className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700"
                >
                  {p.event} &apos;{String(p.year).slice(-2)}
                </span>
              ))}
          </div>
        )}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Pencil size={14} />
            編集
          </button>
        </div>
      </section>

      {/* 自分のパート */}
      <section className="border-t pt-4">
        <h2 className="mb-2 text-sm font-semibold">自分のパート</h2>
        {arrangements.length === 0 ? (
          <p className="text-xs text-gray-400">
            この曲はまだ編成（パート）が登録されていません。編集から追加してください。
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="flex-1 rounded border border-gray-300 bg-white px-3 py-2"
            >
              <option value="">未登録</option>
              {arrangements.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSavePart}
              disabled={isPending}
              className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isPending ? "保存中..." : "保存"}
            </button>
          </div>
        )}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-1 text-sm text-green-600">保存しました</p>}
      </section>

      {/* パート別メンバー */}
      <section className="border-t pt-4">
        <h2 className="mb-2 text-sm font-semibold">パート別メンバー</h2>
        {arrangements.length === 0 ? (
          <p className="text-xs text-gray-400">編成が未登録です</p>
        ) : (
          <div className="space-y-3">
            {arrangements.map((part) => {
              const members = byPart.get(part) ?? [];
              return (
                <div key={part}>
                  <h3 className="mb-1 text-xs font-semibold text-gray-500">
                    {part}
                    {members.length > 0 && `（${members.length}）`}
                  </h3>
                  {members.length === 0 ? (
                    <p className="text-xs text-gray-400">未登録</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {members.map((a) => (
                        <li
                          key={a.user_id}
                          className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-sm ${
                            a.user_id === currentUserId
                              ? "bg-blue-50 ring-1 ring-blue-200"
                              : "bg-gray-100"
                          }`}
                        >
                          {a.users?.avatar_url ? (
                            <img
                              src={a.users.avatar_url}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-xs text-white">
                              {a.users?.family_name?.charAt(0) ?? "?"}
                            </span>
                          )}
                          {memberLabel(a)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 編集モーダル（削除時は一覧へ遷移） */}
      <SongFormModal
        song={song}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        isAdmin={isAdmin}
        onDeleted={() => router.push("/songs")}
      />
    </div>
  );
}
