import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAppUser } from "@/lib/auth/get-current-app-user";

type Props = {
  title: string;
  /** 戻るボタンの遷移先。未指定なら戻るボタンは表示しない */
  backHref?: string;
};

export async function Header({ title, backHref }: Props) {
  const result = await getAppUser();
  const isApproved = result.status === "approved";
  const avatarUrl = isApproved ? result.appUser.avatar_url : null;
  const fallbackLetter = isApproved
    ? (result.appUser.display_name || "?").charAt(0)
    : "?";

  return (
    <header
      className="
        fixed top-0 right-0 left-0 z-40 h-12 bg-white border-b border-gray-200
        flex items-center justify-between px-3
        landscape:left-16
      "
    >
      <div className="flex min-w-0 items-center gap-2">
        {backHref && (
          <Link
            href={backHref}
            className="-ml-1 p-1 text-gray-600 hover:text-black"
            aria-label="戻る"
          >
            <ArrowLeft size={20} />
          </Link>
        )}
        <h1 className="truncate text-base font-semibold">{title}</h1>
        <span className="flex-shrink-0 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-800">
          試験公開中
        </span>
      </div>

      <Link
        href="/profile"
        className="flex-shrink-0"
        aria-label="プロフィール"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-sm font-medium text-white">
            {fallbackLetter}
          </div>
        )}
      </Link>
    </header>
  );
}
