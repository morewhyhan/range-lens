import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir='research/nevir-system/';
const source=JSON.parse(fs.readFileSync(dir+'value-trap-tree-evidence.json','utf8'));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
// Terminal river decision only: no hidden-policy averaging across future streets.
const selected=source.profiles.map(p=>({profile:p.id,node:p.nodes.find(n=>n.id==='after_xraise_villain_jam')}));
assert.ok(selected.every(x=>x.node));
for(const {node} of selected){
 assert.equal(node.state.heroPut,45);assert.equal(node.state.villainPut,83);
 const q=node.posterior['77'];
 close(node.posterior.KK+q,1);
 const call=node.actions.find(a=>a.action==='call38');
 assert.ok(call);close(call.evFromRiverRootBB+45,201*q-38);
}
const ev=t=>402/(t+2)-38;
const threshold=163/19;
close(ev(threshold),0);
const classify=(lo,hi)=>{
 assert.ok(lo>=0&&hi>=lo);
 const minCall=ev(hi),maxCall=ev(lo);
 return {kkWeightInterval:[lo,hi],fixed77Weight:2,callEVIntervalBB:[minCall,maxCall],foldEVBB:0,
  conclusion:minCall>1e-9?'call_strictly_better_throughout':maxCall< -1e-9?'fold_strictly_better_throughout':'ranking_changes_or_ties_within_interval',
  maximumRegretBB:{fold:Math.max(0,maxCall),call:Math.max(0,-minCall)}};
};
const cases=[classify(1,3),classify(10,12),classify(7,10)];
assert.equal(cases[0].conclusion,'call_strictly_better_throughout');
assert.equal(cases[1].conclusion,'fold_strictly_better_throughout');
assert.equal(cases[2].conclusion,'ranking_changes_or_ties_within_interval');
close(cases[2].callEVIntervalBB[0],-4.5);close(cases[2].callEVIntervalBB[1],20/3);
// Separate balance formula: hero currently has38; fold ends38; call ends201 or0.
let evaluations=0;
for(let i=0;i<=14000;i++){
 const t=i/1000,q=2/(t+2);
 const endingStackDelta=q*(201-38)+(1-q)*(0-38);
 close(ev(t),endingStackDelta);
 if(i)assert.ok(ev(t)<=ev(t-.001)+1e-9);
 evaluations++;
}
const crossing=cases[2];
const maximin='fold'; // minimum EV0 exceeds call's -4.5.
const minimaxRegret='call'; // loss cap4.5 below fold's6.666... .
assert.ok(crossing.maximumRegretBB.call<crossing.maximumRegretBB.fold);
const output={status:'author_terminal_sensitivity_calculation_not_target_strategy_or_learner_result',
 source:'value-trap-tree-evidence.json',sourceNodesChecked:selected.length,
 context:{board:source.context.board,hero:source.context.hero,heroPut:45,villainPut:83,toCall:38,finalPotAfterCall:201},
 declaredTeachingAssumption:{KK:'relative mass t',77:'relative mass2',otherHands:'excluded by this given model',intervalOrigin:'author sensitivity ranges, not measured opponent confidence intervals'},
 threshold:{winShare:38/201,kkWeight:threshold,meaning:'call ties fold; no other future decision'},
 cases,ambiguousCaseAlternativeCriteria:{comparedPolicies:'always fold versus always call only; randomized mixtures not optimized',maximin,minimaxRegret,defaultRealPlayRecommendation:null,modelPrior:null,
 warning:'Neither criterion is supplied by poker rules or proven appropriate for an unknown real opponent.'},
 verification:{independentEndingStackChecks:evaluations,monotonicity:true,fullGameSolved:false,realLearnerTrial:false},
 ordinaryActionQuestionPublishableForCrossingInterval:false};
fs.writeFileSync(dir+'assumption-boundary-evidence.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,sourceNodesChecked:selected.length,evaluations,threshold:output.threshold,cases,alternativeCriteria:output.ambiguousCaseAlternativeCriteria},null,2));
