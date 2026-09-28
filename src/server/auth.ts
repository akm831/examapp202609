import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { ApiError } from "./errors";
const COOKIE="examapp_session";
const hash=(v:string)=>createHash("sha256").update(v).digest("hex");
export async function createLoginSession(userId:string){
  const token=randomBytes(32).toString("base64url");
  await prisma.loginSession.create({data:{userId,tokenHash:hash(token),expiresAt:new Date(Date.now()+30*86400000)}});
  (await cookies()).set(COOKIE,token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:30*86400});
}
export async function requireUser(){
  const token=(await cookies()).get(COOKIE)?.value;
  if(!token) throw new ApiError("UNAUTHORIZED","ログインが必要です。",401);
  const session=await prisma.loginSession.findUnique({where:{tokenHash:hash(token)},include:{user:true}});
  if(!session||session.expiresAt<=new Date()) throw new ApiError("UNAUTHORIZED","ログインが必要です。",401);
  return {id:session.user.id,email:session.user.email};
}
export async function clearLoginSession(){
  const jar=await cookies(); const token=jar.get(COOKIE)?.value;
  if(token) await prisma.loginSession.deleteMany({where:{tokenHash:hash(token)}});
  jar.delete(COOKIE);
}
