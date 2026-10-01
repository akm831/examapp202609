import {describe,it,expect} from "vitest";
import {handbookTopicFor} from "./handbook-topics";
import handbook from "../../data/shisei_handbook.json";

describe("市政知識テキスト",()=>{
  it("制度名から本文へ案内し、未知の過去テーマは目次に戻す",()=>{
    const id=handbookTopicFor("札幌市宿泊税の課税対象");
    expect(handbook.topics.find(t=>t.id===id)?.title).toBe("札幌市宿泊税");
    expect(handbookTopicFor("ASEANTAの当時の事業")).toBeUndefined();
  });
  it("全20問の解説を回答表示用の折りたたみに収める",()=>{
    const questions=handbook.topics.filter(t=>/^(問\d+　|総合問\d+$)/.test(t.title));
    expect(questions).toHaveLength(20);
    for(const t of questions){
      expect(t.html).toContain('class="handbook-answer"');
      expect(t.html).not.toContain('<details open');
      expect(t.html.split('class="handbook-answer"')[1].match(/○/g)).toHaveLength(1);
    }
  });
  it("重要条件は詳細の折りたたみより前に表示する",()=>{
    const t=handbook.topics.find(t=>t.title.includes('アルカサル')&&!t.title.startsWith('問'))!;
    expect(t.html.indexOf('正誤を分ける条件')).toBeLessThan(t.html.indexOf('<details>'));
  });
});
