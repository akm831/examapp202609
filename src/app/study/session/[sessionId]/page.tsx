import { StudyScreen } from "@/components/study-screen";
export default async function Page({params,searchParams}:{params:Promise<{sessionId:string}>;searchParams:Promise<{fast?:string}>}){
  const {sessionId}=await params;
  return <StudyScreen sessionId={sessionId} fast={(await searchParams).fast==="1"}/>;
}
