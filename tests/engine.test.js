import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { card, DECK, evaluate, evaluateFive, compare, draws, boardClass, potOdds, assertCards, holeFromClass } from '../src/poker.js';
import { charts, preflopQuestion, bbSituations, bbMap, actionKey, edgeInfo } from '../src/preflop.js';
import { allRules, activeRules, branches } from '../src/rules.js';
import { DEFAULTS, MODULES, generateQuestion, strategyQuestion, ruleTasks, sequenceQuestions, ROUTES } from '../src/questions.js';
const cs=str=>str.split(' ').map(card);
function random(seed=12345){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const rng=random();
function validate(q){assert.ok(q);assert.ok(q.title);assert.ok(q.explanation);assert.ok(q.source);assert.ok(q.options.some(o=>o.id===q.correct),q.title);assert.equal(new Set(q.options.map(o=>o.id)).size,q.options.length);assertCards([...q.board,...q.hole,...(q.opponentHole||[])]);if(q.leftBoard)assertCards([...q.leftBoard,...q.leftHole]);}
test('all 15 charts / 2535 classes match expected simplified counts',()=>{
  const expected=[[124,7,38],[113,10,46],[104,6,59],[80,9,80],[78,4,87],[144,9,16],[141,9,19],[137,14,18],[141,11,17]];
  assert.equal(charts.length,15);
  for(const [i,c] of charts.entries()) {
    assert.equal(Object.keys(c.hands).length,169);
    for(const h of Object.values(c.hands)){assert.equal(Object.values(h.action).reduce((a,b)=>a+b,0),1);for(const p of Object.values(h.action))assert.ok([.5,1].includes(p));}
    if(i<9){const values=Object.values(c.hands);assert.deepEqual([values.filter(h=>h.action.fold===1).length,values.filter(h=>Object.keys(h.action).length===2).length,values.filter(h=>h.action.raise===1).length],expected[i]);}
  }
  const bbExpected=[[81,8,58,22],[44,8,89,28],[26,11,113,19],[115,11,17,26],[92,17,37,23],[62,25,64,18]];
  for(const [i,c] of charts.slice(9).entries()){const a=Object.values(c.hands);assert.deepEqual([a.filter(h=>h.action.call===1).length,a.filter(h=>h.action.raise===1).length,a.filter(h=>h.action.fold===1).length,a.filter(h=>Object.keys(h.action).length===2).length],bbExpected[i]);}
});
test('all 845 open frequencies agree with typed workbook data',()=>{const sources=JSON.parse(fs.readFileSync(new URL('../src/data/sources.json',import.meta.url)));let n=0;for(const r of sources.preflop[1].rows){const v=r.values;if(charts[0].hands[v.C]&&typeof v.F==='number'){const chart=charts.find(c=>c.group==='open'&&v.A.includes(c.name));assert.equal(chart.hands[v.C].action.raise||0,v.F);n++;}}assert.equal(n,845);});
test('all 20 BB position/size mappings match the workbook',()=>{assert.equal(bbSituations.length,20);const rows=JSON.parse(fs.readFileSync(new URL('../src/data/sources.json',import.meta.url))).preflop[5].rows;const sizes={B:2,C:2.25,D:2.5,E:3,F:3.5};for(const r of rows.filter(r=>r.row>=6&&r.row<=10)){const p=Object.keys(bbMap).find(p=>r.values.A.includes(p));for(const [col,size] of Object.entries(sizes)){if(r.values[col]==='无源图')assert.equal(bbMap[p][size],undefined);else assert.equal(bbMap[p][size],r.values[col]);}}});
test('holdem best five: wheels, royal, kickers, full houses, board ties',()=>{
  assert.deepEqual(evaluate(cs('As 2h 3d 4c 5s Kh Qd')).value,[4,5]);
  assert.deepEqual(evaluate(cs('As Ks Qs Js Ts 2h 2d')).value,[8,14]);
  assert.equal(evaluate(cs('As 2h 3d 4c Ks')).name,'高牌');
  assert.deepEqual(evaluate(cs('As Ah Ad Ks Kh Kd 2c')).value,[6,14,13]);
  assert.deepEqual(evaluate(cs('As Ah Ks Kh Qs Qh 2d')).value,[2,14,13,12]);
  assert.deepEqual(evaluate(cs('As Ah Ad Ac Ks Kh 2d')).value,[7,14,13]);
  assert.equal(compare(evaluate(cs('As Ah Kd Qc Js 2h 3d')),evaluate(cs('Ac Ad Kc Qd Ts 2h 3d'))),1);
  const board=cs('As Ks Qs Js Ts');assert.equal(compare(evaluate([...board,...cs('2h 3h')]),evaluate([...board,...cs('Ah Ad')])),0);
  assert.throws(()=>evaluate(cs('As As 2h 3h 4h')));
});
test('draw enumeration: exact course examples and boundaries',()=>{
  assert.equal(draws(cs('Jc 9h'),cs('Ts 7h 2d')).straightType,'卡顺');
  const d=draws(cs('Jc 9h'),cs('Ts 8h 2d'));assert.equal(d.straightType,'两头顺');assert.deepEqual(d.straightRanks,[7,12]);assert.equal(d.straightOuts.length,8);
  assert.equal(draws(cs('Qs Jc'),cs('Ts 9h 8d')).madeStraight,true);
  assert.equal(draws(cs('As Qs'),cs('Ts 7h 2d')).backdoorFlush[0],'s');
  assert.equal(draws(cs('As Qs'),cs('Ts 7h 2s')).flushOuts.length,9);
  assert.equal(draws(cs('As Ad'),cs('2s 5s 8s')).flushOuts.length,9);
  assert.equal(draws(cs('Ah Ad'),cs('2s 5s 8s')).flushOuts.length,0);
  assert.equal(draws(cs('As Ks'),cs('2s 5s 8s')).madeFlush,true);
  assert.equal(draws(cs('As Kh'),cs('2s 5s 8s 9s')).madeFlush,true);
  assert.equal(draws(cs('As 2h'),cs('3s 4h 9d')).straightType,'卡顺');
  assert.equal(draws(cs('As 2h'),cs('3s 4h 5d')).madeStraight,true);
});
test('board precedence and pot-odds definition',()=>{assert.equal(boardClass(cs('As 8s 5s')),'M');assert.equal(boardClass(cs('As Ah 2d')),'P');assert.equal(boardClass(cs('As 7h 2d')),'A');assert.equal(potOdds(150,50),.25);});
test('all preflop choices and targeted edge sampling produce exact chart answer',()=>{for(const module of ['open','threebet','bb'])for(const sampling of ['all','edge','custom'])for(let i=0;i<150;i++){const q=generateQuestion({...DEFAULTS,module,sampling},rng);validate(q);assert.equal(q.correct,actionKey(q.chart.hands[q.hand].action));if(sampling==='edge')assert.ok(edgeInfo(q.chart,q.hand).edge);}for(const c of charts)for(const h of Object.keys(c.hands)){const hole=holeFromClass(h,[],rng);assertCards(hole);assert.equal(hole[0].rank===hole[1].rank,h.length===2);if(h.endsWith('s'))assert.equal(hole[0].suit,hole[1].suit);if(h.endsWith('o'))assert.notEqual(hole[0].suit,hole[1].suit);}});
test('every active source node and supported task generates a valid graded question',()=>{for(const r of activeRules){assert.ok(ruleTasks(r).length,r.id);for(const task of ruleTasks(r))for(let i=0;i<12;i++){const q=strategyQuestion({...DEFAULTS,module:r.street,task},rng,r,task);validate(q);assert.equal(q.ruleId,r.id);if(task==='size')assert.equal(q.correct,String(r.size));if(task==='frequency')assert.equal(q.correct,String(r.frequency.value));}}for(const r of allRules.filter(r=>r.pending))assert.ok(!activeRules.includes(r));});
test('all reading, branch, scenario and mixed modules produce legal questions',()=>{for(const m of MODULES.filter(m=>!['sequence','open','threebet','bb'].includes(m.id)))for(let i=0;i<25;i++)validate(generateQuestion({...DEFAULTS,module:m.id},rng));for(const b of branches)for(let i=0;i<5;i++)validate(generateQuestion({...DEFAULTS,module:'branch',unit:b.id},rng));});
test('continuous routes retain the same physical previous board and answer after mistakes',()=>{for(const r of ROUTES)for(let i=0;i<15;i++){const qs=sequenceQuestions({...DEFAULTS,module:'sequence',unit:r.id},rng);assert.ok(qs.length>=2);qs.forEach(validate);for(let j=1;j<qs.length;j++)assert.deepEqual(qs[j].board.slice(0,qs[j-1].board.length),qs[j-1].board,r.id);}});
test('no browser persistence, network calls or database layer in app source',()=>{for(const f of ['main.jsx','poker.js','questions.js','preflop.js','rules.js']){const text=fs.readFileSync(new URL('../src/'+f,import.meta.url),'utf8');assert.doesNotMatch(text,/localStorage|sessionStorage|indexedDB|fetch\(|supabase|firebase/);}});
