import fs from 'node:fs';
import assert from 'node:assert/strict';

const file='research/nevir-system/first-pass-runtime-output-crosswalk.json';
const d=JSON.parse(fs.readFileSync(file,'utf8'));
const narration=JSON.parse(fs.readFileSync('research/nevir-system/learner-first-pass-narration-contract.json','utf8'));
const experience=JSON.parse(fs.readFileSync('research/nevir-system/first-pass-experience-map.json','utf8'));
const execution=JSON.parse(fs.readFileSync('research/nevir-system/learner-execution-output-contract.json','utf8'));
const schema=JSON.parse(fs.readFileSync('research/nevir-system/course-unit-field-schema-map.json','utf8'));
assert.equal(d.id,'FIRST_PASS_RUNTIME_OUTPUT_CROSSWALK_V1');
assert.equal(d.status,'paper_crosswalk_contract_not_trialed');
assert.deepEqual(d.route,['p1_context','p2_board','p3_range','p4_compare','p5_execute','p6_update','p7_close']);
assert.deepEqual(d.runtimeRoute,['O1_context','O2_board','O3_hand','O4_range','O5_compare','O6_execute','O7_update','O8_close']);
assert.equal(d.schemaSource,'course-unit-field-schema-map.json');
assert.equal(d.canonicalProjectionMode,'union_of_runtime_steps');
assert.equal(d.mappings.length,7);
const ids=new Set(d.mappings.map(x=>x.id));
assert.equal(ids.size,7);
for(const row of d.mappings){
  assert.ok(row.runtimeSteps.length>=1);
  assert.ok(row.firstPassRequired.length>=3);
  assert.ok(row.canonical.length>=1);
  assert.ok(row.errorReturn);
  assert.equal(row.firstPassRequired.some(x=>row.fullExecutionRequired.includes(x)),false,'depth duplicated without explicit need '+row.id);
  const projected=[...new Set(row.runtimeSteps.flatMap(step=>schema.runtimeProjection[step]||[]))].sort();
  assert.deepEqual([...new Set(row.canonical)].sort(),projected,`canonical projection mismatch ${row.id}`);
}
const commonAliases=d.aliases;
function normalize(field, source, stepId){
  if(source==='narration')return commonAliases[field]||field;
  if(source==='experience'){
    const byStep={
      p1_context:{toCallOrZero:'toCallBB',pot:'potBB',stack:'stacksBB'},
      p2_board:{},
      p3_range:{physicalFilterReason:'physicalFilter',actionFilterReasonOrUnknown:'actionFilterStatus',denominator:'normalizationDenominator'},
      p4_compare:{action:'legalActions',purpose:'actionPurpose',allowedIdentity:'answerIdentity'},
      p5_execute:{legalAction:'selectedAction',amount:'amountBB',potAfter:'potAfterBB',stackAfter:'stacksAfterBB'},
      p6_update:{rangeUpdate:'rangeAfter',ledgerUpdate:'ledgerAfter'},
      p7_close:{result:'settlement',decisionReview:'decisionResultSeparation',errorLayerOrNone:'errorLayer'}
    };
    return byStep[stepId]?.[field]||commonAliases[field]||field;
  }
  if(source==='execution'){
    const byStep={
      O1_context:{effectiveStackBB:'effectiveStackBB'},
      O2_board:{},
      O3_hand:{},
      O4_range:{physicalRemoval:'physicalFilter',actionFilter:'actionFilterStatus',beforeAfterChangedCells:'beforeAfterChangedCells',viewpoint:'viewpoint'},
      O5_compare:{},
      O6_execute:{action:'selectedAction'},
      O7_update:{newRangeSnapshot:'rangeAfter'},
      O8_close:{routeRecall:'routeRecall'}
    };
    return byStep[stepId]?.[field]||commonAliases[field]||field;
  }
  return field;
}
const narrationById=new Map(narration.steps.map(x=>[x.id,x]));
const experienceById=new Map(experience.steps.map(x=>[x.id,x]));
const executionById=new Map(execution.steps.map(x=>[x.id,x]));
for(const row of d.mappings){
  const targetSet=new Set([...row.firstPassRequired,...row.fullExecutionRequired]);
  const n=narrationById.get(row.id);
  for(const field of n.requiredOutputs)assert.equal(targetSet.has(normalize(field,'narration',row.id)),true,`narration output not mapped ${row.id}:${field}`);
  const e=experienceById.get(row.id);
  for(const field of (e.requiredOutputs||e.requiredOutput))assert.equal(targetSet.has(normalize(field,'experience',row.id)),true,`experience output not mapped ${row.id}:${field}`);
  for(const runtimeId of row.runtimeSteps){
    const runtime=executionById.get(runtimeId);
    assert.ok(runtime,`runtime step missing ${runtimeId}`);
    for(const field of runtime.requiredOutputs)assert.equal(targetSet.has(normalize(field,'execution',runtimeId)),true,`runtime output not mapped ${runtimeId}:${field}`);
  }
}
assert.deepEqual(d.mappings.find(x=>x.id==='p2_board').runtimeSteps,['O2_board','O3_hand']);
assert.equal(d.rules.everyPStepMapsToRuntimeStep,true);
assert.equal(d.rules.firstPassRequiredIsSmallerThanFullExecution,true);
assert.equal(d.rules.missingFieldNeverInferred,true);
assert.equal(d.currentEvidence.runtimeImplemented,false);
assert.equal(d.currentEvidence.learnerTrial,false);
console.log(JSON.stringify({ok:true,status:d.status,steps:d.mappings.length,p2RuntimeSteps:d.mappings.find(x=>x.id==='p2_board').runtimeSteps,aliases:Object.keys(d.aliases).length,runtimeImplemented:d.currentEvidence.runtimeImplemented}));
