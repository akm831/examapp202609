import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
const mocks=vi.hoisted(()=>({transaction:vi.fn()}));
vi.mock("./db",()=>({prisma:{$transaction:mocks.transaction}}));
import { submitAnswerBatch } from "./study-service";
const input={requestId:"request-new",sessionId:"today-session",studyItemId:"item",selectedJudgment:true,wasUnsure:false};
const existing={id:"saved-attempt",userId:"user",selectedJudgment:false,isCorrect:true,wasUnsure:true,studyItem:{correctJudgment:false,explanation:"",explanationType:"",sourceReference:"",verificationStatus:"CONFIRMED",caution:null,timeSensitive:false,historicalJudgment:null,historicalContext:null,judgmentAsOf:null}};
const known=(code:string)=>new Prisma.PrismaClientKnownRequestError("failure",{code,clientVersion:"6.19.3"});
describe("answer synchronization",()=>{
  beforeEach(()=>vi.resetAllMocks());
  it("acknowledges a previously saved TODAY session item with a different requestId without rewriting progress",async()=>{
    const findUnique=vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
    const create=vi.fn();
    mocks.transaction.mockImplementation(async run=>run({answerAttempt:{findUnique,create},studyItem:{findUnique:vi.fn().mockResolvedValue({id:"item"})},studySessionItem:{findFirst:vi.fn().mockResolvedValue({id:"session-item"})}}));
    const results=await submitAnswerBatch("user",[input]);
    expect(results[0].attemptId).toBe("saved-attempt");expect(create).not.toHaveBeenCalled();
  });
  it.each(["P2034","P2002"])("retries the entire transaction after %s",async code=>{
    mocks.transaction.mockRejectedValueOnce(known(code)).mockResolvedValueOnce([existing]);
    await submitAnswerBatch("user",[input]);expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });
  it("does not retry missing database schema errors",async()=>{
    mocks.transaction.mockRejectedValue(known("P2022"));
    await expect(submitAnswerBatch("user",[input])).rejects.toMatchObject({code:"P2022"});expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });
  it("bounds conflict retries and leaves the error available for diagnostics",async()=>{
    mocks.transaction.mockRejectedValue(known("P2034"));
    await expect(submitAnswerBatch("user",[input])).rejects.toMatchObject({code:"P2034"});expect(mocks.transaction).toHaveBeenCalledTimes(4);
  });
});
