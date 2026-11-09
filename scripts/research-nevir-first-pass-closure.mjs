import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir='research/nevir-system/';
const contract=JSON.parse(fs.readFileSync(dir+'first-pass-step-closure-contract.json','utf8'));
const route=JSON.parse(fs.readFileSync(dir+'learner-goal-route-canonical.json','utf8'));
const experience=JSON.parse(fs.readFileSync(dir+'first-pass-experience-map.json','utf8'));
const output=JSON.parse(fs.readFileSync(dir+'learner-execution-output-contract.json','utf8'));
const units=JSON.parse(fs.readFileSync(dir+'unit-outcome-matrix.json','utf8'));
const nested=JSON.parse(fs.readFileSync(dir+'nested-35-route.json','utf8'));

const ids=['p1_context','p2_board','p3_range','p4_compare','p5_execute','p6_update','p7_close'];
assert.equal(contract.id,'FIRST_PASS_STEP_CLOSURE_CONTRACT_V1');
assert.equal(contract.status,'paper_closure_contract_not_trialed');
assert.deepEqual(contract.mainChain,ids);
assert.deepEqual(Object.keys(contract.teachingMatrix),ids);
for(const id of ids){
  const m=contract.teachingMatrix[id];
  for(const field of ['principle','factInputs','visual','practiceSequence','contrastAxis','transferAxis','minimumIndependentOutput','sourceBoundary']) assert.ok(m[field],`missing teachingMatrix ${id}.${field}`);
  assert.ok(m.practiceSequence.length>=3);
  assert.ok(m.minimumIndependentOutput.length>=3);
}
assert.deepEqual(experience.mainPath,ids);
assert.deepEqual(route.postflopSequentialChain,ids);
assert.equal(contract.steps.length,7);
for(const step of contract.steps){
  for(const field of contract.requiredStepFields) assert.ok(step[field],`missing ${step.id}.${field}`);
  assert.equal(step.oneQuestion.length>0,true);
  assert.equal(step.handoff.length>0,true);
  assert.equal(step.childPolicy.length>0,true);
}
assert.equal(contract.childEmbedding.representativePerGroup,1);
assert.deepEqual(contract.childEmbedding.allowedParents,['p4_compare','p6_update']);
assert.equal(contract.childEmbedding.flatHomeMenuForbidden,true);
assert.equal(contract.childEmbedding.oneOpenChildAtATime,true);
assert.equal(contract.childEmbedding.childCloseRestoresExactParent,true);
assert.equal(units.unitCount,35);
assert.equal(units.rows.length,35);
assert.equal(nested.units.length,35);
for(const row of units.rows){
  assert.ok(contract.childEmbedding.allowedParents.includes(row.parentRouteNode),`unit outside parent ${row.unitId}`);
  assert.equal(row.guards.oneQuestion,true);
  assert.equal(row.guards.onePrimaryAction,true);
  assert.equal(row.guards.opensOnlyFromParent,true);
  assert.equal(row.guards.noLevelSkip,true);
}
for(const step of experience.steps){
  assert.equal(step.requiredOutput.length>0,true);
  assert.equal(step.errorReturn.length>0,true);
}
assert.equal(output.steps.length,8);
assert.equal(contract.currentEvidence.runtimeImplemented,false);
assert.equal(contract.currentEvidence.beginnerTrial,false);
assert.equal(contract.currentEvidence.NL50Evidence,false);
console.log(JSON.stringify({ok:true,status:contract.status,steps:ids.length,units:units.rows.length,parents:[...new Set(units.rows.map(r=>r.parentRouteNode))],runtimeImplemented:contract.currentEvidence.runtimeImplemented}));
