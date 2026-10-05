"""Build offline assets from the same reviewed data used by the web app."""
import json, pathlib, shutil
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'mobile/android/app/src/main/assets'
OUT.mkdir(parents=True, exist_ok=True)
def load(name): return json.loads((ROOT / 'data' / name).read_text())
items = load('study_items.json')['items']
rewrites = load('shisei_rewrites.json')
for item in items:
    rewrite = rewrites.get(item['id'])
    if rewrite and rewrite['correctJudgment'] == item['correctJudgment']:
        item['statement'] = rewrite['statementText']
        item['explanation'] = rewrite['explanation']
subjects = [('地方自治法','jichiho'),('地方公務員法','chikoho'),('労働基準法','rokiho'),('市政知識','shisei'),('市例規','shireiki'),('国内情勢','domestic')]
bundle = dict(items=items, contexts=load('study_contexts.json'), history=load('exam_history.json'), choices=load('shisei_choice_questions.json')['questions'], handbooks={name:load(slug+'_handbook.json') for name,slug in subjects}, subjects=[name for name,_ in subjects])
(OUT / 'data.js').write_text('window.EXAM_DATA = '+json.dumps(bundle, ensure_ascii=False).replace('</','<\\/')+';', encoding='utf-8')
for path in (ROOT / 'mobile/web').glob('*'):
    if path.is_file() and not path.name.endswith('test.cjs'): shutil.copyfile(path, OUT / path.name)
shutil.copyfile(ROOT / 'src/app/globals.css', OUT / 'base.css')
print(f'Built {len(items)} items, {len(bundle["choices"])} choice questions, {len(subjects)} handbooks')
