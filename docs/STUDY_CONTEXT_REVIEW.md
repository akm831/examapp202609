# 市政知識・市例規の文脈と本番形式（2026-10-01）

## 変更後の学習

- ○×演習・今日の復習・高速周回で、市政知識110肢・市例規100肢の前に施策／条例・テーマ・対象時点を表示する。
- 593肢のID・sourceItemKey・問題文・正誤を維持。既存の回答履歴、定着判定、未同期キューは同じIDを使用する。
- 市政知識・市例規の全肢に機械的に設定されていた2026-04-01を除去。教材更新日と個別の時点指定を表示する。教材更新日を、全事実を再確認した日とは扱わない。
- 市例規の「実過去問テーマ」は実過去問の原文ではないため、予想問題として表示する。現行法への全面的な再監査はこの変更に含めない。
- JSON／CSV回答ログにもquestionContext・referenceDateLabelを加え、選択肢だけのログを補う。

## デプロイ

`data/study_contexts.json`をIDで参照するため、既存DBへのseed実行前から問題の前提を表示できる。DBスキーマの変更はない。明示的にseedを実行する場合は、更新済み`data/study_items.json`のメタデータと判定日をupsertする。IDや履歴は削除しない。

ホームの「市政知識・本番形式」から`/study/shisei-choice`へ移動する。６問の予想問題と２問の添付実過去問を区別し、５肢から１つを選択、全肢解説と公式根拠リンクを表示する。

５肢択一の回答はログインユーザー別のlocalStorageに保存し、独立したJSON出力が可能。ブラウザ／端末をまたぐ同期は行わず、既存○×の正答率や復習スケジュールに５肢分の推定回答を追加しない。端末保存に失敗した場合は選択を保持して再試行できる。

## 過去問の時点

添付`03r7shisei.pdf`と`03r8shisei.pdf`は１ページの原文と掲載正答（５、１）を保持し、空白・改行のみ整形する。出題年度はPDF本文に明記されていない。ファイル名から令和７・８年と断定しない。

- 前者は2023年11月のあいまるさっぽろ開設、2024年5月のASEANTA関連事業等から本文の基準年を2024年と推定。
- 後者は2024年12月の第20回世界冬の都市市長会議、2025年2〜3月のごみ袋実証等から本文の基準年を2025年と推定。
- 敬老パスの原則75歳への変更は2026年4月。2025年基準の原文「今年４月」を2026年の現在制度へ読み替えて掲載正答を変更しない。
- 現在の公式説明が当時の詳細を証明しない箇所では、当時の掲載正答と、確認できた誤りの箇所を分けて説明する。

## 予想問題の作問方針

６問とも異なる施策を組み合わせる。数字だけの５肢比較ではなく、施策の説明・対象・時期・所在・主体・状態を含める。誤答肢は原則１属性を変更し、全肢に誤りの箇所と修正内容を添える。公式資料を2026-10-01に確認し、判定基準日を明示する。頻出領域の網羅を保証する問題集ではなく、本番形式の最初の追加セットである。

主な公式資料：

- [敬老優待乗車証制度の見直し](https://www.city.sapporo.jp/koreifukushi/ikigai/ikigai6.html)
- [札幌市宿泊税の手続き](https://www.city.sapporo.jp/citytax/shukuhakuzei/tetsuzuki.html)
- [健康アプリ・2026-03-11会見](https://www.city.sapporo.jp/city/mayor/interview/text/2026/0311.html)
- [こども本の森の開館](https://www.city.sapporo.jp/toshokan/guide/sisin/kodomohonnomori.html)
- [LiLiLi・2025-10-02会見](https://www.city.sapporo.jp/city/mayor/interview/text/2025/1002.html)
- [暑さ対策・2026-05-25会見](https://www.city.sapporo.jp/city/mayor/interview/text/2026/0525.html)
- [指定ごみ袋の臨時対応](https://www.city.sapporo.jp/seiso/yuryoka/shiteifukuro_rinzitaiou.html)
- [第21回会議・2026-09-25会見](https://www.city.sapporo.jp/city/mayor/interview/text/2026/0925.html)
- [MICE・2024年開催実績](https://www.city.sapporo.jp/keizai/kanko/aboutmice.html)
- [2025年ごみ袋実証](https://www.city.sapporo.jp/seiso/topics/reji/sakugen-jikken.html)

## 再生成と検証

６科目の添付教材を既存の`tools/build_study_items.py`が期待するファイル名で`sources/`へ配置して実行する。教材原本は編集しない。

```sh
python3 tools/build_study_items.py
python3 tools/build_shisei_choices.py --pdf-dir /path/to/attached/pdfs
npm run check
npm test
npm run build
```

文脈210件の網羅、条例・年度の表示、他科目の不変更、８問の構造・掲載正答・推定年表示・端末記録検証をテストする。全593肢の元データとの照合では変更キーが`judgmentAsOf`と`sourceMetadata`のみであることを確認する。

検証環境には`/proc`がなくNodeの`uv_resident_set_memory`がENOENTになるため、ローカル検証時だけV8ヒープ情報でメモリ計測を代替するプリロードを使用した。これはリポジトリ／本番コードには含めない。ビルド時のDATABASE_URLは接続不能な検証用値を使用し、本番DBには接続・書込みを行っていない。
