import fs from 'node:fs';
import assert from 'node:assert/strict';
import {card,evaluate,compare} from '../src/poker.js';
const dir='research/nevir-system/';
const board=['Kh','9h','2c','7d','4s'];
const suits='shdc'.split('');
const pairs=cls=>suits.flatMap(s1=>suits.map(s2=>[cls[0]+s1,cls[1]+s2])).filter(h=>h[0]!==h[1]&&!h.some(c=>board.includes(c))&&(cls.endsWith('s')?h[0][1]===h[1][1]:h[0][1]!==h[1][1]));
const pool=[...pairs('AKs').map(hole=>({group:'AKs',hole})),...pairs('KQo').map(hole=>({group:'KQo',hole}))];
assert.equal(pool.filter(x=>x.group==='AKs').length,3);assert.equal(pool.filter(x=>x.group==='KQo').length,9);
const context={players:6,initialEffectiveBB:100,rake:0,heroSeat:'SB',villainSeat:'BTN',board,
 observedAuthorHistory:['BTN opens2.5; SB raises_to10; BB folds; BTN calls','Flop Kh9h2c: SB bets7; BTN calls7','Turn7d: both check','River4s: SB bets17.5; BTN raises_to45'],
 current:{pot:97.5,heroStack:65.5,villainStack:38,heroPut:17.5,villainPut:45,toCall:27.5,foldedStacks:399},
 prior:'Author current-raise-node board-legal AKs/KQo with unit weight per physical holding, then condition on hero cards. Not a preflop or action-conditioned course range.',
 response:'For every legal hero re-raise total R in[72.5,83], AKs always continues; KQo folds with the profile probability, otherwise continues. Continue means jam_to83 when R<83, or call38 at R=83. Size-independent response is an explicit author assumption, not a real-player estimate.'};
const minRaise=45+(45-17.5),maxRaise=83;assert.equal(minRaise,72.5);
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
const rows=[];
for(const [id,hero]of [['hearts',['Ah','Qh']],['clubs',['Ac','Qc']],['Aheart_Qclub',['Ah','Qc']],['Aclub_Qheart',['Ac','Qh']]]){
 const legal=pool.filter(c=>!c.hole.some(x=>hero.includes(x))),removed=pool.filter(c=>c.hole.some(x=>hero.includes(x)));
 const counts=Object.fromEntries(['AKs','KQo'].map(g=>[g,legal.filter(c=>c.group===g).length]));
 const expected={hearts:{AKs:3,KQo:6},clubs:{AKs:2,KQo:7},Aheart_Qclub:{AKs:3,KQo:7},Aclub_Qheart:{AKs:2,KQo:6}};
 assert.deepEqual(counts,expected[id]);assert.equal(legal.length,counts.AKs+counts.KQo);
 const value=evaluate([...board,...hero].map(card)).value;assert.deepEqual(value,[0,14,13,12,9,7]);
 for(const c of legal){assert.equal(new Set([...board,...hero,...c.hole]).size,9);assert.equal(compare(evaluate([...board,...hero].map(card)),evaluate([...board,...c.hole].map(card))),-1);}
 const profiles=[];
 for(const [profile,foldFraction]of [['all_KQo_fold',1],['KQo_fold52',13/25],['KQo_fold55',11/20]]){
  const foldShare=counts.KQo*foldFraction/legal.length,callEV=-27.5;
  function raisePlan(R){
   assert.ok(R>=minRaise&&R<=maxRaise);const add=R-17.5;
   // On a continue-jam we have zero equity: fold the remaining83-R, not call.
   const foldEnd={hero:163,villain:38,pot:0};
   const continueEnd={hero:83-R,villain:118+R,pot:0};
   for(const end of [foldEnd,continueEnd])near(end.hero+end.villain+399,600);
   const ev=foldShare*(foldEnd.hero-65.5)+(1-foldShare)*(continueEnd.hero-65.5);
   near(ev,foldShare*97.5-(1-foldShare)*add);
   return {raiseTo:R,added:add,evFromCurrentBB:ev,onFold:{refundHero:R-45,matchedPot:125,ending:foldEnd},onContinue:{kind:R===83?'opponent_call38_showdown_hero_loses':'opponent_short_allin83_hero_folds',heroExtraCallCost:83-R,heroCallIncrement:-(83-R),ending:continueEnd}};
  }
  const min=raisePlan(minRaise),jam=raisePlan(maxRaise);
  // All chip sizes at0.01BB and a continuous monotonic proof cover interior sizes.
  let gridMax=-Infinity,gridBest=null;
  for(let cents=7250;cents<=8300;cents++){const r=raisePlan(cents/100);if(r.evFromCurrentBB>gridMax+1e-9){gridMax=r.evFromCurrentBB;gridBest=r.raiseTo;}}
  near(gridMax,min.evFromCurrentBB);assert.equal(gridBest,minRaise);
  const best=min.evFromCurrentBB>0?'raise_to72.5':'fold';
  profiles.push({id:profile,KQoFoldProbability:foldFraction,foldShare,foldEV:0,callEV,minRaisePlan:min,allInPlan:jam,
   continuousProof:{formula:'F*97.5 - (1-F)*(R-17.5)',derivative:-(1-foldShare),bestR:minRaise,assumption:'Opponent response probabilities constant over the whole legal size interval; continue-jam is followed by hero fold if chips remain.'},grid:{sizes:1051,stepBB:.01,bestR:gridBest},best});
 }
 rows.push({id,hero,currentValue:value,legal,removed,counts,profiles});
}
const heart52=rows[0].profiles.find(p=>p.id==='KQo_fold52'),club52=rows[1].profiles.find(p=>p.id==='KQo_fold52');
near(heart52.minRaisePlan.evFromCurrentBB,-32/15);near(club52.minRaisePlan.evFromCurrentBB,601/90);
assert.equal(heart52.best,'fold');assert.equal(club52.best,'raise_to72.5');
const out={status:'complete_declared_river_bluff_reraise_response_model_not_target_policy',context,pool,legalRaiseInterval:{min:minRaise,max:maxRaise},rows,
 rulesSource:{url:'https://www.pokerstars.com/help/articles/poker-rules-master/217425/',scope:'Minimum full raise and short allin concepts only, not the model ranges or52% response.'},
 scope:'Current-node best response over fold/call and the continuous mathematical raise interval under the declared size-independent responses. Any chip grid containing72.5 has the same optimum;0.01BB is an author check grid, not a claimed NL50 platform chip denomination. This is not a full-game equilibrium or real-player response claim.',
 release:{sourceMatchedCourseStrategy:false,actualOpponentFrequency:false,NL50Reference:false,learnerVerified:false}};
fs.writeFileSync(dir+'bluff-reraise-model.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,pool:pool.length,counts:rows.map(r=>({id:r.id,counts:r.counts})),profile52:rows.map(r=>{const p=r.profiles.find(p=>p.id==='KQo_fold52');return {id:r.id,foldShare:p.foldShare,minRaiseEV:p.minRaisePlan.evFromCurrentBB,allInEV:p.allInPlan.evFromCurrentBB,best:p.best};}),gridSizesPerProfile:1051,status:out.status},null,2));
