import { StudyScreen } from "@/components/study-screen";export default async function Page({params}:{params:Promise<{sessionId:string}>}){return <StudyScreen sessionId={(await params).sessionId}/>}
