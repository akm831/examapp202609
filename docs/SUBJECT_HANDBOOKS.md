# 科目別テキスト

ホームの「科目別テキスト」から `/texts` を開き、6科目を選択する。
既存の `/texts/shisei` と問題中の市政知識ダイアログも利用できる。
追加した5科目は科目ごとにサーバー側で読み込み、目次・検索・文字サイズ・前後移動を共通の閲覧コンポーネントで提供する。

| 科目 | URL | 原本 |
| --- | --- | --- |
| 地方自治法 | /texts/jichiho | content/handbooks/jichiho.md |
| 地方公務員法 | /texts/chikoho | content/handbooks/chikoho.md |
| 労働基準法 | /texts/rokiho | content/handbooks/rokiho.md |
| 市例規 | /texts/shireiki | content/handbooks/shireiki.md |
| 国内情勢 | /texts/domestic | content/handbooks/domestic.md |

原本はユーザー提供の統合復習テキストをそのまま保存した。法令の基準日・要確認の注記・過去問の参照は原文に従う。今回の実装で現行法や年度表記の再監査は行っていない。

再生成：`python3 tools/build_subject_handbooks.py`

信頼された原本のMarkdownを既存のエスケープ対応レンダラーでHTMLへ変換する。問題の正答・解説は開閉式にし、次の応用問題の見出しで解説を閉じる。`##` のテーマ単位で分割する。生成JSONをコミットするため、本番ビルドにPythonの追加実行は不要。
