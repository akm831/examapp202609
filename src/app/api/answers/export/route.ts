import { requireUser } from "@/server/auth";
import { apiErrorResponse } from "@/server/errors";
import { learningAnalytics } from "@/server/analytics";
import { answerLog } from "@/server/study-service";

export async function GET(request:Request){
  try {
    const user=await requireUser();
    const log=await answerLog(user.id);
    const analytics=await learningAnalytics(user.id);
    if(new URL(request.url).searchParams.get("format")==="csv"){
      const columns=["answeredAt","subject","sourceItemKey","question","isCorrect","wasUnsure","responseMs","weaknessScore","recentAccuracy","improvement"];
      const scores=new Map(analytics.questions.map(q=>[q.sourceItemKey,q]));
      const csv=[columns.join(","),...log.attempts.map(a=>{const q=scores.get(a.sourceItemKey);const row={...a,weaknessScore:q?.weaknessScore,recentAccuracy:q?.recentAccuracy,improvement:q?.improvement};return columns.map(key=>`"${String(row[key as keyof typeof row]??"").replaceAll('"','""')}"`).join(",")})].join("\r\n");
      return new Response("\uFEFF"+csv,{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":"attachment; filename=examapp-answer-log.csv","cache-control":"private, no-store"}});
    }
    return new Response(JSON.stringify({...log,analytics},null,2),{headers:{"content-type":"application/json; charset=utf-8","content-disposition":"attachment; filename=examapp-answer-log.json","cache-control":"private, no-store"}});
  } catch(error){return apiErrorResponse(error)}
}
