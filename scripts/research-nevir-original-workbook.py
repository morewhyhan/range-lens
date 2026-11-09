"""Read-only audit. Run with the bundled Python from load_workspace_dependencies.

Artifact Tool import was also inspected in this research run. It exposed the cells
but not WPS DISPIMG pictures; OOXML extraction below recovers that missing surface.
No workbook is exported or modified.
"""
import hashlib, json, pathlib, posixpath, re, sys, zipfile
import xml.etree.ElementTree as E
sys.stdout.reconfigure(encoding='utf-8')
source=pathlib.Path('C:/Users/why/Desktop/笔记 Nevir/翻前GTO_整理版.xlsx')
output=pathlib.Path('research/nevir-system/original-workbook-audit.json')
preview=pathlib.Path('.build-cache/nevir-workbook-audit/media')
reviewed_hash='80c35c635edd62938c79dc5b8eb4e52d72c096e68760975dab6a599af4b95cef'
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
before=hashlib.sha256(source.read_bytes()).hexdigest()
with zipfile.ZipFile(source) as z:
    parts=z.namelist()
    ss=[''.join(si.itertext()) for si in E.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)]
    relationships={r.get('Id'):r.get('Target') for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    sheets=[]
    for sh in E.fromstring(z.read('xl/workbook.xml')).find('s:sheets',ns):
        target=relationships[sh.get('{'+ns['r']+'}id')]
        part=target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join('xl',target))
        tree=E.fromstring(z.read(part));cells=[]
        for c in tree.findall('.//s:sheetData/s:row/s:c',ns):
            v=c.find('s:v',ns);f=c.find('s:f',ns);kind=c.get('t')
            value=ss[int(v.text)] if kind=='s' and v is not None else ''.join(t.text or '' for t in c.findall('.//s:t',ns)) if kind=='inlineStr' else v.text if v is not None else None
            if value is not None or f is not None:cells.append({'cell':c.get('r'),'value':value,'formula':None if f is None else f.text,'style':c.get('s')})
        sheets.append({'name':sh.get('name'),'visibility':sh.get('state','visible'),'part':part,'dimension':tree.find('s:dimension',ns).get('ref'),'cells':cells})
    media=[]
    for part in parts:
        if part.startswith('xl/media/') and not part.endswith('/'):
            data=z.read(part);preview.mkdir(parents=True,exist_ok=True);dest=preview/pathlib.PurePosixPath(part).name;dest.write_bytes(data)
            media.append({'part':part,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    image_rels={r.get('Id'):r.get('Target') for r in E.fromstring(z.read('xl/_rels/cellimages.xml.rels'))}
    images=[]
    for pic in E.fromstring(z.read('xl/cellimages.xml')).iter():
        if pic.tag.split('}')[-1]!='pic':continue
        prop=next(p for p in pic.iter() if p.tag.split('}')[-1]=='cNvPr')
        blip=next(p for p in pic.iter() if p.tag.split('}')[-1]=='blip')
        target=image_rels[blip.get('{'+ns['r']+'}embed')]
        part=target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join('xl',target))
        refs=[{'sheet':sh['name'],'cell':c['cell']} for sh in sheets for c in sh['cells'] if prop.get('name') in (c['formula'] or '')]
        assert len(refs)==1
        images.append({'wpsId':prop.get('name'),'part':part,'refs':refs})

observed={
 'image1.png':('UTG','CO',2,6.5), 'image2.png':('UTG','BTN',2,7.5),
 'image3.png':('UTG','SB',2,10), 'image4.png':('HJ','CO',2,6.5),
 'image5.png':('HJ','BTN',2,7.5), 'image6.png':('HJ','SB',None,None),
 'image7.png':('CO','BTN',2.3,7.5), 'image8.png':('CO','SB',2.3,11.5),
 'image9.png':('BTN','SB',2.5,12), 'image10.png':('UTG','HJ',2,6.5)
}
if before==reviewed_hash:
    for image in images:
        name=pathlib.PurePosixPath(image['part']).name
        opener,responder,open_size,raise_size=observed[name]
        image['review']={'opener':opener,'responder':responder,'openToBB':open_size,'threebetToBB':raise_size,'players':6 if open_size else None,'initialDepthBB':100 if open_size else None,'scope':'selected responder facing an open, before making a 3bet; not opener facing a 3bet' if open_size else 'Worksheet placement HJ open / SB response only; cropped image has no action header.','availableActionsAtSelectedSeat':['fold','raise','allin'] if open_size else None,'visualStatus':'header_and_grid_viewed' if open_size else 'grid_only_viewed_context_not_independently_visible','stakeAndRake':None,'frequencies':'not_digitized'}
else:
    for image in images:image['review']={'visualStatus':'source_changed_needs_reinspection'}
after=hashlib.sha256(source.read_bytes()).hexdigest();assert before==after
out={'status':'read_only_workbook_audited_not_complete_caller_policy','source':str(source),'sha256':before,'reviewedImageWorkbookSha256':reviewed_hash,'unchangedAfterRead':True,'sheets':sheets,'media':media,'wpsCellImages':images,'embeddedBinaryParts':[p for p in parts if p.startswith('xl/embeddings/') and not p.endswith('/')],
 'importerLimit':'Artifact Tool import found two sheets and DISPIMG formulas, but its drawing inspect returned no records. Original ZIP holds ten WPS cell images. No-drawing API output is not absence of images.',
 'roundingRuleEvidence':{'cells':[{'sheet':'翻前GTO','cell':'H1'},{'sheet':'3bet','cell':'K1'}],'text':'0–24% → 0%; 25–74% → 50%; 75–100% → 100%','scope':'This early workbook states a many-to-one rounding rule. It cannot recover original frequencies and does not prove another workbook uses identical source ranges or rules.'},
 'conclusion':{'earlyRfiNotesPresent':True,'rangeImagesRecovered':10,'headersConfirmResponseToOpen':9,'croppedImageContext':'worksheet_assignment_only','completeOpenerCallVs3betPolicy':'not_recovered_from_this_audit','notClaimed':'No per-combo caller frequencies inferred, no whole original course validated, no new training scope or application changes.'}}
output.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'status':out['status'],'sha256':before,'sheets':[{'name':s['name'],'dimension':s['dimension'],'populatedCells':len(s['cells'])} for s in sheets],'wpsImages':len(images),'headersReviewed':sum(i['review']['visualStatus']=='header_and_grid_viewed' for i in images),'croppedGridOnly':sum(i['review']['visualStatus']=='grid_only_viewed_context_not_independently_visible' for i in images),'conclusion':out['conclusion']},ensure_ascii=False,indent=2))
