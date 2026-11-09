import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir='research/nevir-system/';
const protocol=JSON.parse(fs.readFileSync(dir+'low-baseline-validation-protocol.json','utf8'));
const packet=JSON.parse(fs.readFileSync(dir+'low-baseline-first-pass-trial-packet.json','utf8'));
const closure=JSON.parse(fs.readFileSync(dir+'first-pass-step-closure-contract.json','utf8'));
const structure=JSON.parse(fs.readFileSync(dir+'first-pass-structure-packet.json','utf8'));
const replay=JSON.parse(fs.readFileSync(dir+'goal-cognitive-replay-contract.json','utf8'));
const gates=JSON.parse(fs.readFileSync(dir+'learner-evidence-release-gates.json','utf8'));

assert.equal(protocol.id,'LOW_BASELINE_VALIDATION_PROTOCOL_V1');
assert.equal(protocol.status,'f0_specified_f1_f3_not_administered');
assert.deepEqual(protocol.phases.map(p=>p.id),['F0_paper_walkthrough','F1_formative_read','F2_structure_validation','F3_execution_validation']);
assert.equal(protocol.phases.length,4);
for(const phase of protocol.phases){assert.ok(phase.answerable.length>=2);assert.ok(phase.notAnswerable.length>=1);}
assert.equal(protocol.recordFields.includes('firstAnswer'),true);
assert.equal(protocol.recordFields.includes('hostIntervention'),true);
assert.equal(protocol.attributionRules.sharedSameLayerErrorAcrossParticipants,'course_or_page_candidate');
assert.equal(protocol.attributionRules.missingInputOrUnsupportedAction,'data_or_strategy_gap');
assert.equal(protocol.attributionRules.clearInputAndPolicyButLayerSkipped,'learner_structure_gap');
assert.equal(protocol.attributionRules.independentAmountRangeSuccessorMismatch,'reference_or_compiler_gap');
assert.deepEqual(protocol.revisionOrder,['source_and_data','parent_frame_and_inputs','one_question_and_copy','more_items_last']);
assert.equal(protocol.releaseRules.F1ProducesRevisionListOnly,true);
assert.equal(protocol.releaseRules.F3DoesNotProveNL50,true);
assert.equal(protocol.privacyAndStorage.appLongTermDatabase,false);
assert.equal(packet.currentEvidence.participantObserved,false);
assert.equal(packet.closureContract,'first-pass-step-closure-contract.json');
assert.equal(packet.currentEvidence.closureContractCrossChecked,true);
assert.deepEqual(packet.guidedCoverage && Object.keys(packet.guidedCoverage),closure.mainChain);
assert.equal(closure.currentEvidence.paperContract,true);
assert.deepEqual(packet.holdoutOrder,packet.holdoutCases.map(h=>h.id));
assert.equal(packet.holdoutCases.length,7);
const structureCases=new Map(structure.cases.map(c=>[c.id,c]));
for(const holdout of packet.holdoutCases){
  assert.equal(holdout.changedField,'board');
  const sourceId=holdout.sourceStateCase||holdout.sourceCase;
  const source=structureCases.get(sourceId);
  assert.ok(source,`missing source case ${sourceId}`);
  assert.deepEqual(holdout.sourcePath,`cases.${sourceId}.state.board`);
  assert.equal(Array.isArray(source.state.board),true);
  assert.equal(holdout.override && Array.isArray(holdout.override.board),true);
  assert.equal(holdout.override.board.length,source.state.board.length);
  assert.equal(new Set(holdout.override.board).size,holdout.override.board.length);
}
assert.equal(replay.currentEvidence.participantObserved,false);
assert.equal(gates.currentEvidence.learnerTrial,false);
assert.equal(protocol.currentEvidence.F1Administered,false);
assert.equal(protocol.currentEvidence.F3Administered,false);
console.log(JSON.stringify({ok:true,status:protocol.status,phases:protocol.phases.length,F1Administered:protocol.currentEvidence.F1Administered,F3Administered:protocol.currentEvidence.F3Administered}));
