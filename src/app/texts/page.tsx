import Link from "next/link";
import {redirect} from "next/navigation";
import {requireUser} from "@/server/auth";
import {textbooks} from "@/lib/textbooks";
export default async function Page(){
  try{await requireUser()}catch{redirect("/auth")}
  return <main className="shell"><header className="top"><h1>科目別テキスト</h1><Link className="button ghost" href="/">ホームへ</Link></header><p>科目を選び、目次・検索から復習する項目を開けます。</p><div className="grid">{textbooks.map(book=><section className="card" key={book.slug}><h2>{book.title}</h2><p>{book.description}</p><Link className="button secondary" href={`/texts/${book.slug}`}>テキストを読む</Link></section>)}</div></main>;
}
