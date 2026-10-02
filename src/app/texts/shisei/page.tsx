import Link from "next/link";
import {redirect} from "next/navigation";
import {requireUser} from "@/server/auth";
import HandbookReader from "@/components/handbook-reader";

export default async function Page() {
  try {await requireUser()}catch {redirect("/auth")}
  return <main className="shell"><header className="top"><h1>市政知識テキスト</h1><Link className="button ghost" href="/texts">科目一覧へ</Link></header><p className="muted">テーマ別に理解・復習。重要条件は本文に、細かな数値と問題の解説は開いて確認できます。</p><HandbookReader/></main>;
}
