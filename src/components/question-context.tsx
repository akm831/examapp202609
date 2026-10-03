import type { StudyContext } from "@/lib/study-context";

import { ExamHistoryDetails } from "./exam-history";

export function QuestionContext({context}:{context:StudyContext|null|undefined}) {
  if (!context) return null;
  return <div className="question-context">
    {context.originLabel&&<p className="badge">{context.originLabel}</p>}
    {context.questionContext&&<p className="question-premise">{context.questionContext}</p>}
    {context.referenceDateLabel&&<p className="muted">{context.referenceDateLabel}</p>}
    <ExamHistoryDetails history={context.examHistory}/>
  </div>;
}
