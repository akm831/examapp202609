"""Compile the bundled, trusted Markdown subset using only the Python stdlib.

Only details/summary HTML is accepted. All other text is escaped, links permit
https URLs only. No user input is rendered. Run python3 tools/build_handbook.py.
"""
from pathlib import Path
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]

def inline(text):
    tokens = re.split(r'(\[[^\]]+\]\(https://[^\s)]+\)|\*\*[^*]+\*\*)', text)
    out = []
    for token in tokens:
        m = re.fullmatch(r'\[([^\]]+)\]\((https://[^\s)]+)\)', token)
        if m:
            out.append(f'<a href="{html.escape(m[2], quote=True)}" target="_blank" rel="noreferrer">{html.escape(m[1])}</a>')
        elif token.startswith('**') and token.endswith('**'):
            out.append('<strong>'+html.escape(token[2:-2])+'</strong>')
        else:
            out.append(html.escape(token))
    return ''.join(out)

def render(text):
    lines=text.splitlines(); out=[]; i=0
    while i < len(lines):
        line=lines[i].strip(); i+=1
        if not line: continue
        if line in ('<details>', '</details>'):
            out.append(line); continue
        if line.startswith('<summary>') and line.endswith('</summary>'):
            out.append('<summary>'+inline(line[9:-10])+'</summary>'); continue
        if re.fullmatch(r'-{3,}',line): out.append('<hr>'); continue
        m=re.match(r'^(#{1,6}) (.+)',line)
        if m:
            level=min(6,max(3,len(m[1])))
            out.append(f'<h{level}>{inline(m[2])}</h{level}>'); continue
        if line.startswith('|'):
            rows=[line]
            while i<len(lines) and lines[i].strip().startswith('|'):
                rows.append(lines[i].strip()); i+=1
            out.append('<div class="handbook-table" tabindex="0" role="region" aria-label="比較表"><table>')
            for n,row in enumerate(rows):
                cells=[c.strip() for c in row.strip('|').split('|')]
                if all(re.fullmatch(r':?-+:?',c) for c in cells): continue
                tag='th' if n==0 else 'td'
                out.append('<tr>'+''.join(f'<{tag}>{inline(c)}</{tag}>' for c in cells)+'</tr>')
            out.append('</table></div>'); continue
        m=re.match(r'^([-*]|\d+\.) (.*)',line)
        if m:
            ordered=m[1][-1]=='.'; tag='ol' if ordered else 'ul'
            out.append(f'<{tag}>')
            while True:
                out.append('<li>'+inline(m[2])+'</li>')
                if i>=len(lines): break
                nxt=re.match(r'^([-*]|\d+\.) (.*)',lines[i].strip())
                if not nxt or (nxt[1][-1]=='.')!=ordered: break
                m=nxt; i+=1
            out.append(f'</{tag}>'); continue
        if line.startswith('> '): out.append('<blockquote>'+inline(line[2:])+'</blockquote>'); continue
        out.append('<p>'+inline(line)+'</p>')
    return '\n'.join(out)

def build():
    text=(ROOT/'content/handbooks/shisei.md').read_text()
    # Move all chapter answers into the relevant question, hidden until requested.
    answers={}
    for m in re.finditer(r'^## 問(\d+)(?:（正答：(\d)）)?\n\n(.*?)(?=^## |^# |\Z)',text,re.M|re.S):
        answers['問'+m[1]]=m[3]
    for m in re.finditer(r'^### 総合問(\d+)（正答：(\d)）\n\n(.*?)(?=^### |^# |\Z)',text,re.M|re.S):
        answers['総合問'+m[1]]=m[3]
    text=re.sub(r'^# 章別問題の正答と全肢解説\n.*?(?=^# 11\.)','',text,flags=re.M|re.S)
    text=re.sub(r'^## 総合五択の全肢解説\n.*?(?=^# 試験前日の確認)','',text,flags=re.M|re.S)
    # The source TOC is replaced by the interactive chapter/topic index.
    text=re.sub(r'^## 目次\n.*?(?=^# 1\.)','',text,flags=re.M|re.S)
    topics=[]; chapter='使い方'; title='教材について'; lines=[]
    def flush():
        if not '\n'.join(lines).strip(): return
        key=re.match(r'(総合問\d+|問\d+)',title)
        answer=answers.get(key[1]) if key else None
        body='\n'.join(lines)
        content=render(body)
        if answer: content+='<details class="handbook-answer"><summary>正答・全肢解説を開く</summary>'+render(answer)+'</details>'
        topics.append({'id':f'topic-{len(topics)+1:02}', 'chapter':chapter,'title':title,'html':content,'searchText':title+' '+re.sub(r'<[^>]*>','',body)})
    for line in text.splitlines():
        if line.startswith('# '):
            flush(); lines=[]; chapter=line[2:]; title=chapter
        elif line.startswith('## '):
            flush(); lines=[]; title=line[3:]
        else: lines.append(line)
    flush()
    payload={'title':'市政知識テキスト','revisedAt':'2026-10-01','topics':topics}
    (ROOT/'data/shisei_handbook.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'data/shisei_handbook_topics.json').write_text(json.dumps([{'id':t['id'],'title':t['title']} for t in topics],ensure_ascii=False,indent=2)+'\n')
    assert len(answers)==20, len(answers)
    assert sum('class="handbook-answer"' in t['html'] for t in topics)==20
    print(f'{len(topics)} topics, 20 questions with hidden explanations')

if __name__=='__main__': build()
