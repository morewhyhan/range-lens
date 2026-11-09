import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir='research/nevir-system/';
const ledger=JSON.parse(fs.readFileSync(dir+'continuous-state-ledger-contract.json','utf8'));
const continuity=JSON.parse(fs.readFileSync(dir+'first-hand-continuity-audit.json','utf8'));
const reach=JSON.parse(fs.readFileSync(dir+'street-state-reachability-contract.json','utf8'));
const replay=JSON.parse(fs.readFileSync(dir+'goal-cognitive-replay-contract.json','utf8'));

assert.equal(ledger.id,'CONTINUOUS_STATE_LEDGER_CONTRACT_V1');
assert.equal(ledger.status,'ledger_invariants_written_runtime_unverified');
assert.equal(ledger.stateVector.length,14);
assert.deepEqual(Object.keys(ledger.eventKinds),['action','response','new_card','settlement']);
for(const kind of Object.values(ledger.eventKinds)){assert.ok(kind.mayChange.length>=3);assert.ok(kind.mustPreserve.length>=2);}
for(const key of ['potAfter','stackAfter','historyAppend','newCard','rangeAfter'])assert.ok(ledger.formulas[key]);
assert.deepEqual(ledger.invariants,['card_conservation','history_monotonic','money_conservation','nonnegative_stacks','legal_actor','declared_denominator','source_identity_stable','successor_exists_or_stop_reason']);
assert.equal(ledger.displayContract.previousStateRetained,true);
assert.equal(ledger.displayContract.oneDeltaHighlighted,true);
assert.equal(ledger.displayContract.missingSuccessorStops,true);
assert.equal(ledger.releaseRules.ledgerDoesNotProveStrategy,true);
assert.equal(ledger.releaseRules.missingSuccessorBlocksContinuousLesson,true);
assert.equal(ledger.currentEvidence.paperContinuityAudit,true);
assert.equal(ledger.currentEvidence.runtimeImplemented,false);
assert.equal(ledger.currentEvidence.completeA72Successors,false);
assert.equal(continuity.currentEvidence.completeSuccessorClosure,false);
assert.equal(reach.releaseRules.missingSuccessorBlocksExactLesson,true);
assert.equal(replay.releaseRules.missingSuccessorStopsContinuousLesson,true);
console.log(JSON.stringify({ok:true,status:ledger.status,eventKinds:Object.keys(ledger.eventKinds).length,invariants:ledger.invariants.length,runtimeImplemented:ledger.currentEvidence.runtimeImplemented}));
