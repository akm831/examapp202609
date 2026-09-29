"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Item={id:string;statementText:string;subject:{name:string}};
type Pending={requestId:string;sessionId:string;studyItemId:string;selectedJudgment:boolean;wasUnsure:boolean;responseMs:number};
const BATCH_SIZE=5;
export function FastStudyScreen({sessionId}:{sessionId:string}){
  const router=useRouter(),key=`examapp-pending-${sessionId}`;
  const [items,setItems]=useState<Item[]>([]),[index,setIndex]=useState(0),[pending,setPending]=useState<Pending[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState(""),[unsure,setUnsure]=useState(false);
  const started=useRef(Date.now()),saving=useRef(false),queue=useRef<Pending[]>([]);
  const save=useCallback(async (answers:Pending[])=>{
    if(!answers.length||saving.current)return true;
    saving.current=true;setBusy(true);setError("");
    try{
      const response=await fetch("/api/attempts/batch",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({answers})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error?.message||"回答を保存できませんでした。");
      queue.current=queue.current.slice(answers.length);
      sessionStorage.setItem(key,JSON.stringify(queue.current));setPending([...queue.current]);
      return true;
    }catch(e){setError(e instanceof Error?e.message:"回答を保存できませんでした。");return false}
    finally{saving.current=false;setBusy(false)}
  },[key]);
  useEffect(()=>{router.prefetch(`/study/complete/${sessionId}`);void (async()=>{
    try{
      const response=await fetch(`/api/study/sessions/${sessionId}/items`,{cache:"no-store"});
      if(response.status===401){router.replace("/auth");return}
      const body=await response.json();if(!response.ok)throw new Error(body.error?.message||"問題を取得できませんでした。");
      const stored=JSON.parse(sessionStorage.getItem(key)||"[]") as Pending[];
      const answered=new Set<string>(body.answeredIds);
      const remaining=stored.filter(entry=>!answered.has(entry.studyItemId));
      queue.current=remaining;sessionStorage.setItem(key,JSON.stringify(remaining));setPending(remaining);
      const first=body.items.findIndex((item:Item)=>!answered.has(item.id));
      setItems(body.items);setIndex(first<0?body.items.length:first);
      setBusy(false);
      if(remaining.length){const saved=await save(remaining);if(saved){setIndex(Math.min(body.items.length,(first<0?body.items.length:first)+remaining.length));if((first<0?body.items.length:first)+remaining.length>=body.items.length)router.replace(`/study/complete/${sessionId}`)}}
      else if(body.completed)router.replace(`/study/complete/${sessionId}`);
    }catch(e){setError(e instanceof Error?e.message:"問題を取得できませんでした。");setBusy(false)}
  })()},[key,router,save,sessionId]);
  async function answer(selectedJudgment:boolean){
    if(busy||error||index>=items.length)return;
    const entry={requestId:crypto.randomUUID(),sessionId,studyItemId:items[index].id,selectedJudgment,wasUnsure:unsure,responseMs:Date.now()-started.current};
    const next=[...queue.current,entry];queue.current=next;sessionStorage.setItem(key,JSON.stringify(next));setPending(next);
    setIndex(index+1);setUnsure(false);started.current=Date.now();
    if(next.length>=BATCH_SIZE||index+1>=items.length){const ok=await save(next);if(ok&&index+1>=items.length)router.replace(`/study/complete/${sessionId}`)}
  }
  async function finish(){const ok=await save(queue.current);if(ok)router.push("/")}
  const item=items[index];
  return <main className="shell"><header className="top"><button className="ghost" disabled={busy} onClick={()=>void finish()}>保存して終了</button><b>{Math.min(index+1,items.length)} / {items.length}</b></header><div className="progress"><i style={{width:`${items.length?index/items.length*100:0}%`}}/></div><p className="muted">高速周回・解説を挟まず回答（{pending.length}件が保存待ち）</p>{error&&<section className="card"><p className="error">{error}</p><button className="secondary" onClick={()=>void save(queue.current)}>保存を再試行</button></section>}{busy?<p>読み込み・保存中…</p>:item?<><section className="card"><p className="eyebrow">{item.subject.name}</p><p className="question">{item.statementText}</p><label><input type="checkbox" checked={unsure} onChange={e=>setUnsure(e.target.checked)}/> 迷った</label></section><div className="answers"><button disabled={!!error} className="answer true" onClick={()=>void answer(true)}>○ 正しい</button><button disabled={!!error} className="answer false" onClick={()=>void answer(false)}>× 誤り</button></div></>:items.length?<section className="card"><h2>回答完了</h2><p>保存済みの結果を表示します。</p><Link href={`/study/complete/${sessionId}`} className="button primary">結果を見る</Link></section>:!error?<p>問題を読み込み中…</p>:null}</main>
}
