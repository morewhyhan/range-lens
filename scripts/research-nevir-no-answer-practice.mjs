import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fingerprint,gradeRoot,advanceRoot,gradeContinuation,finishContinuation,newAttemptMemory} from './nevir-practice-grader.mjs';
const dir='research/nevir-system/';
const model=JSON.parse(fs.readFileSync(dir+'bluff-reraise-model.json','utf8'));
assert.deepEqual(model.context.board,['Kh','9h','2c','7d','4s']);
assert.deepEqual(model.context.current,{pot:97.5,heroStack:65.5,villainStack:38,heroPut:17.5,villainPut:45,toCall:27.5,foldedStacks:399});
const percentages=[40,45,48,50,52,54,55,57,60,65,70,80,90,100];
const publicQuestions=[],references=[];
const expectedCounts={hearts:[3,6],clubs:[2,7],Aheart_Qclub:[3,7],Aclub_Qheart:[2,6]};
const gcd=(a,b)=>b?gcd(b,a%b):a;
for(const row of model.rows){
 const [C,F]=expectedCounts[row.id],n=C+F;assert.equal(row.legal.length,n);
 const probabilities=percentages.map(x=>({numerator:x,denominator:100,kind:[52,55,100].includes(x)?'published_parameter_profile':'new_parameter_same_published_mechanism'}));
 let numerator=110*n,denominator=305*F;const d=gcd(numerator,denominator);numerator/=d;denominator/=d;
 probabilities.push({numerator,denominator,kind:'exact_indifference_boundary_same_published_mechanism'});
 for(const probability of probabilities){
  const p=probability.numerator/probability.denominator,foldShare=F*p/n;
  const body={board:model.context.board,hero:row.hero,heroSeat:'SB',villainSeat:'BTN',actor:'SB',pot:97.5,heroStack:65.5,villainStack:38,heroPut:17.5,villainPut:45,toCall:27.5,foldedStacks:399,
   observedHistory:model.context.observedAuthorHistory,
   currentRange:{classes:['AKs','KQo'],physicalHoldingWeight:1,removeBoardAndHeroCards:true},
   responseModel:{AKs:'Always continue',KQoFoldProbability:{numerator:probability.numerator,denominator:probability.denominator},otherKQo:'Continue',continueMeaning:'Jam_to83 after any hero raise below83; call38 if hero allin83',sameProbabilitiesAtEveryLegalRaiseSize:true},
   legalActions:{fold:true,callAmount:27.5,raiseToInterval:[72.5,83],practiceChipUnitBB:.01,chipUnitMeaning:'Author arithmetic grid, not a platform denomination claim.'},
   prompt:'轮到你了。按题设比较当前选择。',options:[{action:'fold',label:'弃牌'},{action:'call',label:'跟27.5'},{action:'raise',to:72.5,label:'再加到72.5'},{action:'raise',to:83,label:'全下83'},{action:'unknown',label:'我不知道'}],
   notice:'当前范围与回应是完整给定的作者模型，不是现实对手频率。其它合法再加金额也可按题设检验。'};
  const inputFingerprint=fingerprint(body),id='Q-'+inputFingerprint.slice(0,16);
  const minRaiseEV=foldShare*97.5-(1-foldShare)*55,jamEV=foldShare*97.5-(1-foldShare)*65.5;
  const bestEV=Math.max(0,minRaiseEV),bestActions=[];
  if(Math.abs(bestEV)<1e-9)bestActions.push({action:'fold'});
  if(Math.abs(minRaiseEV-bestEV)<1e-9)bestActions.push({action:'raise',to:72.5});
  publicQuestions.push({id,body});references.push({id,inputFingerprint,heroVariant:row.id,KQoFoldProbability:p,foldShare,minRaiseEV,jamEV,bestEV,bestActions,parameterIdentity:probability.kind,scope:'Current-node application inside one declared mechanism family, not NL50 or unseen-situation transfer.'});
 }
}
assert.equal(publicQuestions.length,60);assert.equal(new Set(publicQuestions.map(q=>q.id)).size,60);
// Prompts must not contain derived values, counts, recommendation or selected future reply.
const forbidden=new Set(['bestActions','bestEV','minRaiseEV','jamEV','foldShare','counts','isCorrect','selectedOutcome','actualOpponentHole']);
function noAnswerLeak(x){if(!x||typeof x!=='object')return;for(const[k,v]of Object.entries(x)){assert.ok(!forbidden.has(k),`Prompt leak: ${k}`);noAnswerLeak(v);}}
publicQuestions.forEach(noAnswerLeak);
let amountChecks=0,transitionChecks=0;const distribution={foldOnly:0,raiseOnly:0,tied:0};
for(let i=0;i<publicQuestions.length;i++){
 const q=publicQuestions[i],r=references[i];distribution[r.bestActions.length===2?'tied':r.bestActions[0].action==='fold'?'foldOnly':'raiseOnly']++;
 for(const action of r.bestActions)assert.equal(gradeRoot(r,q,action).correct,true);
 assert.equal(gradeRoot(r,q,{action:'raise',to:74}).correct,false);
 const [C,F]=expectedCounts[r.heroVariant],p=q.body.responseModel.KQoFoldProbability;
 const chance=F/(C+F)*p.numerator/p.denominator;
 // Independent endpoint oracle from final stack163 on a fold,10.5 on continued min-raise.
 const oracle=chance*163+(1-chance)*10.5-65.5;assert.ok(Math.abs(oracle-r.minRaiseEV)<1e-9);
 for(let cents=7250;cents<=8300;cents++){
  const to=cents/100,answer={action:'raise',to},g=gradeRoot(r,q,answer);
  const endpoint=chance*163+(1-chance)*(83-to)-65.5;
  assert.ok(g.gradeable);assert.ok(Math.abs(g.evLossBB-(r.bestEV-endpoint))<1e-8);amountChecks++;
 }
 for(const action of [{action:'fold'},{action:'call'},{action:'raise',to:72.5},{action:'raise',to:74},{action:'raise',to:83}]){
  for(const reply of action.action==='raise'?['fold','continue']:['continue']){
   const next=advanceRoot(r,q,action,{observedReply:reply,feedbackAlreadyShown:true});transitionChecks++;
   if(next.kind==='terminal'){
    assert.ok(Math.abs(next.state.heroStack+next.state.villainStack+399-600)<1e-8);
    const expected=action.action==='fold'?65.5:action.action==='call'?38:reply==='fold'?163:0;
    assert.equal(next.state.heroStack,expected);
   }
   else{
    assert.equal(next.kind,'next_decision');assert.equal(next.evidenceEligibility.wholeSequenceCanBeClaimedIndependent,false);
    assert.equal(next.reference.raiseTo,action.to);assert.equal(next.question.body.heroStack,83-action.to);
    assert.equal(next.question.body.currentConditionalRange.classes[1].physicalHoldingWeight,1-r.KQoFoldProbability);
    assert.equal(gradeContinuation(next.reference,next.question,{action:'fold'}).correct,true);
    assert.equal(gradeContinuation(next.reference,next.question,{action:'call'}).correct,false);
    for(const a of [{action:'fold'},{action:'call'}]){const end=finishContinuation(next.reference,next.question,a);assert.ok(Math.abs(end.state.heroStack+end.state.villainStack+399-600)<1e-8);assert.equal(end.state.heroStack,a.action==='fold'?83-action.to:0);}
   }
  }
 }
 assert.equal(gradeRoot(r,q,{action:'unknown'}).correct,false);
 assert.equal(advanceRoot(r,q,{action:'unknown'}).actualActionCommitted,false);
 assert.equal(gradeRoot(r,q,{action:'raise',to:72.49}).correct,false);
 assert.equal(advanceRoot(r,q,{action:'raise',to:72.49}).actualActionCommitted,false);
 const tampered=structuredClone(q);tampered.body.pot=98;
 assert.equal(gradeRoot(r,tampered,{action:'fold'}).gradeable,false);
 const authorErrorMemory=newAttemptMemory({unit:'3.5',mode:'answers_hidden'});
 authorErrorMemory.record(q.id,gradeRoot(r,tampered,{action:'fold'}));assert.equal(authorErrorMemory.snapshot().questions,0);
 const mem=newAttemptMemory({unit:'3.5',mode:'answers_hidden'});
 mem.record(q.id,gradeRoot(r,q,{action:'unknown'}));mem.record(q.id,gradeRoot(r,q,r.bestActions[0]));
 assert.deepEqual([mem.snapshot().wrong,mem.snapshot().correct,mem.snapshot().questions],[1,0,1]);
 assert.equal(newAttemptMemory({unit:'3.5',mode:'another_mode'}).snapshot().questions,0);
}
assert.equal(distribution.tied,4);
// A correct first move does not certify the plan actually executed afterwards.
for(const r of references){
 const alwaysCallAfterContinue=r.foldShare*163+(1-r.foldShare)*0-65.5;
 assert.ok(Math.abs(alwaysCallAfterContinue-r.jamEV)<1e-8);
 assert.ok(Math.abs((r.minRaiseEV-(1-r.foldShare)*10.5)-alwaysCallAfterContinue)<1e-8);
}
const linkedPolicyCase=references.find(r=>r.heroVariant==='hearts'&&Math.abs(r.KQoFoldProbability-.55)<1e-9);
assert.ok(linkedPolicyCase.minRaiseEV>0&&linkedPolicyCase.jamEV<0);
const common={status:'public_answers_hidden_same_mechanism_practice_not_frozen_test',familyCount:1,source:'bluff-reraise-model.json',total:60,
 administration:{showCurrentQuestionOnly:true,noCorrectHighlights:true,requiredInputsRemainAccessible:true,defaultTrainingFeedback:'immediate_after_answer',laterAnswersAfterFeedbackNotIndependent:true,notHeldout:true,noActualLearnerResponsesCollected:true,noDatabase:true}};
fs.writeFileSync(dir+'no-answer-practice-prompts.json',JSON.stringify({...common,questions:publicQuestions},null,2)+'\n');
fs.writeFileSync(dir+'no-answer-practice-teacher.json',JSON.stringify({...common,status:'author_reference_keys_not_learner_results',references},null,2)+'\n');
const verification={ok:true,status:'synthetic_grader_and_continuation_checks_not_learning_evidence',rootCases:60,referenceActionDistribution:distribution,legalRaiseAmountChecks:amountChecks,scriptedActionReplyTransitions:transitionChecks,
 checks:{promptNoDerivedAnswerFields:true,terminal600BB:true,unknownWrongWithoutCommittingAction:true,firstAnswerLocked:true,modesMemoryIsolated:true,invalidAuthorInputNotLearnerError:true,legalWrongActionNotSilentlyCorrected:true,feedbackContaminatedContinuationMarked:true,tiedActionsBothAccepted:true,wholePlanValueNotInferredFromFirstCorrectMove:true},
 limits:['Only one authored mechanism family; call and allin are never uniquely best in this bank.','Parameter grid is not the distribution of real poker hands or an EV-to-bb/100 estimate.','Published profiles and new parameter cases are public practice, not frozen unseen transfer evidence.','Immediate explanations can expose later decisions; no full independent sequence claim.','Scripted traces are validator inputs, not real learners or measured learning outcomes.']};
verification.sourceHashes=Object.fromEntries([dir+'bluff-reraise-model.json','scripts/nevir-practice-grader.mjs'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
verification.linkedPolicyCounterexample={kind:'author_mathematical_counterexample_not_observed_learner',heroVariant:'hearts',KQoFoldProbability:.55,firstMinRaiseWithOptimalContinuationEV:linkedPolicyCase.minRaiseEV,minRaiseThenAlwaysCallShortJamEV:linkedPolicyCase.jamEV,reason:'The lost option to fold after a continuation is weighted by the continuation probability. Do not sum unweighted local errors.'};
fs.writeFileSync(dir+'no-answer-practice-verification.json',JSON.stringify(verification,null,2)+'\n');
console.log(JSON.stringify({ok:true,rootCases:60,distribution,legalRaiseAmountChecks:amountChecks,scriptedTransitions:transitionChecks,status:verification.status},null,2));
