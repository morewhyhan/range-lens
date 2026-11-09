import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {validateThreebet,CLASSES}=createRequire(import.meta.url)('../desktop/threebet-config.cjs');
const {threebetSpots}=createRequire(import.meta.url)('../desktop/threebet-config.cjs');
test('3bet models account for dead blinds and use 100BB initial stacks',()=>{
 for(const [scene,size,pot,stack] of [['3bet-ip',8,17.5,92],['3bet-oop',11,23,89]]){
  const r=validateThreebet({scene,size,oop:{QQ:1,AKs:.5},ip:{AA:1}});
  assert.equal(r.context.startingPotBB,pot);assert.equal(r.context.eachStackBB,stack);
  assert.equal(r.startingPot,pot*100);assert.equal(r.effectiveStack,stack*100);
  assert.equal(Object.keys(r.ranges.oop.classWeights).length,169);assert.equal(CLASSES.length,169);
  assert.match(r.ranges.oop.source,/非翻前均衡/);assert.deepEqual(r.ranges.oop.rangeStringDraft.split(',').sort(),['AKs:0.5','QQ']);
  assert.equal(r.inputFingerprint,validateThreebet({scene,size,oop:{QQ:1,AKs:.5},ip:{AA:1}}).inputFingerprint);
 }
});
test('3bet refuses missing caller ranges, invalid scales, and invented classes',()=>{
 const valid={scene:'3bet-ip',size:8,oop:{QQ:1},ip:{AA:1}};
 for(const patch of [{scene:'../../other'},{size:NaN},{size:101},{size:8.001},{oop:{}},{ip:{AAA:1}},{oop:{QQ:.7}},{oop:['QQ']}])assert.throws(()=>validateThreebet({...valid,...patch}));
 assert.doesNotThrow(()=>validateThreebet({...valid,size:19.99}));
 assert.throws(()=>validateThreebet({...valid,oop:{AA:1},ip:{AA:1}}),/没有互不冲突/);
});
test('all fifteen legal six-seat 3bet position pairs preserve blinds, initiative and postflop order',()=>{
 const spots=threebetSpots();assert.equal(spots.length,15);assert.equal(new Set(spots.map(s=>s.id)).size,15);
 for(const s of spots){const r=validateThreebet({scene:s.scene,spot:s.id,size:12,openSize:3,oop:{AA:1},ip:{KK:1},board:['9s','8h','6d']});assert.equal(r.context.oopSeat,s.oopSeat);assert.equal(r.context.ipSeat,s.ipSeat);assert.equal(r.context.startingPotBB,24+s.dead);assert.equal(r.ranges[s.hero?'ip':'oop'].action,'3bet');assert.deepEqual(r.context.flop,['9s','8h','6d']);}
 assert.throws(()=>validateThreebet({scene:'3bet-ip',spot:'BTN-UTG',size:8,oop:{AA:1},ip:{KK:1}}));
 assert.throws(()=>validateThreebet({scene:'3bet-ip',spot:'CO-BTN',size:8,openSize:5,oop:{AA:1},ip:{KK:1}}));
});
