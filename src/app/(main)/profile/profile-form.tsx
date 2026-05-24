"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { updateProfile } from "@/features/users/api/actions";
import { logout } from "@/lib/auth/actions";
import type { UserProfile } from "@/features/users/api";
import { PART_OPTIONS } from "@/features/users/constants";

type Props = {
  profile: UserProfile;
};

export function ProfileForm({ profile }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <div className="px-4 py-4 space-y-6">
      {/* アバター + LINE 表示名（閲覧のみ） */}
      <div className="flex items-center gap-3 border-b pb-4">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-300 text-xl font-medium text-white">
            {profile.family_name.charAt(0)}
          </div>
        )}
        <div>
          <p className="text-base font-semibold">{profile.display_name}</p>
          <p className="text-xs text-gray-500">LINE 表示名（編集不可）</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="nickname" className="block text-sm font-medium">
            ニックネーム
          </label>
          <input
            id="nickname"
            name="nickname"
            type="text"
            defaultValue={profile.nickname ?? ""}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="family_name" className="block text-sm font-medium">
            姓 <span className="text-red-500">*</span>
          </label>
          <input
            id="family_name"
            name="family_name"
            type="text"
            required
            defaultValue={profile.family_name}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="given_name" className="block text-sm font-medium">
            名 <span className="text-red-500">*</span>
          </label>
          <input
            id="given_name"
            name="given_name"
            type="text"
            required
            defaultValue={profile.given_name}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="old_family_name" className="block text-sm font-medium">
            旧姓
          </label>
          <input
            id="old_family_name"
            name="old_family_name"
            type="text"
            defaultValue={profile.old_family_name ?? ""}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="part" className="block text-sm font-medium">
            パート <span className="text-red-500">*</span>
          </label>
          <select
            id="part"
            name="part"
            required
            defaultValue={profile.part}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 bg-white"
          >
            <option value="" disabled>
              選択してください
            </option>
            {PART_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="class_label" className="block text-sm font-medium">
            現役当時入学期 <span className="text-red-500">*</span>
          </label>
          <input
            id="class_label"
            name="class_label"
            type="text"
            required
            placeholder="例: 大野26期"
            defaultValue={profile.class_label}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="note" className="block text-sm font-medium">
            備考メモ（任意）
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            placeholder="例: xxxx年x月までお休み"
            defaultValue={profile.note ?? ""}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && (
          <p className="text-sm text-green-600">保存しました</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-black px-4 py-3 text-white font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {isPending ? "保存中..." : "保存"}
        </button>
      </form>

      {/* ログアウト */}
      <div className="border-t pt-6">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogOut size={16} />
            ログアウト
          </button>
        </form>
      </div>
    </div>
  );
}
