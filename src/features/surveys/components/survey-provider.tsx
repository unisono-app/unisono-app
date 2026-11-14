"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { markSurveyPrompted } from "../api/actions";
import type { ActiveSurvey, MySurveyState, SurveyResults } from "../api";
import { SurveyModal } from "./survey-modal";

type SurveyContextValue = {
  /** ヘッダーのボタンを表示するか（集計中 or 結果公開中のアンケートがある） */
  available: boolean;
  /** 集計中で自分が未回答（ボタンに赤ドットを出す） */
  needsAnswer: boolean;
  /** 公開終了前のアンケート（管理者の操作メニュー用） */
  survey: ActiveSurvey | null;
  open: () => void;
};

const SurveyContext = createContext<SurveyContextValue>({
  survey: null,
  available: false,
  needsAnswer: false,
  open: () => {},
});

export function useSurvey() {
  return useContext(SurveyContext);
}

type Props = {
  survey: ActiveSurvey | null;
  myState: MySurveyState | null;
  results: SurveyResults | null;
  isAdmin: boolean;
  children: React.ReactNode;
};

export function SurveyProvider({
  survey,
  myState,
  results,
  isAdmin,
  children,
}: Props) {
  const collecting = survey?.phase === "collecting";
  // 集計開始後に初めてアクセスしたとき（まだポップアップを表示していない）は自動で開く。
  // 初期値のみで判定するため、閉じた後や再検証後に勝手に開き直すことはない。
  const [isOpen, setIsOpen] = useState(
    () => !!survey && collecting && !!myState && !myState.prompted
  );
  const [, startTransition] = useTransition();

  function handleClose() {
    setIsOpen(false);
    // 初回表示済みとして記録（「後で答える」）。以降は自動表示せず、ヘッダーのボタンから開く
    if (survey && collecting && myState && !myState.prompted) {
      startTransition(async () => {
        await markSurveyPrompted(survey.id);
      });
    }
  }

  const value: SurveyContextValue = {
    survey,
    available: !!survey,
    needsAnswer: !!collecting && !!myState && !myState.answered,
    open: () => setIsOpen(true),
  };

  return (
    <SurveyContext.Provider value={value}>
      {children}
      {isOpen && survey && myState && (
        <SurveyModal
          key={survey.id}
          survey={survey}
          myState={myState}
          results={results}
          isAdmin={isAdmin}
          onClose={handleClose}
        />
      )}
    </SurveyContext.Provider>
  );
}
