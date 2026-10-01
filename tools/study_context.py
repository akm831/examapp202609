"""Add the missing premise without changing statements, judgments, or stable IDs."""
import re

SHISEI_TOPICS = {
    'q01': '令和8年度当初予算の会計別規模',
    'q02': '令和8年度当初予算の扶助費・建設事業費と前年度比',
    'q03': '令和8年度一般会計の歳入・歳出と前年度比',
    'q04': '令和8年度予算資料における基金・今後の財政推計',
    'q05': '2026年4月導入の札幌市宿泊税（市分と北海道分を区別）',
    'q06': '令和8年度の敬老優待乗車証と福祉除雪の制度変更',
    'q07': '物価高対策の全市民向け給付・低所得等世帯への加算・子育て応援手当の支給単位',
    'q08': '2026年10月の下水道使用料改定と、2026年6月〜9月の指定ごみ袋の臨時対応',
    'q09': '札幌健康アプリ「アルカサル」・夜間休日急病センター・救急相談等の対象と利用方法',
    'q10': '札幌市の施設整備・施設サービス（LiLiLi、新琴似スポーツ広場等）',
    'q11': '札幌市の雪対策に関する計画の期間・後継計画の策定工程',
    'q12': 'ヒグマ対策の計画・ゾーニング（2026年9月3日時点の改定案）',
    'q13': '第3次札幌市都市計画マスタープランの目標年次・人口推計・都市空間像',
    'q14': '第3次札幌市都心まちづくり計画',
    'q15': 'Well-Moving City SAPPORO 2045の対象区域・理念',
    'q16': '札幌市都市再開発方針の区域指定と法的効果',
    'urban-planning-cross': '札幌市の都市計画関連計画の横断比較',
    'q17': '市立札幌病院・下水道・火葬場・墓地の計画と年次・所管',
    'q18': '札幌市の都市計画・都心まちづくり・ヒグマ対策の横断比較',
    'q19': '令和8年度の敬老パス・健康アプリ・子育て・下水道等の施策比較',
    'q20': '札幌市の病院計画・公園施設・動物園サービス・南区複合庁舎の比較',
    'q21': '令和8年度の札幌市職員定数・機構編成',
}


def enrich_context(items, source_lines):
    contexts = {}
    for item in items:
        if item['subject'] not in ('市政知識', '市例規'):
            continue
        slug = item['sourceItemKey'].split(':')[0]
        ls = source_lines(slug)
        idx = item['sourceMetadata']['statementLine'] - 1
        if slug == 'shisei':
            topic = SHISEI_TOPICS[item['questionGroup']]
            label = '予想問題・知識確認'
            date_note = '教材更新：2026-09-09。個別の時点指定を優先し、現在の制度と区別して判定。'
            context = f'札幌市の{topic}について、次の記述の正誤を判断してください。'
        else:
            section = next(re.sub(r'^#\s+[IVX]+\s+', '', line) for line in reversed(ls[:idx]) if re.match(r'^#\s+[IVX]+\s+', line))
            if section == '横断比較':
                section = '札幌市の情報公開条例・事務取扱規程・公文書管理条例・公用文規程・オンブズマン条例・内部監査規程の横断比較'
            theme = re.sub(r'^Q\d+\s*', '', item['sourceHeading'])
            context = f'{section}における「{theme}」について、次の記述の正誤を判断してください。'
            label = '予想問題（過去問テーマ参考）' if any('過去問テーマ' in l for l in ls[max(0, idx-12):idx]) else '予想問題・横断確認'
            date_note = '教材更新：2026-09-04。教材に記載された条文・改正の扱いで判定（現行条文の再監査は未実施）。'
        info = {'questionContext': context, 'originLabel': label, 'referenceDateLabel': date_note,
                'judgmentAsOf': None, 'sourceDocument': item['sourceDocument'], 'sourceHeading': item['sourceHeading']}
        item['sourceMetadata'].update({k: v for k, v in info.items() if k not in ('judgmentAsOf', 'sourceDocument', 'sourceHeading')})
        # These source texts do not support the old blanket 2026-04-01 date.
        item['judgmentAsOf'] = None
        contexts[item['id']] = info
    return contexts
