import Link from "next/link";

type Props = {
  avatarUrl: string | null;
  displayName: string;
};

export function ProfileButton({ avatarUrl, displayName }: Props) {
  return (
    <Link
      href="/profile"
      className="fixed top-3 right-3 z-50"
      aria-label="プロフィール"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow"
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-300 text-sm font-medium text-white ring-2 ring-white shadow">
          {displayName.charAt(0)}
        </div>
      )}
    </Link>
  );
}
