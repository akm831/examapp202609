"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import { useRouter } from "next/navigation";
import { HandbookButton } from "./handbook-button";
import { QuestionContext } from "./question-context";
import type { StudyContext } from "@/lib/study-context";
import { acknowledgePending, readPending, sendAnswers } from "@/lib/answer-sync";

type Item={context?:StudyContext|null;id:string;subject:{name:string;slug:string};statementText:string;correctJudgment:boolean;explanation:string;explanationType:string;sourceReference:string;verificationStatus:string;caution:string|null;timeSensitive:boolean;historicalJudgment:boolean|null;historicalContext:string|null;judgmentAsOf:string|null};
type Pending={requestId:string;sessionId:string;studyItemId:string;selectedJudgment:boolean;wasUnsure:boolean;responseMs:number};
type Page={items:Item[];total:number;answeredIds:string[];completed:boolean};
const PAGE_SIZE=100;
export function StudyScreen({sessionId,fast=false}:{sessionId:string;fast?:boolean}){
  const router=useRouter(),storageKey=`examapp-pending-${sessionId}`;
  const [items,setItems]=useState<Item[]>([]),[total,setTotal]=useState(0),[loaded,setLoaded]=useState(0),[index,setIndex]=useState(0),[ready,setReady]=useState(false);
  const [selected,setSelected]=useState<boolean|null>(null),[unsure,setUnsure]=useState(false),[pendingCount,setPendingCount]=useState(0),[syncing,setSyncing]=useState(false),[error,setError]=useState("");
  const queue=useRef<Pending[]>([]),attemptIds=useRef(new Map<string,string>()),syncPromise=useRef<Promise<boolean>|null>(null),started=useRef(Date.now()),answerLock=useRef<string|null>(null);
  const persist=useCallback((entries:Pending[])=>{queue.current=entries;localStorage.setItem(storageKey,JSON.stringify(entries));setPendingCount(entries.length)},[storageKey]);
  const sync=useCallback(async (all=false):Promise<boolean>=>{
    if(syncPromise.current){const ok=await syncPromise.current;if(!ok)return false;if(queue.current.length&&(all||queue.current.length>=5))return sync(all);return true}
    if(!queue.current.length||!all&&queue.current.length<5)return true;
    const run=async()=>{
      setSyncing(true);setError("");
      try{
        while(queue.current.length&&(all||queue.current.length>=5)){
          queue.current=readPending(storageKey);
          if(!queue.current.length)break;
          const answers=queue.current.slice(0,5);
          const results=await sendAnswers(answers);
          answers.forEach((entry,i)=>attemptIds.current.set(entry.studyItemId,results[i].attemptId));
          queue.current=acknowledgePending(storageKey,answers.map(a=>a.requestId));
          setPendingCount(queue.current.length);
        }
        return true;
      }catch(e){setError(e instanceof Error?e.message:"回答を保存できませんでした。");return false}
      finally{setSyncing(false)}
    };
    const task=run();syncPromise.current=task;
    try{return await task}finally{if(syncPromise.current===task)syncPromise.current=null}
  },[storageKey]);
  useEffect(()=>{router.prefetch(`/study/complete/${sessionId}`);let cancelled=false;void (async()=>{
    try{
      const fetchPage=async(offset:number):Promise<Page>=>{
        const response=await fetch(`/api/study/sessions/${sessionId}/items?offset=${offset}&limit=${PAGE_SIZE}`,{cache:"no-store"});
        if(response.status===401){router.replace("/auth");throw new Error("ログインが必要です。")}const body=await response.json();
        if(!response.ok)throw new Error(body.error?.message||"問題を読み込めませんでした。");return body;
      };
      const first=await fetchPage(0);if(cancelled)return;
      setTotal(first.total);setLoaded(first.items.length);
      const pages:Item[][]=[first.items];
      const offsets=Array.from({length:Math.ceil(first.total/PAGE_SIZE)-1},(_,n)=>(n+1)*PAGE_SIZE);
      let cursor=0;
      await Promise.all(Array.from({length:Math.min(3,offsets.length)},async()=>{
        while(cursor<offsets.length){const pageIndex=cursor++,page=await fetchPage(offsets[pageIndex]);pages[pageIndex+1]=page.items;if(!cancelled)setLoaded(n=>n+page.items.length)}
      }));
      if(cancelled)return;
      const allItems=pages.flat(),answered=new Set(first.answeredIds);
      const saved=JSON.parse(localStorage.getItem(storageKey)||sessionStorage.getItem(storageKey)||"[]") as Pending[];
      sessionStorage.removeItem(storageKey);
      const outstanding=saved.filter(entry=>!answered.has(entry.studyItemId));persist(outstanding);
      const firstUnanswered=allItems.findIndex(item=>!answered.has(item.id));
      started.current=Date.now();
      setItems(allItems);setIndex(Math.min(allItems.length,(firstUnanswered<0?allItems.length:firstUnanswered)+outstanding.length));setReady(true);
      if(outstanding.length)void sync(true);
      if(first.completed&&!outstanding.length)router.replace(`/study/complete/${sessionId}`);
    }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"問題を読み込めませんでした。")}
  })();return()=>{cancelled=true}},[persist,router,sessionId,storageKey,sync]);
  useEffect(()=>{answerLock.current=null},[index]);
  function answer(value:boolean){
    const item=items[index];if(!item||selected!==null||answerLock.current===item.id)return;
    answerLock.current=item.id;
    const entry:Pending={requestId:crypto.randomUUID(),sessionId,studyItemId:item.id,selectedJudgment:value,wasUnsure:unsure,responseMs:Math.min(2147483647,Math.max(0,Date.now()-started.current))};
    persist([...readPending(storageKey),entry]);setSelected(value);
    if(queue.current.length>=5)void sync();
    if(fast&&value===item.correctJudgment&&!unsure){setSelected(null);setIndex(n=>n+1);setUnsure(false);started.current=Date.now();if(index+1>=items.length)void sync(true).then(ok=>{if(ok)window.location.assign(`/study/complete/${sessionId}`)});}
  }
  async function next(){
    if(selected===null)return;
    if(index+1>=items.length){const ok=await sync(true);if(ok)window.location.assign(`/study/complete/${sessionId}`);return}
    setIndex(n=>n+1);setSelected(null);setUnsure(false);started.current=Date.now();
  }
  function leave(){window.location.assign("/")}
  useEffect(()=>{const retry=()=>{if(queue.current.length)void sync(true)};window.addEventListener("online",retry);const timer=window.setInterval(retry,30000);return()=>{window.removeEventListener("online",retry);window.clearInterval(timer)}},[sync]);
  function changeUnsure(value:boolean){
    setUnsure(value);
    const item=items[index],entry=queue.current.find(e=>e.studyItemId===item.id);
    if(entry){persist(queue.current.map(e=>e===entry?{...e,wasUnsure:value}:e));return}
    const attemptId=attemptIds.current.get(item.id);
    if(attemptId)void (async()=>{
      const response=await fetch(`/api/attempts/${attemptId}/unsure`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({wasUnsure:value})});
      if(!response.ok){setUnsure(!value);setError("迷った状態を更新できませんでした。")}
    })();
  }
  if(!ready)return <main className="shell"><section className="card" role="status"><h1>演習を準備中</h1><p>{error||`問題と解説を読み込み中：${loaded} / ${total||"確認中"}問`}</p><div className="progress loading-progress"><i style={{width:`${total?Math.round(loaded/total*100):0}%`}}/></div><p>{total?`${Math.round(loaded/total*100)}%`:"件数を確認中…"}</p>{error&&<button className="ghost" onClick={()=>location.reload()}>再試行</button>}</section></main>;
  const item=items[index];
  if(!item)return <main className="shell"><section className="card"><h1>回答を同期中</h1><p>{error||`未同期 ${pendingCount}件`}</p><button className="primary" onClick={()=>void sync(true).then(ok=>{if(ok)window.location.assign(`/study/complete/${sessionId}`)})}>保存を再試行</button><button className="ghost" onClick={leave}>未同期回答を保持してホームへ戻る</button></section></main>;
  const correct=selected===item.correctJudgment;
  return <main className="shell"><header className="top"><button className="ghost" onClick={()=>void leave()}>終了</button><b>{index+1} / {total}</b></header><div className="progress"><i style={{width:`${index/total*100}%`}}/></div><p className="muted" role="status">{syncing?"回答履歴を同期中…":pendingCount?`端末に保存済み・サーバー未同期 ${pendingCount}件`:"回答履歴は同期済み"}</p>{error&&<p className="error">同期エラー：{error} <button className="ghost" onClick={()=>void sync(true)}>再試行</button></p>}<section className="card"><p className="eyebrow">{item.subject.name}</p><QuestionContext context={item.context}/><p className="question">{item.statementText}</p>{fast&&<p className="muted">高速周回：正解は自動で次へ進みます</p>}{selected===null&&<label><input type="checkbox" checked={unsure} onChange={e=>setUnsure(e.target.checked)}/> 迷った</label>}</section>{selected!==null?<section className="card"><h2 className={correct?"result-ok":"result-ng"}>{correct?"○ 正解":"× 不正解"}</h2><p>あなたの回答：{selected?"○ 正しい":"× 誤り"}{!correct&&<>　正しい判定：{item.correctJudgment?"○ 正しい":"× 誤り"}</>}</p>{item.explanationType==="GROUP_SHARED"&&<p className="badge">問題群に共通する解説</p>}<p style={{whiteSpace:"pre-wrap",lineHeight:1.8}}>{item.explanation}</p><p className="muted">根拠：{item.sourceReference}</p><Flags item={item}/>{item.subject.slug==="shisei"&&<HandbookButton text={item.statementText}/>}<label><input type="checkbox" checked={unsure} disabled={syncing} onChange={e=>changeUnsure(e.target.checked)}/> 迷った</label><button className="primary" style={{width:"100%",marginTop:18}} onClick={()=>void next()}>次の問題へ</button></section>:<div className="answers"><button className="answer true" onClick={()=>answer(true)}>○ 正しい</button><button className="answer false" onClick={()=>answer(false)}>× 誤り</button></div>}</main>
}
function Flags({item}:{item:Item}){return <div>{item.verificationStatus==="JUDGMENT_CONFIRMED_REASON_UNVERIFIED"&&<p className="badge">正誤確認済／理由要確認</p>}{item.verificationStatus==="PAST_EXAM_ONLY"&&<p className="badge">過去問・原典未確認</p>}{item.verificationStatus==="SOURCE_UNCERTAIN"&&<p className="badge">要確認問題</p>}{item.caution==="AMENDMENT"&&<p className="badge">改正注意</p>}{item.timeSensitive&&<p className="badge">試験直前に再確認</p>}{item.historicalJudgment!==null&&<p className="muted">過去時点の判定：{item.historicalJudgment?"○":"×"}（{item.historicalContext}）／現在判定を正答として採点</p>}</div>}


