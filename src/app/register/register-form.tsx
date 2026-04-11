"use client";

import { useActionState } from "react";
import { registerUser } from "./actions";

const initialState = { error: null as string | null };

export function RegisterForm() {
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
        <label htmlFor="old_family_name" className="block text-sm font-medium">
          旧姓
        </label>
        <input
          id="old_family_name"
          name="old_family_name"
          type="text"
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="nickname" className="block text-sm font-medium">
          ニックネーム <span className="text-red-500">*</span>
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          required
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="part" className="block text-sm font-medium">
          担当パート <span className="text-red-500">*</span>
        </label>
        <input
          id="part"
          name="part"
          type="text"
          required
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="class_label" className="block text-sm font-medium">
          期 <span className="text-red-500">*</span>
        </label>
        <input
          id="class_label"
          name="class_label"
          type="text"
          required
          placeholder="例: 1期"
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="affiliation" className="block text-sm font-medium">
          所属 <span className="text-red-500">*</span>
        </label>
        <input
          id="affiliation"
          name="affiliation"
          type="text"
          required
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
