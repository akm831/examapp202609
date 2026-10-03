import type { ExamHistory,HistorySummary } from "@/lib/exam-history";
function Summary({label,data}:{label:string;data:HistorySummary}){
  return <div><p>{label}：<strong>{data.recordCount}肢・{data.yearCount}年度</strong>{data.latestYear&&`（最新${data.latestYear}）`}</p><p className="muted">出題年度：{data.years.join("、")||"未確認"}</p></div>;
}
export function ExamHistoryDetails({history}:{history:ExamHistory|null|undefined}){
  if(!history)return null;
  const main=history.exact.recordCount?history.exact:history.topic?.recordCount?history.topic:history.relatedArticles;
  const label=history.exact.recordCount?"同じ問題文":history.topic?.recordCount?"同じ論点":history.relatedArticles.recordCount?"関連条文":"対応未確認";
  return <details className="exam-history"><summary>過去問DB：{label}{main.recordCount?` ${main.recordCount}肢・${main.yearCount}年度`:""}</summary>
    {history.exact.recordCount>0&&<Summary label="同じ問題文（空白・句読点等を除いて照合）" data={history.exact}/>}
    {history.topic&&<>{history.topic.recordCount?<Summary label="同じ論点（個別に対応を確認）" data={history.topic}/>:<p>この問題が問う論点自体の出題実績は未確認です。</p>}</>}
    {history.relatedArticles.recordCount>0&&<Summary label={`関連条文（${history.articleLabels.join("・")}）全体`} data={history.relatedArticles}/>}
    {history.status==="UNCONFIRMED"&&<p>DB内の対応を確認できていません。未出題という意味ではありません。</p>}
    <p className="muted">関連条文の集計には別の論点も含まれます。肢数は収録行数で、五択問題数や出題確率ではありません。複数年度をまとめた行は1肢として数え、年度数は重複を除いています。正誤は現在の問題の解説で確認してください。</p>
    <p className="muted">出典：{history.sourceFile}「{history.sheet}」／年度はDBの表記。予想問・回答履歴を除外。</p>
    <details><summary>参照行</summary>{history.exact.recordCount>0&&<p>同文：{history.exact.rows.map(r=>`${r.row}行（${r.years||"年度不明"}）`).join("、")}</p>}{history.topic&&history.topic.recordCount>0&&<p>同論点：{history.topic.rows.map(r=>`${r.row}行（${r.years||"年度不明"}）`).join("、")}</p>}{history.relatedArticles.recordCount>0&&<p>関連条文：{history.relatedArticles.rows.map(r=>`${r.row}行（${r.years||"年度不明"}）`).join("、")}</p>}</details>
  </details>;
}
