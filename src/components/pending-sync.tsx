"use client";
import { useEffect,useState } from "react";
type Pending={requestId:string;sessionId:string;studyItemId:string;selectedJudgment:boolean;wasUnsure:boolean;responseMs:number};
export function PendingSync(){
  const [count,setCount]=useState(0),[busy,setBusy]=useState(false);
  useEffect(()=>{
    let active=true,running=false;
    async function retry(){
      if(running)return;running=true;
      try{
        for(let i=0;i<localStorage.length;i++){
          const key=localStorage.key(i);if(!key?.startsWith("examapp-pending-"))continue;
          const entries=JSON.parse(localStorage.getItem(key)||"[]") as Pending[];
          if(!entries.length)continue;
          if(active)setBusy(true);
          for(let offset=0;offset<entries.length;offset+=5){
            const batch=entries.slice(offset,offset+5);
            const response=await fetch("/api/attempts/batch",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({answers:batch})});
            if(!response.ok)break;
            const ids=new Set(batch.map(a=>a.requestId));
            const latest=JSON.parse(localStorage.getItem(key)||"[]") as Pending[];
            localStorage.setItem(key,JSON.stringify(latest.filter(a=>!ids.has(a.requestId))));
          }
        }
      }catch{/* Keep the local queue for the next reconnect. */}
      finally{running=false;if(active){setBusy(false);let n=0;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith("examapp-pending-"))try{n+=(JSON.parse(localStorage.getItem(k)||"[]") as Pending[]).length}catch{} }setCount(n)}}
    }
    void retry();window.addEventListener("online",retry);const timer=window.setInterval(retry,30000);
    return()=>{active=false;window.removeEventListener("online",retry);window.clearInterval(timer)};
  },[]);
  return count?<p role="status" className="muted">端末に未同期回答 {count}件を保存中。{busy?"再送中…":"通信回復時に再送します。"}</p>:null;
}
