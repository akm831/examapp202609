export type ChoiceOption = {text:string; explanation:string; source:string; sourceUrl:string|null};
export type ChoiceQuestion = {
  id:string; sourceType:"PAST_EXAM"|"PREDICTED"; title:string; prompt:string;
  context:string; referenceDate:string; correctChoice:number; choices:ChoiceOption[];
};
export type ChoiceAnswer = {requestId:string; questionId:string; selectedChoice:number; correctChoice:number; isCorrect:boolean; wasUnsure:boolean; answeredAt:string; responseMs:number};
export function choiceIsCorrect(question:ChoiceQuestion, selectedChoice:number) {
  if(!Number.isInteger(selectedChoice)||selectedChoice<1||selectedChoice>question.choices.length) throw new Error("選択肢を指定してください。");
  return question.correctChoice===selectedChoice;
}
export function readChoiceAnswers(value:string|null):ChoiceAnswer[] {
  if(value===null) return [];
  const data:unknown=JSON.parse(value);
  if(!Array.isArray(data)||!data.every(a=>a&&typeof a.requestId==="string"&&typeof a.questionId==="string"&&Number.isInteger(a.selectedChoice)&&a.selectedChoice>=1&&a.selectedChoice<=5&&Number.isInteger(a.correctChoice)&&a.correctChoice>=1&&a.correctChoice<=5&&typeof a.isCorrect==="boolean"&&a.isCorrect===(a.selectedChoice===a.correctChoice)&&typeof a.wasUnsure==="boolean"&&typeof a.answeredAt==="string"&&Number.isFinite(a.responseMs)&&a.responseMs>=0)) throw new Error("保存済みの演習記録を読み込めませんでした。");
  return data;
}
