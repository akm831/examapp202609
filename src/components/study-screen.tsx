"use client";
import { useEffect,useMemo,useRef,useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Item={id:string;subject:{name:string;slug:string};statementText:string;correctJudgment:boolean};
type Bulk={sessionId:string;answeredIds:string[];total:number;completed:boolean;items:Item[]};
type Result={attemptId?:string;isCorrect:boolean;selectedJudgment:boolean;correctJudgment:boolean;wasUnsure:boolean;explanation:string;explanationType:string;sourceReference:string;verificationStatus:string;caution:string|null;timeSensitive:boolean;historicalJudgment:boolean|null;historicalContext:string|null;judgmentAsOf:string|null};

export function StudyScreen({sessionId}:{sessionId:string}){
  const [bulk,setBulk]=useState<Bulk|null>(null),[index,setIndex]=useState(0),[result,setResult]=useState<Result|null>(null),[unsure,setUnsure]=useState(false),[error,setError]=useState(""),[saving,setSaving]=useState(false);
  const started=useRef(Date.now()),requestId=useRef<string|null>(null),router=useRouter();

  useEffect(()=>{router.prefetch(`/study/complete/${sessionId}`);void (async()=>{
    const r=await fetch(`/api/study/sessions/${sessionId}/items`,{cache:"no-store"});
    if(r.status===401){router.replace("/auth");return}
    const j=await r.json();
    if(!r.ok){setError(j.error?.message||"読み込みに失敗しました。");return}
    if(j.completed){router.replace(`/study/complete/${sessionId}`);return}
    const answered=new Set<string>(j.answeredIds);
    const next=Math.max(0,j.items.findIndex((x:Item)=>!answered.has(x.id)));
    setBulk(j);setIndex(next);started.current=Date.now();
  })()},[router,sessionId]);

  const item=useMemo(()=>bulk?.items[index],[bulk,index]);

  async function answer(selectedJudgment:boolean,retry=false){
    if(saving||!item||(result&&!retry))return;
    setError("");
    requestId.current??=crypto.randomUUID();
    setResult({isCorrect:selectedJudgment===item.correctJudgment,selectedJudgment,correctJudgment:item.correctJudgment,wasUnsure:unsure,explanation:"",explanationType:"",sourceReference:"",verificationStatus:"",caution:null,timeSensitive:false,historicalJudgment:null,historicalContext:null,judgmentAsOf:null});
    setSaving(true);
    try{
      const r=await fetch("/api/attempts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({requestId:requestId.current,sessionId,studyItemId:item.id,selectedJudgment,wasUnsure:unsure,responseMs:Date.now()-started.current})});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error?.message);
      setResult(j);
    }catch(e){
      setError(e instanceof Error?`${e.message} 「保存を再試行」を押してください。`:"回答の保存に失敗しました。");
    }finally{setSaving(false)}
  }

  async function retrySave(){
    if(!result)return;
    await answer(result.selectedJudgment,true);
  }

  function next(){
    if(saving||!result?.attemptId)return;
    if(!bulk||index+1>=bulk.items.length){router.replace(`/study/complete/${sessionId}`);return}
    setIndex(index+1);setResult(null);setUnsure(false);setError("");requestId.current=null;started.current=Date.now();
  }

  async function changeUnsure(checked:boolean){
    if(!result?.attemptId)return;
    setUnsure(checked);
    const r=await fetch(`/api/attempts/${result.attemptId}/unsure`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({wasUnsure:checked})});
    if(!r.ok){setUnsure(!checked);setError("迷った状態を更新できませんでした。")}else setResult({...result,wasUnsure:checked});
  }

  if(!bulk||!item)return <main className="shell"><p>{error||"問題をまとめて読み込み中…"}</p></main>;
  return <main className="shell"><header className="top"><Link href="/" className="button ghost">終了</Link><b>{index+1} / {bulk.total}</b></header><div className="progress"><i style={{width:`${(index/bulk.total)*100}%`}}/></div><section className="card"><p className="eyebrow">{item.subject.name}</p><p className="question">{item.statementText}</p>{!result&&<label><input type="checkbox" checked={unsure} onChange={e=>setUnsure(e.target.checked)}/> 迷った</label>}{error&&<p className="error">{error}</p>}</section>{result?<section className="card"><h2 className={result.isCorrect?"result-ok":"result-ng"}>{result.isCorrect?"○ 正解":"× 不正解"}</h2><p>あなたの回答：{result.selectedJudgment?"○ 正しい":"× 誤り"}{!result.isCorrect&&<>　正しい判定：{result.correctJudgment?"○ 正しい":"× 誤り"}</>}</p>{saving&&<p className="muted" role="status">解説と回答履歴を読み込み中…</p>}{result.explanationType==="GROUP_SHARED"&&<p className="badge">問題群に共通する解説</p>}{result.explanation&&<><p style={{whiteSpace:"pre-wrap",lineHeight:1.8}}>{result.explanation}</p><p className="muted">根拠：{result.sourceReference}</p><Flags r={result}/></>}{result.attemptId?<label><input type="checkbox" checked={unsure} onChange={e=>void changeUnsure(e.target.checked)}/> 迷った</label>:<p className="muted">{saving?"回答履歴を保存中…":"回答履歴はまだ保存されていません。"}</p>}{error&&!saving&&<button className="ghost" style={{width:"100%",marginTop:12}} onClick={()=>void retrySave()}>保存を再試行</button>}<button disabled={saving||!result.attemptId} className="primary" style={{width:"100%",marginTop:18}} onClick={next}>{saving?"保存中…":"次の問題へ"}</button></section>:<div className="answers"><button disabled={saving} className="answer true" onClick={()=>void answer(true)}>○ 正しい</button><button disabled={saving} className="answer false" onClick={()=>void answer(false)}>× 誤り</button></div>}</main>
}
function Flags({r}:{r:Result}){return <div>{r.verificationStatus==="JUDGMENT_CONFIRMED_REASON_UNVERIFIED"&&<p className="badge">正誤確認済／理由要確認</p>}{r.verificationStatus==="PAST_EXAM_ONLY"&&<p className="badge">過去問・原典未確認</p>}{r.verificationStatus==="SOURCE_UNCERTAIN"&&<p className="badge">要確認問題</p>}{r.caution==="AMENDMENT"&&<p className="badge">改正注意</p>}{r.timeSensitive&&<p className="badge">試験直前に再確認</p>}{r.historicalJudgment!==null&&<p className="muted">過去時点の判定：{r.historicalJudgment?"○":"×"}（{r.historicalContext}）／現在判定を正答として採点</p>}</div>}
