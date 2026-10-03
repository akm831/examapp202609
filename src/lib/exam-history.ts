import history from "../../data/exam_history.json";
export type HistorySummary={recordCount:number;yearCount:number;years:string[];latestYear:string|null;yearRecordCount:number;undatedRecordCount:number;rows:{row:number;years:string}[]};
export type ExamHistory={sourceFile:string;sheet:string;judgmentAsOf:string|null;articleLabels:string[];exact:HistorySummary;topic:HistorySummary|null;relatedArticles:HistorySummary;status:string};
export function examHistoryFor(id:string):ExamHistory|null{return (history as Record<string,ExamHistory>)[id]??null;}
