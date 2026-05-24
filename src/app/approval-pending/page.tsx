import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getAppUser } from "@/lib/auth/get-current-app-user";
import { logout } from "@/lib/auth/actions";

export default async function ApprovalPendingPage() {
  const result = await getAppUser();

  if (result.status === "unauthenticated") redirect("/login");
  if (result.status === "unregistered") redirect("/register");
  if (result.status === "approved") redirect("/practices");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">承認待ち</h1>

        <div className="space-y-3 text-sm text-gray-600 text-left">
          <p>ご登録ありがとうございます。</p>
          <p>
            既存メンバーまたは管理者による承認をお待ちください。
            承認後、再度本アプリにアクセスすると全機能をご利用いただけます。
          </p>
          <p className="rounded bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            現在は試験公開中のため、承認までお時間をいただく場合があります。
          </p>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogOut size={16} />
            ログアウト
          </button>
        </form>
      </div>
    </div>
  );
}
