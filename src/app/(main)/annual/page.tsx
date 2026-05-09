import { getAppUser } from "@/lib/auth/get-current-app-user";
import {
  getVersionsByYear,
  getYearsWithSchedule,
} from "@/features/annual/api";
import { getCurrentFiscalYear } from "@/features/annual/utils";
import { getAnnualScheduleComments } from "@/features/comments/api";
import { AnnualClient } from "./annual-client";

export default async function AnnualPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const result = await getAppUser();
  if (result.status !== "approved") return null;

  const isAdmin = result.appUser.role === "admin";

  const params = await searchParams;
  const yearsRegistered = await getYearsWithSchedule();
  const currentFY = getCurrentFiscalYear();

  // デフォルト年度: ?year=xxx → 登録済みなら現年度 → 一番新しい登録年度 → 現年度
  let initialYear = params.year ? Number(params.year) : NaN;
  if (!Number.isFinite(initialYear)) {
    initialYear = yearsRegistered.includes(currentFY)
      ? currentFY
      : (yearsRegistered[0] ?? currentFY);
  }

  const versions = await getVersionsByYear(initialYear);
  const comments = await getAnnualScheduleComments(initialYear);

  return (
    <AnnualClient
      isAdmin={isAdmin}
      initialYear={initialYear}
      currentFiscalYear={currentFY}
      yearsRegistered={yearsRegistered}
      initialVersions={versions}
      initialComments={comments}
      currentUserId={result.appUser.id}
    />
  );
}
