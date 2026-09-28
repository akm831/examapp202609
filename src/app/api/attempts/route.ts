import { requireUser } from "@/server/auth";import { apiErrorResponse } from "@/server/errors";import { submitAnswer } from "@/server/study-service";import { answerSchema } from "@/server/validation";
export async function POST(r:Request){try{const u=await requireUser();return Response.json(await submitAnswer(u.id,answerSchema.parse(await r.json())))}catch(e){return apiErrorResponse(e)}}
