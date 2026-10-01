import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
export class ApiError extends Error { constructor(public code:string,message:string,public status:number,public fieldErrors?:Record<string,string[]>){super(message)} }
export function apiErrorResponse(error: unknown) {
  if(error instanceof ZodError) return Response.json({error:{code:"INVALID_INPUT",message:"入力内容を確認してください。",fieldErrors:error.flatten().fieldErrors}},{status:400});
  if(error instanceof ApiError) return Response.json({error:{code:error.code,message:error.message,fieldErrors:error.fieldErrors}},{status:error.status});
  console.error(error);
  if(error instanceof Prisma.PrismaClientKnownRequestError){
    const messages:Record<string,string>={P2002:"回答の重複を解消できませんでした。",P2034:"回答保存が競合しました。再試行してください。",P2028:"回答保存の処理が時間切れになりました。",P2003:"回答に対応するデータが見つかりません。",P2021:"DBのテーブル構成を確認してください。",P2022:"DBの列構成を確認してください。"};
    return Response.json({error:{code:error.code,message:messages[error.code]||"DBへの保存に失敗しました。"}},{status:503});
  }
  return Response.json({error:{code:"INTERNAL_ERROR",message:"処理に失敗しました。"}},{status:500});
}
