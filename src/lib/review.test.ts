import { describe, expect, test } from "vitest";
import { calculateProgress, emptyProgress, rebuildProgress } from "./review";
const at=new Date("2026-09-01T01:00:00Z");
describe("calculateProgress",()=>{
  test("confident answers advance +4/+7/+14 and master",()=>{
    const a=calculateProgress(emptyProgress(),{isCorrect:true,wasUnsure:false,answeredAt:at});
    expect([a.masteryStatus,a.consecutiveCorrect,a.nextReviewAt?.toISOString()]).toEqual(["LEARNING",1,"2026-09-05T01:00:00.000Z"]);
    const b=calculateProgress(a,{isCorrect:true,wasUnsure:false,answeredAt:at});
    expect([b.masteryStatus,b.consecutiveCorrect]).toEqual(["REVIEW",2]);
    const c=calculateProgress(b,{isCorrect:true,wasUnsure:false,answeredAt:at});
    expect([c.masteryStatus,c.consecutiveCorrect]).toEqual(["MASTERED",3]);
  });
  test("wrong and unsure reset streak",()=>{
    const prev={...emptyProgress(),masteryStatus:"REVIEW" as const,consecutiveCorrect:2};
    expect(calculateProgress(prev,{isCorrect:false,wasUnsure:false,answeredAt:at}).masteryStatus).toBe("RELEARNING");
    const u=calculateProgress(prev,{isCorrect:true,wasUnsure:true,answeredAt:at});
    expect([u.masteryStatus,u.consecutiveCorrect,u.nextReviewAt?.toISOString()]).toEqual(["LEARNING",0,"2026-09-03T01:00:00.000Z"]);
  });
  test("rebuild reflects unsure edits",()=>{
    const attempts=[{isCorrect:true,wasUnsure:false,answeredAt:at},{isCorrect:true,wasUnsure:true,answeredAt:new Date(at.getTime()+1000)}];
    expect(rebuildProgress(attempts).consecutiveCorrect).toBe(0);
    attempts[1].wasUnsure=false;
    expect(rebuildProgress(attempts).masteryStatus).toBe("REVIEW");
  });
});
