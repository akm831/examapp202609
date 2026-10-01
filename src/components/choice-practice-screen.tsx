"use client";
import Link from "next/link";
import {HandbookButton} from "./handbook-button";
import {useEffect,useRef,useState} from "react";
import {choiceIsCorrect,readChoiceAnswers,type ChoiceAnswer,type ChoiceQuestion} from "@/lib/choice-practice";

export function ChoicePracticeScreen({questions,userId}:{questions:ChoiceQuestion[];userId:string}) {
  const storageKey=`examapp-choice-answers-${userId}`;
  const [kind,setKind]=useState<"PREDICTED"|"PAST_EXAM">("PREDICTED"),[index,setIndex]=useState(0);
  const [selected,setSelected]=useState<number|null>(null),[result,setResult]=useState<ChoiceAnswer|null>(null),[unsure,setUnsure]=useState(false);
  const [error,setError]=useState(""),[ready,setReady]=useState(false),[records,setRecords]=useState<ChoiceAnswer[]>([]);
  const started=useRef(0),lock=useRef(false);
  const subset=questions.filter(q=>q.sourceType===kind),question=subset[index];
  useEffect(()=>{
    try {setRecords(readChoiceAnswers(localStorage.getItem(storageKey)));setReady(true)}
    catch {setError("保存済みの記録を読み込めません。既存記録を上書きせず停止しています。")}
    started.current=Date.now();
  },[storageKey]);
  function reset(nextKind=kind) {setKind(nextKind);setIndex(0);setSelected(null);setResult(null);setUnsure(false);started.current=Date.now();lock.current=false}
  function answer() {
    if(!question||selected===null||result||!ready||lock.current)return;
    lock.current=true;
    const record:ChoiceAnswer={requestId:crypto.randomUUID(),questionId:question.id,selectedChoice:selected,correctChoice:question.correctChoice,isCorrect:choiceIsCorrect(question,selected),wasUnsure:unsure,answeredAt:new Date().toISOString(),responseMs:Math.max(0,Date.now()-started.current)};
    try {
      const next=[...readChoiceAnswers(localStorage.getItem(storageKey)),record];
      localStorage.setItem(storageKey,JSON.stringify(next));setRecords(next);setResult(record);setError("");
    } catch {lock.current=false;setError("演習記録を端末に保存できませんでした。選択を保持しています。再試行してください。")}
  }
  function next() {setIndex(n=>n+1);setSelected(null);setResult(null);setUnsure(false);lock.current=false;started.current=Date.now();window.scrollTo({top:0})}
  function download() {
    const payload={format:"examapp-choice-log-v1",exportedAt:new Date().toISOString(),attempts:records.map(r=>({ ...r, question:questions.find(q=>q.id===r.questionId)??null }))};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="shisei-choice-answers.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <main className="shell"><header className="top"><Link className="button ghost" href="/">ホームへ</Link><h1>市政知識・本番形式</h1></header>
    <section className="card"><p>異なる施策の５肢から、最も妥当なものを１つ選びます。</p><label className="field">出題区分<select value={kind} onChange={e=>reset(e.target.value as typeof kind)}><option value="PREDICTED">予想問題（{questions.filter(q=>q.sourceType==="PREDICTED").length}問）</option><option value="PAST_EXAM">添付の実過去問（{questions.filter(q=>q.sourceType==="PAST_EXAM").length}問）</option></select></label><p className="muted">この演習の記録は、この端末・ブラウザのログインユーザーごとに保存します。○×復習の回答履歴・定着判定には加算されません。</p><button className="secondary" disabled={!ready||!records.length} onClick={download}>演習記録JSONを出力（{records.length}件）</button></section>
    {error&&<p className="error" role="alert">{error}</p>}
    {!ready?<p>{error?"記録の読み込みを停止しました。":"演習記録を読み込み中…"}</p>:!question?<section className="card"><h2>演習完了</h2><p>{subset.length}問の演習を終了しました。</p><button className="primary" onClick={()=>reset()}>もう一度演習する</button></section>:<>
      <p className="muted">{index+1} / {subset.length}問</p><div className="progress"><i style={{width:`${index/subset.length*100}%`}}/></div>
      <section className="card"><p className="badge">{kind==="PAST_EXAM"?"実過去問・掲載正答で採点":"予想問題・公式資料で確認"}</p><h2>{question.title}</h2><p className="muted">{question.referenceDate}</p><p>{question.context}</p>
        <fieldset style={{border:0,padding:0,margin:0}} disabled={result!==null}><legend className="question">{question.prompt}</legend><div className="choice-list">{question.choices.map((choice,n)=><label key={n} className={`choice-option${selected===n+1?" chosen":""}${result&&n+1===question.correctChoice?" right":""}${result&&selected===n+1&&!result.isCorrect?" wrong":""}`}><input type="radio" name={question.id} checked={selected===n+1} onChange={()=>setSelected(n+1)}/><span><b>{n+1}．</b>{choice.text}</span></label>)}</div><label><input type="checkbox" checked={unsure} onChange={e=>setUnsure(e.target.checked)}/> 迷った</label></fieldset>
        {!result&&<button className="primary" disabled={selected===null} style={{width:"100%",marginTop:18}} onClick={answer}>回答する</button>}
      </section>
      {result&&<section className="card" aria-live="polite"><h2 className={result.isCorrect?"result-ok":"result-ng"}>{result.isCorrect?"○ 正解":"× 不正解"}</h2><p>あなたの回答：{result.selectedChoice} ／ 正答：{question.correctChoice}{result.wasUnsure?"（迷った）":""}</p><h3>全肢解説</h3>{question.choices.map((choice,n)=><div className="choice-explanation" key={n}><b>{n+1}．{n+1===question.correctChoice?"○":"×"}</b><p>{choice.explanation}</p><HandbookButton text={choice.text}/><p className="muted">根拠：{choice.sourceUrl?<a href={choice.sourceUrl} target="_blank" rel="noreferrer">{choice.source}</a>:choice.source}</p></div>)}<button className="primary" style={{width:"100%",marginTop:18}} onClick={next}>{index+1===subset.length?"結果へ":"次の問題へ"}</button></section>}
    </>}
  </main>;
}

