// Isolated author model. All maxima are chosen at public conditional nodes.
import {fingerprint} from './nevir-practice-grader.mjs';
import {card,evaluate,compare,assertCards} from '../src/poker.js';
const near=(a,b)=>Math.abs(a-b)<1e-8;
const invalid=reason=>({kind:'invalid_execution_input',reason,actualActionCommitted:false});
const total=n=>n.range.reduce((s,h)=>s+h.relativeWeight,0);
function invariant(n){const s=n.state;return near(s.pot+s.heroStack+s.villainStack+s.foldedStacks,600)&&near(s.pot,35+s.heroPut+s.villainPut)&&near(s.heroStack,83-s.heroPut)&&near(s.villainStack,83-s.villainPut);}
function share(n,h){assertCards([...n.board,...n.hero,...h.hole].map(card));const c=compare(evaluate([...n.board,...n.hero].map(card)),evaluate([...n.board,...h.hole].map(card)));return c>0?1:c<0?0:.5;}
function sourceNode(q){
 if(q.body.valueExecutionNode)return structuredClone(q.body.valueExecutionNode);
 const b=q.body,f=b.futureModel,s=b.state;
 return {board:b.board,hero:b.hero,heroSeat:b.heroSeat,villainSeat:b.villainSeat,state:structuredClone(s),range:structuredClone(b.currentRange.holdings),history:[...b.observedHistory],
  model:{check:f.afterHeroCheck,lead:f.afterHeroBet17_5,raise45:f.afterHeroRaise45,jam:f.afterHeroJam83},
  phase:s.toCall===0?'root':s.villainStack===0?'facing_jam':s.heroPut>0?'facing_raise':'facing_bet'};
}
function plans(n){
 const F={action:'fold',label:'弃牌'},C={action:'call',amount:n.state.villainPut-n.state.heroPut,label:`跟${n.state.villainPut-n.state.heroPut}`};
 let p;
 if(n.phase==='root')p=[{action:'check',label:'过牌'},{action:'bet',to:17.5,label:'下注17.5'}];
 else if(n.phase==='facing_jam')p=[F,C];
 else if(n.phase==='facing_raise')p=[F,C,{action:'raise',to:83,label:'全下83'}];
 else if(n.phase==='facing_bet')p=[F,C,{action:'raise',to:45,label:'加到45'},{action:'raise',to:83,label:'全下83'}];
 else return [];
 return p.map((a,i)=>({choiceId:'p'+i,...a}));
}
function settleFold(n,folded){
 const s=n.state,refund=Math.abs(s.heroPut-s.villainPut),toHero=s.heroPut>s.villainPut;
 s.pot-=refund;s[toHero?'heroStack':'villainStack']+=refund;
 n.events=[...(n.events??[]),{type:'refund_unmatched',to:toHero?n.heroSeat:n.villainSeat,amount:refund},{type:'award',to:folded==='hero'?n.villainSeat:n.heroSeat,amount:s.pot}];
 s[folded==='hero'?'villainStack':'heroStack']+=s.pot;s.pot=0;s.heroPut=0;s.villainPut=0;s.toCall=0;n.phase='terminal';return n;
}
function commit(n,plan){
 n=structuredClone(n);n.events=[];
 if(plan.action==='fold'){n.history.push('SB fold');return settleFold(n,'hero');}
 if(plan.action==='call'){
  const add=n.state.villainPut-n.state.heroPut;n.state.heroStack-=add;n.state.heroPut+=add;n.state.pot+=add;n.state.toCall=0;n.phase='showdown';n.history.push(`SB call${add}`);n.events.push({type:'hero_call',amount:add});return n;
 }
 if(plan.action==='check'){n.phase='after_check';n.history.push('SB check');n.events.push({type:'hero_check'});return n;}
 const add=plan.to-n.state.heroPut;n.state.heroPut=plan.to;n.state.heroStack-=add;n.state.pot+=add;n.state.toCall=n.state.heroPut-n.state.villainPut;
 n.phase=plan.to===17.5?'after_lead':plan.to===45?'after_raise45':'after_jam';n.history.push(`SB ${plan.action}_to${plan.to}`);n.events.push({type:'hero_'+plan.action,to:plan.to,add});return n;
}
function responseDistribution(n,h){
 const row=kind=>{const r=n.model[kind]?.find(r=>r.holding===h.id);if(!r)throw Error('Missing given response for '+kind+'/'+h.id);return r;};
 if(n.phase==='after_check'){const p=row('check').bet17_5Probability;return {check:1-p,bet17_5:p};}
 if(n.phase==='after_lead'){
  const r=row('lead').response;
  if(r==='half_call_half_fold')return {call:.5,fold:.5};
  return {[r==='raise_to45'?'raise45':r]:1};
 }
 if(n.phase==='after_raise45'){const r=row('raise45').response;return {[r==='jam_to83'?'jam83':r==='call_to45'?'call':r]:1};}
 if(n.phase==='after_jam'){const p=row('jam').callProbability;return {call:p,fold:1-p};}
 return {};
}
function replies(n){
 const m={};for(const h of n.range)for(const [a,p]of Object.entries(responseDistribution(n,h))){if(!Number.isFinite(p)||p<0||p>1)throw Error('Invalid response probability');m[a]=(m[a]??0)+h.relativeWeight*p;}
 return Object.entries(m).filter(([,mass])=>mass>1e-12).map(([reply,mass])=>({reply,probability:mass/total(n)}));
}
function respond(n,reply){
 n=structuredClone(n);
 n.range=n.range.map(h=>({...h,relativeWeight:h.relativeWeight*(responseDistribution(n,h)[reply]??0)})).filter(h=>h.relativeWeight>0);
 if(!total(n))return null;
 n.events=[];n.history.push('BTN '+reply);
 if(reply==='fold')return settleFold(n,'villain');
 if(reply==='check'){n.phase='showdown';return n;}
 const to=reply==='bet17_5'?17.5:reply==='raise45'?45:reply==='jam83'?83:n.state.heroPut;
 const add=to-n.state.villainPut;n.state.villainPut=to;n.state.villainStack-=add;n.state.pot+=add;
 n.events.push({type:'opponent_'+reply,to,add});
 if(reply==='call'){n.state.toCall=0;n.phase='showdown';}
 else{n.state.toCall=n.state.villainPut-n.state.heroPut;n.phase=reply==='bet17_5'?'facing_bet':reply==='raise45'?'facing_raise':'facing_jam';}
 return n;
}
function expectedEnd(n){
 if(n.phase==='terminal')return n.state.heroStack;
 if(n.phase==='showdown')return n.state.heroStack+n.state.pot*n.range.reduce((s,h)=>s+h.relativeWeight*share(n,h),0)/total(n);
 if(plans(n).length)return Math.max(...plans(n).map(p=>expectedEnd(commit(n,p))));
 return replies(n).reduce((s,r)=>s+r.probability*expectedEnd(respond(n,r.reply)),0);
}
function packDecision(n,provenance,feedbackAlreadyShown){
 const values=plans(n).map(p=>({choiceId:p.choiceId,evBB:expectedEnd(commit(n,p))-n.state.heroStack})),bestEV=Math.max(...values.map(v=>v.evBB));
 const body={board:n.board,hero:n.hero,heroSeat:n.heroSeat,villainSeat:n.villainSeat,actor:n.heroSeat,state:n.state,observedHistory:n.history,currentRange:{holdings:n.range},candidatePlans:plans(n),unknownOption:{choiceId:'unknown',label:'我不知道'},
  comparisonScope:'Given finite river-value model only; all unlisted amounts omitted.',referenceKind:'author_given_model',valueExecutionNode:n};
 const fp=fingerprint(body),id='VE-'+fp.slice(0,16);
 return {kind:'next_decision',actualActionCommitted:true,question:{id,body},reference:{id,inputFingerprint:fp,domain:'finite_candidate_plans',family:'river_value',planValues:values,bestEV,bestActions:values.filter(v=>near(v.evBB,bestEV)).map(v=>({choiceId:v.choiceId})),executionAdapterReady:true},
  provenance,feedbackAlreadyShown,evidence:{computedConditionalRangeProvided:true,realLearnerObserved:false,wholeSequenceIndependent:false}};
}
function packet(n,provenance,feedbackAlreadyShown){
 if(n.phase==='terminal')return {kind:'terminal',actualActionCommitted:true,state:{...n.state,actor:null},events:n.events,opponentCardsRevealed:false,provenance,feedbackAlreadyShown};
 if(plans(n).length)return packDecision(n,provenance,feedbackAlreadyShown);
 if(!invariant(n))throw Error('Value money or state invariant mismatch');
 const body={board:n.board,hero:n.hero,heroSeat:n.heroSeat,villainSeat:n.villainSeat,state:n.state,observedHistory:n.history,currentRange:{holdings:n.range},actor:n.phase==='showdown'?null:n.villainSeat,opponentCardsRevealed:false,valueExecutionNode:n};
 return {kind:n.phase==='showdown'?'awaiting_showdown':'waiting_opponent',actualActionCommitted:true,question:{id:'VP-'+fingerprint(body).slice(0,16),body},reference:{inputFingerprint:fingerprint(body),provenance,feedbackAlreadyShown},events:n.events??[],availableReplies:n.phase==='showdown'?[]:replies(n)};
}
export function advanceRiverValue(r,q,answer,{provenance='learner_committed',feedbackAlreadyShown=true}={}){
 if(r.family!=='river_value'||r.id!==q.id||fingerprint(q.body)!==r.inputFingerprint)return invalid('author_input_mismatch');
 if(!['learner_committed','demonstration_after_feedback'].includes(provenance))return invalid('explicit_action_provenance_required');
 if(answer?.action==='unknown')return {kind:'awaiting_explicit_action_or_announced_demonstration',actualActionCommitted:false};
 const n=sourceNode(q);if(!invariant(n)||!plans(n).length)return invalid('unsupported_state');
 const plan=plans(n).find(p=>p.action===answer?.action&&(p.to===undefined||near(p.to,answer.to))&&(answer.amount===undefined||near(p.amount,answer.amount)));
 if(!plan)return invalid('outside_compared_plans');
 return packet(commit(n,plan),provenance,feedbackAlreadyShown);
}
export function replyRiverValue(execution,reply,{showdownHoldingId}={}){
 const {question:q,reference:r}=execution??{};
 if(!q||!r||fingerprint(q.body)!==r.inputFingerprint)return invalid('pending_fingerprint_mismatch');
 const n=structuredClone(q.body.valueExecutionNode);if(!n||!invariant(n))return invalid('pending_state_mismatch');
 if(n.phase==='showdown'){
  if(reply!=='showdown')return invalid('awaiting_showdown_only');
  const h=n.range.find(h=>h.id===showdownHoldingId&&h.relativeWeight>0);if(!h)return invalid('holding_not_in_positive_conditional_range');
  const e=share(n,h),s=n.state,p=s.pot;s.heroStack+=p*e;s.villainStack+=p*(1-e);s.pot=0;s.heroPut=0;s.villainPut=0;s.toCall=0;
  if(!near(s.heroStack+s.villainStack+s.foldedStacks,600))throw Error('Showdown money mismatch');
  return {kind:'terminal',actualActionCommitted:true,state:{...s,actor:null},events:[{type:'showdown',opponentHole:h.hole,heroShare:e},{type:'award',heroAmount:p*e,villainAmount:p*(1-e)}],opponentCardsRevealed:true,opponentHole:h.hole,heroShowdownShare:e,provenance:r.provenance,feedbackAlreadyShown:r.feedbackAlreadyShown};
 }
 if(!replies(n).some(r=>r.reply===reply))return invalid('zero_probability_or_unsupported_reply');
 return packet(respond(n,reply),r.provenance,r.feedbackAlreadyShown);
}
