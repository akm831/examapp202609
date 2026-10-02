import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({transaction:vi.fn()}));
vi.mock("./db",()=>({prisma:{$transaction:mocks.transaction}}));
import { createStudySession, submitAnswerBatch } from "./study-service";
const settings={timezone:"Asia/Tokyo",includeSourceUncertain:false,dailyReviewLimit:100,newItemsPerDay:20};
function fixture(answered=46,endedAt:Date|null=null){
  const tx={reviewSettings:{upsert:vi.fn().mockResolvedValue(settings)},studySession:{findUnique:vi.fn().mockResolvedValue({id:"old",endedAt,_count:{attempts:answered,items:46}}),update:vi.fn(),create:vi.fn().mockResolvedValue({id:"new"})},studyItemProgress:{findMany:vi.fn().mockResolvedValue([{studyItemId:"due"}])},studyItem:{findMany:vi.fn().mockResolvedValue([{id:"fresh"}])}};
  mocks.transaction.mockImplementation(async run=>run(tx));return tx;
}
describe("review session lifecycle",()=>{
  beforeEach(()=>vi.resetAllMocks());
  it("resumes an unfinished daily session",async()=>{
    const tx=fixture(45);expect(await createStudySession("user",{mode:"TODAY"})).toEqual({id:"old"});expect(tx.studySession.update).not.toHaveBeenCalled();expect(tx.studySession.create).not.toHaveBeenCalled();
  });
  it.each([null,new Date()])("starts remaining review after a completed daily session (endedAt=%s)",async endedAt=>{
    const tx=fixture(46,endedAt);expect(await createStudySession("user",{mode:"TODAY"})).toEqual({id:"new"});expect(tx.studySession.update).toHaveBeenCalledWith({where:{id:"old"},data:{localDate:null,endedAt:expect.any(Date)}});expect(tx.studySession.create.mock.calls[0][0].data.items.create).toEqual([{studyItemId:"due",position:0},{studyItemId:"fresh",position:1}]);
  });
  it("does not create an empty session when no review remains",async()=>{
    const tx=fixture();tx.studyItemProgress.findMany.mockResolvedValue([]);tx.studyItem.findMany.mockResolvedValue([]);await expect(createStudySession("user",{mode:"TODAY"})).rejects.toMatchObject({code:"NO_STUDY_ITEMS"});expect(tx.studySession.create).not.toHaveBeenCalled();expect(tx.studySession.update).not.toHaveBeenCalled();
  });
  it.each([45,46])("records completion only when all answers are saved (%i/46)",async answered=>{
    const saved={id:"attempt",selectedJudgment:true,isCorrect:true,wasUnsure:false,studyItem:{judgmentAsOf:null}};
    const tx={answerAttempt:{findUnique:vi.fn().mockResolvedValue(saved)},studySession:{findFirst:vi.fn().mockResolvedValue({endedAt:null,_count:{items:46,attempts:answered}}),update:vi.fn()}};
    mocks.transaction.mockImplementation(async run=>run(tx));
    await submitAnswerBatch("user",[{requestId:"saved",sessionId:"old",studyItemId:"item",selectedJudgment:true,wasUnsure:false}]);
    expect(tx.studySession.update).toHaveBeenCalledTimes(answered===46?1:0);
  });
});
