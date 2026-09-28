# 593 StudyItems 抽出監査レポート

## 結論

6教材から593件を固定データ化した。原本は変更していない。問題文、正誤、解説はいずれも原本内の明示情報だけを使用し、原本にない正誤・解説は生成していない。

| 科目 | 件数 |
|---|---:|
| 地方自治法 | 146 |
| 地方公務員法 | 192 |
| 市政知識 | 110 |
| 労働基準法 | 20 |
| 市例規 | 100 |
| 国内情勢 | 25 |
| 合計 | 593 |

## 検証結果

| 検査 | 結果 |
|---|---:|
| statementあり | 593/593 |
| correctJudgmentがboolean | 593/593 |
| explanationあり | 593/593 |
| sourceItemKey一意 | 593/593 |
| 正規化statement完全一致 | 0 |
| UNRESOLVED | 0 |
| reviewEligible=true | 587 |
| reviewEligible=false | 6 |

### verificationStatus

| 値 | 件数 |
|---|---:|
| CONFIRMED | 565 |
| JUDGMENT_CONFIRMED_REASON_UNVERIFIED | 10 |
| PAST_EXAM_ONLY | 12 |
| SOURCE_UNCERTAIN | 6 |

`SOURCE_UNCERTAIN` の6件だけを通常復習の既定対象から外す。データ自体は削除せず、明示的な設定で出題可能とする。

### 特殊属性

- 地方公務員法のR1条件付採用1件は、現在判定を `true`、`historicalJudgment=false`、`historicalContext="R1出題当時"`、`judgmentAsOf="2026-04-01"` とした。
- 市例規Q2・Q3・Q7・Q8・Q10・Q11・Q12・Q14・Q15・Q18の50件は `GROUP_SHARED`。共通解説を原文のまま保持し、個別解説を作っていない。
- 市例規Q6・Q8・Q12の15件は `caution="AMENDMENT"`。
- 国内情勢の問1肢2・問3肢2だけを `timeSensitive=true` とした。
- 2026-10-01施行予定の市情報公開条例改正メモは通常20問と分離されているため、593件に含めていない。

## 再現性

`python3 tools/build_study_items.py` で `data/study_items.json` と `data/extraction_report.json` を再生成する。処理末尾のassertが件数、全status、キー一意性、重複、特殊属性を検証し、不一致時は失敗する。
