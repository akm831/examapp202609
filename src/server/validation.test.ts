import { expect, it } from "vitest";
import { batchAnswerSchema } from "./validation";
import { apiErrorResponse } from "./errors";
const answer={requestId:"11111111-1111-4111-8111-111111111111",studyItemId:"22222222-2222-4222-8222-222222222222",sessionId:"33333333-3333-4333-8333-333333333333",selectedJudgment:true,wasUnsure:false};
it("accepts queued answers after the app has been open for more than an hour",()=>{
  const result=batchAnswerSchema.parse({answers:[{...answer,responseMs:3600001}]});
  expect(result.answers[0].responseMs).toBe(3600001);
});
it.each([-1,1.5,2147483648])("rejects responseMs outside the database integer range: %s",responseMs=>{
  expect(batchAnswerSchema.safeParse({answers:[{...answer,responseMs}]}).success).toBe(false);
});
it("returns the exact invalid batch field without exposing answer values",async()=>{
  const result=batchAnswerSchema.safeParse({answers:[{...answer,responseMs:-1}]});
  if(result.success)throw new Error("Expected validation failure");
  const response=apiErrorResponse(result.error),body=await response.json();
  expect(response.status).toBe(400);
  expect(body.error.issues[0].path).toBe("answers.0.responseMs");
  expect(body.error.issues[0]).not.toHaveProperty("input");
});
