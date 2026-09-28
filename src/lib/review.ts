export type Mastery = "NEW" | "LEARNING" | "REVIEW" | "MASTERED" | "RELEARNING";
export type ReviewState = {
  attemptsCount: number; correctCount: number; incorrectCount: number; consecutiveCorrect: number;
  masteryStatus: Mastery; lastAnsweredAt: Date | null; lastResult: boolean | null;
  lastWasUnsure: boolean | null; nextReviewAt: Date | null;
};
export type ReviewAttempt = { isCorrect: boolean; wasUnsure: boolean; answeredAt: Date };

export const emptyProgress = (): ReviewState => ({ attemptsCount:0,correctCount:0,incorrectCount:0,consecutiveCorrect:0,masteryStatus:"NEW",lastAnsweredAt:null,lastResult:null,lastWasUnsure:null,nextReviewAt:null });

function zonedParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23" }).formatToParts(date);
  const get=(t:string)=>Number(parts.find(p=>p.type===t)?.value);
  return {year:get("year"),month:get("month"),day:get("day"),hour:get("hour"),minute:get("minute"),second:get("second")};
}

export function addCalendarDays(date: Date, days: number, timezone = "Asia/Tokyo") {
  const p=zonedParts(date,timezone);
  const target=new Date(Date.UTC(p.year,p.month-1,p.day+days,p.hour,p.minute,p.second));
  for(let i=0;i<2;i++) {
    const z=zonedParts(target,timezone);
    const represented=Date.UTC(z.year,z.month-1,z.day,z.hour,z.minute,z.second);
    const wanted=Date.UTC(p.year,p.month-1,p.day+days,p.hour,p.minute,p.second);
    target.setTime(target.getTime()+(wanted-represented));
  }
  return target;
}

export function calculateProgress(previous: ReviewState, attempt: ReviewAttempt, timezone="Asia/Tokyo"): ReviewState {
  const confident = attempt.isCorrect && !attempt.wasUnsure;
  const streak = confident ? previous.consecutiveCorrect + 1 : 0;
  let masteryStatus: Mastery;
  let interval: number;
  if (!attempt.isCorrect) { masteryStatus = previous.masteryStatus === "NEW" ? "LEARNING" : "RELEARNING"; interval=1; }
  else if (attempt.wasUnsure) { masteryStatus="LEARNING"; interval=2; }
  else if (streak >= 3) { masteryStatus="MASTERED"; interval=14; }
  else if (streak === 2) { masteryStatus="REVIEW"; interval=7; }
  else { masteryStatus="LEARNING"; interval=4; }
  return {
    attemptsCount:previous.attemptsCount+1,
    correctCount:previous.correctCount+(attempt.isCorrect?1:0),
    incorrectCount:previous.incorrectCount+(attempt.isCorrect?0:1),
    consecutiveCorrect:streak, masteryStatus,
    lastAnsweredAt:attempt.answeredAt,lastResult:attempt.isCorrect,lastWasUnsure:attempt.wasUnsure,
    nextReviewAt:addCalendarDays(attempt.answeredAt,interval,timezone),
  };
}

export function rebuildProgress(attempts: ReviewAttempt[], timezone="Asia/Tokyo") {
  return [...attempts].sort((a,b)=>a.answeredAt.getTime()-b.answeredAt.getTime()).reduce((s,a)=>calculateProgress(s,a,timezone),emptyProgress());
}

export function applyExamDateAdjustment(next: Date, answeredAt: Date, examDate: Date | null) {
  if (!examDate) return next;
  const threeDaysBefore = new Date(examDate); threeDaysBefore.setUTCDate(threeDaysBefore.getUTCDate()-3);
  return next > threeDaysBefore && threeDaysBefore > answeredAt ? threeDaysBefore : next;
}
