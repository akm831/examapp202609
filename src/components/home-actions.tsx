"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Subject={slug:string;name:string;count:number};
type Open={id:string;mode:string;answered:number;total:number};
type Filter="ALL"|"UNSTUDIED"|"INCORRECT"|"UNSURE";
export function HomeActions({today,modes,subjects=[],openSessions=[]}:{today?:boolean;modes?:boolean;subjects?:Subject[];openSessions?:Open[]}){
  const [fast,setFast]=useState(false),[busy,setBusy]=useState(false),[mode,setMode]=useState<"SUBJECT"|"WRONG"|"RANDOM"|null>(null),[subject,setSubject]=useState(""),[count,setCount]=useState(20),[filter,setFilter]=useState<Filter>("ALL"),[error,setError]=useState("");
  const router=useRouter();
  async function start(selectedMode:string){
    setBusy(true);setError("");
    try {
      const r=await fetch("/api/study/sessions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:selectedMode,...(selectedMode!=="TODAY"?{subjectSlug:selectedMode==="SUBJECT"?subject:undefined,requestedCount:count,progressFilter:filter}:{})})});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error?.message||"演習を開始できませんでした。");
      const destination=`/study/session/${j.id}${fast&&selectedMode!=="TODAY"?"?fast=1":""}`;router.prefetch(destination);router.push(destination);
    }catch(e){setError(e instanceof Error?e.message:"演習を開始できませんでした。");setBusy(false)}
  }
  if(today){const existing=openSessions.find(s=>s.mode==="TODAY");return <div>{existing?<button className="primary" onClick={()=>router.push(`/study/session/${existing.id}`)}>続きから（{existing.answered}/{existing.total}）</button>:<button disabled={busy} className="primary" onClick={()=>void start("TODAY")}>今日の復習を開始</button>}{error&&<p className="error">{error}</p>}</div>}
  if(!modes)return null;
  return mode?<div className="card"><button className="ghost" onClick={()=>setMode(null)}>← 戻る</button><h3>{mode==="SUBJECT"?"科目別演習":mode==="WRONG"?"間違い問題":"ランダム演習"}</h3>{mode==="SUBJECT"&&<label className="field">科目<select value={subject} onChange={e=>setSubject(e.target.value)}><option value="">選択してください</option>{subjects.map(s=><option key={s.slug} value={s.slug}>{s.name}（{s.count}問）</option>)}</select></label>}<label className="field">出題数<select value={count} onChange={e=>setCount(Number(e.target.value))}>{[10,20,50,100,593].map(n=><option key={n} value={n}>{n===593?"すべて（最大593問）":`${n}問`}</option>)}</select></label><label className="field">学習状態<select value={filter} onChange={e=>setFilter(e.target.value as Filter)}><option value="ALL">すべて</option><option value="UNSTUDIED">未学習</option><option value="INCORRECT">過去に間違えた問題</option><option value="UNSURE">迷った問題</option></select></label><label className="field"><span><input type="checkbox" checked={fast} onChange={e=>setFast(e.target.checked)}/> 高速周回（解説を挟まず5件ずつ保存）</span></label>{error&&<p className="error">{error}</p>}<button className="primary" disabled={busy||mode==="SUBJECT"&&!subject} onClick={()=>void start(mode)}>{busy?"準備中…":"演習を開始"}</button></div>:<div className="grid"><button className="mode" onClick={()=>setMode("SUBJECT")}>科目別演習<br/><span className="muted">科目を選ぶ</span></button><button className="mode" onClick={()=>setMode("WRONG")}>間違い問題<br/><span className="muted">苦手を復習</span></button><button className="mode" onClick={()=>setMode("RANDOM")}>ランダム<br/><span className="muted">全対象から出題</span></button></div>
}
