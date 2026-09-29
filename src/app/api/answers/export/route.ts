import { requireUser } from "@/server/auth";
import { apiErrorResponse } from "@/server/errors";
import { answerLog } from "@/server/study-service";

export async function GET(){
  try {
    const user=await requireUser();
    const log=await answerLog(user.id);
    return new Response(JSON.stringify(log,null,2),{headers:{"content-type":"application/json; charset=utf-8","content-disposition":"attachment; filename=examapp-answer-log.json","cache-control":"private, no-store"}});
  } catch(error){return apiErrorResponse(error)}
}
