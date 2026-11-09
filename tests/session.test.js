import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scopeKey,incrementScore,settingsIssue} from '../src/session.js';
import {DEFAULTS,generateQuestion} from '../src/questions.js';
import {HAND_NAMES} from '../src/poker.js';
import {charts,preflopQuestion} from '../src/preflop.js';

test('scores are isolated by actual exercise scope and preserve other scopes',()=>{
 const a=scopeKey({...DEFAULTS,position:'BTN'}),b=scopeKey({...DEFAULTS,position:'CO'}),c=scopeKey({...DEFAULTS,module:'threebet',position:'BTN'});
 assert.notEqual(a,b);assert.notEqual(a,c);
 let scores=incrementScore({},a,true);scores=incrementScore(scores,a,false);scores=incrementScore(scores,b,false);
 assert.deepEqual(scores[a],{right:1,wrong:1});assert.deepEqual(scores[b],{right:0,wrong:1});assert.equal(scores[c],undefined);
 assert.equal(scopeKey({...DEFAULTS,position:'BTN',edgeRatio:80}),a);
 assert.notEqual(scopeKey({...DEFAULTS,module:'bb',position:'BTN',size:'2'}),scopeKey({...DEFAULTS,module:'bb',position:'BTN',size:'3'}));
 assert.notEqual(scopeKey({...DEFAULTS,module:'flop',unit:'I01'}),scopeKey({...DEFAULTS,module:'flop',unit:'I03'}));
});
test('invalid edge and mixed selections are explicit, full range ignores edge toggles',()=>{
 const none={...DEFAULTS,mixed:false,boundary:false,changes:false};
 assert.ok(settingsIssue(none));assert.ok(settingsIssue({...none,sampling:'edge'}));
 assert.equal(settingsIssue({...none,sampling:'all'}),'');
 assert.equal(settingsIssue({...none,edgeRatio:0}),'');
 assert.throws(()=>preflopQuestion({...none,sampling:'edge'}),/没有符合/);
 const q=preflopQuestion({...none,sampling:'all'});assert.ok(q.chart.hands[q.hand]);
 assert.ok(settingsIssue({...DEFAULTS,module:'mixed',mixPre:false,mixReading:false,mixPost:false}));
});
test('ranking drill has exactly the nine standard categories, either direction',()=>{
 for(const orderDirection of ['ascending','descending']){
  const q=generateQuestion({...DEFAULTS,module:'ranking',orderDirection});
  assert.equal(q.kind,'order');assert.equal(new Set(q.options.map(o=>o.id)).size,9);
  assert.deepEqual(q.order,orderDirection==='ascending'?HAND_NAMES:[...HAND_NAMES].reverse());
  assert.ok(q.answer.includes('顺子'));assert.ok(q.answer.includes('同花顺'));
 }
});
test('range highlight row/column addresses agree with all 2535 labels in original SVGs',()=>{
 for(const c of charts){
  const svg=fs.readFileSync(new URL('../public'+c.image,import.meta.url),'utf8');
  const [,w,h]=svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const texts=[...svg.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]+)<\/text>/g)];
  for(const [name,entry] of Object.entries(c.hands)){
   const text=texts.find(t=>t[3]===name);assert.ok(text,`${c.id} ${name}`);
   assert.equal(Math.floor(Number(text[1])/(Number(w)/13)),entry.col);
   assert.equal(Math.floor(Number(text[2])/(Number(h)/13)),entry.row);
  }
 }
});
