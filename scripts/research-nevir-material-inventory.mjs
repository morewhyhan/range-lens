import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root='C:/Users/why/Desktop/笔记 Nevir',dir='research/nevir-system';
function walk(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(folder,e.name)):[path.join(folder,e.name)]);}
const files=walk(root).map(p=>{
 const name=path.relative(root,p),extension=path.extname(name).toLowerCase(),bytes=fs.readFileSync(p);
 const kind=extension==='.md'?/^2\.[1-7]-/.test(path.basename(name))?'postflop_note':'other_note':extension==='.xlsx'?'workbook':/\.(mp4|mkv|mov|webm)$/i.test(extension)?'standalone_video':/\.(png|jpg|jpeg|svg|webp)$/i.test(extension)?'standalone_image':/\.(cfr|cfr3|tree|solve|pio)$/i.test(extension)?'standalone_solver_export':'other';
 return{relativePath:name,absolutePath:p,kind,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),contentAudit:extension==='.xlsx'?'Workbook content and embedded assets are NOT inspected by this file inventory.':'Inventory identity only; semantic review remains separately recorded.'};
});
const count=kind=>files.filter(f=>f.kind===kind).length;
assert.equal(count('postflop_note'),7);assert.ok(files.some(f=>path.basename(f.relativePath)==='翻前GTO_整理版.xlsx'));
const originalAuditPath=`${dir}/original-workbook-audit.json`,originalAudit=fs.existsSync(originalAuditPath)?JSON.parse(fs.readFileSync(originalAuditPath,'utf8')):null;
const originalIdentity=files.find(f=>path.basename(f.relativePath)==='翻前GTO_整理版.xlsx');
const originalAuditMatches=originalAudit?.sha256===originalIdentity.sha256;
const output={
 status:'inventory_and_directory_leads_not_full_content_verification',checkedOn:'2026-10-19',root,
 counts:{totalFiles:files.length,postflopNotes:count('postflop_note'),otherNotes:count('other_note'),workbooks:count('workbook'),standaloneVideos:count('standalone_video'),standaloneImages:count('standalone_image'),standaloneSolverExports:count('standalone_solver_export')},files,
 officialDirectory:{url:'https://nevirpoker.com/en/sale/1',evidenceKind:'First-party page content returned by web search index; direct web open returned no extractable body in this run.',indexedLevel:'intermediate_advanced',localMatch:'First seven postflop titles and order align with the seven supplied notes; video content itself not compared.',additionalIndexedTopics:['recap','BB_vs_BTN_cbet_defense','play_and_explain_including_NL50'],currentAvailability:'not_verified',videoOrStrategyContentAcquired:false},
 workbookContentAudit:{file:'翻前GTO_整理版.xlsx',status:originalAuditMatches?'read_only_audit_matches_current_source':'content_audit_pending',evidence:originalAuditMatches?'original-workbook-audit.json':null,scope:originalAuditMatches?'Two sheets and ten WPS embedded images inspected. Complete opener call-vs-3bet policy not recovered; no frequencies digitized.':'Inspect content and embedded objects before concluding it cannot add caller-range inputs.'},
 conclusionsAllowed:['The local folder contains seven postflop note files and other material listed here.','No standalone videos or usual solver-file extensions were found in this folder snapshot.','File extensions do not exclude embedded workbook diagrams, ranges or other useful information.','Directory topics guide further source verification; they do not supply strategy answers.'],
 notClaimed:['Official course videos were read','All course material is supplied locally','Workbook embedded content is absent','The complete caller policy is absent from every provided workbook','NL50 competence or teaching effectiveness is proven']
};
fs.writeFileSync(`${dir}/material-inventory.json`,JSON.stringify(output,null,2));
console.log(JSON.stringify({status:output.status,counts:output.counts,officialDirectory:output.officialDirectory,workbookContentAudit:output.workbookContentAudit},null,2));
