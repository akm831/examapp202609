import {describe,expect,it} from "vitest";
import payload from "../../data/shisei_choice_questions.json";
import {choiceIsCorrect,readChoiceAnswers,type ChoiceQuestion} from "./choice-practice";

describe("five-choice municipal knowledge",()=>{
  it("has six predictions and two historical originals, each with one answer and five sourced explanations",()=>{
    const questions=payload.questions as ChoiceQuestion[];
    expect(questions.filter(q=>q.sourceType==="PREDICTED")).toHaveLength(6);
    expect(questions.filter(q=>q.sourceType==="PAST_EXAM")).toHaveLength(2);
    expect(new Set(questions.map(q=>q.id)).size).toBe(8);
    for(const q of questions){
      expect(q.choices).toHaveLength(5);
      expect([1,2,3,4,5].filter(n=>choiceIsCorrect(q,n))).toEqual([q.correctChoice]);
      for(const c of q.choices){expect(c.explanation.trim()).not.toBe("");expect(c.sourceUrl).toMatch(/^https:\/\/(?:www.city.sapporo.jp|www.sapporo-community-plaza.jp)\//)}
    }
  });
  it("preserves published answers without silently treating file names as examination years",()=>{
    const past=payload.questions.filter(q=>q.sourceType==="PAST_EXAM");
    expect(past.map(q=>q.correctChoice)).toEqual([5,1]);
    for(const q of past){expect(q.context).toContain("推定");expect(q.context).toContain("現在制度で再採点しません")}
    expect(past[1].choices[3].text).toContain("今年４月");
  });
  it("does not accept invalid selections or overwrite malformed saved records",()=>{
    expect(()=>choiceIsCorrect(payload.questions[0] as ChoiceQuestion,0)).toThrow();
    expect(readChoiceAnswers(null)).toEqual([]);
    expect(()=>readChoiceAnswers('{bad')).toThrow();
    expect(()=>readChoiceAnswers('[{}]')).toThrow();
  });
});
