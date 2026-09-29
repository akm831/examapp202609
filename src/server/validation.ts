import { z } from "zod";
export const createSessionSchema=z.object({mode:z.enum(["TODAY","SUBJECT","WRONG","RANDOM"]),subjectSlug:z.string().optional(),requestedCount:z.number().int().min(1).optional()}).superRefine((v,c)=>{if(v.mode==="SUBJECT"&&!v.subjectSlug)c.addIssue({code:"custom",path:["subjectSlug"],message:"科目を指定してください。"});if(v.mode==="TODAY"&&v.requestedCount!==undefined)c.addIssue({code:"custom",path:["requestedCount"],message:"今日の復習件数はサーバーが決定します。"})});
export const answerSchema=z.object({requestId:z.uuid(),studyItemId:z.uuid(),sessionId:z.uuid().optional(),selectedJudgment:z.boolean(),wasUnsure:z.boolean(),responseMs:z.number().int().min(0).max(3600000).optional()});
export const unsureSchema=z.object({wasUnsure:z.boolean()});
export const settingsSchema=z.object({newItemsPerDay:z.union([z.literal(0),z.literal(5),z.literal(10),z.literal(20)]),dailyReviewLimit:z.number().int().min(1).max(200),includeSourceUncertain:z.boolean(),examDate:z.iso.date().nullable(),timezone:z.string().min(1)});
export const authSchema=z.object({email:z.email().transform(x=>x.toLowerCase()),password:z.string().min(8).max(128)});
