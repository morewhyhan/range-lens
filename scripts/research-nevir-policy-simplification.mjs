// Author research only: restrict hero continuation menus against a FIXED opponent.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fingerprint} from './nevir-practice-grader.mjs';
import {advanceRiverValue,replyRiverValue} from './nevir-river-value-executor.mjs';
const dir='research/nevir-system/';
const prompts=JSON.parse(fs.readFileSync(dir+'mixed-model-practice-prompts.json'));
const teacher=JSON.parse(fs.readFileSync(dir+'mixed-model-practice-teacher.json'));
const variants=[
 {id:'full',description:'保留原模型全部后续动作',omit:()=>false},
 {id:'no_check_raise45',description:'过牌后面对下注时，只移除加到45',omit:(phase,p)=>phase==='facing_bet'&&p.action==='raise'&&p.to===45},
 {id:'no_check_jam83',description:'过牌后面对下注时，只移除全下83',omit:(phase,p)=>phase==='facing_bet'&&p.action==='raise'&&p.to===83},
 {id:'no_check_raise',description:'过牌后面对下注只准弃或跟；主动下注被加注仍保留再加',omit:(phase,p)=>phase==='facing_bet'&&p.action==='raise'},
 {id:'no_future_raise',description:'面对下注和面对加注都只准弃或跟',omit:(phase,p)=>['facing_bet','facing_raise'].includes(phase)&&p.action==='raise'}
];
let terminalVisits=0,publicDecisions=0;
function endValue(packet,variant){
 if(packet.kind==='terminal'){
  terminalVisits++;
  assert.ok(Math.abs(packet.state.heroStack+packet.state.villainStack+packet.state.foldedStacks-600)<1e-8);
  return packet.state.heroStack;
 }
 if(packet.kind==='awaiting_showdown'){
  const hs=packet.question.body.currentRange.holdings,weight=hs.reduce((s,h)=>s+h.relativeWeight,0);
  return hs.reduce((s,h)=>s+h.relativeWeight/weight*endValue(replyRiverValue(packet,'showdown',{showdownHoldingId:h.id}),variant),0);
 }
 if(packet.kind==='waiting_opponent')return packet.availableReplies.reduce((s,r)=>s+r.probability*endValue(replyRiverValue(packet,r.reply),variant),0);
 assert.equal(packet.kind,'next_decision');
 publicDecisions++;
 const phase=packet.question.body.valueExecutionNode.phase;
 const allowed=packet.question.body.candidatePlans.filter(p=>!variant.omit(phase,p));
 assert.ok(allowed.length>0);
 // Maximize once over the entire public conditional range, never per hidden hand.
 return Math.max(...allowed.map(p=>endValue(advanceRiverValue(packet.reference,packet.question,p),variant)));
}
const roots=teacher.references.filter(r=>r.family==='river_value'&&r.contributors.some(c=>c.node==='river_start'));
assert.equal(roots.length,4);
const cases=roots.map(reference=>{
 const question=prompts.questions.find(q=>q.id===reference.id);
 const results=variants.map(variant=>{
  const values=question.body.candidatePlans.map(plan=>({action:plan.action,to:plan.to??null,evBB:endValue(advanceRiverValue(reference,question,plan),variant)-question.body.state.heroStack}));
  const bestEV=Math.max(...values.map(v=>v.evBB));
  return {policy:variant.id,description:variant.description,policyFingerprint:fingerprint({sourceInput:reference.inputFingerprint,restriction:variant.id,opponentPolicy:'unchanged'}),values,bestEV,bestActions:values.filter(v=>Math.abs(v.evBB-bestEV)<1e-8).map(v=>v.action)};
 });
 const full=results[0];
 full.values.forEach((v,i)=>assert.ok(Math.abs(v.evBB-reference.planValues[i].evBB)<1e-8));
 for(const result of results){
  assert.ok(result.bestEV<=full.bestEV+1e-8);
  result.lossAgainstFullBB=full.bestEV-result.bestEV;
  result.rootBestChanged=JSON.stringify(result.bestActions)!==JSON.stringify(full.bestActions);
 }
 return {profile:reference.contributors[0].profile,questionId:question.id,board:question.body.board,hero:question.body.hero,initialState:question.body.state,results};
});
const induced=cases.find(c=>c.profile==='induces');
const expected={full:[58.55,45.925],no_check_raise45:[50.3,45.925],no_check_jam83:[58.55,45.925],no_check_raise:[43.75,45.925],no_future_raise:[43.75,42.125]};
// Separate hand-weight arithmetic for the selected PUBLIC policies, not per-hand optimization.
const handArithmetic={
 fullCheck:(-83+2*118+3*80+35+3*52.5)/10,
 callAfterCheck:(-17.5+2*52.5+3*52.5+35+3*52.5)/10,
 fullLead:(-83+2*118+3*52.5+43.75+3*35)/10,
 callAfterLeadRaise:(-45+2*80+3*52.5+43.75+3*35)/10
};
assert.ok(Math.abs(handArithmetic.fullCheck-expected.full[0])<1e-8);
assert.ok(Math.abs(handArithmetic.callAfterCheck-expected.no_check_raise[0])<1e-8);
assert.ok(Math.abs(handArithmetic.fullLead-expected.full[1])<1e-8);
assert.ok(Math.abs(handArithmetic.callAfterLeadRaise-expected.no_future_raise[1])<1e-8);
for(const result of induced.results)result.values.forEach((v,i)=>assert.ok(Math.abs(v.evBB-expected[result.policy][i])<1e-8));
assert.deepEqual(induced.results.find(r=>r.policy==='no_check_raise').bestActions,['bet']);
assert.deepEqual(induced.results[0].bestActions,['check']);
const output={status:'author_fixed_opponent_policy_restriction_counterexample',sourceFingerprints:roots.map(r=>r.inputFingerprint),
 method:'Recursive expectation over observed replies and conditional ranges; hero maxima at public decision nodes; terminal physical showdown and refunds use the existing executor. No use of unrestricted child EVs to value restricted continuations.',
 restrictionsChangeHeroPolicyOnly:true,opponentAdaptationModelled:false,equilibriumSolved:false,newNL50Evidence:false,learnerTrials:0,
 interfaceOnlyCollapse:'No menu restriction: identical full-model values by definition; this script tests actual removal of executable continuations.',
 cases,verification:{fullRootsReproduced:4,variantsPerRoot:5,terminalVisits,publicDecisions,inducedGoldenRootValues:expected,independentSelectedPolicyHandArithmetic:handArithmetic,allRestrictedValuesNoGreaterThanFull:true}};
fs.writeFileSync(dir+'policy-simplification-evidence.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,roots:4,variants:5,terminalVisits,publicDecisions,changedRootCases:cases.flatMap(c=>c.results.filter(r=>r.rootBestChanged).map(r=>({profile:c.profile,policy:r.policy,best:r.bestActions,lossBB:r.lossAgainstFullBB})))}));
