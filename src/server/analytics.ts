import { prisma } from "./db";

// The score is a 0–100 review priority, not a probability of failing.
export async function learningAnalytics(userId:string){
  const [subjects,progress,attempts]=await Promise.all([
    prisma.subject.findMany({orderBy:{sortOrder:"asc"},select:{id:true,slug:true,name:true,items:{where:{active:true},select:{id:true,sourceItemKey:true,statementText:true}}}}),
    prisma.studyItemProgress.findMany({where:{userId},select:{studyItemId:true,attemptsCount:true,correctCount:true,incorrectCount:true,lastAnsweredAt:true,nextReviewAt:true,masteryStatus:true}}),
    prisma.answerAttempt.findMany({where:{userId},orderBy:{answeredAt:"asc"},select:{studyItemId:true,isCorrect:true,wasUnsure:true,responseMs:true,answeredAt:true}}),
  ]);
  const byProgress=new Map(progress.map(p=>[p.studyItemId,p]));
  const byAttempts=new Map<string,typeof attempts>();
  for(const a of attempts){const entries=byAttempts.get(a.studyItemId)||[];entries.push(a);byAttempts.set(a.studyItemId,entries)}
  const now=Date.now();
  const questions=subjects.flatMap(subject=>subject.items.map(item=>{
    const p=byProgress.get(item.id),list=byAttempts.get(item.id)||[];
    const recent=list.slice(-5),unsureCount=list.filter(a=>a.wasUnsure).length;
    const responseSamples=list.map(a=>a.responseMs).filter((ms):ms is number=>ms!==null);
    const averageResponseMs=responseSamples.length?Math.round(responseSamples.reduce((a,b)=>a+b,0)/responseSamples.length):null;
    const ageDays=p?.lastAnsweredAt?Math.floor((now-p.lastAnsweredAt.getTime())/86400000):null;
    const accuracy=p?.attemptsCount?p.correctCount/p.attemptsCount:null;
    const recentAccuracy=recent.length?recent.filter(a=>a.isCorrect).length/recent.length:null;
    const early=list.slice(0,-5),earlyAccuracy=early.length?early.filter(a=>a.isCorrect).length/early.length:null;
    const improvement=earlyAccuracy!==null&&recentAccuracy!==null?Math.round((recentAccuracy-earlyAccuracy)*100):null;
    const score=p?Math.min(100,Math.round(35*(1-(accuracy??0))+20*(1-(recentAccuracy??0))+Math.min(15,p.incorrectCount*3)+Math.min(10,unsureCount*3)+Math.min(8,(averageResponseMs??0)/10000)+Math.min(7,(ageDays??0)/14)+5/Math.sqrt(p.attemptsCount))):null;
    return {studyItemId:item.id,sourceItemKey:item.sourceItemKey,question:item.statementText,subjectSlug:subject.slug,attempts:p?.attemptsCount??0,incorrect:p?.incorrectCount??0,unsureCount,accuracy:accuracy===null?null:Math.round(accuracy*100),recentAccuracy:recentAccuracy===null?null:Math.round(recentAccuracy*100),improvement,averageResponseMs,lastAnsweredAt:p?.lastAnsweredAt?.toISOString()??null,nextReviewAt:p?.nextReviewAt?.toISOString()??null,weaknessScore:score,needsReview:!!p&&(p.nextReviewAt!==null&&p.nextReviewAt<=new Date()||p.masteryStatus==="RELEARNING")};
  }));
  const summary=subjects.map(s=>{
    const rows=questions.filter(q=>q.subjectSlug===s.slug),studied=rows.filter(q=>q.attempts>0),count=studied.reduce((n,q)=>n+q.attempts,0);
    return {slug:s.slug,name:s.name,total:rows.length,studied:studied.length,unanswered:rows.length-studied.length,attempts:count,accuracy:count?Math.round(studied.reduce((n,q)=>n+q.attempts*(q.accuracy??0),0)/count):null,needsReview:rows.filter(q=>q.needsReview).length,weaknessScore:studied.length?Math.round(studied.reduce((n,q)=>n+(q.weaknessScore??0),0)/studied.length):null,improving:studied.filter(q=>(q.improvement??0)>0).length};
  });
  const daily=new Map<string,{date:string;attempts:number;correct:number;unsure:number}>();
  for(const a of attempts){const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(a.answeredAt);const row=daily.get(date)||{date,attempts:0,correct:0,unsure:0};row.attempts++;if(a.isCorrect)row.correct++;if(a.wasUnsure)row.unsure++;daily.set(date,row)}
  const history=[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const sevenDays=attempts.filter(a=>a.answeredAt.getTime()>=now-7*86400000);
  const aggregate=(rows:typeof attempts)=>({attempts:rows.length,correct:rows.filter(a=>a.isCorrect).length,accuracy:rows.length?Math.round(rows.filter(a=>a.isCorrect).length/rows.length*100):null});
  return {subjects:summary,questions,history,periods:{last7Days:aggregate(sevenDays),allTime:aggregate(attempts)}};
}
