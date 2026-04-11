import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">UnisOno</h1>
        <p className="text-sm text-gray-500">メンバー専用アプリ</p>

        <Link
          href="/auth/login"
          className="block w-full rounded-lg bg-[#06C755] px-4 py-3 text-white font-medium hover:bg-[#05b34d] transition-colors"
        >
          LINEでログイン
        </Link>
      </div>
    </div>
  );
}
