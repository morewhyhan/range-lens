import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir='research/nevir-system/';
const bridge=JSON.parse(fs.readFileSync(dir+'help-fade-visibility-bridge.json','utf8'));
const plan=JSON.parse(fs.readFileSync(dir+'help-fade-execution-plan.json','utf8'));
const schedule=JSON.parse(fs.readFileSync(dir+'help-fade-schedule.json','utf8'));
const visibility=JSON.parse(fs.readFileSync(dir+'first-pass-visibility-contract.json','utf8'));
assert.equal(bridge.id,'HELP_FADE_VISIBILITY_BRIDGE_V1');
assert.equal(bridge.status,'paper_help_visibility_bridge_not_trialed');
assert.deepEqual(bridge.rounds.map(x=>x.id),['R1','R2','R3','R4','R5','R6']);
assert.deepEqual(plan.rounds.map(x=>x.id),bridge.rounds.map(x=>x.id));
assert.deepEqual(schedule.levels.map(x=>x.id),['H0','H1','H2','H3','H4','H5']);
assert.equal(bridge.rounds.length,6);
const hidden=bridge.rounds.map(x=>x.hiddenDimension);
assert.deepEqual(hidden,['none','answer_color','step_name','one_known_conclusion','needed_view_selection','target_mechanism']);
assert.equal(new Set(hidden.slice(1)).size,5);
const normalizedPlanOrder=plan.helpFadeOrder.map(x=>({
  hide_answer_color:'answer_color',
  hide_step_title:'step_name',
  hide_one_known_conclusion:'one_known_conclusion',
  learner_selects_needed_view:'needed_view_selection',
  hide_target_mechanism:'target_mechanism'
}[x]||x));
assert.deepEqual(hidden.slice(1),normalizedPlanOrder);
for(const row of bridge.rounds){
  assert.ok(row.visibleHelp.length>=1&&row.evidence&&row.rollback);
  assert.ok(visibility.rules.oneQuestion&&visibility.rules.onePrimaryAction);
}
for(const key of Object.keys(bridge.hardRules))assert.equal(bridge.hardRules[key],true,`hard rule ${key}`);
assert.equal(bridge.currentEvidence.runtimeImplemented,false);
assert.equal(bridge.currentEvidence.R1toR6LearnerEvidence,false);
assert.equal(bridge.currentEvidence.NL50Evidence,false);
console.log(JSON.stringify({ok:true,status:bridge.status,rounds:bridge.rounds.length,hiddenDimensionOrder:hidden.slice(1),runtimeImplemented:bridge.currentEvidence.runtimeImplemented}));
