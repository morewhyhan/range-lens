import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {publicMass,fixedHandOpponent,afterAction,dealPair,gradeAction,classOf} from '../src/postflop-model.js';
const {validateHistory}=createRequire(import.meta.url)('../desktop/solver-service.cjs');
const node={actor:0,actions:['Check','Bet(500)'],orderedHands:[['AcAd','KcKd'],['AhKh','QcQd','AcQh']],rawWeights:[[1,.5],[1,1,.5]],strategyActionMajor:[.25,1,.75,0],actionEV:[10,5,10,1]};
test('public range filtering and fixed-own-hand belief use different conditioning',()=>{
 const prior=publicMass(node),after=publicMass(node,afterAction(node,1));
 assert.notDeepEqual(prior.joint[1],after.joint[1]);
 const fixedBefore=fixedHandOpponent(node,0,'AcAd');
 const fixedAfter=fixedHandOpponent(node,0,'AcAd',afterAction(node,1));
 assert.deepEqual(fixedBefore,fixedAfter);
 assert.equal(fixedBefore.weights[2],0);
});
test('an observed opponent action changes fixed-hand belief by that action policy',()=>{
 const next={...node,actor:1,strategyActionMajor:[1,.4,0,0,.6,1]};
 assert.notDeepEqual(fixedHandOpponent(next,0,'AcAd'),fixedHandOpponent(next,0,'AcAd',afterAction(next,1)));
});
test('all action branches conserve prior pair mass and hidden cards never collide',()=>{
 const before=publicMass(node).total;
 assert.ok(Math.abs(node.actions.reduce((s,_,i)=>s+publicMass(node,afterAction(node,i)).total,0)-before)<1e-12);
 for(let i=0;i<100;i++){let seed=(i+.5)/101;const p=dealPair(node,0,()=>seed);assert.ok(!p.hero.match(/.{2}/g).some(c=>p.opponent.includes(c)));}
 assert.equal(classOf('AhKh'),'AKs');assert.equal(classOf('KhAc'),'AKo');
});
test('action grading does not reject the less frequent equal-EV mixed action',()=>{
 assert.equal(gradeAction(node,0,'AcAd',0,.005).correct,true);
 assert.equal(gradeAction(node,0,'AcAd',1,.005).correct,true);
 assert.equal(gradeAction(node,0,'KcKd',1,.005).correct,false);
});
test('native bridge rejects malformed histories before process execution',()=>{
 for(const history of [null,{},[-1],[1.2],[101],new Array(513).fill(0),['0']])assert.throws(()=>validateHistory(history));
 assert.equal(validateHistory(new Array(200).fill(0)).length,200);
 assert.deepEqual(validateHistory([0,1,48]),[0,1,48]);
});
