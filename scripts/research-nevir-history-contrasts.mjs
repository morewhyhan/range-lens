import fs from 'node:fs';
import assert from 'node:assert/strict';
import {card,assertCards,evaluate,compare} from '../src/poker.js';
const dir='research/nevir-system';
// Explicit finite author model: not inferred human frequencies and not a Nash policy.
const flop=['Ts','8h','3d'],turn='2c',river='4s',hero=['Kc','Kd'];
const candidates=[{id:'88',hole:['8c','8d'],priorMass:1},{id:'QQ',hole:['Qc','Qd'],priorMass:2},{id:'JT',hole:['Js','Tc'],priorMass:2}];
for(const h of candidates){assertCards([...flop,turn,river,...hero,...h.hole].map(card));h.heroShowdownShare=compare(evaluate([...flop,turn,river,...hero].map(card)),evaluate([...flop,turn,river,...h.hole].map(card)))>0?1:0;}
assert.deepEqual(candidates.map(h=>h.heroShowdownShare),[0,1,1]);
const paths=[
 {id:'HC_A',events:['flop SB check','flop BTN check','deal2c','turn SB bet7','turn BTN call7','deal4s'],likelihoods:[[.2,.8,1],[1,.5,.1]],integerPosteriorMass:[1,4,1],expectedCheck:175/6,expectedBet:385/12,best:'bet17.5'},
 {id:'HC_B',events:['flop SB bet7','flop BTN call7','deal2c','turn SB check','turn BTN check','deal4s'],likelihoods:[[1,.5,.1],[.8,.8,1]],integerPosteriorMass:[4,4,1],expectedCheck:175/9,expectedBet:140/9,best:'check'}
];
function ledger(events){let pot=21,sb=90,btn=90;const rows=[];for(const event of events){if(/SB bet7/.test(event)){sb-=7;pot+=7;}if(/BTN call7/.test(event)){btn-=7;pot+=7;}rows.push({event,pot,sb,btn});assert.equal(pot+sb+btn+399,600);}return rows;}
const fixedResponse={afterCheck:'BTN always checks; showdown',afterBet17_5:{'88':{call:1,fold:0},QQ:{call:.5,fold:.5},JT:{call:0,fold:1}},restriction:'Only check and bet17.5 are compared; no opponent raise, no other river bet size. Restricted teaching model, not poker legality or GTO.'};
const lessons=paths.map(p=>{
 const raw=candidates.map((h,i)=>h.priorMass*p.likelihoods[0][i]*p.likelihoods[1][i]),sum=raw.reduce((a,b)=>a+b,0),total=p.integerPosteriorMass.reduce((a,b)=>a+b,0);
 raw.forEach((w,i)=>assert.ok(Math.abs(w/sum-p.integerPosteriorMass[i]/total)<1e-12));
 const rows=ledger(p.events);assert.deepEqual(rows.at(-1),{event:'deal4s',pot:35,sb:83,btn:83});
 const groups=candidates.map((h,i)=>{
  const share=h.heroShowdownShare,response=fixedResponse.afterBet17_5[h.id];
  const checkEV=35*share,calledEV=share*(35+17.5)-(1-share)*17.5,foldEV=35;
  for(const [own,other]of [[83+35*share,83+35*(1-share)],[83-17.5+70*share,83-17.5+70*(1-share)],[118,83]])assert.equal(own+other+399,600);
  return{id:h.id,probability:raw[i]/sum,checkEV,calledEV,foldEV,betEV:response.call*calledEV+response.fold*foldEV};
 });
 const check=groups.reduce((s,g)=>s+g.probability*g.checkEV,0),bet=groups.reduce((s,g)=>s+g.probability*g.betEV,0);
 assert.ok(Math.abs(check-p.expectedCheck)<1e-10);assert.ok(Math.abs(bet-p.expectedBet)<1e-10);assert.equal(bet>check?'bet17.5':'check',p.best);
 return{...p,ledger:rows,rawMass:raw,posterior:groups,currentState:{board:[...flop,turn,river],hero,actor:'SB',potBB:35,heroStackBB:83,villainStackBB:83,toCallBB:0},actions:{checkEVBB:check,bet17_5EVBB:bet},answerScope:'Finite model best action only; historical frequencies supplied by author.'};
});
assert.deepEqual(lessons[0].currentState,lessons[1].currentState);
const positionPairs=[
 {id:'POS_IP',heroSeat:'BTN',villainSeat:'CO',heroPreflopRole:'last_raiser',preflop:'CO opens2.5; BTN raises to8.25; CO calls; both blinds fold',flop,hero,history:['CO check'],actor:'BTN',potBB:18,heroStackBB:91.75,villainStackBB:91.75,foldedStacksBB:398.5,afterHeroCheck:'street_closed_wait_turn'},
 {id:'POS_OOP',heroSeat:'SB',villainSeat:'BTN',heroPreflopRole:'last_raiser',preflop:'BTN opens2.5; SB raises to10; BB folds; BTN calls',flop,hero,history:[],actor:'SB',potBB:21,heroStackBB:90,villainStackBB:90,foldedStacksBB:399,afterHeroCheck:'wait_BTN_action'}
];
for(const p of positionPairs)assert.equal(p.potBB+p.heroStackBB+p.villainStackBB+p.foldedStacksBB,600);
const sourceClaims=JSON.parse(fs.readFileSync(`${dir}/source-claims.json`,'utf8'));
const links=['R19','R22','R23'].map(id=>{const r=sourceClaims.reviews.find(r=>r.id===id);assert.ok(r);const f=sourceClaims.fragments.find(f=>f.id===r.fragment);assert.ok(f);return{id,source:f.source,fragment:r.fragment,scope:'Source route distinction; none of the numeric likelihoods or exact river actions above are attributed to this claim.'};});
const out={status:'author_history_and_position_contrasts_not_NL50_policy',context:{players:6,initialBB:100,heroSeat:'SB',villainSeat:'BTN',preflop:'BTN opens2.5, SB raises to10, BB folds, BTN calls',flopPotBB:21,flopStacksBB:90,rake:'none',candidatePrior:'Given at flop, conditional on hero cards; three physical candidates, not complete course ranges',chance:'Uniform legal dealing; both selected later cards legal for every candidate, so the common runout likelihood cancels in this conditional comparison.'},candidates,fixedResponse,paths:lessons,positionPairs,sourceLinks:links,scope:'Same visible final state does not imply same information set: both actual histories remain visible. Position examples also change seats, preflop sizes and money, so their strategy difference cannot be assigned to position alone.'};
fs.writeFileSync(`${dir}/history-contrast-evidence.json`,JSON.stringify(out,null,2)+'\n');
const prompts={status:'public_given_model_practice_not_frozen_holdout',position:positionPairs.map(({afterHeroCheck,...p})=>p),positionPrompt:'如果我现在过牌，是马上等转牌，还是还要等对手行动？',history:{context:out.context,candidates,fixedResponse,paths:paths.map(p=>({id:p.id,events:p.events,likelihoods:p.likelihoods,currentState:lessons.find(x=>x.id===p.id).currentState})),task:'先按两次已观察回应筛选候选，再在完整给定的河牌模型内比较过牌与下注17.5。',options:['过牌','下注17.5','我不知道']},persistence:'none; research content only'};
fs.writeFileSync(`${dir}/history-contrast-prompts.json`,JSON.stringify(prompts,null,2)+'\n');
console.log(JSON.stringify({ok:true,positionStates:2,historyPaths:2,sameCurrentState:true,results:lessons.map(p=>({id:p.id,posteriorMass:p.integerPosteriorMass,...p.actions,best:p.best})),scope:out.status},null,2));
