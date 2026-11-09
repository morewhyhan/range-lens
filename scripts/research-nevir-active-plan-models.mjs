import fs from 'node:fs';
import assert from 'node:assert/strict';
import {card,evaluate,compare} from '../src/poker.js';
const dir='research/nevir-system/';
const defense=JSON.parse(fs.readFileSync(dir+'defense-tree-evidence.json','utf8'));
const pressure=defense.profiles.find(p=>p.id==='pressure');
const deck='23456789TJQKA'.split('').flatMap(r=>'shdc'.split('').map(s=>r+s));
const board=['Ks','7s','2d','3d'],P=21,S=90,B=10.5,finalAllin=201;
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
function enumerate(hero,candidates){return candidates.map(c=>{
 const seen=[...board,...hero,...c.hole];assert.equal(new Set(seen).size,8);
 const current=compare(evaluate([...board,...hero].map(card)),evaluate([...board,...c.hole].map(card)));
 const rivers=deck.filter(r=>!seen.includes(r)).map(r=>{
  const cmp=compare(evaluate([...board,r,...hero].map(card)),evaluate([...board,r,...c.hole].map(card)));
  return {river:r,share:cmp>0?1:cmp===0?.5:0};
 });assert.equal(rivers.length,44);assert.ok(rivers.every(r=>r.share!==.5));
 return {...c,currentWinner:current>0?'hero':'villain',rivers,winCards:rivers.filter(r=>r.share===1).map(r=>r.river),equity:rivers.reduce((s,r)=>s+r.share,0)/44};
});}
const protection=enumerate(['Qs','Qc'],[{id:'AJ',hole:['As','Jc'],weight:3},{id:'KK',hole:['Kh','Kd'],weight:1}]);
assert.deepEqual(protection[0].rivers.filter(r=>r.share===0).map(r=>r.river).sort(),['Ac','Ad','Ah']);
assert.equal(protection[1].winCards.length,0);
const weak=enumerate(['As','Qs'],[{id:'KK',hole:['Kh','Kd'],weight:4},{id:'KJ',hole:['Kc','Jc'],weight:16},{id:'JT',hole:['Js','Ts'],weight:1}]);
assert.deepEqual(weak.map(c=>c.winCards.length),[7,12,38]);
function leadPlan(candidates,responses,riverPolicy){
 const mass=candidates.reduce((s,c)=>s+c.weight,0);
 const jamMass=candidates.reduce((s,c)=>s+c.weight*responses[c.id].jam,0);
 const jamWinMass=candidates.reduce((s,c)=>s+c.weight*responses[c.id].jam*c.equity,0);
 const jamShare=jamMass?jamWinMass/jamMass:null;
 // One public jam decision, not a different action after peeking at each hidden holding.
 const jamFoldNet=-B,jamCallNet=jamShare===null?null:finalAllin*jamShare-S;
 const jamChoice=jamShare===null?null:jamCallNet>jamFoldNet?'call':'fold';
 const branches=[];
 for(const c of candidates){const r=responses[c.id];near(r.fold+r.call+r.jam,1);
  const foldEV=c.weight/mass*r.fold*P;
  const riverRows=r.call>0?c.rivers.map(outcome=>{
   let heroEnd,oppEnd,action;
   if(riverPolicy==='both_check'){
    heroEnd=S-B+outcome.share*(P+2*B);oppEnd=S-B+(1-outcome.share)*(P+2*B);action='check_check';
   }else{
    assert.equal(c.id==='KJ'||r.call===0,true,'Only KJ may reach this called branch; shared information permits the same response.');
    if(outcome.share===1){heroEnd=S-B+P+2*B;oppEnd=S-B;action='hero_check_villain_check';}
    else{const futureBet=21;heroEnd=S-B;oppEnd=S-B-futureBet+(P+2*B+futureBet);action='hero_check_villain_bet21_hero_fold';}
   }
   near(heroEnd+oppEnd+399,600);
   return {...outcome,action,heroNetFromCurrent:heroEnd-S};
  }):[];
  const conditionalCallEV=riverRows.length?riverRows.reduce((s,r)=>s+r.heroNetFromCurrent,0)/44:null;
  const callEV=r.call>0?c.weight/mass*r.call*conditionalCallEV:0;
  if(r.jam>0)for(const outcome of c.rivers){
    const heroEnd=jamChoice==='call'?finalAllin*outcome.share:S-B;
    const opponentEnd=jamChoice==='call'?finalAllin*(1-outcome.share):S+P+B;
    near(heroEnd+opponentEnd+399,600);
  }
  const jamEV=c.weight/mass*r.jam*(jamChoice==='call'?finalAllin*c.equity-S:-B);
  branches.push({id:c.id,probability:c.weight/mass,response:r,foldEVContribution:foldEV,callEVContribution:callEV,jamEVContribution:jamEV,conditionalCallEV,riverRows});
 }
 const total=branches.reduce((s,c)=>s+c.foldEVContribution+c.callEVContribution+c.jamEVContribution,0);
 return {bet:B,branches,jamMass:jamMass/mass,jamShare,jamCallNetFromRoot:jamCallNet,jamFoldNetFromRoot:jamFoldNet,jamChoice,evFromRootBB:total,riverPolicy};
}
const protectionCheck=protection.reduce((sum,c)=>sum+c.weight*c.equity*P,0)/4;
const protectionFold=leadPlan(protection,{AJ:{fold:1,call:0,jam:0},KK:{fold:0,call:0,jam:1}},'both_check');
const protectionCall=leadPlan(protection,{AJ:{fold:0,call:1,jam:0},KK:{fold:0,call:0,jam:1}},'both_check');
near(protectionCheck,2583/176);near(protectionFold.evFromRootBB,13.125);near(protectionCall.evFromRootBB,1659/88);
const denyGain=3/4*P*(1-41/44),strongCost=1/4*B;
near(protectionFold.evFromRootBB-protectionCheck,denyGain-strongCost);
const weakAllJam=leadPlan(weak,{KK:{fold:0,call:0,jam:1},KJ:{fold:0,call:0,jam:1},JT:{fold:0,call:0,jam:1}},'KJ_known_on_call_pressure');
const weakSomeFold=leadPlan(weak,{KK:{fold:0,call:0,jam:1},KJ:{fold:.5,call:.5,jam:0},JT:{fold:0,call:0,jam:1}},'KJ_known_on_call_pressure');
const weakCheck=Math.max(...pressure.actions.map(a=>a.evBB));near(weakCheck,0);near(weakAllJam.evFromRootBB,-10.5);near(weakSomeFold.evFromRootBB,129/22);
const out={status:'explicit_active_plan_models_not_target_strategy_or_learning_result',context:{players:6,startingEffectiveBB:100,heroSeat:'SB',villainSeat:'BTN',board,potBB:P,heroStackBB:S,villainStackBB:S,
 history:'Author legal observed history: BTN opens2.5, SB raises_to10, BB folds, BTN calls; flop Ks7s2d both check; turn3d before SB first action.',
 prior:'Current conditional candidates and weights are authored, not recovered from course or user full action-conditioned ranges.',
 comparisonMenu:['check_with_declared_continuation','bet10.5_with_declared_continuation'],future:'All44 legal rivers represented per candidate. Fold/call/jam responses specified; other lead sizes and river hero bets/raises omitted explicitly.'},
 protection:{hero:['Qs','Qc'],candidates:protection,checkPolicy:'Turn SB checks; BTN checks. River both always check. This is a fixed plan restriction, not guaranteed by the rules.',checkEV:protectionCheck,weakFolds:protectionFold,weakCalls:protectionCall,denialGainContribution:denyGain,strongRangeCostContribution:strongCost,
  lesson:'Against AJ, denying its3 winning rivers helps. Across the full declared range that benefit can be smaller than the cost of betting into KK.'},
 weak:{hero:['As','Qs'],candidates:weak,checkPolicy:'After SB check BTN bets10.5; use existing pressure model complete restricted defense continuation, whose best value is0. This differs from the protection family.',checkEV:weakCheck,checkReference:'defense-tree-evidence.json/profiles/pressure',allReraise:weakAllJam,someBetterFold:weakSomeFold,
  lesson:'Draw facts stay the same while declared response changes. One lead loses10.5, the other earns129/22; a draw alone does not select aggression.'},
 release:{courseRuleReplacement:false,fullContinuousActionOptimum:false,actualOpponentRange:false,NL50Reference:false,learnerVerified:false}};
fs.writeFileSync(dir+'active-plan-models.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,protection:{check:protectionCheck,betWhenWorseFolds:protectionFold.evFromRootBB,betWhenWorseCalls:protectionCall.evFromRootBB,denialGain:denyGain,strongCost},weak:{check:weakCheck,betWhenAllJam:weakAllJam.evFromRootBB,betWhenSomeBetterFold:weakSomeFold.evFromRootBB},status:out.status},null,2));
