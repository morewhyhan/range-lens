import fs from 'node:fs';
import assert from 'node:assert/strict';
import {card,assertCards,evaluate,compare} from '../src/poker.js';

// Research evidence only. No application state or strategy tables are changed.
const dir='research/nevir-system';
const range=JSON.parse(fs.readFileSync(`${dir}/starting-range-example.json`,'utf8'));
assert.equal(range.context.observedPreflopAction,'BB call');
const initialKnown=[...range.context.board,...range.context.heroHole];
const turn='2d';assertCards([...initialKnown,turn].map(card));
const remaining=range.combos.filter(c=>!c.cards.includes(turn));
const sum=xs=>xs.reduce((a,x)=>a+x.mass,0);
const blocked=range.combos.filter(c=>c.cards.includes(turn));
// These are demonstrations of non-identifiability, NOT estimates of human checking.
const strongClasses=new Set(['QQ','TT','55','QTs','QTo','Q5s','Q5o','T5s','T5o']);
const models=[
 {id:'all_check',strongCheck:1,otherCheck:1},
 {id:'less_strong_check',strongCheck:.25,otherCheck:1},
 {id:'more_strong_check',strongCheck:1,otherCheck:.25}
].map(m=>{
 const weighted=range.combos.map(c=>({...c,posteriorMass:c.mass*(strongClasses.has(c.handClass)?m.strongCheck:m.otherCheck)}));
 const total=weighted.reduce((s,c)=>s+c.posteriorMass,0);
 const strong=weighted.filter(c=>strongClasses.has(c.handClass)).reduce((s,c)=>s+c.posteriorMass,0);
 assert.ok(total>0);return{...m,totalMass:total,strongMass:strong,strongPosterior:strong/total};
});
assert.ok(models[1].strongPosterior<models[0].strongPosterior && models[0].strongPosterior<models[2].strongPosterior);

// Exact group posterior bounds for independent, rectangular likelihood bounds.
// Values are unnormalized mass bounds. Source/model assumptions must supply them.
function groupBounds(groupLow,groupHigh,otherLow,otherHigh){
 for(const x of [groupLow,groupHigh,otherLow,otherHigh])assert.ok(Number.isFinite(x)&&x>=0);
 assert.ok(groupLow<=groupHigh&&otherLow<=otherHigh);
 if(groupHigh+otherHigh===0)return{status:'event_impossible',min:null,max:null};
 const min=groupLow===0?otherHigh>0?0:1:groupLow/(groupLow+otherHigh);
 const max=groupHigh===0?0:otherLow===0?1:groupHigh/(groupHigh+otherLow);
 return{status:'bounded',min,max};
}
const boundExample={input:[1,3,2,6],...groupBounds(1,3,2,6)};
assert.equal(boundExample.min,1/7);assert.equal(boundExample.max,3/5);
assert.deepEqual(groupBounds(0,0,0,0),{status:'event_impossible',min:null,max:null});
assert.deepEqual(groupBounds(0,0,0,3),{status:'bounded',min:0,max:0});
assert.deepEqual(groupBounds(0,2,0,0),{status:'bounded',min:1,max:1});
assert.deepEqual(groupBounds(0,2,0,3),{status:'bounded',min:0,max:1});
// Independently sample the allowed masses; every actual conditional ratio is bounded.
for(let a=1;a<=3;a+=.25)for(let b=2;b<=6;b+=.25){const p=a/(a+b);assert.ok(p>=boundExample.min&&p<=boundExample.max);}
const callCases=[{equity:[.3,.4],expected:'call_over_fold'},{equity:[.1,.2],expected:'fold_over_call'},{equity:[.2,.4],expected:'not_identified'}].map(x=>{
 const ev=x.equity.map(e=>e*15-(1-e)*5);
 const result=ev[0]>0?'call_over_fold':ev[1]<0?'fold_over_call':'not_identified';assert.equal(result,x.expected);
 return{...x,potIncludingBet:15,toCall:5,evBounds:ev,result,scope:'River, no further betting, no rake, call/fold only; illustrative bounds, not a measured opponent.'};
});
const out={
 scope:'输入来源、行动筛选非唯一性、物理排除和限定河牌敏感性的研究算例；不是完整策略。',
 baseline:{positiveCombos:range.combos.length,mass:sum(range.combos),state:'Flop dealt; before BB first postflop action. No checking likelihood has been applied.'},
 physicalTurnOnly:{turn,blockedCombos:blocked.length,blockedMass:sum(blocked),remainingCombos:remaining.length,remainingMass:sum(remaining),scope:'Condition on this card only, with NO intervening action filtering. Not a real turn action posterior.'},
 nonIdentifiability:{group:'Two pair or better on Qs Th 5s, independent of hero hidden cards as a strategy feature.',models,claim:'Same starting chart and observed check do not identify posterior without action likelihoods.',notClaimed:'These likelihoods are not Nevir data, solver data, or population estimates.'},
 rectangularGroupBounds:boundExample,callSensitivity:callCases,
 lessonReleaseRule:'Ordinary graded lessons require sufficient sourced inputs or a supported prescription. Missing-data detection is a named special task, not a replacement for decision training.'
};
fs.writeFileSync(`${dir}/input-bridge-evidence.json`,JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
