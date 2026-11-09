import fs from 'node:fs';
import assert from 'node:assert/strict';
import {advanceScoped,gradeScoped} from './nevir-scoped-practice-grader.mjs';
import {continueTurnDefense} from './nevir-turn-defense-executor.mjs';
const dir='research/nevir-system/',read=f=>JSON.parse(fs.readFileSync(dir+f,'utf8'));
const source=read('defense-tree-evidence.json'),questions=read('mixed-model-practice-prompts.json').questions,refs=read('mixed-model-practice-teacher.json').references.filter(r=>r.family==='turn_defense');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
let terminals=0,publicChanceNodes=0,publicRiverEvents=0,decisionVisits=0,childComparisons=0,requiredChecks=0;
function terminal(t){const s=t.state;close(s.pot,0);close(s.heroStack+s.villainStack+s.foldedStacks,600);assert.ok(s.heroStack>=0&&s.villainStack>=0);terminals++;}
function walk(e){
 if(e.kind==='terminal'){terminal(e);assert.equal(e.opponentCardsRevealed,false);return e.state.heroStack;}
 const {question:q,reference:r}=e,b=q.body,s=b.state;
 close(s.pot+s.heroStack+s.villainStack+s.foldedStacks,600);assert.equal(b.opponentCardsRevealed,false);
 if(['next_decision','required_model_action'].includes(e.kind)){
  if(e.kind==='required_model_action'){requiredChecks++;assert.equal(r.givenActionExecutionOnly,true);assert.deepEqual(b.candidatePlans.map(p=>p.action),['check']);}
  else decisionVisits++;
  const evs=b.candidatePlans.map(p=>{
   const child=advanceScoped(r,q,{choiceId:p.choiceId});assert.equal(child.actualActionCommitted,true);
   const value=walk(child)-s.heroStack;close(value,r.planValues.find(v=>v.choiceId===p.choiceId).evBB);childComparisons++;
   const grade=gradeScoped(r,q,{choiceId:p.choiceId});assert.equal(grade.evidence.answerKind,e.kind==='required_model_action'?'given_action_execution':'given_plan_comparison');
   return value;
  });
  return s.heroStack+Math.max(...evs);
 }
 const tampered=structuredClone(e);tampered.question.body.state.pot+=1;assert.equal(continueTurnDefense(tampered,'fold').actualActionCommitted,false);
 if(e.kind==='awaiting_river'){
  publicChanceNodes++;close(e.availableRivers.reduce((n,c)=>n+c.probability,0),1);
  assert.equal(continueTurnDefense(e,'As').actualActionCommitted,false);
  assert.equal(continueTurnDefense(e,'Ks').actualActionCommitted,false);
  const total=b.currentRange.holdings.reduce((n,h)=>n+h.relativeWeight,0);
  return e.availableRivers.reduce((mean,c)=>{
   const legal=b.currentRange.holdings.filter(h=>!h.hole.includes(c.river));
   const lm=legal.reduce((n,h)=>n+h.relativeWeight,0);close(c.probability,lm/total/44);
   const child=continueTurnDefense(e,c.river);publicRiverEvents++;
   assert.deepEqual(child.question.body.currentRange.holdings.map(h=>h.id),legal.map(h=>h.id));
   return mean+c.probability*walk(child);
  },0);
 }
 if(e.kind==='waiting_opponent'){
  assert.equal(b.actor,'BTN');close(e.availableReplies.reduce((n,a)=>n+a.probability,0),1);
  assert.equal(continueTurnDefense(e,'unsupported').actualActionCommitted,false);
  return e.availableReplies.reduce((mean,a)=>mean+a.probability*walk(continueTurnDefense(e,a.reply)),0);
 }
 assert.equal(e.kind,'awaiting_showdown');assert.equal(b.board.length,5);assert.equal(b.actor,null);
 assert.equal(continueTurnDefense(e,'showdown',{showdownHoldingId:'missing'}).actualActionCommitted,false);
 const total=b.currentRange.holdings.reduce((n,h)=>n+h.relativeWeight,0);
 return b.currentRange.holdings.reduce((mean,h)=>{
  const t=continueTurnDefense(e,'showdown',{showdownHoldingId:h.id});terminal(t);
  const v=source.holdings.find(x=>x.id===h.id).rivers.find(x=>x.river===b.board[4]).share;
  close(t.heroShowdownShare,v);close(t.state.heroStack,s.heroStack+s.pot*v);
  return mean+h.relativeWeight/total*t.state.heroStack;
 },0);
}
const summaries=[];
for(const r of refs){
 const q=questions.find(q=>q.id===r.id),before=JSON.stringify(q);
 for(const p of q.body.candidatePlans){const e=advanceScoped(r,q,{choiceId:p.choiceId});assert.equal(e.actualActionCommitted,true);const value=walk(e)-90;close(value,r.planValues.find(v=>v.choiceId===p.choiceId).evBB);summaries.push({id:q.id,plan:p,executedEVBB:value,referenceEVBB:r.planValues.find(v=>v.choiceId===p.choiceId).evBB});}
 assert.equal(JSON.stringify(q),before);assert.equal(advanceScoped(r,q,{choiceId:'unknown'}).actualActionCommitted,false);
 assert.equal(advanceScoped(r,q,{action:'raise',to:45}).actualActionCommitted,false);
}
assert.equal(summaries.length,16);assert.ok(publicChanceNodes>0&&requiredChecks>0);
const baseline=refs.find(r=>r.contributors.some(c=>c.profile==='pressure')),q=questions.find(q=>q.id===baseline.id);
const chance=advanceScoped(baseline,q,{action:'call'});
const js=chance.availableRivers.find(c=>c.river==='Js'),four=chance.availableRivers.find(c=>c.river==='4c');
close(js.probability,20/(21*44));close(four.probability,1/44);assert.ok(js.probability<four.probability);
const on2s=continueTurnDefense(chance,'2s');
const checked=advanceScoped(on2s.reference,on2s.question,{action:'check'});
const facingBet=continueTurnDefense(checked,'bet');
assert.deepEqual(facingBet.question.body.currentRange.holdings.map(h=>h.id),['KK','JT']);
close(facingBet.question.body.state.toCall,21);
const foldPlan=facingBet.question.body.candidatePlans.find(p=>p.action==='fold'),callPlan=facingBet.question.body.candidatePlans.find(p=>p.action==='call');
close(facingBet.reference.planValues.find(v=>v.choiceId===callPlan.choiceId).evBB,-4.2);
assert.equal(gradeScoped(facingBet.reference,facingBet.question,{choiceId:foldPlan.choiceId}).correct,true);
const folded=advanceScoped(facingBet.reference,facingBet.question,{action:'fold'});close(folded.state.heroStack,79.5);close(folded.state.villainStack,121.5);
const output={ok:true,status:'author_given_turn_river_execution_not_app_or_real_learner',rootQuestions:4,rootPlanComparisons:16,childPlanComparisons:childComparisons,publicChanceNodes,publicRiverEvents,requiredCheckVisits:requiredChecks,decisionVisits,terminalCalls:terminals,all600BB:true,sourceEVsReconstructed:true,publicRiverNotUniform46:true,newCardAndActionConditioning:true,riverCheckIsGivenPolicyNotOptimalityClaim:true,realLearners:0,newCoarseContextCells:0,summaries};
fs.writeFileSync(dir+'turn-defense-execution-verification.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({...output,summaries:undefined}));
