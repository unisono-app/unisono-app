"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck, User } from "lucide-react";
import { approveUser, updateUserRole } from "@/features/members/api/actions";
import type { ManagedMember } from "@/features/members/api";
import { formatMemberName } from "@/features/users/format";

type Props = {
  members: ManagedMember[];
  isAdmin: boolean;
  currentUserId: string;
};

function formatName(m: ManagedMember): string {
  const base = formatMemberName(m.family_name, m.given_name, m.old_family_name);
  return m.nickname ? `${base}（${m.nickname}）` : base;
}

const PART_ORDER = ["1st", "2nd", "Prim", "A.cem.", "Bass", "CG", "指揮"];

function groupApprovedByPart(
  members: ManagedMember[]
): { part: string; members: ManagedMember[] }[] {
  const map = new Map<string, ManagedMember[]>();
  for (const m of members) {
    const key = m.part || "(未設定)";
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  const known = PART_ORDER.filter((p) => map.has(p)).map((part) => ({
    part,
    members: map.get(part)!,
  }));
  const unknown = Array.from(map.keys())
    .filter((p) => !PART_ORDER.includes(p))
    .sort()
    .map((part) => ({ part, members: map.get(part)! }));
  return [...known, ...unknown];
}

export function ManagementClient({ members, isAdmin, currentUserId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pending = members.filter((m) => m.approval_status === "pending");
  const approved = members.filter((m) => m.approval_status === "approved");
  const groupedApproved = groupApprovedByPart(approved);

  function handleApprove(userId: string) {
    setError(null);
    startTransition(async () => {
      const result = await approveUser(userId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleRoleChange(
    userId: string,
    newRole: "member" | "admin",
    name: string
  ) {
    const message =
      newRole === "admin"
        ? `${name} を管理者にしますか？`
        : `${name} を一般メンバーに変更しますか？`;
    if (!window.confirm(message)) return;

    setError(null);
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* 承認待ち */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1">
          承認待ち {pending.length > 0 && `(${pending.length})`}
        </h2>
        {pending.length === 0 ? (
          <p className="text-xs text-gray-400">承認待ちのメンバーはいません</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((m) => (
              <li
                key={m.id}
                className="flex items-start gap-3 rounded border border-yellow-200 bg-yellow-50 p-3"
              >
                {m.avatar_url ? (
                  <img
                    src={m.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-sm font-medium text-white flex-shrink-0">
                    {m.family_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{formatName(m)}</div>
                  <div className="text-xs text-gray-500">
                    {[m.part, m.class_label].filter(Boolean).join(" / ")}
                  </div>
                </div>
                <button
                  onClick={() => handleApprove(m.id)}
                  disabled={isPending}
                  className="flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Check size={14} />
                  承認
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 承認済み */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1">
          承認済みメンバー
        </h2>
        {groupedApproved.length === 0 ? (
          <p className="text-xs text-gray-400">承認済みメンバーはいません</p>
        ) : (
          <div className="space-y-4">
            {groupedApproved.map(({ part, members: groupMembers }) => (
              <div key={part}>
                <h3 className="text-xs font-semibold text-gray-500 mb-1">
                  {part}
                </h3>
                <ul className="space-y-1">
                  {groupMembers.map((m) => {
                    const isSelf = m.id === currentUserId;
                    return (
                      <li
                        key={m.id}
                        className="flex items-center gap-3 rounded border border-gray-200 bg-white p-2"
                      >
                        {m.avatar_url ? (
                          <img
                            src={m.avatar_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-xs font-medium text-white flex-shrink-0">
                            {m.family_name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{formatName(m)}</span>
                            {m.role === "admin" && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                                <ShieldCheck size={10} />
                                管理者
                              </span>
                            )}
                            {isSelf && (
                              <span className="text-xs text-gray-400">
                                （自分）
                              </span>
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            {m.role === "member" ? (
                              <button
                                onClick={() =>
                                  handleRoleChange(
                                    m.id,
                                    "admin",
                                    formatName(m)
                                  )
                                }
                                disabled={isPending}
                                className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <ShieldCheck size={12} />
                                管理者にする
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  handleRoleChange(
                                    m.id,
                                    "member",
                                    formatName(m)
                                  )
                                }
                                disabled={isPending}
                                className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <User size={12} />
                                一般メンバーにする
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
