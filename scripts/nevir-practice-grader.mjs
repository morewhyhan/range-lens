// Isolated research grader. No app import, storage, learner database, or network access.
import crypto from 'node:crypto';
const close=(a,b)=>Math.abs(a-b)<1e-9;
export const fingerprint=body=>crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
export function validAction(answer){
 if(!answer||typeof answer!=='object')return false;
 if(['fold','call','unknown'].includes(answer.action))return true;
 return answer.action==='raise'&&Number.isFinite(answer.to)&&answer.to>=72.5&&answer.to<=83&&Math.abs(answer.to*100-Math.round(answer.to*100))<1e-7;
}
export function rootEV(reference,answer){
 if(!validAction(answer)||answer.action==='unknown')return null;
 if(answer.action==='fold')return 0;
 if(answer.action==='call')return -27.5;
 return reference.foldShare*97.5-(1-reference.foldShare)*(answer.to-17.5);
}
export function gradeRoot(reference,question,answer,{answerHelpUsed=false}={}){
 if(question.id!==reference.id||fingerprint(question.body)!==reference.inputFingerprint)return {gradeable:false,correct:null,reason:'author_input_mismatch_not_learner_error'};
 const ev=rootEV(reference,answer);
 return {gradeable:true,correct:ev!==null&&close(ev,reference.bestEV),evLossBB:ev===null?null:reference.bestEV-ev,
  unknownCountsAsWrong:answer?.action==='unknown',reason:!validAction(answer)?'invalid_or_illegal_answer':answer.action==='unknown'?'unknown':undefined,
  feedback:{bestEV:reference.bestEV,bestActions:reference.bestActions,foldEV:0,callEV:-27.5,minRaiseEV:reference.minRaiseEV,jamEV:reference.jamEV,evScope:'Root reference assumes the given optimal continuation, not arbitrary later learner behavior.'},
  evidence:{attemptWithAnswersHidden:!answerHelpUsed,realLearnerObserved:false,exposureHistoryKnown:false,claim:'An eligible answer format, not evidence that a learner has independently completed it.'}};
}
function terminal(hero,villain,events,extra={}){
 if(Math.abs(hero+villain+399-600)>1e-8)throw Error('Terminal money mismatch');
 return {kind:'terminal',state:{pot:0,heroStack:hero,villainStack:villain,foldedStacks:399,actor:null},events,...extra};
}
export function advanceRoot(reference,question,answer,{observedReply='continue',feedbackAlreadyShown=true,provenance='learner_committed'}={}){
 if(question.id!==reference.id||fingerprint(question.body)!==reference.inputFingerprint)return {kind:'invalid_author_input',actualActionCommitted:false};
 if(!validAction(answer)||answer.action==='unknown')return {kind:'awaiting_explicit_action_or_announced_demonstration',actualActionCommitted:false};
 if(!['learner_committed','demonstration_after_feedback'].includes(provenance))throw Error('Action provenance required');
 if(answer.action==='fold')return terminal(65.5,135.5,['Hero fold','Refund27.5 to opponent','Award matched70 to opponent'],{opponentCardsRevealed:false,provenance});
 if(answer.action==='call')return terminal(38,163,['Hero call27.5','Showdown: all declared candidates beat hero','Award125 to opponent'],{opponentCardsRevealedAtShowdown:true,provenance});
 const R=answer.to,add=R-17.5;
 if(observedReply==='fold'){
  if(reference.foldShare<=0)throw Error('Cannot select a zero-probability reply');
  return terminal(163,38,[`Hero raise_to${R}, add${add}`,'Observed opponent fold',`Refund${R-45} to hero`,'Award matched125 to hero'],{opponentCardsRevealed:false,provenance});
 }
 if(observedReply!=='continue'||reference.foldShare>=1)throw Error('Invalid or zero-probability reply');
 if(R===83)return terminal(0,201,['Hero allin_to83, add65.5','Opponent call38','Showdown: hero loses','Award201 to opponent'],{opponentCardsRevealedAtShowdown:true,provenance});
 const remaining=83-R;
 const body={board:question.body.board,hero:question.body.hero,heroSeat:'SB',villainSeat:'BTN',actor:'SB',pot:118+R,heroStack:remaining,villainStack:0,toCall:remaining,foldedStacks:399,
  observedHistory:[...question.body.observedHistory,`Hero raise_to${R}`, 'Opponent allin_to83'],
  currentConditionalRange:{classes:[{id:'AKs',physicalHoldingWeight:1},{id:'KQo',physicalHoldingWeight:1-reference.KQoFoldProbability}],removeBoardAndHeroCards:true,weightsApplyAfterObservedContinue:true},
  legalActions:['fold','call'],prompt:'轮到你了，按当前局面选择。',selectionPolicy:'Compare current fold/call alternatives under the given conditional range.'};
 if(!close(body.pot+body.heroStack+399,600))throw Error('Continuation money mismatch');
 const id=reference.id+'-next';
 return {kind:'next_decision',question:{id,body},reference:{id,inputFingerprint:fingerprint(body),remaining,raiseTo:R,bestEV:0,bestActions:[{action:'fold'}]},
  events:[`Hero raise_to${R}, add${add}`,'Observed opponent allin_to83, add38'],provenance,
  evidenceEligibility:{previousFeedbackShown:feedbackAlreadyShown,wholeSequenceCanBeClaimedIndependent:false,
   potentialBlindResearchTrace:!feedbackAlreadyShown&&provenance==='learner_committed',realLearnerObserved:false,
   reason:feedbackAlreadyShown?'Parent explanation may expose the continuation answer.':'No feedback exposure declared; actual participant/exposure evidence still required.'}};
}
export function gradeContinuation(reference,question,answer){
 if(question.id!==reference.id||fingerprint(question.body)!==reference.inputFingerprint)return {gradeable:false,correct:null,reason:'author_input_mismatch_not_learner_error'};
 const valid=['fold','call','unknown'].includes(answer?.action);
 const ev=answer?.action==='fold'?0:answer?.action==='call'?-reference.remaining:null;
 return {gradeable:true,correct:valid&&ev===0,evLossBB:ev===null?null:-ev,unknownCountsAsWrong:answer?.action==='unknown',feedback:{foldEV:0,callEV:-reference.remaining}};
}
export function finishContinuation(reference,question,answer){
 if(!gradeContinuation(reference,question,answer).gradeable)return {kind:'invalid_author_input',actualActionCommitted:false};
 if(answer?.action==='fold')return terminal(83-reference.raiseTo,118+reference.raiseTo,['Hero fold',`Refund${reference.remaining} to opponent`,`Award matched${35+2*reference.raiseTo} to opponent`],{opponentCardsRevealed:false});
 if(answer?.action==='call')return terminal(0,201,[`Hero call${reference.remaining}`,'Showdown: hero loses','Award201 to opponent'],{opponentCardsRevealedAtShowdown:true});
 return {kind:'awaiting_explicit_action_or_announced_demonstration',actualActionCommitted:false};
}
export function newAttemptMemory({unit,mode}){
 const first=new Map();let correct=0,wrong=0;
 return {record(id,result){
   if(!result.gradeable)return {counted:false,reason:'invalid_author_input',correct,wrong};
   if(first.has(id))return {counted:false,first:first.get(id),correct,wrong};
   const hidden=result.evidence?.attemptWithAnswersHidden;
   const item={correct:result.correct,answerHelpUsed:typeof hidden==='boolean'?!hidden:null};first.set(id,item);
   result.correct?correct++:wrong++;
   return {counted:true,first:item,correct,wrong};
  },snapshot(){return {unit,mode,correct,wrong,questions:first.size,persistence:'none'};}};
}
