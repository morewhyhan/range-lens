import fs from 'node:fs';
import assert from 'node:assert/strict';
import charts from '../src/data/ranges.json' with {type:'json'};
import {bbMap} from '../src/preflop.js';
import {card,assertCards,DECK,evaluate,compare} from '../src/poker.js';

// Document research only. No strategy is written into the application.
const dir='research/nevir-system',claims=JSON.parse(fs.readFileSync(`${dir}/source-claims.json`,'utf8'));
const findFragment=needle=>{const f=claims.fragments.filter(f=>f.id.startsWith('N1-')&&f.text.includes(needle));assert.equal(f.length,1);return{id:f[0].id,source:f[0].source};};
const combos=[];for(let i=0;i<DECK.length;i++)for(let j=i+1;j<DECK.length;j++)combos.push([DECK[i],DECK[j]]);
const handClass=c=>{const [a,b]=[...c].sort((a,b)=>b.rank-a.rank);return '23456789TJQKA'[a.rank-2]+'23456789TJQKA'[b.rank-2]+(a.rank===b.rank?'':a.suit===b.suit?'s':'o');};
const chart=charts.find(c=>c.group==='bb'&&c.name===bbMap.BTN[2.5]);assert.equal(chart.id,'bb-普通中');
const board=['Th','8d','5c'],hero=['Ah','4h'];assertCards([...board,...hero].map(card));
const legal=(c,known)=>c.every(x=>!known.includes(x.id));
const belongs=(c,h)=>h.length===2?handClass(c).slice(0,2)===h:handClass(c)===h;
const groupCounts=h=>{
 const before=combos.filter(c=>legal(c,board)&&belongs(c,h));
 const after=before.filter(c=>legal(c,hero));
 const mass=cs=>cs.reduce((s,c)=>s+(chart.hands[handClass(c)].action.call||0),0);
 return{group:h,physicalBefore:before.length,physicalAfter:after.length,physicalRemoved:before.length-after.length,bbChartCallMassBefore:mass(before),bbChartCallMassAfter:mass(after)};
};
const groups=['AT','ATs','ATo','A8','A8s','A8o','A5','A5s','A5o','A7','A7s','A7o','A4','QJs','QJo','J9s','J9o','97s','97o'].map(groupCounts);
const get=g=>groups.find(x=>x.group===g);
for(const h of ['AT','A8','A5'])assert.deepEqual([get(h).physicalBefore,get(h).physicalAfter],[12,9]);
assert.deepEqual([get('ATs').physicalBefore,get('ATs').physicalAfter],[3,3]);
assert.deepEqual([get('A7o').physicalBefore,get('A7o').physicalAfter,get('A7o').bbChartCallMassBefore],[12,9,0]);
assert.equal(get('QJs').bbChartCallMassBefore,0);assert.equal(get('QJo').bbChartCallMassBefore,12);
const a4Before=combos.filter(c=>legal(c,board)&&belongs(c,'A4'));
const removeA=a4Before.filter(c=>c.some(x=>x.id==='Ah'));
const remove4=a4Before.filter(c=>c.some(x=>x.id==='4h'));
const overlap=a4Before.filter(c=>c.some(x=>x.id==='Ah')&&c.some(x=>x.id==='4h'));
const inclusionExclusion={before:a4Before.length,removedByAh:removeA.length,removedBy4h:remove4.length,overlap:overlap.length,after:a4Before.length-removeA.length-remove4.length+overlap.length};
assert.deepEqual(Object.values(inclusionExclusion),[16,4,4,1,9]);
const examples=[['AT',['As','Td']],['A8',['As','8s']],['A5',['As','5s']],['22',['2s','2d']],['A7',['As','7s']],['QJ',['Qs','Js']],['J9',['Js','9s']],['97',['9s','7s']]].map(([label,hole])=>{
 assertCards([...board,...hero,...hole].map(card));
 const cmp=compare(evaluate([...board,...hero].map(card)),evaluate([...board,...hole].map(card)));
 return{label,hole,currentComparison:cmp>0?'hero_ahead':cmp<0?'hero_behind':'tie',scope:'Current five-card ranking only; not future equity or a response policy.'};
});
// Exhaustive card-completion facts under uniform unknown-card sampling, without a range model.
function backdoor(hole){
 assertCards([...board,...hole].map(card));const deck=DECK.filter(c=>![...board,...hole].includes(c.id));
 let total=0,heartFlush=0,anyFlush=0;
 for(let i=0;i<deck.length;i++)for(let j=i+1;j<deck.length;j++){
  total++;const all=[...board.map(card),...hole.map(card),deck[i],deck[j]];
  if(all.filter(c=>c.suit==='h').length>=5)heartFlush++;
  if(['s','h','d','c'].some(s=>all.filter(c=>c.suit===s).length>=5))anyFlush++;
 }
 return{hole,totalTwoCardRunouts:total,heartFlushRunouts:heartFlush,anyFlushRunouts:anyFlush,probability:heartFlush/total,scope:'Uniform unknown cards, no action-conditioned opponent range; making a flush is not winning the pot or an action EV.'};
}
const q7Hearts=backdoor(['Qh','7h']),q7Spades=backdoor(['Qs','7s']);
assert.equal(q7Hearts.totalTwoCardRunouts,1081);assert.equal(q7Hearts.heartFlushRunouts,45);assert.equal(q7Spades.heartFlushRunouts,0);
assert.equal(q7Hearts.anyFlushRunouts,45);assert.equal(q7Spades.anyFlushRunouts,0);
const river=['Kh','9h','2c','7d','4s'];
const riverHeartGroups=[['Qh','Jh'],['Qs','Js']].map(hole=>{
 assertCards([...river,...hole].map(card));
 const rows=combos.filter(c=>legal(c,[...river,...hole])&&c.every(x=>x.suit==='h'));
 return{hole,remainingTwoHeartCombos:rows.length,scope:'Two-heart holdings that did not make a flush. Some made pairs or other showdown hands; not all are bluffs and not all took the same history.'};
});
assert.deepEqual(riverHeartGroups.map(x=>x.remainingTwoHeartCombos),[36,55]);
const samePairVariants=[['Qh','9s'],['Qc','9s']].map(hole=>{
 assertCards([...river,...hole].map(card));const value=evaluate([...river,...hole].map(card));
 return{hole,handValue:value.value,remainingTwoHeartCombos:combos.filter(c=>legal(c,[...river,...hole])&&c.every(x=>x.suit==='h')).length};
});
assert.deepEqual(samePairVariants[0].handValue,samePairVariants[1].handValue);
assert.deepEqual(samePairVariants.map(x=>x.remainingTwoHeartCombos),[45,55]);
const pureCatch={bluffMass:20,valueMass:80,blockedBluffMass:4,blockedValueMass:8};
const beforeEq=pureCatch.bluffMass/(pureCatch.bluffMass+pureCatch.valueMass);
const afterEq=(pureCatch.bluffMass-pureCatch.blockedBluffMass)/(pureCatch.bluffMass+pureCatch.valueMass-pureCatch.blockedBluffMass-pureCatch.blockedValueMass);
assert.ok(pureCatch.blockedValueMass>pureCatch.blockedBluffMass&&afterEq<beforeEq);
const result={
 status:'facts_and_lesson_inputs_not_complete_strategy',
 source:{a4:findFragment('A高牌也强烈想下注'),q7:findFragment('同花手牌：更倾向于下注'),chart:chart.id,sheet:chart.source,chartAssumption:'BB uses user simplified chart against BTN 2.5BB; original Nevir example opening size and full source ranges are not supplied.'},
 context:{board,hero,physicalSuitAssignment:'Author-chosen rainbow representative, consistent with source Q7 hearts has a backdoor and spades has none; not a claim to recover original screenshot.'},
 groups,inclusionExclusion,currentRankingExamples:examples,currentRankingScope:'Physical card comparisons; example holdings are not all in the chart-derived calling range (e.g. QJs).',
 backdoor:{hearts:q7Hearts,spades:q7Spades},
 riverMissedHeartExample:{board:river,variants:riverHeartGroups,samePairVariants,scope:'Physical holdings only, not a betting/bluffing range.'},
 pureBluffCatchRatioCounterexample:{...pureCatch,beforeEq,afterEq,scope:'Author-specified algebra counterexample only. Not observed opponent data. Pure catch wins all bluffs and loses all value; no ties.'},
 compatibilityFindings:[
  {id:'a7o_target',fact:'Source discusses A7o as a folding target on T85; user BB chart at BTN 2.5BB gives A7o call mass 0.',result:'Do not include A7o in this chart-derived postflop range.',notClaimed:'Not evidence that the original course is wrong; its opening size and ranges may differ.'},
  {id:'qj_not_one_weight',fact:'Source says QJ among worse continuing candidates; user chart QJs raises 100% and QJo calls 100%.',result:'Coarse rank labels cannot be expanded to all suit classes with the same prior.',notClaimed:'No claim about exact source response probabilities.'}
 ],
 releasedTaskTypes:['Physical combo removal','No double-counting of overlapping removals','Current hand ranking','Backdoor completion possibility','Chart/source compatibility identification'],
 notReleased:['Any-hand optimal bet/check or call/fold based only on these counts','Full postflop response matrix','NL50 certification']
};
fs.writeFileSync(`${dir}/blocker-teaching-evidence.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,groupCount:groups.length,sourceFragments:[result.source.a4.id,result.source.q7.id],inclusionExclusion,backdoorRunouts:[q7Hearts.anyFlushRunouts,q7Spades.anyFlushRunouts],riverHeartCombos:riverHeartGroups.map(x=>x.remainingTwoHeartCombos),samePairHeartCombos:samePairVariants.map(x=>x.remainingTwoHeartCombos),compatibilityFindings:result.compatibilityFindings},null,2));
