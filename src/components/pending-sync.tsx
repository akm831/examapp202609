"use client";
import { useEffect,useState } from "react";
import { acknowledgePending, sendAnswers } from "@/lib/answer-sync";
type Pending={requestId:string;sessionId:string;studyItemId:string;selectedJudgment:boolean;wasUnsure:boolean;responseMs:number};
export function PendingSync(){
  const [count,setCount]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{
    let active=true,running=false;
    async function retry(){
      if(running)return;running=true;
      try{
        if(active)setError("");
        for(let i=0;i<localStorage.length;i++){
          const key=localStorage.key(i);if(!key?.startsWith("examapp-pending-"))continue;
          const entries=JSON.parse(localStorage.getItem(key)||"[]") as Pending[];
          if(!entries.length)continue;
          if(active)setBusy(true);
          for(let offset=0;offset<entries.length;offset+=5){
            const batch=entries.slice(offset,offset+5);
            try{
              await sendAnswers(batch);
              acknowledgePending(key,batch.map(a=>a.requestId));
            }catch(e){if(active)setError(e instanceof Error?e.message:"同期に失敗しました。");break}
          }
        }
      }catch(e){if(active)setError(e instanceof Error?e.message:"未同期回答を読み込めませんでした。")}
      finally{running=false;if(active){setBusy(false);let n=0;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith("examapp-pending-"))try{n+=(JSON.parse(localStorage.getItem(k)||"[]") as Pending[]).length}catch{} }setCount(n)}}
    }
    void retry();window.addEventListener("online",retry);window.addEventListener("examapp-retry-sync",retry);const timer=window.setInterval(retry,30000);
    return()=>{active=false;window.removeEventListener("online",retry);window.removeEventListener("examapp-retry-sync",retry);window.clearInterval(timer)};
  },[]);
  return count?<section><p role="status" className="muted">端末に未同期回答 {count}件を保存中。{busy?"再送中…":"通信回復時に再送します。"}</p>{error&&<p className="error">同期エラー：{error}</p>}<button className="ghost" disabled={busy} onClick={()=>window.dispatchEvent(new Event("examapp-retry-sync"))}>再試行</button></section>:null;
}
