#!/usr/bin/env python3
"""Build six original cross-policy questions and preserve two user-supplied exams.

Usage: python3 tools/build_shisei_choices.py --pdf-dir /path/to/attached/pdfs
No source PDF is edited. Only extraction whitespace is normalized.
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROMPT = '札幌市の施策・事業に関する次の記述のうち、最も妥当なものはどれか。'
SOURCES = {
    'tax': ('札幌市宿泊税の手続き（特別徴収義務者）', 'https://www.city.sapporo.jp/citytax/shukuhakuzei/tetsuzuki.html'),
    'pass': ('敬老優待乗車証制度の見直しについて', 'https://www.city.sapporo.jp/koreifukushi/ikigai/ikigai6.html'),
    'app': ('令和7年度第18回定例市長記者会見記録（2026-03-11）', 'https://www.city.sapporo.jp/city/mayor/interview/text/2026/0311.html'),
    'forest': ('令和8年8月1日「こども本の森 札幌・北大」がオープンしました', 'https://www.city.sapporo.jp/toshokan/guide/sisin/kodomohonnomori.html'),
    'park': ('令和7年度第10回定例市長記者会見記録（2025-10-02）', 'https://www.city.sapporo.jp/city/mayor/interview/text/2025/1002.html'),
    'cool': ('令和8年度第3回定例市長記者会見記録（2026-05-25）', 'https://www.city.sapporo.jp/city/mayor/interview/text/2026/0525.html'),
    'bag': ('家庭用指定ごみ袋に関する臨時的対応について', 'https://www.city.sapporo.jp/seiso/yuryoka/shiteifukuro_rinzitaiou.html'),
    'library': ('札幌市図書・情報館', 'https://www.city.sapporo.jp/toshokan/infolibrary/'),
    'winter': ('令和8年度第10回定例市長記者会見記録（2026-09-25）', 'https://www.city.sapporo.jp/city/mayor/interview/text/2026/0925.html'),
    'mice': ('MICEについて（2024年の開催実績）', 'https://www.city.sapporo.jp/keizai/kanko/aboutmice.html'),
    'trial': ('指定ごみ袋を活用したレジ袋削減の実証実験', 'https://www.city.sapporo.jp/seiso/topics/reji/sakugen-jikken.html'),
    'vaccine': ('令和7年度高齢者帯状疱疹ワクチン定期接種のお知らせ', 'https://www.city.sapporo.jp/hokenjo/f1kansen/documents/taijooshirase2025.pdf'),
    'cool2025': ('令和7年度第5回定例市長記者会見記録（2025-06-23）', 'https://www.city.sapporo.jp/city/mayor/interview/text/2025/0623.html'),
    'animal': ('令和5年度第10回定例市長記者会見記録（2023-10-03）', 'https://www.city.sapporo.jp/city/mayor/interview/text/2023/1003.html'),
    'town': ('令和5年度第18回定例市長記者会見記録（2024-03-13）', 'https://www.city.sapporo.jp/city/mayor/interview/text/2024/0313.html'),
    'cobra': ('消防局からのお知らせとお願い・COBRA', 'https://www.city.sapporo.jp/shobo/koho/oshirase/'),
    'library2023': ('リニューアル内容のお知らせ（2023-10-06）', 'https://www.sapporo-community-plaza.jp/news.php?num=1175'),
}


def option(text, explanation, source):
    title, url = SOURCES[source]
    return {'text': text, 'explanation': explanation, 'source': title, 'sourceUrl': url}


def predicted():
    # Each row has one correct statement and four deliberate, single-attribute errors.
    rows = [
        (1, [
            ('札幌市宿泊税は、2026年4月1日以後の宿泊を対象として導入され、宿泊者が納税義務者となる。宿泊施設の経営者は特別徴収義務者として、宿泊料金と併せて税を徴収し、市へ申告・納入する。', '導入日、納税義務者、徴収・申告納入の主体が一致する。宿泊者と施設経営者の役割を分けて押さえる。', 'tax'),
            ('札幌健康アプリ「アルカサル」は、日々の歩行や健康づくり活動を通じてポイントを獲得できる仕組みで、2026年4月1日から本格運用された。アプリを利用できる市民は75歳以上に限られる。', '誤りは利用対象年齢。利用対象は40歳以上の札幌市民であり、75歳以上に限定されない。', 'app'),
            ('子どもが本と自由に触れ合える場を目指す「こども本の森 札幌・北大」は、2026年8月1日に開館した子ども向け図書館で、札幌市中央図書館の館内に設置された。', '誤りは設置場所。北海道大学構内に開館した施設であり、中央図書館内のコーナーではない。', 'forest'),
            ('百合が原公園の公園交流施設「LiLiLi」は、札幌市初のPark-PFI事業による施設として設置され、2026年10月25日にオープンした。', '誤りは開業年。オープン日は2025年10月25日。2026年ではない。', 'park'),
            ('2026年9月、札幌市は第21回世界冬の都市市長会議に参加し、都市空間のコンセプトに関する事例などを発表した。この会議の開催都市は日本の札幌市であった。', '誤りは開催都市。第21回はフィンランドのロヴァニエミ市。2024年の札幌開催の第20回と区別する。', 'winter'),
        ]),
        (3, [
            ('札幌市宿泊税は、宿泊施設で宿泊料金と併せて徴収する仕組みである。納税義務者は宿泊施設の経営者であり、宿泊者から税を受け取って市へ納入する。', '誤りは納税義務者。納税義務者は宿泊者、施設経営者は特別徴収義務者。', 'tax'),
            ('敬老優待乗車証の交付対象年齢は、2026年4月から原則75歳以上へ変更された。この変更により、従来から敬老パスを保有していた75歳未満の市民も、例外なく利用できなくなった。', '誤りは既存利用者の扱い。既存保有者等には経過措置があり、一律に利用不可ではない。', 'pass'),
            ('札幌健康アプリ「アルカサル」は、40歳以上の札幌市民を対象として、2026年4月1日に本格運用を開始した。歩行や健康づくり活動への参加等をポイントにつなげ、健康行動の習慣化を図る。', '対象・本格運用の開始日・施策の目的が一致する。利用対象と特典の交換条件は別に考える。', 'app'),
            ('「こども本の森 札幌・北大」は、子どもが読書の楽しさに気づき、豊かな感性や好奇心を育む場となることを目指して整備された。北海道大学構内で2026年4月1日に開館した。', '誤りは開館日。開館は2026年8月1日。健康アプリ等の4月開始と混同しない。', 'forest'),
            ('札幌市図書・情報館は、仕事や暮らしの課題解決に役立つ情報を提供する図書館であり、いつでも必要な本を読めるよう、館内の図書を一般の利用者へ貸し出している。', '誤りは貸出の有無。図書・情報館の館内図書は貸出しない。館内でいつでも読めるようにするための運用である。', 'library'),
        ]),
        (5, [
            ('「こども本の森 札幌・北大」は、子ども向け図書館として2026年8月1日に開館した施設であり、札幌市北区の百合が原公園内に設置されている。', '誤りは場所。北海道大学構内。百合が原公園の交流施設はLiLiLi。', 'forest'),
            ('札幌市のクーリングシェルターは、市民等が夏の暑さを避けるための施設である。2026年度の指定に当たっては、市有施設のみを対象とし、民間施設の協力は受けていない。', '誤りは指定対象。2026年度も民間事業者の協力を得て指定している。', 'cool'),
            ('指定ごみ袋の供給不足に対応するため、札幌市は2026年6月15日から、市販の透明・半透明の袋等でも燃やせるごみ・燃やせないごみを排出できるようにした。この対応は期限を設けない恒久制度として導入された。', '誤りは制度の状態。2026年6月15日〜9月30日の臨時対応であり、恒久制度ではない。10月1日収集分から指定ごみ袋を使用する。', 'bag'),
            ('「アルカサル」は、健康づくり活動を見える化し、歩行等の取組への参加に応じてポイントを付与するアプリとして、2026年4月から本格運用された。利用対象は札幌市外に住む40歳以上の人に限られる。', '誤りは居住要件。対象は40歳以上の札幌市民。健康づくりの内容だけでなく利用者の条件まで読む。', 'app'),
            ('2026年8月1日、北海道大学構内に子ども向け図書館「こども本の森 札幌・北大」が開館した。子どもが自由に本と触れ合い、読書の楽しさや豊かな感性・好奇心を育む場を目指している。', '名称・場所・開館日・目的が一致する。中央図書館や公園交流施設とは別の施設。', 'forest'),
        ]),
        (2, [
            ('札幌健康アプリ「アルカサル」は、日々の健康づくり活動を見える化し、活動への参加等に応じてポイントを付与する仕組みである。2026年4月から本格運用され、利用対象年齢の下限は30歳である。', '誤りは対象年齢の下限。対象は40歳以上。', 'app'),
            ('百合が原公園の公園交流施設「LiLiLi」は、札幌市初のPark-PFI事業による施設で、2025年10月25日にオープンした。民間の事業者が設置・運営を担う。', '施設名、所在公園、事業方式、開業日、設置運営主体が一致する。', 'park'),
            ('2026年4月導入の札幌市宿泊税は、宿泊者から宿泊施設を通じて徴収する。ただし、導入前に予約を済ませた場合は、導入後に宿泊しても、その宿泊には課税されない。', '誤りは課税を判断する時点。予約日ではなく宿泊日で判断する。2026年4月1日以後の宿泊は導入前の予約でも対象。', 'tax'),
            ('敬老優待乗車証の対象年齢は2026年4月から原則75歳以上となった。制度見直し前から敬老パスを保有する人についても、継続利用のため全員に再申請が義務付けられた。', '誤りは再申請の要否。既存保有者は、そのまま使用でき、再申請不要。', 'pass'),
            ('札幌市図書・情報館では、働く世代の仕事や暮らしの課題解決に役立つ本を館内で利用できる。また、館内図書はすべて通常の貸出対象となり、各自が自宅へ持ち帰って読める。', '誤りは貸出。館内の図書は貸出しない。予約本の受取り等と館内図書の貸出は区別する。', 'library'),
        ]),
        (4, [
            ('第21回世界冬の都市市長会議は、2026年9月に開かれ、札幌市も参加した。会場となった都市は、フィンランドではなく日本の札幌市であった。', '誤りは開催都市。フィンランドのロヴァニエミ市。回次と開催地を一組で覚える。', 'winter'),
            ('「LiLiLi」は、2025年10月25日にオープンした札幌市初のPark-PFI事業による公園交流施設である。この施設は新琴似スポーツ広場内に設置されている。', '誤りは所在。百合が原公園の施設。新琴似スポーツ広場と入れ替えない。', 'park'),
            ('札幌健康アプリ「アルカサル」は40歳以上の札幌市民を対象とし、健康行動の習慣化を図る。2026年10月1日から本格運用を開始した。', '誤りは本格運用開始日。2026年4月1日。', 'app'),
            ('札幌市は、2026年度も市民等が夏の暑さを避けるためのクーリングシェルターを指定している。民間事業者にも協力を求め、冷房設備を備えた場所を利用できるようにしている。', '民間事業者の協力を得た暑さ対策である点が正しい。指定を市有施設だけに限定する説明は誤り。', 'cool'),
            ('札幌市図書・情報館では、最新の情報をいつでも館内で読めるよう、仕事や暮らし等に関する資料をそろえている。この目的のため、館内図書を原則としてすべて貸し出している。', '誤りは運用。いつでも館内で読めるよう、館内図書は貸出しない。', 'library'),
        ]),
        (1, [
            ('札幌市の指定ごみ袋の供給不足に伴う、市販の透明・半透明の袋等による排出を認める臨時対応は、2026年9月30日収集分で終了した。10月1日収集分から、燃やせるごみ・燃やせないごみには指定ごみ袋を使用する。', '臨時対応の終了時点と通常の取扱いへの復帰が正しい。実証実験や恒久的な制度変更と区別する。', 'bag'),
            ('札幌市宿泊税では宿泊者が納税義務者、施設経営者が特別徴収義務者となる。この税は2026年10月1日以後の宿泊を対象として導入された。', '誤りは導入日。2026年4月1日以後の宿泊が対象。', 'tax'),
            ('「こども本の森 札幌・北大」は2026年8月1日に開館した子ども向け図書館であり、市立札幌病院の敷地内に設置された。', '誤りは場所。北海道大学構内に設置された。', 'forest'),
            ('札幌健康アプリ「アルカサル」は2026年4月1日に本格運用を開始し、歩行等の健康づくり活動への参加に応じたポイントを付与する。アプリの利用対象は65歳以上の札幌市民に限られる。', '誤りは対象年齢。40歳以上。65歳以上の一定対象者に関する特典条件と利用対象を混同しない。', 'app'),
            ('2026年4月から敬老優待乗車証の交付対象年齢は原則75歳以上に引き上げられた。制度改正前から敬老パスを所有する75歳未満の人には、経過措置が一切適用されない。', '誤りは経過措置。既存保有者等に経過措置がある。', 'pass'),
        ]),
    ]
    return [{'id': f'shisei-cross-2026-{n:02}', 'sourceType': 'PREDICTED', 'title': f'施策・事業の横断比較 {n}', 'prompt': PROMPT,
             'context': '令和8年度対策。各肢に明記された年月・対象の説明を、2026年10月1日時点で判断してください。',
             'referenceDate': '判定基準：2026-10-01／公式資料確認：2026-10-01', 'correctChoice': correct,
             'choices': [option(*args) for args in choices]} for n, (correct, choices) in enumerate(rows, 1)]


def past_questions(pdf_dir):
    specs = [
        ('03r7shisei.pdf', 2024, 5, [
            ('認証名が誤り。あいまるさっぽろは市有施設初のZEB Ready。HACCPは食品衛生に関する管理方式である。', 'animal'),
            ('シンポジウムのテーマのうち「自由貿易」が誤り。実際は観光・MICEを中心とするテーマ。2024年5月の関連事業である。', 'mice'),
            ('制度名と対象業種が誤り。2024年4月開始の「さっぽろマチトモパートナー企業認定制度」は、不動産事業者を対象とする。', 'town'),
            ('「全区役所への配備を令和5年度中に完了」が誤り。消防の水槽隊への配置であり、参照資料では令和7年度までに全51隊へ配置する予定とされている。放水の説明と配備先・時期を分けて判断する。', 'cobra'),
            ('添付PDFの掲載正答は5。図書・情報館の2023年10月のリニューアルではオンライン会議に対応する席が設けられた。PAPA MAMA BOOKSは中央図書館の育児書・0〜3歳向け絵本のコーナー。日付は添付原文の説明を保持する。', 'library2023'),
        ]),
        ('03r8shisei.pdf', 2025, 1, [
            ('添付PDFの掲載正答は1。第20回は2024年12月に札幌で開催された会議。開催地・回次・テーマが一致する。2026年の第21回と区別する。', 'mice'),
            ('誤りは袋の容量。2025年2〜3月の実証実験で1枚単位で販売したのは10L・20Lであり、5L・10Lではない。', 'trial'),
            ('70歳以上に限定されず、全員無料でもない。2025年度の対象・経過措置・自己負担免除は令和7年度の説明書で確認する。', 'vaccine'),
            ('誤りは「今年4月」の時点。本文を2025年基準として読むと、年齢引上げは翌2026年4月。2026年の現在制度に置き換えて正答を変更しない。', 'pass'),
            ('「市有施設のみ」が誤り。2025年度も民間事業者の協力によるクーリングシェルターがある。', 'cool2025'),
        ]),
    ]
    result = []
    for filename, year, answer, explanations in specs:
        text = subprocess.check_output(['pdftotext', '-layout', str(pdf_dir / filename), '-'], text=True)
        parts = re.split(r'^\s*([１-５])．', text, flags=re.M)
        choices = []
        for n in range(1, 6):
            i = parts.index(str(n).translate(str.maketrans('12345', '１２３４５')))
            statement = re.split(r'正答[：:]', parts[i + 1])[0]
            statement = re.sub(r'\s+', '', statement).strip()
            choices.append(option(statement, *explanations[n-1]))
        assert int(re.search(r'正答[：:]\s*(\d)', text).group(1)) == answer
        result.append({'id': f'attached-{filename[:-4]}', 'sourceType': 'PAST_EXAM', 'title': f'添付実過去問：{filename}', 'prompt': PROMPT,
                       'context': f'原文とPDF掲載正答を保持（改行・空白のみ整形）。本文中の「今年」は{year}年、「昨年」は{year-1}年と推定して読む。これは本文の出来事と公式資料からの推定で、出題年度の確定情報ではありません。現在制度で再採点しません。',
                       'referenceDate': f'本文の基準年：{year}年（推定）／出題年度は未確定／原典：{filename} 1ページ',
                       'correctChoice': answer, 'choices': choices})
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pdf-dir', type=Path, required=True)
    args = parser.parse_args()
    questions = predicted() + past_questions(args.pdf_dir)
    assert len(questions) == 8
    assert len({q['id'] for q in questions}) == 8
    assert all(len(q['choices']) == 5 and 1 <= q['correctChoice'] <= 5 for q in questions)
    (ROOT / 'data/shisei_choice_questions.json').write_text(json.dumps({'schemaVersion': '1.0.0', 'questionCount': len(questions), 'questions': questions}, ensure_ascii=False, indent=2) + '\n')
    print('Built 6 original predicted questions and 2 original attached exams.')


if __name__ == '__main__':
    main()
