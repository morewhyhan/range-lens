from pathlib import Path
import hashlib, json, re, sys, zipfile
sys.stdout.reconfigure(encoding='utf-8')
import openpyxl

folder = Path('C:/Users/why/Desktop/笔记 Nevir')
report = []
for name in ['翻前GTO_整理版.xlsx', '翻前策略整合版_六工作表.xlsx', '翻后策略_分支与推理版.xlsx']:
    file = folder / name
    book = openpyxl.load_workbook(file, data_only=False)
    sheets = []
    for sheet in book:
        hits = []
        for row in sheet.iter_rows():
            texts = [f'{cell.coordinate}: {str(cell.value)[:350]}' for cell in row if cell.value is not None]
            text = ' | '.join(texts)
            if re.search(r'3bet|3.?bet|跟注范围|应对3|面对3', text, re.I):
                hits.append(text[:1100])
        wps_images = [cell.coordinate for row in sheet for cell in row if isinstance(cell.value, str) and 'DISPIMG(' in cell.value]
        sheets.append({'name': sheet.title, 'rows': sheet.max_row, 'drawingImages': len(sheet._images), 'wpsCellImageCells': wps_images, 'matches': hits[:30]})
    with zipfile.ZipFile(file) as archive:
        embedded = [p for p in archive.namelist() if p.startswith('xl/media/') and not p.endswith('/')]
    report.append({'file': str(file), 'sha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'embeddedMedia': embedded, 'sheets': sheets})
out = Path('research/postflop-pilot/threebet-source-audit.json')
out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
print(json.dumps({'output': str(out), 'workbooks': len(report)}, ensure_ascii=False))
