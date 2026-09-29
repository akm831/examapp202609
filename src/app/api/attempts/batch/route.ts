import { requireUser } from "@/server/auth";
import { apiErrorResponse } from "@/server/errors";
import { submitAnswerBatch } from "@/server/study-service";
import { batchAnswerSchema } from "@/server/validation";
export async function POST(request:Request){
  try{
    const user=await requireUser();
    const {answers}=batchAnswerSchema.parse(await request.json());
    return Response.json({results:await submitAnswerBatch(user.id,answers)});
  }catch(error){return apiErrorResponse(error)}
}
