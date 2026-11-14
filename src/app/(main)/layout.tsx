import { redirect } from "next/navigation";
import { getAppUser } from "@/lib/auth/get-current-app-user";
import { NavBar } from "@/components/layout/nav-bar";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import {
  getActiveSurvey,
  getMySurveyState,
  getSurveyResults,
} from "@/features/surveys/api";
import { SurveyProvider } from "@/features/surveys/components/survey-provider";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getAppUser();

  if (result.status === "unauthenticated") redirect("/login");
  if (result.status === "unregistered") redirect("/register");
  if (result.status === "pending") redirect("/approval-pending");

  // 練習候補日アンケート（集計中 / 結果公開中）。結果は、締切済み、または自分が回答済みのときだけ取得する
  const survey = await getActiveSurvey();
  const myState = survey
    ? await getMySurveyState(survey.id, result.appUser.id)
    : null;
  const results =
    survey && myState && (survey.phase === "published" || myState.answered)
      ? await getSurveyResults(survey)
      : null;

  return (
    <SurveyProvider
      survey={survey}
      myState={myState}
      results={results}
      isAdmin={result.appUser.role === "admin"}
    >
      <main
        className="
          pt-12 pb-16
          landscape:pb-0 landscape:pl-16
        "
      >
        <AnnouncementBanner />
        {children}
      </main>
      <NavBar />
    </SurveyProvider>
  );
}
