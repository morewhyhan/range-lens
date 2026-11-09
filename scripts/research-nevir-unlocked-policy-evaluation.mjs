// Independent author evaluator for the EXISTING two tiny river exports.
// Free deviations are only within each original exported finite menu.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {card,evaluate,compare,assertCards} from '../src/poker.js';
const dir='research/nevir-system/',raw=fs.readFileSync(dir+'engine-export-probe.json'),data=JSON.parse(raw);
assert.equal(data.context.rake,0);
const close=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const hole=h=>h.match(/.{2}/g);
const compatible=(a,b)=>!hole(a).some(c=>hole(b).includes(c));
const key=h=>JSON.stringify(h);
const results=[];
let terminalPhysicalPairs=0,engineActionComparisons=0;
for(const example of data.cases){
 const nodes=new Map(example.nodes.map(n=>[key(n.historyIndices),n])),root=nodes.get('[]');
 const hands=root.orderedHands;
 // This calibration starts with unit mass for each listed exact hand.
 assert.deepEqual(root.rawReachWeights,[[1,1],[1,1]]);
 for(const n of nodes.values()){
  assert.deepEqual(n.orderedHands,hands);
  if(!n.terminal){
   assert.equal(n.rows.length,hands[n.actor].length);
   for(const row of n.rows){
    assert.equal(row.hand,hands[n.actor][row.handIndex]);
    assert.equal(row.strategyByAction.length,n.actions.length);
    assert.ok(row.strategyByAction.every(p=>Number.isFinite(p)&&p>=0));
    close(row.strategyByAction.reduce((s,p)=>s+p,0),1,1e-6);
   }
  }
  let paid=[0,0],history=[];
  for(const a of n.historyIndices){
   const p=nodes.get(key(history));assert.ok(p&&!p.terminal);
   const action=p.actions[a],actor=p.actor;
   if(action==='Call')paid[actor]=paid[actor^1];
   else if(/^Bet\(\d+\)$/.test(action)){assert.equal(paid[0]+paid[1],0);paid[actor]=Number(action.slice(4,-1));}
   else assert.ok(['Check','Fold'].includes(action),'Unsupported action or chance export');
   history.push(a);
  }
  assert.deepEqual(paid,n.totalBetAmount);
 }
 const pairs=hands[0].flatMap((a,i)=>hands[1].flatMap((b,j)=>compatible(a,b)?[{indices:[i,j],mass:1}]:[]));assert.equal(pairs.length,3);
 const pairMass=pairs.reduce((s,p)=>s+p.mass,0);
 const policy=(n,index)=>{
  const p=n.rows.find(r=>r.handIndex===index).strategyByAction;
  const sum=p.reduce((s,v)=>s+v,0);return p.map(v=>v/sum);
 };
 function terminal(n,indices,player){
  assert.equal(n.terminal,true);
  const matched=Math.min(...n.totalBetAmount),last=n.historyActions.at(-1);
  if(last==='Fold'){
   const parent=nodes.get(key(n.historyIndices.slice(0,-1))),winner=parent.actor^1;
   return winner===player?data.context.startingPot+matched:-matched;
  }
  assert.equal(n.totalBetAmount[0],n.totalBetAmount[1]);
  const own=hole(hands[player][indices[player]]),other=hole(hands[player^1][indices[player^1]]);
  assertCards([...data.context.board,...own,...other].map(card));
  const c=compare(evaluate([...data.context.board,...own].map(card)),evaluate([...data.context.board,...other].map(card)));
  const share=c>0?1:c<0?0:.5;
  return share*(data.context.startingPot+2*matched)-matched;
 }
 for(const n of nodes.values())if(n.terminal)for(const p of pairs){
  close(terminal(n,p.indices,0)+terminal(n,p.indices,1),data.context.startingPot);terminalPhysicalPairs++;
 }
 const child=(n,a)=>{const c=nodes.get(key([...n.historyIndices,a]));assert.ok(c,'Missing counterfactual continuation');return c;};
 function pairValue(n,indices,player,override=null){
  if(n.terminal)return terminal(n,indices,player);
  const tag=key(n.historyIndices)+'|'+indices[n.actor];
  const chosen=override?.player===n.actor?override.choices[tag]:undefined;
  const probs=chosen===undefined?policy(n,indices[n.actor]):n.actions.map((_,a)=>a===chosen?1:0);
  return probs.reduce((s,p,a)=>s+(p>0?p*pairValue(child(n,a),indices,player,override):0),0);
 }
 // Known own hand, full public history, and only opponent's policy reach enter this maximization.
 function bestValue(n,ownIndex,player,opponentWeights){
  const mass=opponentWeights.reduce((s,w)=>s+w,0);assert.ok(mass>0);
  if(n.terminal)return opponentWeights.reduce((s,w,j)=>{
   const ids=player===0?[ownIndex,j]:[j,ownIndex];return s+(w>0?w*terminal(n,ids,player)/mass:0);
  },0);
  if(n.actor===player)return Math.max(...n.actions.map((_,a)=>bestValue(child(n,a),ownIndex,player,opponentWeights)));
  return n.actions.reduce((s,_,a)=>{
   const next=opponentWeights.map((w,j)=>w*policy(n,j)[a]),m=next.reduce((s,w)=>s+w,0);
   return s+(m>0?m/mass*bestValue(child(n,a),ownIndex,player,next):0);
  },0);
 }
 const baseline=[0,1].map(player=>pairs.reduce((s,p)=>s+p.mass/pairMass*pairValue(root,p.indices,player),0));close(baseline[0]+baseline[1],data.context.startingPot);
 const best=[0,1].map(player=>hands[player].reduce((s,h,i)=>{
  const opponentWeights=hands[player^1].map(o=>compatible(h,o)?1:0),m=opponentWeights.reduce((s,w)=>s+w,0);
  return s+(m>0?m/pairMass*bestValue(root,i,player,opponentWeights):0);
 },0));
 // Independent exhaustive pure-policy enumeration: never condition decisions on the other hand.
 const purePolicyCounts=[];
 for(const player of [0,1]){
  const slots=[...nodes.values()].filter(n=>!n.terminal&&n.actor===player).flatMap(n=>hands[player].map((_,i)=>({tag:key(n.historyIndices)+'|'+i,count:n.actions.length})));
  const policies=[];
  function enumerate(index,choices){if(index===slots.length){policies.push({...choices});return;}const slot=slots[index];for(let a=0;a<slot.count;a++){choices[slot.tag]=a;enumerate(index+1,choices);}}
  enumerate(0,{});purePolicyCounts.push(policies.length);assert.equal(policies.length,16);
  const maximum=Math.max(...policies.map(choices=>pairs.reduce((s,p)=>s+p.mass/pairMass*pairValue(root,p.indices,player,{player,choices}),0)));
  close(best[player],maximum);
 }
 // Revalue supported current actions without reading the exported EV as an input.
 for(const n of nodes.values())if(!n.terminal)for(const row of n.rows){
  if(!row.referenceUsableAtThisObservedNode)continue;
  const player=n.actor,ownIndex=row.handIndex;
  const ws=hands[player^1].map((h,j)=>compatible(row.hand,h)?n.rawReachWeights[player^1][j]:0),m=ws.reduce((s,w)=>s+w,0);assert.ok(m>0);
  n.actions.forEach((_,a)=>{
   const value=ws.reduce((s,w,j)=>{const ids=player===0?[ownIndex,j]:[j,ownIndex];return s+(w>0?w/m*pairValue(child(n,a),ids,player):0);},0)+n.totalBetAmount[player];
   close(value,row.publishedActionEV[a],.02);engineActionComparisons++;
  });
 }
 const gains=best.map((v,p)=>v-baseline[p]);assert.ok(gains.every(g=>g>=-1e-8));
 const nashConv=gains[0]+gains[1],exploitability=nashConv/2;
 results.push({case:example.id,sourceReportedLockedMetric:example.returnedMetric,baselineBB:baseline.map(v=>v/data.unitsPerBB),bestResponseBB:best.map(v=>v/data.unitsPerBB),deviationGainBB:gains.map(v=>v/data.unitsPerBB),nashConvBB:nashConv/data.unitsPerBB,unrestrictedWithinOriginalMenuExploitabilityBB:exploitability/data.unitsPerBB,purePoliciesCheckedPerSeat:purePolicyCounts,
  offPathPolicy:'Uses the explicit exported policy rows on every original branch, including original zero-reach branches. These rows define a policy completion, not an optimality or real-opponent claim.'});
}
close(results[0].deviationGainBB[0],.155);close(results[0].deviationGainBB[1],1.2133333333333334);
close(results[1].deviationGainBB[0],.7616666666666667);close(results[1].deviationGainBB[1],.6066666666666667);
results.forEach(r=>close(r.unrestrictedWithinOriginalMenuExploitabilityBB,.6841666666666667));
const out={status:'independent_policy_evaluation_and_free_deviation_calibration_not_new_strategy',source:{file:'engine-export-probe.json',sha256:crypto.createHash('sha256').update(raw).digest('hex'),revision:data.sourceRevision},
 payoffOrigin:'Net from river start; winner receives starting pot plus matched opponent investment. Unmatched bets refunded. Both net payoffs sum to starting pot, not zero; deviation gains remove this constant.',
 validity:'Existing fixed river, two players, unit initial hand masses, zero rake, check/bet/fold/call finite tree, no chance or raising. Best response uses known own cards and observed history, never hidden opposing cards.',
 results,checks:{terminalPhysicalPairs,engineActionComparisons,recursiveBestResponseMatchesExhaustivePurePolicies:true,exactGoldenDeviationGains:true},
 notClaimed:['Full poker exploitability outside the original finite menu','Full A72 or NL50 reference','Quality of either locked source policy','Course simplification has now been validated','New training questions or learner results'],appChanged:false,learnerTrials:0};
fs.writeFileSync(dir+'unlocked-policy-evaluation-evidence.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,...out.checks,results:results.map(r=>({case:r.case,sourceMetric:r.sourceReportedLockedMetric,deviationGains:r.deviationGainBB,menuExploitability:r.unrestrictedWithinOriginalMenuExploitabilityBB}))}));
