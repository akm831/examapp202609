import { describe, expect, it } from "vitest";
import master from "../../data/study_items.json";
import revisions from "../../data/shisei_rewrites.json";
import { revisedStudyItem } from "./shisei-rewrites";
import { studyContextFor } from "./study-context";

describe("市政知識の修正文の配信", () => {
  it("DBが旧文面のままでも全110問を正誤を変えずに配信する", () => {
    const targets = master.items.filter(item => item.subject === "市政知識");
    expect(Object.keys(revisions)).toHaveLength(110);
    for (const item of targets) {
      const dbItem = { id: item.id, statementText: "旧問題文", explanation: "旧解説", correctJudgment: item.correctJudgment };
      const result = revisedStudyItem(dbItem);
      expect(result.statementText).toBe(item.statement);
      expect(result.explanation).toBe(item.explanation);
      expect(result.correctJudgment).toBe(dbItem.correctJudgment);
      expect(studyContextFor(item.id)?.questionContext).not.toContain("札幌市の札幌市");
    }
  });
  it("DBの正誤が変更されている場合は互換性のない修正文を適用しない", () => {
    const item = master.items.find(item => item.subject === "市政知識")!;
    const dbItem = { id: item.id, statementText: "将来の問題", explanation: "将来の解説", correctJudgment: !item.correctJudgment };
    expect(revisedStudyItem(dbItem)).toBe(dbItem);
  });
  it("他科目には適用しない", () => {
    for (const item of master.items.filter(item => item.subject !== "市政知識")) {
      const dbItem = { id: item.id, statementText: item.statement, explanation: item.explanation, correctJudgment: item.correctJudgment };
      expect(revisedStudyItem(dbItem)).toBe(dbItem);
    }
  });
});
