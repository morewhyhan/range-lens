import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir='research/nevir-system/';
const audit=JSON.parse(fs.readFileSync(dir+'learning-unit-readiness.json','utf8'));
const files={bluff:'guided-bluff-reraise-sequence-packet.json',weakLead:'guided-weak-lead-sequence-packet.json',protection:'guided-protection-sequence-packet.json',madeDraw:'guided-made-draw-sequence-packet.json',semibluff:'guided-semibluff-sequence-packet.json',outer:'first-hand-lesson-packet.json',size:'guided-size-sequence-packet.json',history:'guided-history-sequence-packet.json',value:'guided-value-sequence-packet.json',draw:'guided-draw-sequence-packet.json',update:'guided-update-sequence-packet.json',reraise:'guided-reraise-sequence-packet.json'};
const packets=Object.fromEntries(Object.entries(files).map(([k,f])=>[k,JSON.parse(fs.readFileSync(dir+f,'utf8'))]));
// Authored semantic pointers. A valid pointer means illustrated, not taught to mastery.
const pointers={
 '1.1':['size/B03','size/B04'],'1.2':['protection/P02','protection/P03','protection/P04','protection/P07','protection/P08','protection/P09'],'1.3':['size/B05'],'1.4':['weakLead/W01','weakLead/W02','weakLead/W03','weakLead/W05','weakLead/W06','weakLead/W08','weakLead/N01'],
 '1.5':['size/B07'],'1.6':['value/V04','value/V07'],'1.7':['size/O03'],'1.8':['size/B03','size/B08','size/B09','size/B10'],
 '2.1':['value/V09','value/V10'],'2.2':['draw/D10'],'2.3':['draw/D04','draw/D08','draw/D13'],'2.4':['madeDraw/F01','madeDraw/F02','madeDraw/F05','madeDraw/F06','madeDraw/F08'],
 '2.5':['value/V10','value/V11'],'2.6':['semibluff/A01','semibluff/A02','semibluff/A05','semibluff/A12'],'2.7':['draw/D13','draw/D14'],
 '3.1':['reraise/R04','reraise/R08'],'3.2':['reraise/R05','reraise/C03'],'3.3':['semibluff/A08','semibluff/A09','semibluff/A10'],
 '3.4':['reraise/R07','reraise/R08'],'3.5':['bluff/Z01','bluff/Z04','bluff/Z05','bluff/Z06','bluff/Z07','bluff/Z09','bluff/Z12','bluff/Z14'],'3.6':['value/V11','value/V12','value/V14'],
 '4.1':['update/U05','update/U06','history/H07','history/H12'],'4.2':['history/H02','history/H03','history/H04','history/J03','history/J04'],'4.3':['update/U03','update/U06','update/U07'],'4.4':['history/J02','history/J05','history/J06'],
 '4.5':['outer/S07','outer/S08','outer/S11','outer/S12'],'4.6':['value/V16','reraise/R12'],
 '5.1':['update/U09','update/U10','update/U11'],'5.2':['history/K02','history/K03'],'5.3':['draw/D04'],'5.4':['draw/D04'],
 '5.5':['history/K02','history/K03','history/K04'],'5.6':['history/K01'],'5.7':['update/U09','update/U12'],'5.8':['value/V14']
};
assert.equal(audit.units.length,35);assert.deepEqual(Object.keys(pointers).sort(),audit.units.map(u=>u.id).sort());
const rows=audit.units.map(u=>{
  const linkedFrames=pointers[u.id].map(link=>{
    const [packet,id]=link.split('/'),p=packets[packet],f=p.frames.find(f=>f.id===id);assert.ok(f,link);
    const core=p.navigation?.core??p.frames.map(f=>f.id);
    return {packet:files[packet],frame:id,title:f.title,prompt:f.task.prompt,optional:!core.includes(id)};
  });
  return {id:u.id,label:u.label,status:linkedFrames.length?'partial_explicit_frame_evidence':'local_material_without_linked_step_sequence',linkedFrames,
    priorMaterial:u.evidence,priorGap:u.gap,
    fullTeachingSequenceVerified:false,independentUnseenPerformanceVerified:false,fullMatchingTargetPolicyVerified:false,learnerTrialVerified:false};
});
const counts={withExplicitPartialFrames:rows.filter(u=>u.linkedFrames.length).length,withoutLinkedSequence:rows.filter(u=>!u.linkedFrames.length).length,fullSequenceOrLearnerPasses:0};
const out={status:'author_semantic_pointer_audit_not_mastery_evidence',scope:'35 existing ability units; only explicitly asked frame tasks counted. Candidate menu presence or reused words alone do not count.',counts,units:rows,
  limits:['Pointers are author semantic judgments; script checks existence and route status, not independent educational validity.','One frame may illustrate prerequisites of several abilities without completing them.','Optional frames are not presumed seen.','An existing local math model does not imply an ordered teaching sequence, matched target policy or learner transfer.']};
fs.writeFileSync(dir+'guided-sequence-coverage.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,...counts,notYetLinked:rows.filter(u=>!u.linkedFrames.length).map(u=>`${u.id} ${u.label}`)},null,2));
