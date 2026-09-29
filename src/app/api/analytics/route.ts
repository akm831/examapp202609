import { requireUser } from "@/server/auth";
import { apiErrorResponse } from "@/server/errors";
import { learningAnalytics } from "@/server/analytics";
export async function GET(){try{return Response.json(await learningAnalytics((await requireUser()).id))}catch(e){return apiErrorResponse(e)}}
