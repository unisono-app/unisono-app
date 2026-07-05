"use client";

import { useActionState, useState } from "react";
import { registerUser } from "./actions";
import { PART_OPTIONS } from "@/features/users/constants";

const initialState = { error: null as string | null };

export function RegisterForm() {
  const [showOldFamilyName, setShowOldFamilyName] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await registerUser(formData);
      return result ?? initialState;
    },
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="family_name" className="block text-sm font-medium">
          姓 <span className="text-red-500">*</span>
        </label>
        <input
          id="family_name"
          name="family_name"
          type="text"
          required
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
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={showOldFamilyName}
            onChange={(e) => setShowOldFamilyName(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          旧姓を併記する
        </label>
        {showOldFamilyName && (
          <div className="mt-2">
            <label
              htmlFor="old_family_name"
              className="block text-sm font-medium"
            >
              旧姓
            </label>
            <input
              id="old_family_name"
              name="old_family_name"
              type="text"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              「姓（旧姓） 名」の形式で表示されます
            </p>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="nickname" className="block text-sm font-medium">
          ニックネーム
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
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
          defaultValue=""
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
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-black px-4 py-3 text-white font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
      >
        {pending ? "送信中..." : "登録申請"}
      </button>
    </form>
  );
}
