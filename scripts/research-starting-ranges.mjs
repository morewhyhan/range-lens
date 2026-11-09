import fs from 'node:fs';
import assert from 'node:assert/strict';
import ranges from '../src/data/ranges.json' with {type:'json'};
import {bbMap} from '../src/preflop.js';
import {DECK,RANKS,card,assertCards,evaluate,compare} from '../src/poker.js';

const type=([a,b])=>a.rank===b.rank?RANKS[a.rank-2]+RANKS[b.rank-2]:RANKS[Math.max(a.rank,b.rank)-2]+RANKS[Math.min(a.rank,b.rank)-2]+(a.suit===b.suit?'s':'o');
const combos=[];for(let i=0;i<DECK.length;i++)for(let j=i+1;j<DECK.length;j++)combos.push([DECK[i],DECK[j]]);
assert.equal(combos.length,1326);const categories=new Map();for(const c of combos)categories.set(type(c),(categories.get(type(c))||0)+1);
assert.equal(categories.size,169);assert.equal(categories.get('AA'),6);assert.equal(categories.get('AKs'),4);assert.equal(categories.get('AKo'),12);
const chart=ranges.find(r=>r.group==='bb'&&r.name===bbMap.BTN[2.5]);assert.equal(chart.name,'普通中');
const board=['Qs','Th','5s'].map(card),hero=['Ac','Qh'].map(card);assertCards([...board,...hero]);
function build(known){return combos.filter(c=>c.every(x=>!known.some(k=>k.id===x.id))).map(cards=>({cards:cards.map(c=>c.id),handClass:type(cards),mass:chart.hands[type(cards)].action.call||0})).filter(c=>c.mass>0);}
const before=build([]),after=build([...board,...hero]);
const sum=rows=>rows.reduce((a,c)=>a+c.mass,0),total=sum(after),best=evaluate([...board,...hero]);
const groups={heroAhead:{mass:0,combos:0},tie:{mass:0,combos:0},heroBehind:{mass:0,combos:0}};
for(const c of after){const cmp=compare(best,evaluate([...board,...c.cards.map(card)])),key=cmp>0?'heroAhead':cmp<0?'heroBehind':'tie';groups[key].mass+=c.mass;groups[key].combos++;}
const result={context:{players:6,initialEffectiveBB:100,hero:'BTN',villain:'BB',openSizeBB:2.5,observedPreflopAction:'BB call',postflopObservation:[],state:'Flop dealt, before BB first postflop action',board:board.map(c=>c.id),heroHole:hero.map(c=>c.id)},assumption:'BB follows the user-provided simplified chart in this exact preflop context. This is a scoped baseline, not an observed fact about any real player.',source:{chart:chart.id,name:chart.name,sheet:chart.source},beforeKnownCards:{positiveCombos:before.length,totalMass:sum(before)},afterKnownCards:{positiveCombos:after.length,totalMass:total,normalizedTotal:after.reduce((a,c)=>a+c.mass/total,0)},currentFiveCardComparison:groups,scope:'Current five-card comparison only. Not runout equity, not EV, not a strategy recommendation. Postflop responses and future tree remain unknown.',combos:after.map(c=>({...c,weight:c.mass/total}))};
assert.ok(Math.abs(result.afterKnownCards.normalizedTotal-1)<1e-10);assert.equal(Object.values(groups).reduce((n,g)=>n+g.combos,0),after.length);assert.equal(Object.values(groups).reduce((n,g)=>n+g.mass,0),total);
fs.writeFileSync('research/nevir-system/starting-range-example.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,combos:'See starting-range-example.json'},null,2));
