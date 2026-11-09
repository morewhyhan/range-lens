import fs from 'node:fs';
import assert from 'node:assert/strict';
import {advanceScoped,gradeScoped} from './nevir-scoped-practice-grader.mjs';
import {finishRiverSize} from './nevir-river-size-executor.mjs';
const dir='research/nevir-system/',read=f=>JSON.parse(fs.readFileSync(dir+f,'utf8'));
const prompts=read('mixed-model-practice-prompts.json'),teachers=read('mixed-model-practice-teacher.json'),source=read('size-comparison-evidence.json');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const traces=[];let comparisons=0,rejectedZeroReplies=0,terminalCount=0,hasWin=false,hasLose=false,hasTie=false;
for(const r of teachers.references.filter(r=>r.family==='river_size')){
 const q=prompts.questions.find(q=>q.id===r.id),before=JSON.stringify(q);
 for(const plan of q.body.candidatePlans){
  const execution=advanceScoped(r,q,{choiceId:plan.choiceId});
  assert.equal(execution.actualActionCommitted,true);
  assert.equal(execution.question.body.opponentCardsRevealed,false);
  assert.ok(!Object.hasOwn(execution.question.body,'opponentHole'));
  const amount=plan.to??0;close(execution.question.body.state.heroStack,95.25-amount);
  close(execution.question.body.state.pot,10+amount);close(execution.question.body.state.toCall,amount);
  assert.equal(execution.question.body.actor,amount?'BB':null);
  const holdings=q.body.currentRange.holdings,total=holdings.reduce((n,h)=>n+h.relativeWeight,0);
  let weighted=0;
  for(const h of holdings){
   const rule=q.body.futureModel.afterBet.find(p=>p.holding===h.id);
   const call=amount?rule[amount===5?'callBet5':'callBet10']:1;
   const share=source.groups.find(g=>g.id===h.id).equity;
   if(amount&&call<1){
    const end=finishRiverSize(execution,'fold');assert.equal(end.kind,'terminal');
    assert.equal(end.opponentCardsRevealed,false);assert.ok(!Object.hasOwn(end,'opponentHole'));
    close(end.state.heroStack,105.25);close(end.state.villainStack,95.25);
    const refund=end.events.find(e=>e.type==='refund_unmatched');close(refund.amount,amount);
    close(end.events.find(e=>e.type==='award').amount,10);
    weighted+=h.relativeWeight/total*(1-call)*(end.state.heroStack-95.25);terminalCount++;
   }
   if(call>0){
    const end=finishRiverSize(execution,amount?'call':'showdown',{showdownHoldingId:h.id});assert.equal(end.kind,'terminal');
    close(end.heroShowdownShare,share);assert.equal(end.opponentCardsRevealed,true);
    // Independent gross-pot payout, not the adapter's delta field.
    close(end.state.heroStack,95.25-amount+share*(10+2*amount));
    close(end.state.villainStack,95.25-amount+(1-share)*(10+2*amount));
    close(end.state.heroStack+end.state.villainStack+399.5,600);
    weighted+=h.relativeWeight/total*call*(end.state.heroStack-95.25);terminalCount++;
    hasWin ||=share===1;hasLose ||=share===0;hasTie ||=share===.5;
   }
  }
  const reference=r.planValues.find(v=>v.choiceId===plan.choiceId).evBB;close(weighted,reference);comparisons++;
  for(const reply of amount?['fold','call']:['showdown']){
   const replyMass=holdings.reduce((n,h)=>{const policy=q.body.futureModel.afterBet.find(p=>p.holding===h.id),c=amount?policy[amount===5?'callBet5':'callBet10']:1;return n+h.relativeWeight*(reply==='fold'?1-c:c);},0);
   if(!replyMass){assert.equal(finishRiverSize(execution,reply,{showdownHoldingId:holdings[0].id}).actualActionCommitted,false);rejectedZeroReplies++;}
  }
  const tampered=structuredClone(execution);tampered.question.body.state.pot+=1;
  assert.equal(finishRiverSize(tampered,'fold').actualActionCommitted,false);
  const changedAmount=structuredClone(execution);changedAmount.reference.amount=amount===5?10:5;
  assert.equal(finishRiverSize(changedAmount,'call',{showdownHoldingId:holdings[0].id}).actualActionCommitted,false);
  assert.equal(finishRiverSize(execution,'raise').actualActionCommitted,false);
  if(!amount||holdings.some(h=>q.body.futureModel.afterBet.find(p=>p.holding===h.id)[amount===5?'callBet5':'callBet10']>0))assert.equal(finishRiverSize(execution,amount?'call':'showdown',{showdownHoldingId:'not_a_candidate'}).actualActionCommitted,false);
  traces.push({questionId:q.id,action:plan,weightedTerminalDeltaBB:weighted,referenceEVBB:reference,kind:execution.kind});
 }
 assert.equal(JSON.stringify(q),before);
 assert.equal(advanceScoped(r,q,{choiceId:'unknown'}).actualActionCommitted,false);
 assert.equal(advanceScoped(r,q,{action:'bet',to:7}).actualActionCommitted,false);
 const demonstration=advanceScoped(r,q,r.bestActions[0],{provenance:'demonstration_after_feedback'});
 assert.equal(demonstration.reference.provenance,'demonstration_after_feedback');
}
assert.equal(comparisons,24);assert.ok(hasWin&&hasLose&&hasTie);
const main=teachers.references.find(r=>r.family==='river_size'&&r.contributors.some(c=>c.example==='equityFallsButLargeWins'));
const mainQ=prompts.questions.find(q=>q.id===main.id),small=mainQ.body.candidatePlans.find(p=>p.to===5);
assert.equal(gradeScoped(main,mainQ,{choiceId:small.choiceId}).correct,false);
const wrong=advanceScoped(main,mainQ,{choiceId:small.choiceId});close(wrong.reference.amount,5);
const out={ok:true,status:'author_execution_checks_not_app_or_learner_results',sizeQuestions:8,planEVsReconstructed:comparisons,terminalCalls:terminalCount,rejectedZeroReplies,winLoseTieCovered:hasWin&&hasLose&&hasTie,wrongLegalAmountPreserved:true,all600BB:true,immutableInputs:true,unknownDoesNotCommit:true,traces};
fs.writeFileSync(dir+'river-size-execution-verification.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({...out,traces:undefined}));
