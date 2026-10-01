import contexts from "../../data/study_contexts.json";

export type StudyContext = {
  questionContext: string;
  originLabel: string;
  referenceDateLabel: string;
  judgmentAsOf: null;
  sourceDocument: string;
  sourceHeading: string;
};

// Also applies before an operator runs db:seed: no production DB mutation is needed
// to display the premise for an existing ID. Statements and scoring stay in the DB.
export function studyContextFor(id: string): StudyContext | null {
  return (contexts as Record<string, StudyContext>)[id] ?? null;
}
