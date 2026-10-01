import { afterEach, expect, it, vi } from "vitest";
import { acknowledgePending, sendAnswers } from "./answer-sync";
afterEach(()=>vi.unstubAllGlobals());
it("removes only acknowledged requests from the latest queue, preserving answers added during a request",()=>{
  let value=JSON.stringify([{requestId:"saved"},{requestId:"new"}]);
  vi.stubGlobal("localStorage",{getItem:()=>value,setItem:(_key:string,next:string)=>{value=next}});
  expect(acknowledgePending("queue",["saved"])).toEqual([{requestId:"new"}]);
});
it("preserves the queue and exposes the server diagnostic code on failure",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:false,status:503,json:async()=>({error:{code:"P2034",message:"競合"}})}));
  await expect(sendAnswers([])).rejects.toThrow("HTTP 503 / P2034");
});
it("rejects malformed success responses before acknowledging any answers",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({})}));
  await expect(sendAnswers([])).rejects.toThrow("INVALID_RESPONSE");
});
