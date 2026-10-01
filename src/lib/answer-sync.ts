export type PendingAnswer={requestId:string;sessionId:string;studyItemId:string;selectedJudgment:boolean;wasUnsure:boolean;responseMs:number};
export function readPending(key:string):PendingAnswer[]{return JSON.parse(localStorage.getItem(key)||"[]") as PendingAnswer[]}
export function acknowledgePending(key:string,requestIds:string[]):PendingAnswer[]{
  const ids=new Set(requestIds),remaining=readPending(key).filter(entry=>!ids.has(entry.requestId));
  localStorage.setItem(key,JSON.stringify(remaining));return remaining;
}
export async function sendAnswers(answers:PendingAnswer[]){
  const started=Date.now(),controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch("/api/attempts/batch",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({answers}),signal:controller.signal});
    const body=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(`${body?.error?.message||"サーバーから正常な応答がありません。"} [HTTP ${response.status} / ${body?.error?.code||"INVALID_RESPONSE"} / ${Date.now()-started}ms]`);
    if(!Array.isArray(body?.results)||body.results.length!==answers.length||body.results.some((r:{attemptId?:string})=>!r?.attemptId))throw new Error("同期結果を確認できませんでした。[INVALID_RESPONSE]");
    return body.results as {attemptId:string}[];
  }catch(error){
    if(controller.signal.aborted)throw new Error("同期が25秒以内に完了しませんでした。[TIMEOUT] 端末の回答は保持しています。");
    if(error instanceof TypeError)throw new Error(`同期APIに接続できませんでした。[NETWORK / ${Date.now()-started}ms / ${navigator.onLine?"オンライン表示":"オフライン表示"}]`);
    throw error;
  }finally{clearTimeout(timer)}
}
