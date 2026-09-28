import { clearLoginSession } from "@/server/auth"; export async function POST(){await clearLoginSession();return Response.json({ok:true})}
