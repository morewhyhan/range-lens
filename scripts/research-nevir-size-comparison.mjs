import fs from 'node:fs';
import assert from 'node:assert/strict';
import {card,assertCards,DECK,evaluate,compare,draws} from '../src/poker.js';
import {flopRules} from '../src/rules.js';

// Complete author-specified mechanism models, NOT a solved poker policy.
const dir='research/nevir-system',P=10,board=['Ks','7h','2d','3c','9h'],hero=['Qs','Qc'];
const groups=[
 {id:'JJ',hole:['Js','Jd'],callsSmall:true,callsLarge:true,role:'worse_inelastic'},
 {id:'66',hole:['6s','6h'],callsSmall:true,callsLarge:false,role:'worse_price_sensitive'},
 {id:'KJ',hole:['Kc','Jc'],callsSmall:true,callsLarge:false,role:'better_price_sensitive'},
 {id:'KK',hole:['Kh','Kd'],callsSmall:true,callsLarge:true,role:'better_inelastic'},
 {id:'QQ',hole:['Qh','Qd'],callsSmall:true,callsLarge:true,role:'tie'},
 {id:'AJ',hole:['As','Jc'],callsSmall:false,callsLarge:false,role:'worse_always_folds'}
].map(g=>{
 assertCards([...board,...hero,...g.hole].map(card));
 const cmp=compare(evaluate([...board,...hero].map(card)),evaluate([...board,...g.hole].map(card)));
 return{...g,equity:cmp>0?1:cmp<0?0:.5};
});
assert.deepEqual(groups.map(g=>g.equity),[1,1,0,0,.5,1]);
function inspect(weights,scale=1,responseOverrides={}){
 assert.equal(weights.length,groups.length);assert.ok(weights.every(w=>Number.isInteger(w)&&w>=0));
 const mass=weights.reduce((a,b)=>a+b,0);assert.ok(mass>0);
 const pot=P*scale;
 const actions=[{id:'check',bet:0},{id:'small',bet:5*scale},{id:'large',bet:10*scale}].map(action=>{
  let doubledNumerator=0,doubledDelta=0,calledMass=0,calledEquityMass=0;
  const contributions=[];
  groups.forEach((g,i)=>{
   const w=weights[i],calls=action.id==='small'?(responseOverrides[g.id]?.callsSmall??g.callsSmall):action.id==='large'?(responseOverrides[g.id]?.callsLarge??g.callsLarge):false;
   assert.equal(typeof calls,'boolean');
   const checkDoubled=2*pot*g.equity;
   const terminalDoubled=action.bet===0?checkDoubled:!calls?2*pot:2*(g.equity*(pot+action.bet)-(1-g.equity)*action.bet);
   const deltaDoubled=action.bet===0?0:!calls?2*pot*(1-g.equity):2*action.bet*(2*g.equity-1);
   doubledNumerator+=w*terminalDoubled;doubledDelta+=w*deltaDoubled;
   if(action.bet&&calls){calledMass+=w;calledEquityMass+=w*g.equity;}
   contributions.push({group:g.id,weight:w,response:action.bet?calls?'call':'fold':'showdown',payoffIfThisHoldingBB:terminalDoubled/2,weightedEVBB:w*terminalDoubled/(2*mass),deltaFromCheckEVBB:w*deltaDoubled/(2*mass)});
  });
  const checkNumerator=groups.reduce((s,g,i)=>s+weights[i]*2*pot*g.equity,0);
  assert.equal(doubledNumerator,checkNumerator+doubledDelta,'Terminal payout and baseline-difference derivations disagree');
  return{...action,evBB:doubledNumerator/(2*mass),doubledEVNumerator:doubledNumerator,calledMass:action.bet?calledMass:null,calledEquity:action.bet&&calledMass?calledEquityMass/calledMass:null,contributions};
 });
 const bestNumerator=Math.max(...actions.map(a=>a.doubledEVNumerator));
 return{weights:Object.fromEntries(groups.map((g,i)=>[g.id,weights[i]])),responseOverrides,totalMass:mass,actions,best:actions.filter(a=>a.doubledEVNumerator===bestNumerator).map(a=>a.id)};
}
const examples={
 equityFallsButLargeWins:inspect([2,3,1,1,0,3]),
 valueLarge:inspect([1,0,0,0,0,0]),
 valueSmall:inspect([0,1,0,0,0,0]),
 checkBetter:inspect([0,0,0,1,0,0]),
 allTie:inspect([0,0,0,0,1,0]),
 foldsWorseButGainsNothing:inspect([0,0,0,0,0,1]),
 foldsBetterAndWins:inspect([0,0,1,0,0,0]),
 tieHandFoldsToLarge:inspect([0,0,0,0,1,0],1,{QQ:{callsLarge:false}})
};
const main=examples.equityFallsButLargeWins;
assert.deepEqual(main.actions.map(a=>a.evBB),[8,9.5,10]);assert.deepEqual(main.best,['large']);
assert.ok(main.actions[2].calledEquity<main.actions[1].calledEquity);
assert.deepEqual(examples.valueLarge.best,['large']);assert.deepEqual(examples.valueSmall.best,['small']);
assert.deepEqual(examples.checkBetter.best,['check']);assert.deepEqual(examples.allTie.best,['check','small','large']);
assert.deepEqual(examples.foldsWorseButGainsNothing.best,['check','small','large']);
assert.deepEqual(examples.tieHandFoldsToLarge.actions.map(a=>a.evBB),[5,5,10]);
let models=0,lowerCalledEquityButLargeBetter=0;
const bestSetCounts={};
// All integer mass vectors from 0 through 3, excluding the impossible zero-total model.
for(let n=1;n<4**groups.length;n++){
 let v=n;const weights=groups.map(()=>{const w=v%4;v=Math.floor(v/4);return w;});
 const row=inspect(weights);models++;const key=row.best.join('|');bestSetCounts[key]=(bestSetCounts[key]||0)+1;
 if(row.actions[1].calledEquity!==null&&row.actions[2].calledEquity!==null&&row.actions[2].calledEquity<row.actions[1].calledEquity&&row.actions[2].evBB>row.actions[1].evBB)lowerCalledEquityButLargeBetter++;
 const scaled=inspect(weights,2);
 assert.deepEqual(scaled.best,row.best);
 scaled.actions.forEach((a,i)=>assert.equal(a.evBB,2*row.actions[i].evBB));
}
assert.equal(models,4095);assert.ok(lowerCalledEquityButLargeBetter>0);
// A separate flop checkdown calculation, using actual legal remaining cards.
const flop=board.slice(0,3),villain=['As','Jc'];
assertCards([...flop,...hero,...villain].map(card));
const left=DECK.filter(c=>![...flop,...hero,...villain].includes(c.id));
let runouts=0,wins=0,ties=0,losses=0;
for(let i=0;i<left.length;i++)for(let j=i+1;j<left.length;j++){
 const b=[...flop.map(card),left[i],left[j]];
 const cmp=compare(evaluate([...b,...hero.map(card)]),evaluate([...b,...villain.map(card)]));
 runouts++;if(cmp>0)wins++;else if(cmp<0)losses++;else ties++;
}
assert.equal(runouts,990);const eq=(wins+ties/2)/runouts,flopPot=5.5;
assert.ok(eq<1&&eq>0);
const checkdownContrast={flop,hero,villain,runouts,wins,ties,losses,heroEquity:eq,potBB:flopPot,forcedCheckdownEVBB:eq*flopPot,winImmediatelyIfVillainFoldsEVBB:flopPot,foldGainOverForcedCheckdownBB:(1-eq)*flopPot,scope:'Alternate flop experiment before the recorded 2.25 bet: uniform legal runouts, BOTH hands known, forced checkdown with no future betting and no rake. If an immediate fold occurs instead, compare its conditional payoff. Does not assert a bet makes this holding fold or that real checking guarantees no future bets.'};
const textureFacts=[['Ts','7h','2d'],['Ts','7h','2s']].map(b=>{
 const h=['Ks','Qs'],aa=['Ah','Ac'];assertCards([...b,...h,...aa].map(card));
 const d=draws(h.map(card),b.map(card));
 return{board:b,opponent:h,hero:aa,opponentFlushOuts:d.flushOuts.map(c=>c.id),opponentBackdoorFlushSuits:d.backdoorFlush,scope:'Card-structure facts only; not a prediction that this holding calls or raises, nor a derivation of the course bet size.'};
});
assert.deepEqual(textureFacts.map(x=>x.opponentFlushOuts.length),[0,9]);
const geometryStart={potBB:18,activeStackBB:91.75,foldedPlayerStacksBB:398.5,history:'Six seats, 100BB: CO opens 2.5, BTN raises to 8.25, SB folds 0.5, BB folds 1, CO calls. UTG/HJ folded. Gross pot 18; CO checks flop.'};
assert.equal(geometryStart.potBB+2*geometryStart.activeStackBB+geometryStart.foldedPlayerStacksBB,600);
const potGeometry={start:geometryStart,branches:[{name:'40_percent',betBB:7.2},{name:'two_thirds',betBB:12}].map(x=>{
 const potCents=1800+2*Math.round(x.betBB*100),stackCents=9175-Math.round(x.betBB*100);
 assert.equal(potCents+2*stackCents+39850,60000);
 return{...x,afterCallPotBB:potCents/100,eachStackBB:stackCents/100,spr:stackCents/potCents};
}),scope:'Alternative gross ledgers from the SAME predecision state. Legal amounts only; not a source-optimal preflop or postflop sizing claim. Actual response ranges for each size remain separate.'};
const sourceClaims=JSON.parse(fs.readFileSync(`${dir}/source-claims.json`,'utf8'));
const fromRule=(id,phase)=>{
 const r=flopRules.find(r=>r.id===id);assert.ok(r&&!r.pending&&r.scenario==='ip3');
 return{fixtureId:'SC_'+id,phase,board:r.board,notation:r.notation,source:{kind:'user_workbook_import',node:id,location:r.source,text:r.text},task:'Given this course betting line, choose its stated MAIN size; not whether an arbitrary hand must bet.',expected:{type:'main_size_execution',percent:r.size,amountAtGivenPot18BB:r.size===undefined?null:Math.round(18*r.size)/100},notEvidenceOf:'Complete per-combo strategy, why this precise size is solver-optimal, or any-hand NL50 transfer.'};
};
const sourceFixtures=[fromRule('I08','demonstrate'),fromRule('I09','demonstrate'),fromRule('I13','nearby_boundary'),fromRule('I10','connected_boundary'),fromRule('I11','mixed_retrieval')];
for(const [title,notation,board]of [['T62彩虹的课程主尺寸','T62r',['Ts','6h','2d']],['T62两同花的课程主尺寸','T62tt',['Ts','6h','2s']]]){
 const r=sourceClaims.reviews.find(r=>r.title===title);assert.ok(r&&r.status==='reviewed_text_entailment_only');
 sourceFixtures.push({fixtureId:'SC_'+notation,phase:'new_source_supported_rank_case',board,notation,source:{kind:'reviewed_note',reviewId:r.id,location:r.source,precision:r.claim.precision,suitAssignment:'Teaching representative; no exact physical-suit solution recovered.'},task:'Apply the stated main size in the same IP 3bet teaching context.',expected:{type:'main_size_execution',percent:r.claim.size,amountAtGivenPot18BB:Math.round(18*r.claim.size)/100},notEvidenceOf:'A formula proving all rainbow T-high boards use this size, or full hand selection.'});
}
const checkRule=flopRules.find(r=>r.id==='I12'),middleRule=flopRules.find(r=>r.id==='I11');
sourceFixtures.push({fixtureId:'SC_I12',phase:'branch_before_size',board:checkRule.board,notation:checkRule.notation,source:{kind:'user_workbook_import',node:'I12',location:checkRule.source,text:checkRule.text},condition:'本例采用课程先整体过牌简化；CO极少领先下注的前提保留，不加入另外的过弃调整。',task:'Apply the stated check simplification; do not force a size selection.',expected:{type:'stated_check_simplification',action:'check'},notEvidenceOf:'All wet low boards or all opponents require checking.'});
sourceFixtures.push({fixtureId:'SC_I11_77',phase:'main_size_vs_hand_role',board:middleRule.board,notation:middleRule.notation,holeClass:'77',source:{kind:'user_workbook_import',node:'I11',location:middleRule.source,handEntry:middleRule.hands.find(h=>h.hand==='77')},task:'Identify the source-described hand role, not a fabricated pure-action frequency.',expected:{type:'preference_interpretation',description:'更多过牌',exactBetFrequency:null},notEvidenceOf:'77 always checks or the 67% main size makes every hand bet.'});
const courseLesson={scope:'Source main-size retrieval, hand-role precision and context discrimination only; not a complete strategic lesson.',context:'6max, 100BB, BTN 3bettor vs CO caller, CO checks. Original ranges/rake not fully supplied.',givenAmountTask:{potBB:18,activeStackBB:91.75,historyRef:'potGeometry/start',scope:'Apply a GIVEN course percent and update a legal gross ledger; no claim that a new preflop size preserves source optimal strategy.',percentConvention:'Use the task explicit training percent. For 67%, bet12.06BB; exact2/3 would be12BB, a separate convention.'},fixtures:sourceFixtures,sequence:['SC_I08','SC_I09','SC_I13','SC_T62r','SC_T62tt','SC_I10','SC_I11','SC_I11_77','SC_I12'],authorGuards:[{change:'Switch hero to OOP SB',decision:'Reject reuse of this IP reference; route to separately matched material, not an unknown-answer ordinary learner task.'},{change:'Ask arbitrary hand action from main-size-only data',decision:'Reject exact action grading.'},{change:'Change physical suits where only diagram suits were supplied',decision:'Do not claim exact solver equivalence.'}],notVerified:['Learner understanding of why each precise course size is optimal','Source-matched response matrix','Unprompted real-game transfer']};
const out={
 status:'mathematical_mechanism_family_not_NL50_strategy',
 context:{players:6,street:'river',heroSeat:'BTN',villainSeat:'BB',board,hero,potBB:10,activeStackBB:95.25,legalGrossHistory:'100BB: BTN opens 2.5, BB calls, SB dead 0.5. Flop BB checks, BTN bets 2.25, BB calls. Turn both check. River BB checks. Earlier actions are observed teaching history, not claimed optimal.',menu:['check','bet_5','bet_10'],opponentResponse:'Fixed call/fold rules for this complete model; no raises',rake:'none'},
 weightsMeaning:'Relative probability mass for mutually exclusive possible holdings, not copies of a physical combo or source population counts.',
 groups,examples,
 exhaustiveFamily:{weightValues:[0,1,2,3],models,proof:'For every model, independently formulated terminal payouts equal check EV plus fold-gain and called-investment differences. Exact integer numerator decides ties. Scaling pot/bets by 2 preserves ordering in this fixed model.',scaleCheckScope:'Algebra only. Not the same 100BB physical history and not a transfer between NL50 and NL500. Complete configuration still needs matching.',bestSetCounts,lowerCalledEquityButLargeBetter},
 checkdownContrast,textureFacts,potGeometry,courseLesson,
 sourceBoundary:'Nevir sizing discussion motivates the learning question. These exact responses and weights are author-specified, not original course or solver data. The result does not select 25/40/67 for arbitrary flops.'
};
fs.writeFileSync(`${dir}/size-comparison-evidence.json`,JSON.stringify(out,null,2));
console.log(JSON.stringify({status:out.status,mainEV:main.actions.map(a=>[a.id,a.evBB,a.calledEquity]),exhaustiveFamily:out.exhaustiveFamily,checkdownContrast,sourceFixtures:sourceFixtures.length},null,2));
