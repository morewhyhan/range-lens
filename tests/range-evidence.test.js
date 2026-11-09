import test from 'node:test';
import assert from 'node:assert/strict';
import {compareHoldings,rangeEvidence,focusFactor,showdownRunouts} from '../src/range-evidence.js';
import {guideDistribution,exampleHoldings,compareActions} from '../src/decision-guide.js';
const node={board:['Ks','7h','2d'],actor:1,actions:['Fold','Call','Raise(500)'],orderedHands:[['AsAh'],['KcQh','7c7d','AcQd','AsQh']],rawWeights:[[1],[1,.5,.5,1]],compatibleMassWeights:[[2],[1,.5,.5,0]],strategyActionMajor:[.2,.1,.8,0,.6,.5,.2,1,.2,.4,0,0],actionEV:Array(12).fill(10)};
test('current strength is computed from actual best five, with physical conflicts excluded',()=>{
 assert.equal(compareHoldings(node.board,'AsAh','KcQh'),'weaker');assert.equal(compareHoldings(node.board,'AsAh','7c7d'),'stronger');assert.equal(compareHoldings(node.board,'AsAh','AsQh'),'blocked');
 assert.equal(compareHoldings(['As','Ks','Qs','Js','Ts'],'2h3h','4c5d'),'tie');
});
test('response buckets partition the same conditional prior; visual lenses do not mutate it',()=>{
 const view=rangeEvidence(node,0,'AsAh',node),sum=view.responses.reduce((s,r)=>s+r.frequency,0);
 assert.ok(Math.abs(sum-1)<1e-12);assert.equal(view.total,2);
 const weak=view.rows[0],strong=view.rows[1];assert.equal(focusFactor(weak,'pay'),.8);assert.equal(focusFactor(strong,'pay'),0);assert.equal(focusFactor(strong,'fold'),.1);
 assert.equal(focusFactor(strong,'remain',1),1);assert.deepEqual(node.rawWeights,[[1],[1,.5,.5,1]]);
});
test('turn runouts distinguish currently losing from final equity: AA has exactly two winning rivers against KK set',()=>{
 const r=showdownRunouts(['Ks','7h','2d','3c'],'AsAh','KcKd');assert.deepEqual([r.wins,r.ties,r.losses,r.total],[2,0,42,44]);assert.equal(r.currentRelation,'stronger');assert.equal(r.heroEquity,2/44);
});
test('river board royal ties; repeated cards cannot produce an equity result',()=>{
 const r=showdownRunouts(['As','Ks','Qs','Js','Ts'],'2h3h','4c5d');assert.equal(r.heroEquity,.5);assert.equal(r.total,1);
 assert.throws(()=>showdownRunouts(['Ks','7h','2d'],'AsAh','AsQh'));
});
test('guided examples use compatible weighted holdings and response percentages renormalize after observation',()=>{
 const evidence=rangeEvidence(node,0,'AsAh',node),before=guideDistribution(evidence),after=guideDistribution(evidence,1);
 assert.equal(before.total,2);assert.ok(Math.abs(after.total-.95)<1e-12);
 assert.ok(Math.abs(after.groups.reduce((s,g)=>s+g.frequency,0)-1)<1e-12);
 assert.ok(exampleHoldings(after,'weaker').every(r=>r.kind==='weaker'&&r.weight>0&&!r.hand.includes('As')));
 assert.equal(focusFactor(evidence.rows[0],'weaker'),1);assert.equal(focusFactor(evidence.rows[1],'weaker'),0);
 assert.equal(evidence.total,2);
});
test('action comparisons keep negative EV and near-equal mixed choices without turning them into win probability',()=>{
 const rows=compareActions([{ev:-2,index:0},{ev:-2.01,index:1},{ev:-3,index:2}],.02);
 assert.deepEqual(rows.map(r=>r.nearBest),[true,true,false]);assert.equal(rows[2].loss,1);
});
