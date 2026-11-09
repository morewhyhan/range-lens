import fs from 'node:fs';
import assert from 'node:assert/strict';
import {advanceScoped,gradeScoped} from './nevir-scoped-practice-grader.mjs';
import {replyRiverValue} from './nevir-river-value-executor.mjs';
const dir='research/nevir-system/',read=f=>JSON.parse(fs.readFileSync(dir+f,'utf8'));
const questions=read('mixed-model-practice-prompts.json').questions,refs=read('mixed-model-practice-teacher.json').references.filter(r=>r.family==='river_value');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
let terminalCalls=0,childDecisions=0,comparisons=0,pendingCalls=0,foldRefunds=0;
function terminal(s){close(s.pot,0);close(s.heroStack+s.villainStack+s.foldedStacks,600);assert.ok(s.heroStack>=0&&s.villainStack>=0);terminalCalls++;}
function endValue(execution){
 if(execution.kind==='terminal'){
  terminal(execution.state);assert.equal(execution.opponentCardsRevealed,false);
  assert.ok(!Object.hasOwn(execution,'opponentHole'));
  for(const e of execution.events)if(e.type==='refund_unmatched'){assert.ok(e.amount>=0);foldRefunds++;}
  return execution.state.heroStack;
 }
 if(execution.kind==='next_decision'){
  childDecisions++;
  const {question:q,reference:r}=execution;close(q.body.state.toCall,q.body.state.villainPut-q.body.state.heroPut);
  assert.equal(q.body.actor,'SB');
  let best=-Infinity;
  for(const p of q.body.candidatePlans){
   const child=advanceScoped(r,q,{choiceId:p.choiceId});assert.equal(child.actualActionCommitted,true);
   const ev=endValue(child)-q.body.state.heroStack;
   close(ev,r.planValues.find(v=>v.choiceId===p.choiceId).evBB);comparisons++;
   assert.equal(gradeScoped(r,q,{choiceId:p.choiceId}).correct,Math.abs(ev-r.bestEV)<1e-8);
   best=Math.max(best,ev);
  }
  return q.body.state.heroStack+best;
 }
 assert.ok(['awaiting_showdown','waiting_opponent'].includes(execution.kind),execution.kind);pendingCalls++;
 const b=execution.question.body,s=b.state;
 close(s.pot+s.heroStack+s.villainStack+s.foldedStacks,600);
 close(s.pot,35+s.heroPut+s.villainPut);
 assert.equal(b.opponentCardsRevealed,false);
 const tampered=structuredClone(execution);tampered.question.body.state.pot+=.5;
 assert.equal(replyRiverValue(tampered,'fold').actualActionCommitted,false);
 assert.equal(replyRiverValue(execution,'impossible').actualActionCommitted,false);
 if(execution.kind==='awaiting_showdown'){
  assert.equal(b.actor,null);close(s.heroPut,s.villainPut);
  let mean=0,mass=b.currentRange.holdings.reduce((n,h)=>n+h.relativeWeight,0);
  for(const h of b.currentRange.holdings){
   const done=replyRiverValue(execution,'showdown',{showdownHoldingId:h.id});terminal(done.state);assert.equal(done.opponentCardsRevealed,true);
   const share=h.id==='KK'?0:1;
   close(done.heroShowdownShare,share);close(done.state.heroStack,s.heroStack+share*s.pot);
   mean+=h.relativeWeight/mass*done.state.heroStack;
  }
  assert.equal(replyRiverValue(execution,'showdown',{showdownHoldingId:'missing'}).actualActionCommitted,false);
  return mean;
 }
 assert.equal(b.actor,'BTN');close(s.toCall,Math.max(0,s.heroPut-s.villainPut));
 close(execution.availableReplies.reduce((n,r)=>n+r.probability,0),1);
 return execution.availableReplies.reduce((mean,r)=>mean+r.probability*endValue(replyRiverValue(execution,r.reply)),0);
}
const summaries=[];
for(const r of refs){
 const q=questions.find(q=>q.id===r.id),before=JSON.stringify(q);
 for(const p of q.body.candidatePlans){
  const execution=advanceScoped(r,q,{choiceId:p.choiceId});assert.equal(execution.actualActionCommitted,true);
  const value=endValue(execution)-q.body.state.heroStack;
  close(value,r.planValues.find(v=>v.choiceId===p.choiceId).evBB);comparisons++;
  summaries.push({id:q.id,plan:p,evFromExecutedTreeBB:value,sourceEVBB:r.planValues.find(v=>v.choiceId===p.choiceId).evBB});
 }
 assert.equal(JSON.stringify(q),before);
 assert.equal(advanceScoped(r,q,{choiceId:'unknown'}).actualActionCommitted,false);
 assert.equal(advanceScoped(r,q,{action:'raise',to:72.5}).actualActionCommitted,false);
 const demo=advanceScoped(r,q,r.bestActions[0],{provenance:'demonstration_after_feedback'});assert.equal(demo.provenance??demo.reference?.provenance,'demonstration_after_feedback');
}
assert.equal(refs.length,13);assert.ok(childDecisions>0&&terminalCalls>0);
const root=refs.find(r=>r.contributors.some(c=>c.profile==='induces'&&c.node==='river_start'));
const rootQ=questions.find(q=>q.id===root.id);
const checked=advanceScoped(root,rootQ,{action:'check'});
const facingBet=replyRiverValue(checked,'bet17_5');
assert.deepEqual(facingBet.question.body.currentRange.holdings.map(h=>h.id).sort(),['77','AK','KK','QT']);
const raised=advanceScoped(facingBet.reference,facingBet.question,{action:'raise',to:45});
const facingJam=replyRiverValue(raised,'jam83');
assert.deepEqual(facingJam.question.body.currentRange.holdings.map(h=>h.id).sort(),['77','KK']);
close(facingJam.question.body.state.toCall,38);close(facingJam.question.body.state.pot,163);
assert.equal(gradeScoped(facingJam.reference,facingJam.question,{action:'call'}).correct,true);
const wrongFold=advanceScoped(facingJam.reference,facingJam.question,{action:'fold'});
close(wrongFold.state.heroStack,38);close(wrongFold.state.villainStack,163);
const called=advanceScoped(facingJam.reference,facingJam.question,{action:'call'});
const lost=replyRiverValue(called,'showdown',{showdownHoldingId:'KK'});close(lost.state.heroStack,0);close(lost.state.villainStack,201);
const output={ok:true,status:'author_given_tree_execution_not_app_or_real_learner',rootQuestions:13,rootPlanComparisons:summaries.length,allNodePlanComparisons:comparisons,childDecisionVisits:childDecisions,pendingVisits:pendingCalls,terminalCalls,foldRefunds,all600BB:true,sourceEVsReconstructed:true,hiddenHoldingNotUsedToSelectHeroAction:true,explicitCheckBetRaiseJamCallAndLosingShowdown:true,wrongLaterFoldKeepsActual38:true,summaries,realLearners:0,newCoarseContextCells:0};
fs.writeFileSync(dir+'river-value-execution-verification.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({...output,summaries:undefined}));
