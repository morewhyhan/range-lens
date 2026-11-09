import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir='research/nevir-system/';
const runbook=JSON.parse(fs.readFileSync(dir+'a72-c0-c5-execution-runbook.json','utf8'));
const spec=JSON.parse(fs.readFileSync(dir+'a72-reference-acquisition-spec.json','utf8'));
const contract=JSON.parse(fs.readFileSync(dir+'a72-c0-c5-reference-contract.json','utf8'));
const preflight=JSON.parse(fs.readFileSync(dir+'flop-tree-preflight-verification.json','utf8'));

assert.equal(runbook.id,'A72_C0_C5_EXECUTION_RUNBOOK_V1');
assert.equal(runbook.status,'runbook_written_resource_guard_stops_before_C2');
assert.equal(runbook.candidateId,'REF_BTN_BB_A72_100_zero_rake_research_v1');
assert.deepEqual(runbook.executionOrder,['C0','C1','C2','C3','C4','C5']);
assert.deepEqual(runbook.gates.map(g=>g.id),['C0','C1','C2','C3','C4','C5']);
assert.deepEqual(spec.gates.map(g=>g.id),runbook.executionOrder);
assert.deepEqual(contract.gates.map(g=>g.id),runbook.executionOrder);
for(const gate of runbook.gates){
  assert.ok(gate.inputs.length>=2,`missing inputs ${gate.id}`);
  assert.ok(gate.outputs.length>=2,`missing outputs ${gate.id}`);
  assert.ok(gate.independentChecks.length>=2,`missing independent checks ${gate.id}`);
  assert.ok(gate.stopConditions.length>=2,`missing stop conditions ${gate.id}`);
  assert.ok(gate.currentStatus);
}
assert.equal(runbook.gates.find(g=>g.id==='C0').currentStatus,'history_menu_adapter_verified_reload_pending');
assert.equal(runbook.gates.find(g=>g.id==='C1').currentStatus,'independent_fact_snapshot_verified');
for(const id of ['C2','C3','C4','C5'])assert.equal(runbook.gates.find(g=>g.id===id).currentStatus,'reference_missing');
assert.equal(runbook.gates.find(g=>g.id==='C2').resourceGuard.compressedFits,false);
assert.equal(runbook.gates.find(g=>g.id==='C2').resourceGuard.solveStarted,false);
assert.equal(preflight.executionGuard.compressedFits,false);
assert.equal(preflight.status,'full_tree_and_public_history_amounts_checked_not_solved');
assert.equal(runbook.currentEvidence.solverStarted,false);
assert.equal(runbook.currentEvidence.independentC1Recompute,true);
assert.equal(runbook.currentEvidence.sourceBuildVerified,true);
assert.equal(runbook.currentEvidence.rootActionProbeVerified,true);
assert.equal(runbook.currentEvidence.testedActionAdapter,true);
assert.equal(runbook.currentEvidence.continuousThreeStreetReference,false);
assert.equal(runbook.releaseRules.resourceGuardFailureDoesNotBecomePartialGTO,true);
assert.equal(runbook.releaseRules.equityCheckDoesNotBecomeStrategyProof,true);
assert.equal(runbook.releaseIdentity,'starting_range_fact_or_postflop_demonstration_candidate');
console.log(JSON.stringify({ok:true,status:runbook.status,gates:runbook.gates.length,c1Verified:runbook.currentEvidence.independentC1Recompute,compressedFits:runbook.gates.find(g=>g.id==='C2').resourceGuard.compressedFits,solverStarted:runbook.currentEvidence.solverStarted,nextPriority:runbook.nextPriority}));
