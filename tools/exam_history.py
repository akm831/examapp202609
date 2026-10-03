"""Reproducible exact-text, reviewed-topic, and related-article history, kept distinct."""
import json,re,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ARTICLE=re.compile(r'(\d+)条((?:の\d+)*)')
def articles(text):
    # Ordinance article numbers belong to a different instrument.
    text=re.sub(r'施行令[^〕。\n]*','',text)
    return sorted({a+b for a,b in ARTICLE.findall(unicodedata.normalize('NFKC',text))})
def normalize(text):
    text=unicodedata.normalize('NFKC',text).replace('**','')
    text=re.sub(r'^\s*(?:H\d+|R\d+)\s*','',text)
    return re.sub(r'[\s、。，．「」『』（）()・:：]','',text)
def year_key(year):
    return int(year[1:])+(1988 if year.startswith('H') else 2018)
def summarize(records):
    years=sorted({y for r in records for y in re.findall(r'H\d+|R\d+',r['yearsLabel'])},key=year_key)
    return {'recordCount':len(records),'yearCount':len(years),'years':years,'latestYear':years[-1] if years else None,
            'yearRecordCount':sum(len(set(re.findall(r'H\d+|R\d+',r['yearsLabel']))) for r in records),
            'undatedRecordCount':sum(not re.search(r'H\d+|R\d+',r['yearsLabel']) for r in records),
            'rows':[{'row':r['row'],'years':r['yearsLabel']} for r in records]}
def apply_exam_history(items):
    db=json.loads((ROOT/'content/past-exams/law-db-2026.json').read_text())
    drafts=json.loads((ROOT/'content/questions/council-supplement.json').read_text())
    history={};stats={}
    for item in items:
        subject=item['subject']
        if subject not in db['sheets']:continue
        records=db['sheets'][subject]
        exact=[r for r in records if normalize(r['statement'])==normalize(item['statement'])]
        # Do not reuse a DB judgment: historical amendments and source errors exist.
        refs=articles(item['explanation'])
        draft=None
        if item['questionGroup']=='議会補完2026':
            draft=drafts[item['sourceItemNumber']-1];refs=draft['articles']
        related=[r for r in records if set(refs)&set(articles(r['articleLabel']))]
        topic=[r for r in records if draft and r['row'] in draft['pastExamRows']]
        entry={'sourceFile':db['sourceFile'],'sheet':subject,'articleLabels':[a+'条' if 'の' not in a else a.split('の',1)[0]+'条の'+a.split('の',1)[1] for a in refs],
               'exact':summarize(exact),'topic':summarize(topic) if draft else None,'relatedArticles':summarize(related),
               'judgmentAsOf':item['judgmentAsOf'], 'status':'MATCHED' if exact or topic or related else 'UNCONFIRMED'}
        item['sourceMetadata']['pastExamHistoryReference']='exam_history.json:'+item['id']
        history[item['id']]=entry
        bucket=stats.setdefault(subject,{'items':0,'exact':0,'topic':0,'relatedArticles':0,'unconfirmed':0})
        bucket['items']+=1;bucket['exact']+=bool(exact);bucket['topic']+=bool(topic);bucket['relatedArticles']+=bool(related);bucket['unconfirmed']+=entry['status']=='UNCONFIRMED'
    (ROOT/'data/exam_history.json').write_text(json.dumps(history,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'data/exam_history_report.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2)+'\n')
    return history

def add_council_questions(items,base_item):
    drafts=json.loads((ROOT/'content/questions/council-supplement.json').read_text())
    for draft in drafts:
        n=draft['number']
        item=base_item('local-government-law','議会補完2026',draft['topic'],n,
                       draft['statement'],n,
                       draft['correctJudgment'],draft['explanation']+' 根拠：地方自治法'+ '・'.join(a+'条' if 'の' not in a else a.split('の',1)[0]+'条の'+a.split('の',1)[1] for a in draft['articles'])+'。')
        # Keep the reviewed draft verbatim; common premise is supplied by the context.
        item['statement']=draft['statement']
        item['judgmentAsOf']='2026-10-03'
        item['judgmentSource']='OFFICIAL_LAW_REVIEWED'
        item['sourceDocument']='council-supplement.json';item['sourceReference']='地方自治法 '+ '・'.join(a+'条' if 'の' not in a else a.split('の',1)[0]+'条の'+a.split('の',1)[1] for a in draft['articles'])
        item['sourceMetadata']['lawUrl']='https://laws.e-gov.go.jp/law/322AC0000000067'
        items.append(item)
