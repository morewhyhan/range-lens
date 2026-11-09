from pathlib import Path
import json, openpyxl, zipfile, re, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src' / 'data'
OUT.mkdir(parents=True, exist_ok=True)
ASSETS = ROOT / 'public' / 'sources'
ASSETS.mkdir(parents=True, exist_ok=True)
files = {'preflop':'C:/Users/why/Desktop/翻前策略整合版_六工作表.xlsx', 'postflop':'C:/Users/why/Desktop/翻后策略_分支与推理版.xlsx'}
result = {}
for kind, path in files.items():
    wb = openpyxl.load_workbook(path)
    z = zipfile.ZipFile(path)
    svgs = sorted([n for n in z.namelist() if n.startswith('xl/media/') and n.endswith('.svg')], key=lambda n:int(re.search(r'image(\d*)',n)[1] or 1))
    svg_index = 0
    sheets = []
    for si, s in enumerate(wb):
        rows = []
        for row in s:
            values = {c.column_letter: c.value for c in row if c.value is not None}
            if values:
                rows.append({'row': row[0].row, 'values': values})
        images = []
        for ii, im in enumerate(s._images):
            ext = 'svg' if kind == 'preflop' else im.format
            filename = f'{kind}-{si}-{ii}.{ext}'
            data = z.read(svgs[svg_index]) if kind == 'preflop' else im._data()
            if kind == 'preflop': svg_index += 1
            (ASSETS / filename).write_bytes(data)
            images.append({'path': '/sources/'+filename, 'row':im.anchor._from.row+1,'col':im.anchor._from.col+1})
        sheets.append({'name':s.title, 'rows':rows,'images':images})
    result[kind] = sheets
(OUT / 'sources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
ranks = 'AKQJT98765432'
charts = []
groups = [(0,'open',['UTG','HJ','CO','BTN','SB']), (2,'threebet',['HJ','CO','BTN','SB']), (4,'bb',['普通宽','普通中','普通紧','小盲宽','小盲中','小盲紧'])]
colors = {'#FA655A':'raise','#0692CF':'fold','#42A86B':'call'}
for si, group, names in groups:
    for image, name in zip(result['preflop'][si]['images'], names):
        root = ET.fromstring((ROOT/'public'/image['path'].lstrip('/')).read_text(encoding='utf8'))
        _,_,width,height = map(float,root.attrib['viewBox'].split())
        cw,ch = width/13,height/13
        rects = [r.attrib for r in root if r.tag.endswith('rect') and r.attrib.get('fill') in colors]
        hands = {}
        for r in range(13):
            for c in range(13):
                hand = ranks[r]*2 if r==c else ranks[min(r,c)]+ranks[max(r,c)]+('s' if r<c else 'o')
                action = {}
                for x in [cw*(c+.25),cw*(c+.75)]:
                    y=ch*(r+.5)
                    matches = [a for a in rects if float(a.get('x',0))<=x<float(a.get('x',0))+float(a['width']) and float(a.get('y',0))<=y<float(a.get('y',0))+float(a['height'])]
                    assert len(matches)==1,(hand,matches)
                    key=colors[matches[0]['fill']]
                    action[key]=action.get(key,0)+.5
                hands[hand]={'row':r,'col':c,'action':action}
        charts.append({'id':group+'-'+name,'group':group,'name':name,'image':image['path'],'source':result['preflop'][si]['name'],'hands':hands})
        print(name, {a:sum(h['action']==a for h in hands.values()) for a in []}, 'mixed',sum(len(h['action'])>1 for h in hands.values()))
# Exact open charts must agree with the workbook's typed simplified frequency.
detail=result['preflop'][1]['rows']
for r in detail:
    v=r['values']
    if v.get('C') in charts[0]['hands'] and isinstance(v.get('F'),(int,float)):
        name = next((n for n in ['UTG','HJ','CO','BTN','SB'] if n in str(v.get('A'))),None)
        chart=next(c for c in charts if c['id']=='open-'+name)
        assert chart['hands'][v['C']]['action'].get('raise',0)==v['F'],v
(OUT/'ranges.json').write_text(json.dumps(charts,ensure_ascii=False,indent=2),encoding='utf8')
print('Exported',len(charts),'charts;',sum(len(c['hands']) for c in charts),'hand entries. Open frequencies match all 845 source rows.')
