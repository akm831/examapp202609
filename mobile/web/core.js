(function(root) {
'use strict';
const signature = a => a.sourceItemKey + '\u0000' + new Date(a.answeredAt).toISOString();
function parseCSV(text) {
  text=text.replace(/^\uFEFF/,''); const rows=[]; let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++) { const c=text[i];
    if(quoted) { if(c==='"' && text[i+1]==='"'){cell+='"';i++;} else if(c==='"')quoted=false; else cell+=c; }
    else if(c==='"'){if(cell)throw Error('CSVの引用符が不正です。');quoted=true;}
    else if(c===','){row.push(cell);cell='';}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw Error('CSVの引用符が閉じていません。');
  if(cell||row.length){row.push(cell);rows.push(row);}
  if(!rows.length)throw Error('CSVが空です。');
  const headers=rows.shift();
  for(const key of ['answeredAt','sourceItemKey','isCorrect','wasUnsure'])if(!headers.includes(key))throw Error('必要な項目がありません：'+key);
  return rows.map((r,i)=>{if(r.length!==headers.length)throw Error((i+2)+'行目の列数が不正です。');return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));});
}
function validateAttempt(r, keys, index) {
  const bool=x=>x===true||x==='true'?true:x===false||x==='false'?false:null;
  const correct=bool(r.isCorrect),unsure=bool(r.wasUnsure),date=new Date(r.answeredAt);
  if(!keys.has(r.sourceItemKey))throw Error((index+1)+'件目の問題が見つかりません：'+r.sourceItemKey);
  if(correct===null||unsure===null||!Number.isFinite(date.getTime()))throw Error((index+1)+'件目の日時・正誤が不正です。');
  const ms=r.responseMs===''||r.responseMs===null||r.responseMs===undefined?null:Number(r.responseMs);
  if(ms!==null&&(!Number.isFinite(ms)||ms<0))throw Error((index+1)+'件目の回答時間が不正です。');
  return {sourceItemKey:r.sourceItemKey,answeredAt:date.toISOString(),isCorrect:correct,wasUnsure:unsure,responseMs:ms};
}
function mergeAttempts(existing, incoming, keys) {
  const validated=incoming.map((r,i)=>validateAttempt(r,keys,i));
  const signatures=new Set(existing.map(signature)); const merged=[...existing]; let added=0;
  for(const a of validated)if(!signatures.has(signature(a))){merged.push(a);signatures.add(signature(a));added++;}
  merged.sort((a,b)=>Date.parse(a.answeredAt)-Date.parse(b.answeredAt));
  return {attempts:merged,added,duplicates:validated.length-added};
}
function progress(attempts) {
  const states={};
  for(const a of [...attempts].sort((a,b)=>Date.parse(a.answeredAt)-Date.parse(b.answeredAt))) {
    const p=states[a.sourceItemKey]||{attemptsCount:0,correctCount:0,incorrectCount:0,consecutiveCorrect:0,masteryStatus:'NEW',unsureCount:0};
    const streak=a.isCorrect&&!a.wasUnsure?p.consecutiveCorrect+1:0;
    let status,days;
    if(!a.isCorrect){status=p.masteryStatus==='NEW'?'LEARNING':'RELEARNING';days=1;}
    else if(a.wasUnsure){status='LEARNING';days=2;}
    else if(streak>=3){status='MASTERED';days=14;}
    else if(streak===2){status='REVIEW';days=7;}
    else{status='LEARNING';days=4;}
    states[a.sourceItemKey]={attemptsCount:p.attemptsCount+1,correctCount:p.correctCount+(a.isCorrect?1:0),incorrectCount:p.incorrectCount+(a.isCorrect?0:1),consecutiveCorrect:streak,masteryStatus:status,unsureCount:p.unsureCount+(a.wasUnsure?1:0),lastResult:a.isCorrect,lastWasUnsure:a.wasUnsure,lastAnsweredAt:a.answeredAt,nextReviewAt:new Date(Date.parse(a.answeredAt)+days*86400000).toISOString()};
  }
  return states;
}
const api={parseCSV,validateAttempt,mergeAttempts,progress,signature};
if(typeof module!=='undefined')module.exports=api;else root.ExamCore=api;
})(typeof window==='undefined'?globalThis:window);
