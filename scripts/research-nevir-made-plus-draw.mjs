import fs from 'node:fs';
import assert from 'node:assert/strict';
import {card,evaluate,compare} from '../src/poker.js';
const dir='research/nevir-system/';
const board=['Js','9d','5d','2c'],hero=['Jd','7d'];
const deck='23456789TJQKA'.split('').flatMap(r=>'shdc'.split('').map(s=>r+s));
const candidates=[{id:'AA',hole:['Ah','Ac'],weight:2},{id:'98',hole:['9c','8c'],weight:1},{id:'55',hole:['5c','5h'],weight:1}];
const diamonds=deck.filter(c=>c[1]==='d'&&![...board,...hero].includes(c));assert.equal(diamonds.length,9);
const golden={AA:[...diamonds,'Jc','Jh','7c','7h','7s'], '98':null,'55':diamonds.filter(c=>c!=='2d')};
const rows=[];let outcomes=0,winMass=0,lossMass=0,nowAheadMass=0,retainedWinMass=0,outdrawnMass=0,improvedWinMass=0,stillBehindMass=0,diamondWinMass=0;
for(const c of candidates){
 const blocked=new Set([...board,...hero,...c.hole]);assert.equal(blocked.size,8);
 const rivers=deck.filter(r=>!blocked.has(r));assert.equal(rivers.length,44);
 const current=compare(evaluate([...board,...hero].map(card)),evaluate([...board,...c.hole].map(card)));
 const results=rivers.map(r=>{const cmp=compare(evaluate([...board,r,...hero].map(card)),evaluate([...board,r,...c.hole].map(card)));return {river:r,share:cmp>0?1:cmp===0?.5:0};});
 const wins=results.filter(x=>x.share===1).map(x=>x.river),losses=results.filter(x=>x.share===0).map(x=>x.river);assert.equal(wins.length+losses.length,44);
 if(c.id==='98'){assert.deepEqual(losses.sort(),['8h','8s','9h','9s'].sort());}
 else assert.deepEqual(wins.sort(),golden[c.id].sort());
 if(current>0){nowAheadMass+=44*c.weight;retainedWinMass+=wins.length*c.weight;outdrawnMass+=losses.length*c.weight;}
 else{assert.ok(current<0);improvedWinMass+=wins.length*c.weight;stillBehindMass+=losses.length*c.weight;}
 outcomes+=44*c.weight;winMass+=wins.length*c.weight;lossMass+=losses.length*c.weight;
 diamondWinMass+=results.filter(x=>x.share===1&&x.river[1]==='d').length*c.weight;
 rows.push({...c,currentWinner:current>0?'hero':'villain',rivers:results,wins:wins.length,losses:losses.length,winCards:wins,lossCards:losses});
}
assert.equal(outcomes,176);assert.equal(winMass,76);assert.equal(lossMass,100);assert.equal(retainedWinMass,40);assert.equal(outdrawnMass,4);assert.equal(improvedWinMass,36);assert.equal(stillBehindMass,96);
assert.equal(nowAheadMass+improvedWinMass-outdrawnMass,winMass);
const equity=winMass/outcomes;assert.equal(equity,19/44);
const root={board,hero,heroSeat:'SB',villainSeat:'BTN',potBB:141,heroStackBB:60,villainStackBB:0,toCallBB:60,foldedStacksBB:399};
assert.equal(root.potBB+root.heroStackBB+root.villainStackBB+399,600);
const finalPot=201,ev=equity*finalPot-60,independentEV=rows.reduce((sum,c)=>sum+c.weight*(c.wins*141-c.losses*60)/44,0)/4;
assert.ok(Math.abs(ev-independentEV)<1e-9);assert.ok(ev>0);
const actual=candidates.find(c=>c.id==='98');assert.ok(rows.find(c=>c.id==='98').lossCards.includes('8s'));
assert.equal(compare(evaluate([...board,'8s',...hero].map(card)),evaluate([...board,'8s',...actual.hole].map(card))),-1);
const out={status:'complete_declared_turn_allin_model_not_target_policy_or_learner_result',context:{players:6,startingEffectiveBB:100,initialStackPerSeatBB:100,rake:0,
 observedAuthorHistory:['BTN opens2.5; SB raises_to10; BB folds; BTN calls','Flop Js9d5d: SB bets30; BTN calls30','Turn2c: SB checks; BTN jams60 into81'],
 priorIdentity:'Author-given current conditional range, not derived from user simplified charts or real-player observations. Historical actions are legal, not recommendations.',
 sourceConnection:'J95 notes motivate distinguishing made hand and draw. Exact turn, range, weights and allin history are an isolated author mechanism model; no course action prescribed.'},root,candidates:rows,
 factChecks:{uniformLegalRiversPerCandidate:44,knownPhysicalRiversEnumerated:132,nominalDiamonds:diamonds,manualWinSetOracles:'AA: nine diamonds plus two Js and three7s;98 loses exactly8h/8s/9h/9s;55 wins diamonds except2d.'},
 disjointOutcomes:{denominator:outcomes,meaning:'Weighted outcome units, not176 distinct physical river cards or separate decks.',currentAheadThenWin:retainedWinMass,currentAheadThenLose:outdrawnMass,currentBehindThenWin:improvedWinMass,currentBehindThenLose:stillBehindMass},
 comparison:{currentAheadShare:nowAheadMass/outcomes,eventualWinShare:equity,winningDiamondShare:diamondWinMass/outcomes,wrongAddCurrentAndDiamond:nowAheadMass/outcomes+diamondWinMass/outcomes,
  correctUpdateIdentity:'finalWin = currentAhead - currentlyAheadButOutdrawn + currentlyBehindButImproved',menu:['fold','call60'],foldEVFromCurrentBB:0,callEVFromCurrentBB:ev,finalPotBB:201,callPrice:60/201,evScope:'Facing an effective allin; one river remains, no further betting, no rake, uniform legal dealing within each conditional candidate.'},
 selectedDemo:{opponentHole:actual.hole,river:'8s',heroLoses:true,selection:'Author-selected positive-probability counterexample, not random sampling or a frequency estimate.',revealOnlyAtShowdown:true,afterCall:{pot:201,hero:0,villain:0},afterAward:{pot:0,hero:0,villain:201},wholeHandHeroNetBB:-100,currentDecisionNetBB:-60},
 release:{preciseReferenceOnlyWithinDeclaredModel:true,sourceMatchedTargetPolicy:false,actualOpponentRange:false,unseenAssessment:false,learnerVerified:false,NL50Verified:false}};
fs.writeFileSync(dir+'made-plus-draw-evidence.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,physicalRivers:132,winCounts:rows.map(r=>({id:r.id,wins:r.wins})),disjoint:out.disjointOutcomes,equity,callEVBB:ev,status:out.status},null,2));
