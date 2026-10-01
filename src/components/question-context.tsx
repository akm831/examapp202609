import type { StudyContext } from "@/lib/study-context";

export function QuestionContext({context}:{context:StudyContext|null|undefined}) {
  if (!context) return null;
  return <div className="question-context">
    <p className="badge">{context.originLabel}</p>
    <p className="question-premise">{context.questionContext}</p>
    <p className="muted">{context.referenceDateLabel}</p>
  </div>;
}
