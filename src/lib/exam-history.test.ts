import {describe,expect,it} from "vitest";
import master from "../../data/study_items.json";
import db from "../../content/past-exams/law-db-2026.json";
import {examHistoryFor} from "./exam-history";
import {studyContextFor} from "./study-context";
import {createSessionSchema} from "../server/validation";

describe("past exam provenance and added questions",()=>{
  it("keeps same-topic evidence separate from related article counts",()=>{
    const item=master.items.find(i=>i.questionGroup==="議会補完2026"&&i.sourceItemNumber===4)!;
    const history=examHistoryFor(item.id)!;
    expect(history.topic?.recordCount).toBe(0);
    expect(history.relatedArticles.recordCount).toBe(1);
    expect(history.relatedArticles.rows[0].row).toBe(70);
  });
  it("deduplicates years across merged records and preserves referenced sheet rows",()=>{
    for(const item of master.items.filter(i=>["地方自治法","地方公務員法"].includes(i.subject))){
      const history=examHistoryFor(item.id)!;
      expect(studyContextFor(item.id)?.judgmentAsOf).toBe(item.judgmentAsOf);
      const sheet=db.sheets[history.sheet as keyof typeof db.sheets];
      for(const summary of [history.exact,history.topic,history.relatedArticles].filter(s=>s!==null)){
        const rows=sheet.filter(r=>summary!.rows.some(ref=>ref.row===r.row));
        expect(rows).toHaveLength(summary!.recordCount);
        const years=new Set(rows.flatMap(r=>r.yearsLabel.match(/H\d+|R\d+/g)??[]));
        expect([...years].sort()).toEqual([...summary!.years].sort());
        expect(summary!.yearCount).toBe(years.size);
      }
    }
  });
  it("adds exactly twenty stable council IDs and accepts all 613 items",()=>{
    const additions=master.items.filter(i=>i.questionGroup==="議会補完2026");
    expect(additions).toHaveLength(20);
    expect(additions.filter(i=>i.correctJudgment)).toHaveLength(10);
    expect(new Set(additions.map(i=>i.id)).size).toBe(20);
    expect(createSessionSchema.safeParse({mode:"RANDOM",requestedCount:613}).success).toBe(true);
    expect(createSessionSchema.safeParse({mode:"RANDOM",requestedCount:614}).success).toBe(false);
  });
  it("keeps other subjects free of law DB evidence",()=>{
    for(const item of master.items.filter(i=>!["地方自治法","地方公務員法"].includes(i.subject)))expect(examHistoryFor(item.id)).toBeNull();
  });
});
