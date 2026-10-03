"""Extract only the two law past-exam sheets; exclude predictions and personal history."""
import hashlib,json,sys,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
path=Path(sys.argv[1]);z=zipfile.ZipFile(path)
strings=[''.join(n.itertext()) for n in ET.fromstring(z.read('xl/sharedStrings.xml'))]
sheets={}
for number,name in [(1,'地方自治法'),(2,'地方公務員法')]:
    records=[]
    for row in ET.fromstring(z.read(f'xl/worksheets/sheet{number}.xml')).findall('.//s:sheetData/s:row',NS):
        cells={}
        for cell in row.findall('s:c',NS):
            value=cell.find('s:v',NS);value=value.text if value is not None else ''
            cells[''.join(filter(str.isalpha,cell.get('r')))]=strings[int(value)] if cell.get('t')=='s' else value
        if cells.get('D') not in ('○','×') or not cells.get('C'):continue
        records.append({'row':int(row.get('r')),'yearsLabel':cells.get('A',''),'genre':cells.get('B',''),'statement':cells['C'],'judgment':cells['D']=='○','articleLabel':cells.get('F','')})
    sheets[name]=records
out=Path(__file__).resolve().parents[1]/'content/past-exams/law-db-2026.json'
out.write_text(json.dumps({'sourceFile':path.name,'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sheets':sheets},ensure_ascii=False,indent=2)+'\n')
print({k:len(v) for k,v in sheets.items()})
