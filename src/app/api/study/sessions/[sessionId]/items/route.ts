import { requireUser } from "@/server/auth";
import { apiErrorResponse } from "@/server/errors";
import { getSessionItems } from "@/server/study-service";

export async function GET(request:Request,{params}:{params:Promise<{sessionId:string}>}){
  try{
    const u=await requireUser();
    const query=new URL(request.url).searchParams;
    const offset=Number(query.get("offset")??0),limit=Number(query.get("limit")??593);
    if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>593)return Response.json({error:{message:"取得範囲が不正です。"}},{status:400});
    return Response.json(await getSessionItems(u.id,(await params).sessionId,offset,limit),{headers:{"cache-control":"private, no-store"}});
  }catch(e){
    return apiErrorResponse(e);
  }
}
