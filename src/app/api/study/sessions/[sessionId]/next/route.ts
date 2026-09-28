import { requireUser } from "@/server/auth";import { apiErrorResponse } from "@/server/errors";import { getNextItem } from "@/server/study-service";
export async function GET(_:Request,{params}:{params:Promise<{sessionId:string}>}){try{const u=await requireUser();return Response.json(await getNextItem(u.id,(await params).sessionId))}catch(e){return apiErrorResponse(e)}}
