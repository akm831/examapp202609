# Codex向け実装仕様

## 目的と入力

`data/study_items.json` をアプリの初期seedとして一度だけ投入する。`sources/` は監査根拠であり、実行時に読み直したりDBと同期したりしない。

## 必須動作

1. `schemaVersion` が対応版であること、`itemCount` と配列長が593であることを検査する。
2. `sourceItemKey` で冪等upsertする。既存の回答履歴を保つため、同じキーに対して別IDを新規作成しない。
3. 通常の復習対象は `active && reviewEligible`。既定件数は587件。
4. 「要確認問題も出題する」が有効な場合だけ、6件の `SOURCE_UNCERTAIN` を加える。
5. `GROUP_SHARED` は個別解説として装わず、問題群共通の解説として表示する。
6. `caution=AMENDMENT` は不確実判定ではなく改正注意として表示する。
7. `timeSensitive=true` は試験直前の差分確認対象として表示する。
8. `historicalJudgment` がある場合、現在判定を正答として採点し、過去時点の判定と文脈を補足表示する。

## 禁止事項

- 欠落していると判断した解説や理由を生成して補完しない。
- statement本文から正誤を再推論しない。
- 同文・類似文を自動統合しない。
- `SOURCE_UNCERTAIN` を削除しない、また既定で通常復習へ混ぜない。
- 施行予定改正メモを既存593件へ自動追加しない。

## 受入条件

- seed投入後の総数593、通常復習対象587。
- status集計が565 / 10 / 12 / 6。
- `GROUP_SHARED` 50、`AMENDMENT` 15、`timeSensitive` 2。
- sourceItemKey重複0、statement正規化完全一致0、正誤欠損0。
- 同じseedを2回投入しても行数と回答履歴参照が変化しない。
