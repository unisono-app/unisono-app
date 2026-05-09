"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { PracticeFormModal } from "@/features/practices/components/practice-form-modal";
import { AttendanceButtons } from "@/features/attendance/components/attendance-buttons";
import type { PracticeDetail } from "@/features/practices/api";
import type { SongOption } from "@/features/songs/api";
import { formatMemberName } from "@/features/attendance/format";
import type {
  AttendanceStatus,
  AttendanceWithUser,
} from "@/features/attendance/api";
import { CommentSection } from "@/features/comments/components/comment-section";
import {
  createPracticeComment,
  deletePracticeComment,
} from "@/features/comments/api/actions";
import type { Comment } from "@/features/comments/api";

type Props = {
  practice: PracticeDetail;
  myStatus: AttendanceStatus | null;
  attendances: AttendanceWithUser[];
  songs: SongOption[];
  comments: Comment[];
  currentUserId: string;
  isAdmin: boolean;
};

const statusConfig: Record<
  AttendanceStatus,
  { label: string; className: string }
> = {
  attending: { label: "出席", className: "bg-green-100 text-green-700" },
  undecided: { label: "未定", className: "bg-yellow-100 text-yellow-700" },
  absent: { label: "欠席", className: "bg-gray-100 text-gray-600" },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
}

function formatDeadline(s: string): string {
  const date = new Date(s);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")} まで`;
}

export function PracticeDetailClient({
  practice,
  myStatus,
  attendances,
  songs,
  comments,
  currentUserId,
  isAdmin,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);

  const isEvent = practice.category === "event";

  // 紐づけ楽曲（song_ids 順を維持）
  const linkedSongs = practice.song_ids
    .map((id) => songs.find((s) => s.id === id))
    .filter((s): s is SongOption => s !== undefined);

  const grouped = (["attending", "undecided", "absent"] as AttendanceStatus[])
    .map((status) => ({
      status,
      members: attendances.filter((a) => a.status === status),
    }))
    .filter((g) => g.members.length > 0);

  return (
    <div className="px-4 py-4 space-y-6">
      {/* ヘッダー: 戻る + 編集 */}
      <div className="flex items-center justify-between">
        <Link
          href="/practices"
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-black"
        >
          <ArrowLeft size={18} />
          戻る
        </Link>
        <button
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-1 rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Pencil size={14} />
          編集
        </button>
      </div>

      {/* タイトル */}
      <div>
        {isEvent ? (
          <span className="inline-block rounded bg-purple-500 px-2 py-0.5 text-xs font-medium text-white">
            {practice.title}
          </span>
        ) : (
          <span className="inline-block rounded bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
            練習
          </span>
        )}
        <h1 className="mt-1 text-xl font-bold">{formatDate(practice.practice_date)}</h1>
        <p className="text-sm text-gray-600">{practice.time_range}</p>
        {linkedSongs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {linkedSongs.map((s) => (
              <span
                key={s.id}
                className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700"
              >
                {s.title}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 基本情報 */}
      <section className="space-y-2 text-sm">
        <div>
          <span className="text-gray-500">場所: </span>
          <span>{practice.location}</span>
        </div>
        {practice.deadline && (
          <div>
            <span className="text-gray-500">出欠締切: </span>
            <span>{formatDeadline(practice.deadline)}</span>
          </div>
        )}
      </section>

      {/* 出欠回答 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">出欠回答</h2>
        <AttendanceButtons
          practiceId={practice.id}
          currentStatus={myStatus}
          size="md"
        />
      </section>

      {/* 備考 */}
      {practice.notes && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-gray-700">備考</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {practice.notes}
          </p>
        </section>
      )}

      {/* タイムスケジュール */}
      {practice.schedule && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-gray-700">
            タイムスケジュール
          </h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {practice.schedule}
          </p>
        </section>
      )}

      {/* 練習内容 */}
      {practice.content && (
        <section>
          <h2 className="mb-1 text-sm font-semibold text-gray-700">練習内容</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {practice.content}
          </p>
        </section>
      )}

      {/* 出欠一覧 */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">出欠一覧</h2>
        {grouped.length === 0 ? (
          <p className="text-xs text-gray-400">回答なし</p>
        ) : (
          <div className="space-y-3">
            {grouped.map(({ status, members }) => (
              <div key={status}>
                <span
                  className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${statusConfig[status].className}`}
                >
                  {statusConfig[status].label}（{members.length}）
                </span>
                <ul className="mt-1 ml-1 text-sm text-gray-600">
                  {members.map((a) => (
                    <li key={a.user_id}>
                      {formatMemberName(a.users)}
                      {a.users?.part && (
                        <span className="ml-1 text-xs text-gray-400">
                          ({a.users.part})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* コメント */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700">コメント</h2>
        <CommentSection
          comments={comments}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onCreate={(body, isAnonymous) =>
            createPracticeComment(practice.id, body, isAnonymous)
          }
          onDelete={deletePracticeComment}
        />
      </section>

      <PracticeFormModal
        practice={practice}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        songs={songs}
      />
    </div>
  );
}
