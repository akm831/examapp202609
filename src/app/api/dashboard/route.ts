import { requireUser } from "@/server/auth";import { apiErrorResponse } from "@/server/errors";import { dashboard } from "@/server/study-service";
export async function GET(){try{const u=await requireUser();return Response.json(await dashboard(u.id))}catch(e){return apiErrorResponse(e)}}
