import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {requireUser} from "@/server/auth";
import TextbookReader from "@/components/textbook-reader";
import {textbooks} from "@/lib/textbooks";
const loaders={
  jichiho:()=>import("../../../../data/jichiho_handbook.json"),
  chikoho:()=>import("../../../../data/chikoho_handbook.json"),
  rokiho:()=>import("../../../../data/rokiho_handbook.json"),
  shireiki:()=>import("../../../../data/shireiki_handbook.json"),
  domestic:()=>import("../../../../data/domestic_handbook.json"),
};
export default async function Page({params}:{params:Promise<{subject:string}>}){
  try{await requireUser()}catch{redirect("/auth")}
  const {subject}=await params;
  if(!Object.prototype.hasOwnProperty.call(loaders,subject))notFound();
  const handbook=(await loaders[subject as keyof typeof loaders]()).default;
  const book=textbooks.find(b=>b.slug===subject)!;
  return <main className="shell"><header className="top"><h1>{book.title}テキスト</h1><Link className="button ghost" href="/texts">科目一覧へ</Link></header><p className="muted">問題を読み、正答・解説を開いて確認できます。本文の基準日・要確認の注記も確認してください。</p><TextbookReader handbook={handbook}/></main>;
}
