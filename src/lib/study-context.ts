import { examHistoryFor,type ExamHistory } from "./exam-history";
import contexts from "../../data/study_contexts.json";

export type StudyContext = {
  questionContext: string;
  originLabel: string;
  referenceDateLabel: string;
  judgmentAsOf: string | null;
  examHistory?: ExamHistory;
  sourceDocument: string;
  sourceHeading: string;
};

// Also applies before an operator runs db:seed: no production DB mutation is needed
// to display the premise for an existing ID. Statements and scoring stay in the DB.
export function studyContextFor(id: string): StudyContext | null {
  const base=(contexts as Record<string, StudyContext>)[id];
  const history=examHistoryFor(id);
  if(base)return {...base,...(history?{examHistory:history}:{})};
  if(!history)return null;
  return {questionContext:"",originLabel:"",referenceDateLabel:"",judgmentAsOf:history.judgmentAsOf,sourceDocument:history.sourceFile,sourceHeading:history.sheet,examHistory:history};
}
