import { Prisma, StudyMode } from "@prisma/client";
import { prisma } from "./db";
import { ApiError } from "./errors";
import { applyExamDateAdjustment, calculateProgress, emptyProgress, rebuildProgress } from "@/lib/review";

export type CreateSessionInput={mode:StudyMode;subjectSlug?:string;requestedCount?:number;progressFilter?:"ALL"|"UNSTUDIED"|"INCORRECT"|"UNSURE"};
const dateInZone=(d:Date,tz:string)=>new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
const shuffle=<T>(a:T[])=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};

async function settingsFor(tx:Prisma.TransactionClient,userId:string){return tx.reviewSettings.upsert({where:{userId},create:{userId},update:{}})}
const eligibleWhere=(include:boolean):Prisma.StudyItemWhereInput=>({active:true,...(include?{}:{reviewEligible:true})});

export async function createStudySession(userId:string,input:CreateSessionInput){
  return prisma.$transaction(async tx=>{
    const settings=await settingsFor(tx,userId); const now=new Date(); const localDate=dateInZone(now,settings.timezone);
    if(input.mode==="TODAY"){
      const existing=await tx.studySession.findUnique({where:{userId_mode_localDate:{userId,mode:"TODAY",localDate}}});
      if(existing)return {id:existing.id};
    }
    let subjectId:string|undefined;
    if(input.mode==="SUBJECT"){
      const subject=await tx.subject.findUnique({where:{slug:input.subjectSlug}}); if(!subject)throw new ApiError("INVALID_INPUT","科目を指定してください。",400); subjectId=subject.id;
    }
    const base=eligibleWhere(settings.includeSourceUncertain); let ids:string[]=[];
    const progressFilter:Prisma.StudyItemWhereInput=input.progressFilter==="UNSTUDIED"?{progresses:{none:{userId}}}:input.progressFilter==="INCORRECT"?{progresses:{some:{userId,incorrectCount:{gt:0}}}}:input.progressFilter==="UNSURE"?{attempts:{some:{userId,wasUnsure:true}}}:{};
    if(input.mode==="TODAY"){
      const due=await tx.studyItemProgress.findMany({where:{userId,nextReviewAt:{lte:now},studyItem:base},orderBy:{nextReviewAt:"asc"},take:settings.dailyReviewLimit,select:{studyItemId:true}});
      const remaining=Math.max(0,settings.dailyReviewLimit-due.length);
      const fresh=remaining?await tx.studyItem.findMany({where:{...base,progresses:{none:{userId}}},orderBy:{sourceOrder:"asc"},take:Math.min(settings.newItemsPerDay,remaining),select:{id:true}}):[];
      ids=[...due.map(x=>x.studyItemId),...fresh.map(x=>x.id)];
    }else if(input.mode==="WRONG"){
      const rows=await tx.studyItemProgress.findMany({where:{userId,incorrectCount:{gt:0},studyItem:{...base,...progressFilter}},orderBy:{lastAnsweredAt:"asc"},...(input.requestedCount?{take:input.requestedCount}:{}),select:{studyItemId:true}}); ids=rows.map(x=>x.studyItemId);
    }else{
      const rows=await tx.studyItem.findMany({where:{...base,...progressFilter,...(subjectId?{subjectId}:{})},select:{id:true}}); ids=shuffle(rows.map(x=>x.id)); if(input.requestedCount)ids=ids.slice(0,input.requestedCount);
    }
    if(!ids.length)throw new ApiError("NO_STUDY_ITEMS","現在、対象の問題はありません。",409);
    const session=await tx.studySession.create({data:{userId,mode:input.mode,subjectId,requestedCount:ids.length,localDate:input.mode==="TODAY"?localDate:null,items:{create:ids.map((studyItemId,position)=>({studyItemId,position}))}}});
    return {id:session.id};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}

export async function getSession(userId:string,id:string){
  const session=await prisma.studySession.findFirst({where:{id,userId},include:{_count:{select:{attempts:true,items:true}}}}); if(!session)throw new ApiError("NOT_FOUND","セッションが見つかりません。",404);
  return {id:session.id,mode:session.mode,progress:{answered:session._count.attempts,total:session._count.items},completed:!!session.endedAt||session._count.attempts>=session._count.items};
}

export async function getNextItem(userId:string,id:string){
  // Avoid loading every attempt and every StudyItem in the session on each "next" request.
  // Sessions are ordered and each item can be answered at most once, so the attempt count
  // is also the position of the next item.
  const session=await prisma.studySession.findFirst({
    where:{id,userId},
    select:{endedAt:true,_count:{select:{attempts:true,items:true}}},
  });
  if(!session)throw new ApiError("NOT_FOUND","セッションが見つかりません。",404);
  const answered=session._count.attempts, total=session._count.items;
  if(answered>=total){
    if(!session.endedAt)await prisma.studySession.update({where:{id},data:{endedAt:new Date()}});
    return {sessionId:id,progress:{answered,total},completed:true as const};
  }
  const row=await prisma.studySessionItem.findUnique({
    where:{sessionId_position:{sessionId:id,position:answered}},
    select:{studyItem:{select:{id:true,statementText:true,subject:{select:{slug:true,name:true}}}}},
  });
  if(!row)throw new ApiError("NOT_FOUND","次の問題が見つかりません。",404);
  return {sessionId:id,progress:{answered,total},completed:false as const,item:{id:row.studyItem.id,subject:row.studyItem.subject,statementText:row.studyItem.statementText}};
}

export async function getSessionItems(userId:string,id:string,offset=0,limit=593){
  const session=await prisma.studySession.findFirst({
    where:{id,userId},
    select:{
      endedAt:true,_count:{select:{items:true}},
      ...(offset===0?{attempts:{select:{studyItemId:true}}}:{}),
      items:{orderBy:{position:"asc"},skip:offset,take:limit,
        select:{studyItem:{select:{
          id:true,statementText:true,correctJudgment:true,explanation:true,explanationType:true,
          sourceReference:true,verificationStatus:true,caution:true,timeSensitive:true,
          historicalJudgment:true,historicalContext:true,judgmentAsOf:true,
          subject:{select:{slug:true,name:true}},
        }}},
      },
    },
  });
  if(!session)throw new ApiError("NOT_FOUND","セッションが見つかりません。",404);
  const answeredIds="attempts" in session?session.attempts.map(a=>a.studyItemId):[];
  const items=session.items.map(x=>({...x.studyItem,judgmentAsOf:x.studyItem.judgmentAsOf?.toISOString().slice(0,10)??null}));
  return {sessionId:id,answeredIds,total:session._count.items,completed:!!session.endedAt||offset===0&&answeredIds.length>=session._count.items,items};
}

export type AnswerInput={requestId:string;studyItemId:string;sessionId?:string;selectedJudgment:boolean;wasUnsure:boolean;responseMs?:number};
export async function submitAnswer(userId:string,input:AnswerInput){
  return prisma.$transaction(tx=>submitAnswerInTransaction(tx,userId,input),{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
export async function submitAnswerBatch(userId:string,inputs:AnswerInput[]){
  if(!inputs.length||inputs.length>10)throw new ApiError("INVALID_INPUT","1〜10件の回答を指定してください。",400);
  if(new Set(inputs.map(x=>x.requestId)).size!==inputs.length||new Set(inputs.map(x=>x.studyItemId)).size!==inputs.length)throw new ApiError("INVALID_INPUT","同じ回答または問題が重複しています。",400);
  return prisma.$transaction(async tx=>{
    const results=[];
    for(const input of inputs)results.push(await submitAnswerInTransaction(tx,userId,input));
    return results;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:20000});
}
async function submitAnswerInTransaction(tx:Prisma.TransactionClient,userId:string,input:AnswerInput){
    const prior=await tx.answerAttempt.findUnique({where:{userId_requestId:{userId,requestId:input.requestId}},include:{studyItem:true}}); if(prior)return feedback(prior);
    const item=await tx.studyItem.findUnique({where:{id:input.studyItemId}}); if(!item)throw new ApiError("NOT_FOUND","問題が見つかりません。",404);
    if(input.sessionId){const valid=await tx.studySessionItem.findFirst({where:{sessionId:input.sessionId,studyItemId:item.id,session:{userId}}});if(!valid)throw new ApiError("SESSION_INVALID","このセッションでは回答できません。",409)}
    const settings=await settingsFor(tx,userId); const isCorrect=input.selectedJudgment===item.correctJudgment;
    const attempt=await tx.answerAttempt.create({data:{...input,userId,isCorrect},include:{studyItem:true}});
    const previous=await tx.studyItemProgress.findUnique({where:{userId_studyItemId:{userId,studyItemId:item.id}}});
    const state=previous?{...previous,masteryStatus:previous.masteryStatus as typeof emptyProgress extends ()=>infer R ? R extends {masteryStatus:infer M}?M:never:never}:emptyProgress();
    let result=calculateProgress(state,{isCorrect,wasUnsure:input.wasUnsure,answeredAt:attempt.answeredAt},settings.timezone);
    result={...result,nextReviewAt:applyExamDateAdjustment(result.nextReviewAt!,attempt.answeredAt,settings.examDate)};
    await tx.studyItemProgress.upsert({where:{userId_studyItemId:{userId,studyItemId:item.id}},create:{userId,studyItemId:item.id,...result},update:result as Prisma.StudyItemProgressUpdateInput});
    return feedback(attempt);
  }

function feedback(a:{id:string;selectedJudgment:boolean;isCorrect:boolean;wasUnsure:boolean;studyItem:{correctJudgment:boolean;explanation:string;explanationType:string;sourceReference:string;verificationStatus:string;caution:string|null;timeSensitive:boolean;historicalJudgment:boolean|null;historicalContext:string|null;judgmentAsOf:Date|null}}){return {attemptId:a.id,isCorrect:a.isCorrect,selectedJudgment:a.selectedJudgment,correctJudgment:a.studyItem.correctJudgment,wasUnsure:a.wasUnsure,explanation:a.studyItem.explanation,explanationType:a.studyItem.explanationType,sourceReference:a.studyItem.sourceReference,verificationStatus:a.studyItem.verificationStatus,caution:a.studyItem.caution,timeSensitive:a.studyItem.timeSensitive,historicalJudgment:a.studyItem.historicalJudgment,historicalContext:a.studyItem.historicalContext,judgmentAsOf:a.studyItem.judgmentAsOf?.toISOString().slice(0,10)??null};}

export async function updateUnsure(userId:string,attemptId:string,wasUnsure:boolean){
  return prisma.$transaction(async tx=>{
    const attempt=await tx.answerAttempt.findFirst({where:{id:attemptId,userId}});if(!attempt)throw new ApiError("NOT_FOUND","回答が見つかりません。",404); if(attempt.wasUnsure===wasUnsure)return {attemptId,wasUnsure};
    await tx.answerAttempt.update({where:{id:attemptId},data:{wasUnsure}}); const settings=await settingsFor(tx,userId);
    const all=await tx.answerAttempt.findMany({where:{userId,studyItemId:attempt.studyItemId},orderBy:{answeredAt:"asc"}}); const rebuilt=rebuildProgress(all.map(a=>({isCorrect:a.isCorrect,wasUnsure:a.id===attemptId?wasUnsure:a.wasUnsure,answeredAt:a.answeredAt})),settings.timezone);
    rebuilt.nextReviewAt=applyExamDateAdjustment(rebuilt.nextReviewAt!,rebuilt.lastAnsweredAt!,settings.examDate);
    await tx.studyItemProgress.upsert({where:{userId_studyItemId:{userId,studyItemId:attempt.studyItemId}},create:{userId,studyItemId:attempt.studyItemId,...rebuilt},update:rebuilt as Prisma.StudyItemProgressUpdateInput}); return {attemptId,wasUnsure};
  });
}

export async function sessionSummary(userId:string,id:string){const s=await prisma.studySession.findFirst({where:{id,userId},include:{attempts:true}});if(!s)throw new ApiError("NOT_FOUND","セッションが見つかりません。",404);return {mode:s.mode,total:s.attempts.length,correct:s.attempts.filter(a=>a.isCorrect).length,incorrect:s.attempts.filter(a=>!a.isCorrect).length,unsure:s.attempts.filter(a=>a.wasUnsure).length};}

export async function dashboard(userId:string){
  const settings=await prisma.reviewSettings.upsert({where:{userId},create:{userId},update:{}}); const now=new Date();
  const [subjects,totalAttempts,studiedItems,masteredItems,relearningItems,openSessions,due]=await Promise.all([
    prisma.subject.findMany({orderBy:{sortOrder:"asc"},include:{_count:{select:{items:true}}}}),prisma.answerAttempt.count({where:{userId}}),prisma.studyItemProgress.count({where:{userId}}),prisma.studyItemProgress.count({where:{userId,masteryStatus:"MASTERED"}}),prisma.studyItemProgress.count({where:{userId,masteryStatus:"RELEARNING"}}),prisma.studySession.findMany({where:{userId,endedAt:null},orderBy:{startedAt:"desc"},include:{_count:{select:{items:true,attempts:true}}}}),prisma.studyItemProgress.count({where:{userId,nextReviewAt:{lte:now},studyItem:eligibleWhere(settings.includeSourceUncertain)}})
  ]);
  return {exam:{date:settings.examDate?.toISOString().slice(0,10)??null,daysRemaining:settings.examDate?Math.ceil((settings.examDate.getTime()-now.getTime())/86400000):null},today:{due,new:settings.newItemsPerDay},stats:{totalAttempts,studiedItems,unstudiedItems:593-studiedItems,masteredItems,relearningItems},subjects:subjects.map(s=>({slug:s.slug,name:s.name,count:s._count.items})),openSessions:openSessions.map(s=>({id:s.id,mode:s.mode,answered:s._count.attempts,total:s._count.items}))};
}

export async function answerLog(userId:string){
  const rows=await prisma.answerAttempt.findMany({where:{userId},orderBy:[{answeredAt:"asc"},{id:"asc"}],select:{id:true,answeredAt:true,sessionId:true,selectedJudgment:true,isCorrect:true,wasUnsure:true,responseMs:true,studyItem:{select:{sourceItemKey:true,statementText:true,correctJudgment:true,explanation:true,sourceReference:true,subject:{select:{name:true,slug:true}}}}}});
  return {format:"examapp-answer-log-v1",exportedAt:new Date().toISOString(),count:rows.length,attempts:rows.map(a=>({attemptId:a.id,answeredAt:a.answeredAt.toISOString(),sessionId:a.sessionId,subject:a.studyItem.subject.name,subjectSlug:a.studyItem.subject.slug,sourceItemKey:a.studyItem.sourceItemKey,question:a.studyItem.statementText,answer:a.selectedJudgment,correctAnswer:a.studyItem.correctJudgment,isCorrect:a.isCorrect,wasUnsure:a.wasUnsure,responseMs:a.responseMs,explanation:a.studyItem.explanation,sourceReference:a.studyItem.sourceReference}))};
}
