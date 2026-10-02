"use client";
import {useRef,useState} from "react";
export type Handbook={title:string;revisedAt?:string;topics:{id:string;chapter:string;title:string;html:string;searchText:string}[]};

export default function TextbookReader({handbook,initialTopic}:{handbook:Handbook;initialTopic?:string}) {
  const [active,setActive]=useState(initialTopic??handbook.topics[0].id);
  const [query,setQuery]=useState(""),[size,setSize]=useState(18),[contents,setContents]=useState(!initialTopic);
  const article=useRef<HTMLElement>(null);
  const topic=handbook.topics.find(t=>t.id===active)??handbook.topics[0];
  const filtered=handbook.topics.filter(t=>t.searchText.includes(query.trim()));
  const chapters=[...new Set(filtered.map(t=>t.chapter))];
  const index=handbook.topics.findIndex(t=>t.id===topic.id);
  function choose(id:string){setActive(id);setContents(false);requestAnimationFrame(()=>{article.current?.focus({preventScroll:true});article.current?.scrollIntoView({block:"start"})})}
  return <div className="handbook-reader">
    <div className="handbook-toolbar"><button className="secondary" onClick={()=>setContents(v=>!v)} aria-expanded={contents}>目次・検索</button><label>文字サイズ <select aria-label="文字サイズ" value={size} onChange={e=>setSize(Number(e.target.value))}><option value={16}>標準</option><option value={18}>大</option><option value={21}>特大</option></select></label></div>
    {contents&&<nav className="card" aria-label="教材の目次"><label className="field">テーマ・本文を検索<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="テーマや本文の語句…"/></label><p className="muted">{filtered.length}テーマ</p>{chapters.map(chapter=><div key={chapter}><h2>{chapter}</h2><div className="handbook-topics">{filtered.filter(t=>t.chapter===chapter).map(t=><button key={t.id} className={t.id===topic.id?"secondary":"ghost"} onClick={()=>choose(t.id)}>{t.title}</button>)}</div></div>)}{!filtered.length&&<p>該当するテーマがありません。</p>}</nav>}
    <article ref={article} tabIndex={-1} key={topic.id} className="card handbook-body" style={{fontSize:size}}><p className="eyebrow">{topic.chapter}{handbook.revisedAt&&<> ／ 改訂 {handbook.revisedAt}</>}</p><h2>{topic.title}</h2><div dangerouslySetInnerHTML={{__html:topic.html}}/></article>
    <div className="handbook-navigation"><button className="ghost" disabled={index===0} onClick={()=>choose(handbook.topics[index-1].id)}>前のテーマ</button><span>{index+1} / {handbook.topics.length}</span><button className="ghost" disabled={index===handbook.topics.length-1} onClick={()=>choose(handbook.topics[index+1].id)}>次のテーマ</button></div>
  </div>;
}
