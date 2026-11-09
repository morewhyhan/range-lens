import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {card,evaluate,compare,assertCards} from '../src/poker.js';
const dir='research/nevir-system/',raw=fs.readFileSync(dir+'engine-export-probe.json'),data=JSON.parse(raw);
const close=(a,b,t=1e-4)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const hole=h=>h.match(/.{2}/g),compatible=(a,b)=>!hole(a).some(c=>hole(b).includes(c));
let nodes=0,weights=0,validRows=0,unusableRows=0,goldenCalls=0;
const goldens=[];
for(const example of data.cases){
 const byHistory=new Map(example.nodes.map(n=>[JSON.stringify(n.historyIndices),n]));
 const root=byHistory.get('[]');assert.ok(root);
 const rootPairs=root.orderedHands[0].flatMap(a=>root.orderedHands[1].filter(b=>compatible(a,b)).map(b=>[a,b]));assert.equal(rootPairs.length,3);
 for(const n of example.nodes){
  nodes++;const expected=root.orderedHands.map(hs=>hs.map(()=>1));
  let history=[];
  for(const action of n.historyIndices){
   const p=byHistory.get(JSON.stringify(history));assert.ok(p&&!p.terminal);
   const a=p.actor;
   expected[a]=expected[a].map((w,i)=>w*p.rows.find(r=>r.handIndex===i).strategyByAction[action]);
   history=[...history,action];
  }
  for(let a=0;a<2;a++)for(let i=0;i<n.orderedHands[a].length;i++){
   assert.equal(n.orderedHands[a][i],root.orderedHands[a][i]);
   close(n.rawReachWeights[a][i],expected[a][i]);
   const h=n.orderedHands[a][i];assertCards([...data.context.board,...hole(h)].map(card));
   const joint=expected[a][i]*n.orderedHands[a^1].reduce((sum,o,j)=>sum+(compatible(h,o)?expected[a^1][j]:0),0);
   close(n.compatibleJointMassWeights[a][i],joint);weights++;
  }
  const joint=n.compatibleJointMassWeights[0].reduce((a,b)=>a+b,0);close(n.jointReachMass,joint);close(n.unconditionalPathProbability,joint/3);
  if(n.terminal){assert.equal(n.actor,null);assert.equal(n.rows.length,0);continue;}
  assert.equal(n.rows.length,n.orderedHands[n.actor].length);
  for(const row of n.rows){
   assert.equal(row.hand,n.orderedHands[n.actor][row.handIndex]);
   const supported=n.compatibleJointMassWeights[n.actor][row.handIndex]>0;
   assert.equal(row.referenceUsableAtThisObservedNode,supported);
   close(row.strategyByAction.reduce((a,b)=>a+b,0),1);
   assert.equal(row.engineEVByAction.length,n.actions.length);
   const weighted=row.engineEVByAction.reduce((s,v,i)=>s+v*row.strategyByAction[i],0);close(weighted,row.engineStrategyWeightedEV,.02);
   if(!supported){unusableRows++;assert.ok(row.publishedActionEV.every(x=>x===null));continue;}
   validRows++;close(row.conditionalProbabilityWithinNode,row.compatibleJointMass/n.jointReachMass);
   assert.deepEqual(row.publishedActionEV,row.engineEVByAction);
   if(JSON.stringify(n.historyActions)===JSON.stringify(['Check','Bet(182)'])){
    let sum=0,mass=0;
    n.orderedHands[1].forEach((o,j)=>{
     if(!compatible(row.hand,o))return;
     const w=n.rawReachWeights[1][j];mass+=w;
     const c=compare(evaluate([...data.context.board,...hole(row.hand)].map(card)),evaluate([...data.context.board,...hole(o)].map(card)));
     sum+=w*(c>0?1:c<0?0:.5);
    });
    const callEV=914*sum/mass-182;
    close(row.publishedActionEV[n.actions.indexOf('Fold')],0,.02);
    close(row.publishedActionEV[n.actions.indexOf('Call')],callEV,.02);goldenCalls++;
    goldens.push({case:example.id,hand:row.hand,callEVIndependent:callEV,callEVEngine:row.publishedActionEV[n.actions.indexOf('Call')]});
   }
  }
 }
}
assert.equal(goldenCalls,4);assert.ok(unusableRows>0);
assert.deepEqual(goldens.map(x=>x.callEVIndependent).sort((a,b)=>a-b),[275,503.5,732,732]);
const revision=fs.readFileSync('research/solver-source/.git/HEAD','utf8').trim();assert.equal(data.sourceRevision,revision);
const files=['research/solver-probe/src/bin/export_probe.rs','research/solver-probe/Cargo.lock','research/solver-probe/target/release/export_probe.exe',dir+'engine-export-probe.json'];
const out={ok:true,status:'actual_export_layout_reach_and_current_EV_calibration_not_full_reference',sourceRevision:revision,scenarios:data.cases.length,nodes,physicalReachWeightsChecked:weights,usableDecisionHandRows:validRows,unusableDecisionHandRows:unusableRows,independentCurrentCallChecks:goldenCalls,goldens,
 fileHashes:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')])),
 limitations:['Tiny fixed river only, no chance-node export yet.','Locked policies, not an unconstrained equilibrium benchmark.','Full A72 requested graph remains unsolved.','No NL50 or learner validation.']};
fs.writeFileSync(dir+'engine-export-verification.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({...out,fileHashes:undefined,goldens:undefined}));
