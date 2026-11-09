import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir='research/nevir-system/';
const d=JSON.parse(fs.readFileSync(dir+'first-pass-visibility-contract.json','utf8'));
const crosswalk=JSON.parse(fs.readFileSync(dir+'first-pass-runtime-output-crosswalk.json','utf8'));
assert.equal(d.id,'FIRST_PASS_VISIBILITY_CONTRACT_V1');
assert.equal(d.status,'visibility_layers_written_not_trialed');
assert.equal(d.steps.length,7);
assert.deepEqual(d.steps.map(x=>x.id),crosswalk.route);
const crosswalkById=new Map(crosswalk.mappings.map(x=>[x.id,x]));
for(const step of d.steps){
  const row=crosswalkById.get(step.id); assert.ok(row);
  const first=new Set(row.firstPassRequired), full=new Set(row.fullExecutionRequired), canonical=new Set(row.canonical);
  assert.ok(step.visibleNow.length>=1&&step.visibleNow.every(x=>first.has(x)),`visible field outside first pass ${step.id}`);
  assert.ok(step.answerThen.every(x=>first.has(x)||full.has(x)),`answer field outside crosswalk ${step.id}`);
  assert.ok(step.childDetails.every(x=>full.has(x)),`child field outside full execution ${step.id}`);
  assert.equal(step.visualBlocks.length<=3,true,`too many visual blocks ${step.id}`);
  assert.equal(step.maxNewConcepts,1);
  assert.equal(new Set([...step.visibleNow,...step.answerThen]).size,[...step.visibleNow,...step.answerThen].length);
  assert.ok(step.carriedHidden.every(x=>canonical.has(x)||x==='role'||x==='actionState'||x==='factInputs'||x==='legalSuccessors'||x==='errorReturn'||x==='transferVariant'||x==='releaseStatus'),`hidden field not canonical ${step.id}`);
}
assert.equal(d.rules.oneQuestion,true);
assert.equal(d.rules.onePrimaryAction,true);
assert.equal(d.rules.hiddenIsCarriedNotDeleted,true);
assert.equal(d.rules.answerThenAfterFirstAttempt,true);
assert.equal(d.currentEvidence.runtimeImplemented,false);
assert.equal(d.currentEvidence.adultBeginnerTrial,false);
console.log(JSON.stringify({ok:true,status:d.status,steps:d.steps.length,maxVisualBlocks:d.rules.maxVisualBlocks,p6Visible:d.steps.find(x=>x.id==='p6_update').visibleNow,p6AnswerThen:d.steps.find(x=>x.id==='p6_update').answerThen}));
