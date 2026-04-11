import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/auth/get-current-app-user";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const result = await getAppUser();

  if (result.status === "unauthenticated") redirect("/login");
  if (result.status === "pending") redirect("/approval-pending");
  if (result.status === "approved") redirect("/practices");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">新規登録</h1>
          <p className="mt-2 text-sm text-gray-500">
            プロフィール情報を入力してください
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
