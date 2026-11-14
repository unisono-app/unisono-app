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
  // 集計開始後に初めてアクセスしたとき（ポップアップ未表示かつ未回答）は自動で開く。
  // 初期値のみで判定するため、閉じた後や再検証後に勝手に開き直すことはない。
  // 開いている対象はアンケートの ID で持つので、別のアンケートに替わったときに
  // 前の開閉状態が引き継がれて予告なく開くことはない。
  const [openSurveyId, setOpenSurveyId] = useState<string | null>(() =>
    survey && collecting && myState && !myState.prompted && !myState.answered
      ? survey.id
      : null
  );
  const isOpen = !!survey && openSurveyId === survey.id;
  const [, startTransition] = useTransition();

  function handleClose() {
    setOpenSurveyId(null);
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
    open: () => setOpenSurveyId(survey?.id ?? null),
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
