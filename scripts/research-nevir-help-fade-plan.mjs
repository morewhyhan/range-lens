import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir='research/nevir-system/';
const plan=JSON.parse(fs.readFileSync(dir+'help-fade-execution-plan.json','utf8'));
const schedule=JSON.parse(fs.readFileSync(dir+'help-fade-schedule.json','utf8'));
const progression=JSON.parse(fs.readFileSync(dir+'internalization-progression-contract.json','utf8'));
assert.equal(plan.id,'HELP_FADE_SIX_ROUND_EXECUTION_PLAN_V1');
assert.equal(plan.status,'paper_progression_package_not_trialed');
assert.deepEqual(plan.route,['R1','R2','R3','R4','R5','R6']);
assert.equal(plan.rounds.length,6);
assert.deepEqual(plan.rounds.map(x=>x.label),['demonstration_map','guided_local','untitled_local','single_variable_transfer','delayed_recall','continuous_unseen']);
assert.deepEqual(schedule.levels.map(x=>x.id),['H0','H1','H2','H3','H4','H5']);
assert.deepEqual(plan.helpFadeOrder,progression.helpFadeOrder);
for(let i=0;i<plan.rounds.length;i++){
 const round=plan.rounds[i];
 assert.ok(round.label&&round.visible.length&&round.primaryTask&&round.evidence.length&&round.helpAllowed&&round.rollback);
 assert.equal(round.unlockAfter,i===0?null:plan.rounds[i-1].id);
}
assert.equal(plan.hardRules.noRoundSkipping,true);
assert.equal(plan.hardRules.oneHelpChangeAtATime,true);
assert.equal(plan.hardRules.necessaryInputsNeverHidden,true);
assert.equal(plan.hardRules.oneVariableTransferRequired,true);
assert.equal(plan.hardRules.missingSuccessorBlocksR6,true);
assert.equal(plan.hardRules.sessionOnlyState,true);
assert.equal(plan.hardRules.R6DoesNotProveNL50,true);
assert.equal(plan.currentEvidence.runtimeImplemented,false);
assert.equal(plan.currentEvidence.beginnerTrial,false);
assert.equal(plan.currentEvidence.R1toR6LearnerEvidence,false);
assert.equal(plan.currentEvidence.NL50Evidence,false);
console.log(JSON.stringify({ok:true,status:plan.status,rounds:plan.rounds.length,helpFadeSteps:plan.helpFadeOrder.length,learnerEvidence:plan.currentEvidence.R1toR6LearnerEvidence}));
