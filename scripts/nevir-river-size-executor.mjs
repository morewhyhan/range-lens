// Research adapter only. No app imports apart from the physical card evaluator.
import {fingerprint} from './nevir-practice-grader.mjs';
import {card,evaluate,compare,assertCards} from '../src/poker.js';
const near=(a,b)=>Math.abs(a-b)<1e-8;
const invalid=reason=>({kind:'invalid_execution_input',reason,actualActionCommitted:false});
function validRoot(r,q){return r.family==='river_size'&&r.id===q.id&&fingerprint(q.body)===r.inputFingerprint;}
function money(s){return near(s.pot+s.heroStack+s.villainStack+s.foldedStacks,600);}
export function advanceRiverSize(r,q,action,{provenance='learner_committed',feedbackAlreadyShown=true}={}){
 if(!validRoot(r,q))return invalid('author_input_mismatch');
 if(!['learner_committed','demonstration_after_feedback'].includes(provenance))return invalid('explicit_action_provenance_required');
 const b=q.body,s=structuredClone(b.state);
 if(!money(s)||b.actor!==b.heroSeat||s.toCall!==0||s.heroPut!==0||s.villainPut!==0||b.board.length!==5)return invalid('root_state_not_supported');
 if(action?.action==='unknown')return {kind:'awaiting_explicit_action_or_announced_demonstration',actualActionCommitted:false};
 const plan=b.candidatePlans.find(p=>p.action===action?.action&&(p.to===undefined||near(p.to,action.to)));
 if(!plan||!['check','bet'].includes(plan.action))return invalid('outside_compared_plans');
 const amount=plan.action==='bet'?plan.to:0;
 if(![0,5,10].includes(amount)||amount>s.heroStack)return invalid('unsupported_amount');
 s.pot+=amount;s.heroStack-=amount;s.heroPut=amount;s.toCall=amount;
 const body={board:b.board,hero:b.hero,heroSeat:b.heroSeat,villainSeat:b.villainSeat,
  actor:amount?b.villainSeat:null,state:s,currentRange:structuredClone(b.currentRange),
  observedHistory:[...b.observedHistory,amount?`BTN bet${amount}`:'BTN check'],
  stage:amount?'wait_opponent':'wait_showdown',opponentCardsRevealed:false};
 if(!money(s))throw Error('Execution money mismatch');
 return {kind:amount?'waiting_opponent':'awaiting_showdown',actualActionCommitted:true,
  question:{id:q.id+'-executed-'+amount,body},reference:{rootQuestion:q,rootReference:r,inputFingerprint:fingerprint(body),amount,provenance,feedbackAlreadyShown},
  events:[{type:amount?'hero_bet':'hero_check',amount,pot:s.pot}],
  evidence:{realLearnerObserved:false,wholeSequenceIndependent:false}};
}
export function finishRiverSize(execution,reply,{showdownHoldingId}={}){
 const {question:q,reference:r}=execution??{};
 if(!q||!r||fingerprint(q.body)!==r.inputFingerprint||!validRoot(r.rootReference,r.rootQuestion))return invalid('execution_or_root_fingerprint_mismatch');
 const original=r.rootQuestion.body,b=q.body,s=structuredClone(b.state),amount=r.amount;
 const rebuilt=advanceRiverSize(r.rootReference,r.rootQuestion,{action:amount?'bet':'check',to:amount},{provenance:r.provenance,feedbackAlreadyShown:r.feedbackAlreadyShown});
 if(!rebuilt.question||fingerprint(rebuilt.question.body)!==r.inputFingerprint)return invalid('committed_amount_does_not_match_pending_state');
 if(!money(s))return invalid('money_mismatch');
 const range=original.currentRange.holdings;
 if(!['fold','call','showdown'].includes(reply)||(amount===0?reply!=='showdown':reply==='showdown'))return invalid('reply_not_available_at_this_stage');
 const likelihood=h=>{
  if(!amount)return 1;
  const policy=original.futureModel.afterBet.find(p=>p.holding===h.id);
  const call=policy?.[amount===5?'callBet5':'callBet10'];
  if(!Number.isFinite(call)||call<0||call>1)throw Error('Missing response probability');
  return reply==='call'?call:1-call;
 };
 const remaining=range.map(h=>({...h,relativeWeight:h.relativeWeight*likelihood(h)})).filter(h=>h.relativeWeight>0);
 const mass=remaining.reduce((n,h)=>n+h.relativeWeight,0);
 if(!mass)return invalid('zero_probability_reply');
 const total=range.reduce((n,h)=>n+h.relativeWeight,0),conditional=remaining.map(h=>({...h,probability:h.relativeWeight/mass}));
 const events=[];let revealed=null,share=null;
 if(reply==='fold'){
  // No matching contribution from BB: return hero's entire new bet first.
  s.pot-=amount;s.heroStack+=amount;events.push({type:'opponent_fold'},{type:'refund_unmatched',to:original.heroSeat,amount});
  s.heroStack+=s.pot;events.push({type:'award',to:original.heroSeat,amount:s.pot});s.pot=0;
 }else{
  const holding=remaining.find(h=>h.id===showdownHoldingId);
  if(!holding)return invalid('showdown_holding_not_in_positive_conditional_range');
  if(reply==='call'){
   s.villainStack-=amount;s.pot+=amount;events.push({type:'opponent_call',amount});
  }
  const cards=[...b.board,...b.hero,...holding.hole].map(card);assertCards(cards);
  const result=compare(evaluate([...b.board,...b.hero].map(card)),evaluate([...b.board,...holding.hole].map(card)));
  share=result>0?1:result<0?0:.5;
  revealed=holding.hole;
  events.push({type:'showdown',heroShare:share,opponentHole:revealed});
  const pot=s.pot;s.heroStack+=share*pot;s.villainStack+=(1-share)*pot;s.pot=0;
  events.push({type:'award',heroAmount:share*pot,villainAmount:(1-share)*pot});
 }
 s.heroPut=0;s.villainPut=0;s.toCall=0;
 if(!money(s))throw Error('Terminal money mismatch');
 return {kind:'terminal',actualActionCommitted:true,state:{...s,actor:null},events,
  observedHistory:[...b.observedHistory,reply==='showdown'?'showdown':`BB ${reply}`],
  opponentCardsRevealed:revealed!==null,...(revealed?{opponentHole:revealed,heroShowdownShare:share}:{}),
  replyProbability:mass/total,conditionalRange:conditional,
  provenance:r.provenance,feedbackAlreadyShown:r.feedbackAlreadyShown,
  currentDecisionRealizedDeltaBB:s.heroStack-original.state.heroStack,
  evidence:{realLearnerObserved:false,conditionalRangeIsModelInferenceNotRevealedCards:true,wholeSequenceIndependent:false}};
}
