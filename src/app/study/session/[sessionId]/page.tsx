import { StudyScreen } from "@/components/study-screen";
import { FastStudyScreen } from "@/components/fast-study-screen";
export default async function Page({params,searchParams}:{params:Promise<{sessionId:string}>;searchParams:Promise<{fast?:string}>}){
  const {sessionId}=await params;
  return (await searchParams).fast==="1"?<FastStudyScreen sessionId={sessionId}/>:<StudyScreen sessionId={sessionId}/>;
}
