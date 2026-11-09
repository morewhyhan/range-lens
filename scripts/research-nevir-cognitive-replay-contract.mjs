import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir='research/nevir-system/';
const contract=JSON.parse(fs.readFileSync(dir+'goal-cognitive-replay-contract.json','utf8'));
const mastery=JSON.parse(fs.readFileSync(dir+'parent-step-mastery-contract.json','utf8'));
const gates=JSON.parse(fs.readFileSync(dir+'learner-evidence-release-gates.json','utf8'));

assert.equal(contract.id,'GOAL_COGNITIVE_REPLAY_CONTRACT_V1');
assert.equal(contract.status,'paper_replay_contract_written_not_trialed');
assert.deepEqual(contract.route,['p1_context','p2_board','p3_range','p4_compare','p5_execute','p6_update','p7_close']);
assert.deepEqual(contract.handoffs.map(x=>x.step),contract.route);
assert.equal(contract.handoffs.length,7);
for(const handoff of contract.handoffs){
  assert.ok(handoff.required.length>=3,`handoff too small ${handoff.step}`);
  assert.ok(handoff.next);
  assert.ok(handoff.forbiddenSubstitution);
}
assert.deepEqual(contract.replayPhases.map(x=>x.id),['route_recall','handoff_recall','breakpoint_reconnect','single_variable_transfer']);
assert.equal(contract.replayPhases.every(x=>x.oneCardAtATime),true);
assert.equal(contract.minimumStructuralEvidence.allSevenStepsVisited,true);
assert.equal(contract.minimumStructuralEvidence.allSevenHandoffsNonEmpty,true);
assert.equal(contract.minimumStructuralEvidence.speedThreshold,null);
assert.equal(contract.releaseRules.structureReplayDoesNotProveStrategy,true);
assert.equal(contract.releaseRules.missingReferenceStopsExactAction,true);
assert.equal(contract.currentEvidence.structureMasteryVerified,false);
assert.deepEqual(mastery.steps.map(x=>x.id),contract.route);
assert.deepEqual(gates.gates.slice(1,5).map(x=>x.id),['E1','E2','E3','E4']);
assert.equal(gates.currentEvidence.learnerTrial,false);
console.log(JSON.stringify({ok:true,status:contract.status,steps:contract.route.length,phases:contract.replayPhases.length,structureMasteryVerified:contract.currentEvidence.structureMasteryVerified}));
