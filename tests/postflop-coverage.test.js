import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {boardClass,card} from '../src/poker.js';
import {bbSituations,charts} from '../src/preflop.js';
const {CATEGORIES,openingSources,openingRequest,samplingPlan,validateFlop,category,canonical,sampleFlop,preparePostflopRequest,modelKey}=createRequire(import.meta.url)('../desktop/postflop-coverage.cjs');
test('every physical flop is accepted and falls into the same six-category partition as reading training',()=>{
 const deck=[...'23456789TJQKA'].flatMap(r=>[...'shdc'].map(s=>r+s));let count=0;const counts={};
 for(let i=0;i<52;i++)for(let j=i+1;j<52;j++)for(let k=j+1;k<52;k++){const b=[deck[i],deck[j],deck[k]];validateFlop(b);const type=category(b);assert.equal(type,boardClass(b.map(card)));counts[type]=(counts[type]||0)+1;count++;}
 assert.equal(count,22100);assert.deepEqual(Object.keys(counts).sort(),Object.keys(CATEGORIES).sort());
 for(const b of [['As','As','2h'],['Ax','Kh','Jd'],['As','Kh']])assert.throws(()=>validateFlop(b));
});
test('all 20 original position/size roots preserve exact chart weights, pots and stacks',()=>{
 const sources=openingSources();assert.equal(sources.length,20);
 for(const s of sources){const map=bbSituations.find(x=>x.position===s.seat&&x.size===s.size);assert.equal(map.name,s.chart);const r=openingRequest(s.id);assert.equal(r.context.eachStackBB+s.size,100);assert.equal(r.context.startingPotBB,2*s.size+(s.seat==='SB'?0:.5));
  for(const role of ['oop','ip']){const range=r.ranges[role],chart=charts.find(c=>c.id===range.id);for(const [h,w] of Object.entries(range.classWeights))assert.equal(w,chart.hands[h].action[range.action]||0);}
 }
});
test('sampling generates unseen rank structures within each class rather than replaying a fixed board',()=>{
 let seed=123;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(const kind of Object.keys(CATEGORIES)){const seen=new Set();for(let i=0;i<35;i++){const b=sampleFlop(kind,seen,rng);assert.equal(category(b),kind);const key=canonical(b);assert.ok(!seen.has(key));seen.add(key);}assert.equal(seen.size,35);}
 assert.equal(canonical(['As','Kh','2d']),canonical(['Ah','Kd','2c']));
});
test('each board and action model is independently fingerprinted, with no inherited A72 answer',()=>{
 const source=openingRequest('srp-CO-2.5'),a=preparePostflopRequest(source,['Ks','Qs','Js']),b=preparePostflopRequest(source,['9h','8d','6c']);
 assert.notEqual(a.inputFingerprint,b.inputFingerprint);assert.notEqual(modelKey(a),modelKey(b));assert.equal(a.tree.flopBet,'33%, 75%');assert.deepEqual(source.context.flop,['As','7h','2d']);
 const c=preparePostflopRequest(source,['Ks','Qs','Js'],{betSizes:{flopBet:[25,100],turnBet:[50,150],riverBet:[75,200],raises:[2.5]}});assert.equal(c.tree.raises,'2.5x, a');assert.notEqual(modelKey(a),modelKey(c));
 assert.throws(()=>preparePostflopRequest(source,['Ks','Qs','Js'],{betSizes:{flopBet:[0]}}));
 const impossible=structuredClone(source);impossible.ranges.oop.classWeights={AA:1};impossible.ranges.ip.classWeights={AA:1};assert.throws(()=>preparePostflopRequest(impossible,['As','Ah','7d']),/不可到达/);
});
test('automatic source and board schedules cover every source/category pair without cyclic omissions',()=>{
 for(const count of [20,22])for(const offset of [0,7,109]){const pairs=new Set();for(let i=offset;i<offset+count*6;i++){const p=samplingPlan(i,count);pairs.add(`${p.source}:${p.category}`);}assert.equal(pairs.size,count*6);}
 for(const count of [20,22]){const states=new Set();for(let i=0;i<count*12;i++){const p=samplingPlan(i,count);states.add(`${p.source}:${p.category}:${p.hero}`);}assert.equal(states.size,count*12);}
});
