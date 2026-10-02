"""Compile the five trusted source texts; retain source wording and hide answers."""
from pathlib import Path
import re,json
from build_handbook import render
ROOT=Path(__file__).resolve().parents[1]
BOOKS=[('jichiho','地方自治法'),('chikoho','地方公務員法'),('rokiho','労働基準法'),('shireiki','市例規'),('domestic','国内情勢')]
def build(slug,title):
    text=(ROOT/'content/handbooks'/f'{slug}.md').read_text()
    topics=[];chapter='使い方';name='教材について';lines=[]
    def flush():
        body='\n'.join(lines).strip()
        if not body:return
        # Keep subheadings with the question; close the answer before another
        # application question so that its stem remains visible.
        chunks=[];pending=[];hidden=False
        def emit():
            if pending:chunks.append(render('\n'.join(pending)));pending.clear()
        for line in body.splitlines():
            if re.match(r'^#{3,6} ',line):
                heading=re.sub(r'^#+ ','',line)
                is_answer=bool(re.search(r'正答|正誤|各肢解説|^解説$|出題当時・2026年基準',heading))
                is_question=bool(re.search(r'応用問題|行政実例補完',heading)) and not is_answer
                if hidden and is_question:
                    emit();chunks.append('</details>');hidden=False
                if is_answer and not hidden:
                    emit();chunks.append('<details class="handbook-answer"><summary>正答・解説を開く</summary>');hidden=True
            pending.append(line)
        emit()
        if hidden:chunks.append('</details>')
        topics.append(dict(id=f'{slug}-{len(topics)+1:02}',chapter=chapter,title=name,html='\n'.join(chunks),searchText=name+' '+body))
    for line in text.splitlines():
        if line.startswith('# '):
            flush();lines=[];chapter=line[2:];name=chapter
        elif line.startswith('## '):
            flush();lines=[];name=line[3:]
        else:lines.append(line)
    flush()
    assert topics
    assert all(t['html'].count('<details')==t['html'].count('</details>') for t in topics)
    (ROOT/'data'/f'{slug}_handbook.json').write_text(json.dumps(dict(title=title+'テキスト',topics=topics),ensure_ascii=False,indent=2)+'\n')
    print(slug,len(topics),'topics',sum(t['html'].count('handbook-answer') for t in topics),'answer panels')
if __name__=='__main__':
    for slug,title in BOOKS:build(slug,title)
