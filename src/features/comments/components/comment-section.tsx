"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, User } from "lucide-react";
import type { Comment } from "../api";

type Props = {
  comments: Comment[];
  currentUserId: string;
  isAdmin: boolean;
  onCreate: (body: string, isAnonymous: boolean) => Promise<{ error: string | null }>;
  onDelete: (commentId: string) => Promise<{ error: string | null }>;
};

function formatDateTime(s: string): string {
  const d = new Date(s);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${hh}:${mm}`;
}

function formatPosterName(c: Comment): string {
  if (c.is_anonymous) return "匿名";
  const u = c.users;
  if (!u) return "—";
  if (u.nickname) return u.nickname;
  if (u.family_name && u.given_name)
    return `${u.family_name} ${u.given_name}`;
  return u.display_name || "—";
}

export function CommentSection({
  comments,
  currentUserId,
  isAdmin,
  onCreate,
  onDelete,
}: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!body.trim()) {
      setError("コメントを入力してください");
      return;
    }

    startTransition(async () => {
      const result = await onCreate(body, isAnonymous);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
      setIsAnonymous(false);
      router.refresh();
    });
  }

  function handleDelete(commentId: string) {
    if (!window.confirm("このコメントを削除しますか？")) return;

    startTransition(async () => {
      const result = await onDelete(commentId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <p className="text-xs text-gray-400">コメントはまだありません</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const canDelete = isAdmin || c.user_id === currentUserId;
            const showAvatar = !c.is_anonymous && c.users?.avatar_url;
            return (
              <li key={c.id} className="flex items-start gap-2">
                {showAvatar ? (
                  <img
                    src={c.users!.avatar_url!}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-500 flex-shrink-0">
                    <User size={16} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-gray-700">
                      {formatPosterName(c)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDateTime(c.created_at)}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={isPending}
                        className="ml-auto p-0.5 text-gray-400 hover:text-red-600 disabled:opacity-50"
                        aria-label="削除"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700 break-words">
                    {c.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-2 border-t pt-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="コメントを入力"
          className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-gray-300"
            />
            匿名で投稿
          </label>
          <button
            type="submit"
            disabled={isPending || !body.trim()}
            className="rounded bg-black px-4 py-1.5 text-sm text-white font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? "投稿中..." : "投稿"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </form>
    </div>
  );
}
