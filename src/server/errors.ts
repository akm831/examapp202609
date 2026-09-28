import { ZodError } from "zod";
export class ApiError extends Error { constructor(public code:string,message:string,public status:number,public fieldErrors?:Record<string,string[]>){super(message)} }
export function apiErrorResponse(error: unknown) {
  if(error instanceof ZodError) return Response.json({error:{code:"INVALID_INPUT",message:"入力内容を確認してください。",fieldErrors:error.flatten().fieldErrors}},{status:400});
  if(error instanceof ApiError) return Response.json({error:{code:error.code,message:error.message,fieldErrors:error.fieldErrors}},{status:error.status});
  console.error(error); return Response.json({error:{code:"INTERNAL_ERROR",message:"処理に失敗しました。"}},{status:500});
}
