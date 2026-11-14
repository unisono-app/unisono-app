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
  let myState: Awaited<ReturnType<typeof getMySurveyState>> | null = null;
  let results: Awaited<ReturnType<typeof getSurveyResults>> | null = null;
  if (survey && survey.phase === "published") {
    // 締切後は全員が結果を見られるので、自分の状態と結果を並列に取得する
    [myState, results] = await Promise.all([
      getMySurveyState(survey.id, result.appUser.id),
      getSurveyResults(survey),
    ]);
  } else if (survey) {
    myState = await getMySurveyState(survey.id, result.appUser.id);
    if (myState.answered) results = await getSurveyResults(survey);
  }

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
