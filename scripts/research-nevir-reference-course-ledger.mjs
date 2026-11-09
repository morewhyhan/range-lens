import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve('.');
const dir=path.join(root,'research/nevir-system');
const file=path.join(dir,'reference-course-policy-ledger-contract.json');
const data=JSON.parse(fs.readFileSync(file,'utf8'));
assert.equal(data.id,'REFERENCE_COURSE_POLICY_LEDGER_V1');
assert.equal(data.status,'paper_comparison_contract_not_populated');
assert.deepEqual(data.requiredBlocks,['identity','physical','reference','course','difference','range','successor','teaching']);
assert.deepEqual(data.phaseOrder,data.requiredBlocks);
for(const key of ['equityCalculator','handEvaluator','postflopSolver','desktopAndWasm']){
  const role=data.repositoryRoles[key];
  assert.ok(role.repository&&role.layer&&role.canProduce.length&&role.cannotProduce.length);
}
for(const key of ['before','referenceAfter','courseAfter','view','actionDelta','rangeDelta'])assert.ok(data.formulas[key]);
for(const [key,value] of Object.entries(data.hardGates))assert.equal(value,true,`hard gate ${key}`);
const rep=data.representativeStatus;
assert.equal(rep.unitId,'1.5');
assert.equal(rep.reference,'missing');
assert.equal(rep.difference,'not_comparable');
assert.equal(rep.successor,'missing');
assert.equal(rep.releaseStatus,'course_rule_candidate_not_released');
assert.equal(data.currentEvidence.A72MatchedReference,false);
assert.equal(data.currentEvidence.all35LedgersPopulated,false);
assert.equal(data.currentEvidence.runtimeCompiler,false);
console.log(JSON.stringify({
  ok:true,
  status:data.status,
  blocks:data.requiredBlocks.length,
  repositoryRoles:Object.keys(data.repositoryRoles).length,
  representative:rep.unitId,
  releaseStatus:rep.releaseStatus,
  A72MatchedReference:data.currentEvidence.A72MatchedReference,
  all35LedgersPopulated:data.currentEvidence.all35LedgersPopulated
}));
