import rewrites from "../../data/shisei_rewrites.json";

type Revision = { statementText: string; explanation: string; correctJudgment: boolean };

// The revisions retain every judgment. Guard against a later DB answer change,
// rather than displaying revised prose with an incompatible scoring key.
export function revisedStudyItem<T extends { id: string; statementText?: string; explanation?: string; correctJudgment?: boolean }>(item: T): T {
  const revision = (rewrites as Record<string, Revision>)[item.id];
  if (!revision || item.correctJudgment !== undefined && item.correctJudgment !== revision.correctJudgment) return item;
  return { ...item, ...("statementText" in item ? { statementText: revision.statementText } : {}),
    ...("explanation" in item ? { explanation: revision.explanation } : {}) };
}
