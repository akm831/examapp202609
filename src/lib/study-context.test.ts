import {describe,expect,it} from "vitest";
import master from "../../data/study_items.json";
import {studyContextFor} from "./study-context";

describe("standalone question premises",()=>{
  it("supplies a dated premise for all 210 target items, even if the DB is not reseeded",()=>{
    const targets=master.items.filter(i=>["市政知識","市例規"].includes(i.subject));
    expect(targets).toHaveLength(210);
    for(const item of targets){
      const context=studyContextFor(item.id);
      expect(context?.questionContext).toContain("正誤");
      expect(context?.referenceDateLabel).toContain("2026-09-");
      expect(context?.originLabel).toContain("予想問題");
      expect(context?.judgmentAsOf).toBeNull();
      expect(item.judgmentAsOf).toBeNull();
    }
  });
  it("names the governing ordinance for an ambiguous isolated option",()=>{
    const item=master.items.find(i=>i.sourceItemKey==="municipal-regulations:q01:1")!;
    expect(studyContextFor(item.id)?.questionContext).toContain("札幌市情報公開条例");
  });
  it("states the budget year and the missing three benefit programs",()=>{
    expect(studyContextFor(master.items.find(i=>i.sourceItemKey==="shisei:q03:1")!.id)?.questionContext).toContain("令和8年度一般会計");
    expect(studyContextFor(master.items.find(i=>i.sourceItemKey==="shisei:q07:5")!.id)?.questionContext).toContain("住民税非課税世帯への加算");
  });
  it("keeps unrelated subjects untouched",()=>{
    for(const item of master.items.filter(i=>!["市政知識","市例規","地方自治法","地方公務員法"].includes(i.subject)))expect(studyContextFor(item.id)).toBeNull();
  });
});
