import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/auth/get-current-app-user";

export default async function ApprovalPendingPage() {
  const result = await getAppUser();

  if (result.status === "unauthenticated") redirect("/login");
  if (result.status === "unregistered") redirect("/register");
  if (result.status === "approved") redirect("/practices");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold">承認待ち</h1>
        <p className="text-sm text-gray-500">
          メンバーの承認をお待ちください。
          <br />
          承認されると、アプリの全機能をご利用いただけます。
        </p>
      </div>
    </div>
  );
}
