import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir='research/nevir-system/';
const packet=JSON.parse(fs.readFileSync(dir+'low-baseline-first-pass-trial-packet.json','utf8'));
const key=JSON.parse(fs.readFileSync(dir+'low-baseline-first-pass-trial-key.json','utf8'));
const source=JSON.parse(fs.readFileSync(dir+'first-pass-structure-packet.json','utf8'));
const prompts=JSON.parse(fs.readFileSync(dir+'first-pass-structure-prompts.json','utf8'));
const byId=Object.fromEntries(source.cases.map(x=>[x.id,x]));
const promptIds=new Set(prompts.cases.map(x=>x.id));
assert.equal(packet.id,'LOW_BASELINE_FIRST_PASS_TRIAL_PACKET_V1');
assert.equal(packet.status,'paper_trial_packet_frozen_not_administered');
assert.equal(key.id,'LOW_BASELINE_FIRST_PASS_TRIAL_KEY_V1');
assert.equal(key.status,'author_key_for_paper_trial_not_learner_evidence');
assert.equal(packet.architectureReplayContract,'architecture-replay-contract.json');
assert.equal(packet.architectureReplayRubric,'architecture-replay-rubric.json');
assert.deepEqual(packet.architectureReplay.order,['A1','A2','A3','A4','A5','A6','A7','A8']);
assert.deepEqual(packet.architectureReplay.checks,['node_identification','edge_recall','state_handoff']);
assert.equal(packet.architectureReplay.hideNodeLabels,true);
for(const f of ['architectureNodeRecall','architectureEdgeRecall','architectureStateHandoff'])assert.ok(packet.recordFields.includes(f));
assert.deepEqual(packet.passChecks,['order_recall','layer_location','error_recovery','one_variable_transfer']);
assert.equal(packet.administration.showOneCaseAtATime,true);
assert.equal(packet.administration.hideStepNames,true);
assert.equal(packet.administration.firstAnswerBeforeHelp,true);
assert.equal(packet.administration.sameParentAfterError,true);
assert.deepEqual(packet.guidedOrder,['C01','R01','C03','C05','C08','C10','C12']);
assert.equal(new Set(packet.guidedOrder).size,packet.guidedOrder.length);
assert.equal(packet.trialFactCases.length,1);
const factById=Object.fromEntries(packet.trialFactCases.map(x=>[x.id,x]));
assert.ok(factById.R01);
assert.equal(factById.R01.routeNode,'p3_range');
assert.equal(factById.R01.answerIdentity,'physical_fact');
assert.deepEqual(factById.R01.options,['A♠Q♥','Q♥J♥','所有带A的牌都不可能','我不知道']);
for(const id of packet.guidedOrder){
 assert.ok(key.guidedExpected[id],`missing guided key ${id}`);
 if(id==='R01'){assert.ok(factById.R01);continue;}
 assert.ok(byId[id],`missing guided source case ${id}`);assert.ok(promptIds.has(id),`missing guided prompt ${id}`);
}
const expectedBranches={C01:'compare.unopened',C03:'compare.bet',C05:'compare.raise',C08:null,C10:null,C12:null};
for(const id of packet.guidedOrder.filter(id=>id!=='R01')){
 const sourceCase=byId[id], expected=key.guidedExpected[id];
 assert.equal(expected.location,sourceCase.answer.location);
 if(expectedBranches[id])assert.equal(expected.branch,sourceCase.answer.branch);
 assert.equal(expected.toCallBB,sourceCase.answer.toCallBB);
}
assert.deepEqual(packet.holdoutOrder,['H01','H02','H03','H04','H05','H06','H07']);
assert.equal(packet.holdoutCases.length,7);
assert.equal(new Set(packet.holdoutOrder).size,packet.holdoutOrder.length);
for(const row of packet.holdoutCases){
 assert.ok(row.sourceCase==='R01'||byId[row.sourceCase],`missing holdout source ${row.sourceCase}`);
 assert.equal(row.changedField,'board');
 assert.deepEqual(Object.keys(row.override),['board']);
 const sourceBoard=row.sourceCase==='R01'?byId.C01.state.board:byId[row.sourceCase].state.board;
 assert.equal(row.override.board.length,sourceBoard.length);
 assert.ok(key.holdoutExpected[row.id],`missing holdout key ${row.id}`);
 const sourceCase=row.sourceCase==='R01'?byId.C01:byId[row.sourceCase];
 const forbidden=[...(sourceCase.heroHole||[]),...(sourceCase.state.board||[])];
 const all=row.override.board;
 assert.equal(new Set(all).size,all.length,`duplicate board in ${row.id}`);
 assert.ok(all.every(card=>!forbidden.slice(0,sourceCase.heroHole.length).includes(card)),`hero collision in ${row.id}`);
 assert.equal(key.holdoutExpected[row.id].changedFieldCount,1);
 assert.equal(key.holdoutExpected[row.id].changedField,'board');
}
assert.equal(packet.currentEvidence.packetFrozen,true);
assert.equal(packet.currentEvidence.answerKeySeparated,true);
assert.equal(packet.currentEvidence.participantObserved,false);
assert.equal(packet.currentEvidence.routeReadabilityVerified,false);
assert.equal(packet.currentEvidence.unseenTransferVerified,false);
assert.equal(packet.currentEvidence.NL50Evidence,false);
assert.deepEqual(key.doNotGrade,['best_action','solver_frequency','NL50_readiness','profitability']);
console.log(JSON.stringify({ok:true,packet:packet.id,guidedCases:packet.guidedOrder.length,holdoutCases:packet.holdoutCases.length,passChecks:packet.passChecks,participantObserved:packet.currentEvidence.participantObserved}));
