"use client";
import dynamic from "next/dynamic";
import {useEffect,useRef,useState} from "react";
import {handbookTopicFor} from "@/lib/handbook-topics";
const Reader=dynamic(()=>import("./handbook-reader"),{loading:()=> <p role="status">教材を読み込み中…</p>});

export function HandbookButton({text}:{text?:string}) {
  const [open,setOpen]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    dialog.current?.showModal();
    const original=document.body.style.overflow,trigger=button.current;document.body.style.overflow="hidden";
    return()=>{document.body.style.overflow=original;trigger?.focus()};
  },[open]);
  return <><button ref={button} type="button" className="secondary" onClick={()=>setOpen(true)}>市政知識テキストで確認</button>{open&&<dialog ref={dialog} className="handbook-dialog" onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)}><header className="handbook-dialog-header"><h2>市政知識テキスト</h2><button className="ghost" autoFocus onClick={()=>setOpen(false)}>閉じて問題へ戻る</button></header><Reader initialTopic={handbookTopicFor(text??"")}/></dialog>}</>;
}
