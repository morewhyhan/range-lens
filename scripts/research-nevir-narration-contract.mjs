import fs from 'node:fs';
import assert from 'node:assert/strict';

const file='research/nevir-system/learner-first-pass-narration-contract.json';
const deckFile='research/nevir-system/first-pass-copy-deck.json';
const contract=JSON.parse(fs.readFileSync(file,'utf8'));
const deck=JSON.parse(fs.readFileSync(deckFile,'utf8'));
assert.equal(contract.id,'LEARNER_FIRST_PASS_NARRATION_CONTRACT_V1');
assert.equal(contract.status,'paper_narration_contract_not_trialed');
assert.deepEqual(contract.route,['p1_context','p2_board','p3_range','p4_compare','p5_execute','p6_update','p7_close']);
assert.equal(contract.steps.length,7);
assert.deepEqual(contract.steps.map(x=>x.id),contract.route);
assert.deepEqual(deck.steps.map(x=>x.id),contract.route);
for(const step of contract.steps){
 assert.ok(step.plainTitle&&step.question&&step.requiredOutputs.length>=3&&step.handoffTo&&step.errorReturn&&step.forbiddenShortcut);
 assert.ok(!/\b(EV|GTO|frequency|blocker|backdoor)\b/i.test(step.question));
}
assert.equal(contract.copyRules.oneQuestionPerStep,true);
assert.equal(contract.copyRules.onePrimaryActionPerStep,true);
assert.equal(contract.copyRules.plainLanguageBeforeTechnicalAlias,true);
assert.equal(contract.copyRules.technicalTermsNotSoleNavigation,true);
assert.equal(contract.copyRules.feedbackNamesLayerAndReturnPoint,true);
assert.equal(contract.p3Rules.physicalConflictDistinctFromActionFilter,true);
assert.equal(contract.p3Rules.unknownReferenceStopsExactActionFilter,true);
assert.equal(contract.p3Rules.fixedCoordinateAndDenominator,true);
assert.deepEqual(contract.firstPassChecks,['order_recall','layer_location','error_recovery','one_variable_transfer']);
assert.equal(contract.currentEvidence.runtimeImplemented,false);
assert.equal(contract.currentEvidence.adultBeginnerTrial,false);
assert.equal(contract.currentEvidence.matchedStrategyComplete,false);
assert.equal(contract.currentEvidence.NL50Evidence,false);
console.log(JSON.stringify({ok:true,status:contract.status,steps:contract.steps.length,firstPassChecks:contract.firstPassChecks,adultBeginnerTrial:contract.currentEvidence.adultBeginnerTrial}));
