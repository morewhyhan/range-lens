import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const dir='research/nevir-system/';
const read=p=>JSON.parse(fs.readFileSync(dir+p,'utf8').replace(/^\uFEFF/,''));
const tree=read('flop-tree-preflight.json'),req=read('reference-request-btn-bb-a72.json'),mem=read('memory-snapshot.json');
assert.equal(tree.inputFingerprint,req.inputFingerprint);
assert.equal(tree.sourceRevision,fs.readFileSync('research/solver-source/.git/HEAD','utf8').trim());
assert.equal(tree.status,'full_original_flop_graph_built_memory_estimated_not_solved');
assert.equal(tree.solveStarted,false);assert.equal(tree.strategyMemoryAllocated,false);
const stack=req.moneyUnits.effectiveStack,pot=req.moneyUnits.startingPot;
// Separate public-history replay. Action amounts are street totals, not added chips.
function replay(history){
  let actor=0,streetPaid=[0,0],total=[0,0],checked=false,ended=false,street=0;
  for(const action of history){
    assert.ok(!ended,'History extends a terminal');
    const other=actor^1,toCall=streetPaid[other]-streetPaid[actor];
    if(action==='Fold'){assert.ok(toCall>0);ended=true;continue;}
    if(action==='Check'){
      assert.equal(toCall,0);
      if(checked){street++;streetPaid=[0,0];actor=0;checked=false;if(street===3)ended=true;}
      else{checked=true;actor=other;}
    }else if(action==='Call'){
      assert.ok(toCall>0);total[actor]+=toCall;streetPaid[actor]+=toCall;
      street++;streetPaid=[0,0];actor=0;checked=false;
      if(street===3||total.some(x=>x===stack))ended=true;
    }else{
      const match=/^(Bet|Raise|AllIn)\((\d+)\)$/.exec(action);assert.ok(match,action);
      const target=Number(match[2]),add=target-streetPaid[actor];
      assert.ok(target>streetPaid[other]);assert.ok(add>0);
      if(match[1]==='Bet')assert.equal(toCall,0);
      if(match[1]==='Raise')assert.ok(toCall>0);
      total[actor]+=add;streetPaid[actor]=target;
      if(match[1]==='AllIn')assert.equal(total[actor],stack);
      actor=other;checked=false;
    }
    for(const x of total)assert.ok(x>=0&&x<=stack);
  }
  assert.equal(pot+total[0]+total[1]+(stack-total[0])+(stack-total[1])+req.moneyUnits.foldedStacks,req.moneyUnits.totalTableUnits);
  return total;
}
const counts=[0,0,0];let histories=0;
for(const node of tree.abstractNodes){
  counts[node.street]++;assert.deepEqual(node.totalBet,replay(node.history));histories++;
}
assert.deepEqual(counts,tree.abstractNodesByStreet);
assert.equal(tree.physicalExpansionUpperNodesIgnoringSuitIsomorphism,counts[0]+49*counts[1]+49*48*counts[2]);
const expectedRoot='[Check, Bet(182), AllIn(9750)]';
assert.equal(tree.actualAbstractMenus.rootBB,expectedRoot);assert.equal(tree.actualAbstractMenus.afterBBCheck,expectedRoot);
assert.equal(Math.round(.33*pot),182);assert.equal(Math.round(2.5*182),455);
assert.equal(Math.round(.75*(pot+2*182)),686);
for(const [role,n]of [['oop',358],['ip',507]]){
  const hands=tree.orderedPrivateHands[role];assert.equal(hands.length,n);assert.equal(new Set(hands).size,n);
  for(const hand of hands)for(const card of hand.match(/.{2}/g))assert.ok(!['As','7h','2d'].includes(card));
}
const compressed=tree.fullGameEstimatedBytes.compressed;
// Author execution guard, not the solver's full-process peak prediction.
const reserve=2*1024**3,budget=Math.max(0,Math.min(mem.availablePhysicalBytes*.6,mem.availablePhysicalBytes-reserve));
const result={ok:true,status:'full_tree_and_public_history_amounts_checked_not_solved',inputFingerprint:req.inputFingerprint,
  abstractNodeHistoriesChecked:histories,counts,actualEngineEstimatedBytes:tree.fullGameEstimatedBytes,
  memorySnapshot:mem,executionGuard:{rule:'At most 60% of measured free RAM, and leave at least 2GiB; excludes unmeasured solver scratch/peak.',budgetBytes:Math.floor(budget),compressedFits:compressed<=budget},
  fileHashes:Object.fromEntries(['flop-tree-preflight.json','memory-snapshot.json'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(dir+p)).digest('hex')])),
  limits:['Full original graph was built without strategy storage allocation.','Independent money replay checks exported histories, not game-theoretic convergence or an independent solver.','Conservative physical node bound ignores suit isomorphism; it is not the actual node count.','No full flop solve, strategy answer, NL50 reference or learner outcome.']};
fs.writeFileSync(dir+'flop-tree-preflight-verification.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
