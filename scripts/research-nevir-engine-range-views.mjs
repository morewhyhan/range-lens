import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {jointFromFactoredReach,rangeView} from './nevir-range-view.mjs';
const dir='research/nevir-system/',raw=fs.readFileSync(dir+'engine-export-probe.json'),data=JSON.parse(raw);
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
let publicViews=0,privateViews=0,unsupportedViews=0,checkedEdges=0;
const records=[];
for(const example of data.cases){
 const byHistory=new Map(example.nodes.map(n=>[JSON.stringify(n.historyIndices),n]));
 for(const node of example.nodes){
  const joint=jointFromFactoredReach(node,data.context.board);near(joint.totalMass,node.jointReachMass);
  const views=[];
  for(let owner=0;owner<2;owner++){
   const v=rangeView(joint,{owner});publicViews++;
   for(const [i,h]of node.orderedHands[owner].entries()){
    const actual=v.support.find(r=>[...r.hole].sort().join('')===h.match(/.{2}/g).sort().join(''))?.mass??0;
    near(actual,node.compatibleJointMassWeights[owner][i]);
   }
   views.push(v);
  }
  for(let viewer=0;viewer<2;viewer++)for(const knownHolding of node.orderedHands[viewer]){privateViews++;views.push(rangeView(joint,{owner:viewer^1,viewer,knownHolding}));}
  for(const v of views){
   assert.equal(v.matrix.length,169);
   near(v.matrix.reduce((s,c)=>s+c.mass,0),v.denominator);
   if(v.denominator>0){near(v.support.reduce((s,h)=>s+h.probability,0),1);assert.ok(v.support.every(h=>!h.blocked));}
   else{unsupportedViews++;assert.equal(v.support.length,0);assert.ok(v.matrix.every(c=>c.probability===null));}
  }
  if(node.historyIndices.length){
   const parent=byHistory.get(JSON.stringify(node.historyIndices.slice(0,-1))),action=node.historyIndices.at(-1),parentJoint=jointFromFactoredReach(parent,data.context.board);
   for(const pair of parentJoint.pairs){
    const s=parent.rows.find(r=>r.handIndex===pair.indices[parent.actor]).strategyByAction[action];
    const childMass=joint.pairs.find(p=>p.indices.every((v,i)=>v===pair.indices[i]))?.mass??0;
    near(childMass,pair.mass*s);
   }
   checkedEdges++;
  }
  records.push({case:example.id,history:node.historyActions,historyIndices:node.historyIndices,actor:node.actor,jointMass:joint.totalMass,views});
 }
}
// Explicit counterexample already present in the actual engine calibration.
const splitCase=data.cases.find(c=>c.id!=='all_bet');assert.ok(splitCase);
const prior=records.find(r=>r.case===splitCase.id&&JSON.stringify(r.history)===JSON.stringify(['Check']));
const after=records.find(r=>r.case===splitCase.id&&JSON.stringify(r.history)===JSON.stringify(['Check','Bet(182)']));assert.ok(prior&&after);
const probability=(r,owner,cell,viewer='public',holding=null)=>r.views.find(v=>v.owner===owner&&v.viewer===viewer&&(holding===null||v.knownHolding.join('')===holding)).matrix.find(c=>c.cell===cell).probability;
near(probability(prior,0,'AA'),1/3);near(probability(after,0,'AA'),1/2);
near(probability(prior,0,'AA',1,'QdQc'),1/2);near(probability(after,0,'AA',1,'QdQc'),1/2);
const impossible=after.views.find(v=>v.viewer===1&&v.knownHolding.join('')==='AsQc');assert.equal(impossible.status,'unsupported_under_declared_reference');
const negativeChecks=[];
const root=structuredClone(data.cases[0].nodes[0]);
 for(const [name,change]of [['negative_weight',n=>n.rawReachWeights[0][0]=-1],['misaligned_weight_vector',n=>n.rawReachWeights[0].pop()],['duplicate_physical_holding',n=>n.orderedHands[0][1]=n.orderedHands[0][0]],['positive_board_conflict',n=>n.orderedHands[0][0]='KsQh'],['trailing_characters_in_holding',n=>n.orderedHands[0][0]='QsQhX']]){
 const n=structuredClone(root);change(n);assert.throws(()=>jointFromFactoredReach(n,data.context.board));negativeChecks.push(name);
}
assert.throws(()=>rangeView(jointFromFactoredReach(root,data.context.board),{owner:0,viewer:'public',knownHolding:'AsAh'}));negativeChecks.push('public_view_with_hidden_private_condition');
// Synthetic adapter invariant, not an additional observed engine strategy.
const scaled=structuredClone(root);scaled.rawReachWeights[0][0]*=.5;
const privateRoot=rangeView(jointFromFactoredReach(root,data.context.board),{owner:1,viewer:0,knownHolding:root.orderedHands[0][0]});
const privateScaled=rangeView(jointFromFactoredReach(scaled,data.context.board),{owner:1,viewer:0,knownHolding:root.orderedHands[0][0]});
assert.deepEqual(privateRoot.matrix,privateScaled.matrix);near(privateRoot.jointSubsetMass*.5,privateScaled.jointSubsetMass);
const sourceHash=crypto.createHash('sha256').update(raw).digest('hex');
const out={status:'actual_engine_export_range_view_adapter_calibration',source:{file:'engine-export-probe.json',sha256:sourceHash,revision:data.sourceRevision},
 method:'Reconstruct compatible positive private-hand pairs from BOTH raw reach vectors; marginalize or condition before 169-cell aggregation. Compare each action edge with parent joint mass times the actual exported actor policy.',
 knownLimitations:['Only the existing two tiny locked river models.','No chance-node or folded-player bunching support verified by this adapter.','No full-range requested flop strategy, no equilibrium quality claim, no NL50 or learner result.','A zero-reference branch may still be a legal real action; requires a new reference to continue, never call it a learner legality error.'],
 checks:{nodes:records.length,publicViews,privateViews,unsupportedViews,checkedActionEdges:checkedEdges,negativeChecks,syntheticOwnReachFactorRemovalInvariant:true},
 teachingCounterexample:{case:splitCase.id,historyBefore:prior.history,historyAfter:after.history,publicOOP_AA:[1/3,1/2],knownIP_QdQc_opponentAA:[1/2,1/2],ownKnownIP_AsQcBet:'not_supported_by_this_locked_reference_not_illegal'},
 records,learnerTrials:0,productChanged:false,newStrategyCoverage:false};
fs.writeFileSync(dir+'engine-range-view-evidence.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,...out.checks}));
