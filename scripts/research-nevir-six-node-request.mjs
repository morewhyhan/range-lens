import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const dir='research/nevir-system/',raw=fs.readFileSync(dir+'full-walkthrough-reference.json'),walk=JSON.parse(raw);
const sha=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const gates=[['G_FLOP_HERO','S05','f01'],['G_FLOP_RESPONSE','S07','f02'],['G_TURN_HERO','S09','t01'],['G_TURN_RESPONSE','S11','t02'],['G_RIVER_HERO','S13','r01'],['G_RIVER_RESPONSE','S15','r02']];
const cboard=board=>[...board.slice(0,3).sort(),...board.slice(3)];
const nodes=gates.map(([gate,frame,event])=>{
 const i=walk.ledger.rows.findIndex(r=>r.id===event);assert.ok(i>=0);const row=walk.ledger.rows[i],s=row.before;
 const board=walk.reference.boardFromLink.slice(0,{flop:3,turn:4,river:5}[s.street]);
 const context={street:s.street,board,actor:row.actor,potBB:s.potBB,stacksBB:{SB:s.stacksBB.SB,BTN:s.stacksBB.BTN},streetPaidBB:{SB:s.streetPaidBB.SB,BTN:s.streetPaidBB.BTN},
  normalizedPriorEvents:walk.ledger.rows.slice(0,i).map(r=>({id:r.id,actor:r.actor,action:r.action,addedBB:r.addedBB??null}))};
 return {gate,lessonFrame:frame,observedEvent:event,expectedContext:context,contextFingerprint:sha(context),actingPhysicalHand:walk.selectedHands[row.actor==='SB'?'hero':'villain'],
  observedAction:{action:row.action,totalStreetPaidAfterBB:row.after.streetPaidBB[row.actor],addedBB:row.addedBB},
  requiredReferenceFields:['sourceIdentity','configurationId','actualContext','rootRangeIdentity','bothOrderedPrivateHandLists','bothRawReachWeights','actorStrategyByPhysicalHandAndAction','actorEVByPhysicalHandAndAction','actualMenuWithAmounts','continuationIdentityAndCoverage','errorAndUnits','selectedHandPathSupport'],
  suppliedReference:null,gateStatus:'not_received_not_gradeable'};
});
const expectedMoney=[[21,90,90,0,0],[25.2,85.8,90,4.2,0],[29.4,85.8,85.8,0,0],[51.45,63.75,85.8,22.05,0],[73.5,63.75,63.75,0,0],[137.25,0,63.75,63.75,0]];
nodes.forEach((n,i)=>assert.deepEqual([n.expectedContext.potBB,n.expectedContext.stacksBB.SB,n.expectedContext.stacksBB.BTN,n.expectedContext.streetPaidBB.SB,n.expectedContext.streetPaidBB.BTN],expectedMoney[i]));
// Context match is necessary, never sufficient to certify a strategy reference.
function assess(node,supplied){
 if(!supplied)return {status:'incomplete',missing:node.requiredReferenceFields,preciseStrategyReady:false};
 const missing=node.requiredReferenceFields.filter(k=>supplied[k]===undefined||supplied[k]===null);
 const actual=supplied.actualContext,expected=node.expectedContext,mismatch=[];
 if(actual){
  if(actual.actor!==expected.actor)mismatch.push('actor');
  if(actual.street!==expected.street)mismatch.push('street');
  if(!Array.isArray(actual.board)||JSON.stringify(cboard(actual.board))!==JSON.stringify(cboard(expected.board)))mismatch.push('board_suits_or_street_order');
  if(actual.potBB!==expected.potBB)mismatch.push('pot');
  for(const role of ['SB','BTN'])for(const field of ['stacksBB','streetPaidBB'])if(actual[field]?.[role]!==expected[field][role])mismatch.push(field+'.'+role);
  if(JSON.stringify(actual.normalizedPriorEvents)!==JSON.stringify(expected.normalizedPriorEvents))mismatch.push('prior_history');
 }
 if(supplied.nodeAggregatePercent&&!supplied.actorStrategyByPhysicalHandAndAction)missing.push('node_aggregate_is_not_physical_hand_strategy');
 if(supplied.selectedHandPathSupport?.allObservedChoicesPositive===false)mismatch.push('selected_hand_zero_reach_or_zero_action_probability');
 return {status:mismatch.length?'context_or_path_mismatch':missing.length?'incomplete':'requires_independent_source_and_numeric_review',missing,mismatch,preciseStrategyReady:false};
}
const audits=nodes.map(n=>({gate:n.gate,result:assess(n,n.suppliedReference)}));assert.ok(audits.every(a=>a.result.status==='incomplete'&&!a.result.preciseStrategyReady));
const negativeFixtures=[];
for(const [name,modify]of [['wrong_actor',c=>c.actor='BTN'],['wrong_suit',c=>c.board[0]='As'],['wrong_pot',c=>c.potBB+=1],['same_money_different_history',c=>c.normalizedPriorEvents=[]]]){
 const actual=structuredClone(nodes[0].expectedContext);modify(actual);const result=assess(nodes[0],{actualContext:actual});assert.equal(result.status,'context_or_path_mismatch');negativeFixtures.push({name,result});
}
const zero=assess(nodes[0],{actualContext:nodes[0].expectedContext,selectedHandPathSupport:{allObservedChoicesPositive:false}});assert.equal(zero.status,'context_or_path_mismatch');negativeFixtures.push({name:'zero_selected_path',result:zero});
const aggregate=assess(nodes[4],{actualContext:nodes[4].expectedContext,nodeAggregatePercent:{allin:57.5,check:35.1,small:7.4}});assert.ok(aggregate.missing.includes('node_aggregate_is_not_physical_hand_strategy'));negativeFixtures.push({name:'aggregate_only',result:aggregate});
const out={status:'six_node_acquisition_request_not_received_strategy',purpose:'Reconstruct the original public-source NL500 lesson candidate only; separate target NL50 reference still required.',sourceLedgerSHA256:crypto.createHash('sha256').update(raw).digest('hex'),
 sourceIdentity:{article:walk.reference.article,solutionLink:walk.reference.solutionLink,sourcePresetLabel:'NL500 six-player100BB',exactRakeParameters:null,exactRootRanges:null,errorStatistic:null,immutableSourceVersion:null},
 lessonsHandsAreAuthorSelected:true,requiredSharedConfiguration:['root ranges and both seats','exact rake and cap convention','starting depth/pot and currency unit','actual finite action tree and rounding','source version and lawful use','convergence/error definition and achieved value'],nodes,
 perHandSupportRule:'Verify selected pair compatibility, positive joint reach at every observed node, and positive policy probability for every chosen observed action. Failure requires revising the demonstration, not inventing a frequency.',
 alternativeExecutionRule:'Per-action EV can assess a proposal only within the declared menu; replaying a different action requires its actual continuation reference, not the main-line next snapshot.',
 receivedNodes:0,preciseStrategyReadyNodes:0,newNL50Reference:false,learnerTrials:0};
fs.writeFileSync(dir+'six-node-reference-request.json',JSON.stringify(out,null,2)+'\n');
fs.writeFileSync(dir+'six-node-reference-request-verification.json',JSON.stringify({ok:true,status:'request_context_and_rejection_checks_not_reference_quality_pass',nodes:6,moneyChecks:6,incompleteReferences:audits,negativeFixtures,receivedRealReferenceNodes:0,preciseStrategyReadyNodes:0},null,2)+'\n');
console.log(JSON.stringify({ok:true,nodes:6,moneyChecks:6,rejectionCases:negativeFixtures.length,receivedRealReferenceNodes:0,preciseStrategyReadyNodes:0}));
