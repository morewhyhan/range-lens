// Research-only finite turn/river adapter. Opponent policies never inspect hero's hand.
import {fingerprint} from './nevir-practice-grader.mjs';
import {DECK,card,assertCards,evaluate,compare} from '../src/poker.js';
const near=(a,b)=>Math.abs(a-b)<1e-8;
const invalid=reason=>({kind:'invalid_execution_input',reason,actualActionCommitted:false});
const mass=n=>n.range.reduce((s,h)=>s+h.relativeWeight,0);
function invariant(n){const s=n.state;return near(s.pot+s.heroStack+s.villainStack+s.foldedStacks,600)&&near(s.pot,n.basePot+s.heroPut+s.villainPut)&&near(s.heroStack+s.heroPut,n.streetHeroStart)&&near(s.villainStack+s.villainPut,n.streetVillainStart);}
function fromQuestion(q){
 if(q.body.defenseExecutionNode)return structuredClone(q.body.defenseExecutionNode);
 const b=q.body;
 return {board:b.board,hero:b.hero,heroSeat:b.heroSeat,villainSeat:b.villainSeat,range:structuredClone(b.currentRange.holdings),state:structuredClone(b.state),history:[...b.observedHistory],phase:'turn_root',basePot:21,streetHeroStart:90,streetVillainStart:90,
  model:{raise:b.futureModel.afterHeroRaise30,jam:b.futureModel.afterHeroAllin90}};
}
function plans(n){
 const F={action:'fold',label:'弃牌'},C={action:'call',amount:n.state.toCall,label:`跟${n.state.toCall}`};
 const list=n.phase==='turn_root'?[F,C,{action:'raise',to:30,label:'加到30'},{action:'raise',to:90,label:'全下90'}]:['turn_facing_jam','river_facing_bet'].includes(n.phase)?[F,C]:n.phase==='river_check'?[{action:'check',label:'按给定后续过牌'}]:[];
 return list.map((p,i)=>({choiceId:'p'+i,...p}));
}
function share(n,h){assertCards([...n.board,...n.hero,...h.hole].map(card));const c=compare(evaluate([...n.board,...n.hero].map(card)),evaluate([...n.board,...h.hole].map(card)));return c>0?1:c<0?0:.5;}
function fold(n,by){
 const s=n.state,amount=Math.abs(s.heroPut-s.villainPut),heroRefund=s.heroPut>s.villainPut;
 s.pot-=amount;s[heroRefund?'heroStack':'villainStack']+=amount;
 n.events=[...(n.events??[]),{type:'refund_unmatched',to:heroRefund?n.heroSeat:n.villainSeat,amount},{type:'award',to:by==='hero'?n.villainSeat:n.heroSeat,amount:s.pot}];
 s[by==='hero'?'villainStack':'heroStack']+=s.pot;s.pot=0;s.heroPut=0;s.villainPut=0;s.toCall=0;n.phase='terminal';return n;
}
function commit(n,p){
 n=structuredClone(n);n.events=[];n.history.push('SB '+p.action+(p.to===undefined?'':'_to'+p.to));
 if(p.action==='fold')return fold(n,'hero');
 if(p.action==='check'){n.phase='river_response';return n;}
 const to=p.action==='call'?n.state.villainPut:p.to,add=to-n.state.heroPut;
 n.state.heroPut=to;n.state.heroStack-=add;n.state.pot+=add;n.events.push({type:'hero_'+p.action,add,to});
 n.state.toCall=Math.abs(n.state.heroPut-n.state.villainPut);
 if(p.action==='call')n.phase=n.board.length===5?'showdown':'chance';
 else n.phase=to===30?'after_raise30':'after_jam90';
 return n;
}
function riverBet(h,river){const c=card(river);if(h.id==='KK')return c.suit!=='s'||[2,3].includes(c.rank)?1:0;if(h.id==='KJ')return c.suit==='s'||c.rank===14?0:1;if(h.id==='JT')return 1;throw Error('Unsupported holding');}
function likelihoods(n,h){
 if(n.phase==='after_raise30'){const r=n.model.raise.find(r=>r.holding===h.id);return {fold:r.fold,call:r.call,jam90:r.jam};}
 if(n.phase==='after_jam90'){const p=n.model.jam.find(r=>r.holding===h.id).callProbability;return {fold:1-p,call:p};}
 if(n.phase==='river_response'){const p=riverBet(h,n.board[4]);return {check:1-p,bet:p};}
 return {};
}
function responses(n){const m={};for(const h of n.range)for(const [reply,p]of Object.entries(likelihoods(n,h))){if(!Number.isFinite(p)||p<0||p>1)throw Error('Invalid policy');m[reply]=(m[reply]??0)+h.relativeWeight*p;}return Object.entries(m).filter(([,v])=>v>1e-12).map(([reply,v])=>({reply,probability:v/mass(n)}));}
function respond(n,reply){
 n=structuredClone(n);n.events=[];
 n.range=n.range.map(h=>({...h,relativeWeight:h.relativeWeight*(likelihoods(n,h)[reply]??0)})).filter(h=>h.relativeWeight>0);
 n.history.push('BTN '+reply);
 if(reply==='fold')return fold(n,'villain');
 if(reply==='check'){n.phase='showdown';return n;}
 const to=reply==='jam90'?90:reply==='bet'?n.basePot/2:n.state.heroPut,add=to-n.state.villainPut;
 n.state.villainPut=to;n.state.villainStack-=add;n.state.pot+=add;n.state.toCall=n.state.villainPut-n.state.heroPut;
 n.events.push({type:'opponent_'+reply,to,add});
 n.phase=reply==='jam90'?'turn_facing_jam':reply==='bet'?'river_facing_bet':'chance';return n;
}
function rivers(n){
 const known=[...n.board,...n.hero];
 return DECK.filter(c=>!known.includes(c.id)).map(c=>({river:c.id,probability:n.range.reduce((s,h)=>s+(h.hole.includes(c.id)?0:h.relativeWeight/44),0)/mass(n)})).filter(r=>r.probability>0);
}
function deal(n,river){
 n=structuredClone(n);n.range=n.range.filter(h=>!h.hole.includes(river));n.board.push(river);n.history.push('deal '+river);
 n.basePot=n.state.pot;n.streetHeroStart=n.state.heroStack;n.streetVillainStart=n.state.villainStack;
 n.state.heroPut=0;n.state.villainPut=0;n.state.toCall=0;n.events=[{type:'deal_river',river}];
 n.phase=n.state.heroStack===0&&n.state.villainStack===0?'showdown':'river_check';return n;
}
function expectedEnd(n){
 if(n.phase==='terminal')return n.state.heroStack;
 if(n.phase==='showdown')return n.state.heroStack+n.state.pot*n.range.reduce((s,h)=>s+h.relativeWeight*share(n,h),0)/mass(n);
 if(n.phase==='chance')return rivers(n).reduce((s,r)=>s+r.probability*expectedEnd(deal(n,r.river)),0);
 if(plans(n).length)return Math.max(...plans(n).map(p=>expectedEnd(commit(n,p))));
 return responses(n).reduce((s,r)=>s+r.probability*expectedEnd(respond(n,r.reply)),0);
}
function packet(n,provenance,feedbackAlreadyShown){
 if(n.phase==='terminal')return {kind:'terminal',actualActionCommitted:true,state:{...n.state,actor:null},events:n.events,opponentCardsRevealed:false,provenance,feedbackAlreadyShown};
 if(!invariant(n))throw Error('Defense state invariant mismatch');
 const options=plans(n),actor=options.length?'SB':['chance','showdown'].includes(n.phase)?null:'BTN';
 const body={board:n.board,hero:n.hero,heroSeat:n.heroSeat,villainSeat:n.villainSeat,state:n.state,actor,observedHistory:n.history,currentRange:{holdings:n.range},opponentCardsRevealed:false,defenseExecutionNode:n};
 const reference={provenance,feedbackAlreadyShown};
 let kind;
 if(options.length){
  body.candidatePlans=options;body.unknownOption={choiceId:'unknown',label:'我不知道'};
  body.taskKind=n.phase==='river_check'?'execute_given_continuation_not_strategy_comparison':'compare_given_finite_plans';
  const values=options.map(p=>({choiceId:p.choiceId,evBB:expectedEnd(commit(n,p))-n.state.heroStack})),bestEV=Math.max(...values.map(v=>v.evBB));
  Object.assign(reference,{domain:'finite_candidate_plans',family:'turn_defense',planValues:values,bestEV,bestActions:values.filter(v=>near(v.evBB,bestEV)).map(v=>({choiceId:v.choiceId})),executionAdapterReady:true,givenActionExecutionOnly:n.phase==='river_check'});
  kind=n.phase==='river_check'?'required_model_action':'next_decision';
 }else kind=n.phase==='chance'?'awaiting_river':n.phase==='showdown'?'awaiting_showdown':'waiting_opponent';
 reference.inputFingerprint=fingerprint(body);const id='DE-'+reference.inputFingerprint.slice(0,16);reference.id=id;
 return {kind,actualActionCommitted:true,question:{id,body},reference,events:n.events??[],...(kind==='awaiting_river'?{availableRivers:rivers(n)}:kind==='waiting_opponent'?{availableReplies:responses(n)}:{}),
  evidence:{computedConditionalRangeProvided:true,realLearnerObserved:false,wholeSequenceIndependent:false}};
}
export function advanceTurnDefense(r,q,answer,{provenance='learner_committed',feedbackAlreadyShown=true}={}){
 if(r.family!=='turn_defense'||q.id!==r.id||fingerprint(q.body)!==r.inputFingerprint)return invalid('author_input_mismatch');
 if(!['learner_committed','demonstration_after_feedback'].includes(provenance))return invalid('explicit_action_provenance_required');
 if(answer?.action==='unknown')return {kind:'awaiting_explicit_action_or_announced_demonstration',actualActionCommitted:false};
 if(!q.body.defenseExecutionNode){
  const policy=q.body.futureModel?.opponentRiverPolicy;
  if(JSON.stringify(q.body.board)!==JSON.stringify(['Ks','7s','2d','3d'])||JSON.stringify(q.body.hero)!==JSON.stringify(['As','Qs'])||
   policy?.KK!=='Bet unless river is a spade other than 2s/3s'||policy?.KJ!=='Check on any spade or Ace, otherwise bet'||policy?.JT!=='Always bet'||
   policy?.size!=='Half pot on the river following a turn call or raise-call; amounts remain within stacks'||
   q.body.futureModel.heroFutureMenu?.riverHero!=='Always check first, then fold or call a bet; no river raise or lead evaluated'||q.body.futureModel.uniformLegalRivers!==true)return invalid('model_configuration_not_supported');
 }
 const n=fromQuestion(q);if(!invariant(n))return invalid('state_mismatch');
 const p=plans(n).find(p=>p.action===answer?.action&&(p.to===undefined||near(p.to,answer.to))&&(answer.amount===undefined||near(p.amount,answer.amount)));
 if(!p)return invalid('outside_compared_plans');
 return packet(commit(n,p),provenance,feedbackAlreadyShown);
}
export function continueTurnDefense(execution,event,{showdownHoldingId}={}){
 const {question:q,reference:r}=execution??{};
 if(!q||!r||fingerprint(q.body)!==r.inputFingerprint)return invalid('pending_fingerprint_mismatch');
 const n=structuredClone(q.body.defenseExecutionNode);if(!n||!invariant(n))return invalid('pending_state_mismatch');
 if(n.phase==='chance'){
  if(!rivers(n).some(c=>c.river===event))return invalid('illegal_or_zero_probability_river');
  return packet(deal(n,event),r.provenance,r.feedbackAlreadyShown);
 }
 if(n.phase==='showdown'){
  if(event!=='showdown')return invalid('awaiting_showdown_only');
  const h=n.range.find(h=>h.id===showdownHoldingId&&h.relativeWeight>0);if(!h)return invalid('holding_not_in_positive_conditional_range');
  const e=share(n,h),s=n.state,p=s.pot;s.heroStack+=p*e;s.villainStack+=p*(1-e);s.pot=0;s.heroPut=0;s.villainPut=0;s.toCall=0;
  if(!near(s.heroStack+s.villainStack+s.foldedStacks,600))throw Error('Defense terminal money mismatch');
  return {kind:'terminal',actualActionCommitted:true,state:{...s,actor:null},opponentCardsRevealed:true,opponentHole:h.hole,heroShowdownShare:e,events:[{type:'showdown',opponentHole:h.hole,heroShare:e},{type:'award',heroAmount:p*e,villainAmount:p*(1-e)}],provenance:r.provenance,feedbackAlreadyShown:r.feedbackAlreadyShown};
 }
 if(!responses(n).some(r=>r.reply===event))return invalid('zero_probability_or_unsupported_response');
 return packet(respond(n,event),r.provenance,r.feedbackAlreadyShown);
}
