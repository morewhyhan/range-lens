import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {DECK,card,assertCards,evaluate,compare} from '../src/poker.js';
const dir='research/nevir-system/',data=JSON.parse(fs.readFileSync(dir+'engine-chance-export-probe.json','utf8'));
const hole=h=>h.match(/.{2}/g),compatible=(a,b)=>!a.some(c=>b.includes(c));
const close=(a,b,t=2e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
function share(board,a,b){assertCards([...board,...a,...b].map(card));const c=compare(evaluate([...board,...a].map(card)),evaluate([...board,...b].map(card)));return c>0?1:c<0?0:.5;}
let riverRows=0,handRows=0,invalidRows=0,jointRunouts=0;const summaries=[];
for(const example of data.cases){
 const board=example.initialBoard,hs=example.orderedHands.map(list=>list.map(hole)),pairs=[];
 for(let i=0;i<hs[0].length;i++)for(let j=0;j<hs[1].length;j++)if(compatible(hs[0][i],hs[1][j]))pairs.push([i,j]);
 const possible=DECK.map(c=>c.id).filter(c=>!board.includes(c)&&pairs.some(([i,j])=>![...hs[0][i],...hs[1][j]].includes(c)));
 assert.deepEqual([...example.riverRecords.map(r=>r.river)].sort(),[...possible].sort());assert.equal(example.possiblePhysicalRiverCount,48);
 let chanceSum=0;
 for(const r of example.riverRecords){
  riverRows++;assert.equal(r.currentBoard[4],r.river);assert.deepEqual(r.currentBoard.slice(0,4),board);assert.deepEqual(r.totalBetAmount,[0,0]);
  const ranks='23456789TJQKA',suits='cdhs';assert.equal(r.engineCardId,ranks.indexOf(r.river[0])*4+suits.indexOf(r.river[1]));
  assert.equal(r.historyIndices[2],r.engineCardId);assert.equal(r.actions,'[Check]');
  const legalPairs=pairs.filter(([i,j])=>![...hs[0][i],...hs[1][j]].includes(r.river));
  const probability=legalPairs.length/pairs.length/44;close(r.globalPublicRiverProbability,probability);chanceSum+=probability;
  for(let a=0;a<2;a++)for(let i=0;i<hs[a].length;i++){
   handRows++;const own=hs[a][i],validOpp=hs[a^1].filter(o=>compatible(own,o)&&![...own,...o].includes(r.river));
   const raw=own.includes(r.river)?0:1;close(r.rawWeights[a][i],raw);close(r.compatibleJointMass[a][i],raw*validOpp.length);
   const ok=validOpp.length>0;assert.equal(r.referenceUsableByHand[a][i],ok);
   if(!ok){invalidRows++;assert.equal(r.publishedEVByHand[a][i],null);continue;}
   const equity=validOpp.reduce((s,o)=>s+share(r.currentBoard,own,o),0)/validOpp.length;
   close(r.equity[a][i],equity);close(r.EV[a][i],550*equity,.02);close(r.publishedEVByHand[a][i],r.EV[a][i]);
  }
 }
 close(chanceSum,1);
 for(let a=0;a<2;a++)for(let i=0;i<hs[a].length;i++){
  const own=hs[a][i],opps=hs[a^1].filter(o=>compatible(own,o));let sum=0,count=0;
  for(const o of opps){const legal=DECK.map(c=>c.id).filter(c=>![...board,...own,...o].includes(c));assert.equal(legal.length,44);
   for(const river of legal){sum+=share([...board,river],own,o);count++;if(a===0)jointRunouts++;}
  }
  close(example.rootEquity[a][i],sum/count);close(example.rootEV[a][i],550*sum/count,.02);
 }
 summaries.push({id:example.id,compatibleJointPairs:pairs.length,physicalRivers:possible.length,representativeActions:example.representativeActions.length,rootPhysicalEquityChecked:true});
}
const asymmetric=data.cases.find(c=>c.id==='asymmetric_turn'),symmetric=data.cases.find(c=>c.id==='suit_symmetric_turn');
assert.ok(symmetric.representativeActions.length<symmetric.possiblePhysicalRiverCount);
assert.ok(asymmetric.riverRecords.some(r=>r.river==='As'));
const actualHero=['As','Qs'],legalForHero=asymmetric.riverRecords.filter(r=>!actualHero.includes(r.river));assert.equal(legalForHero.length,46);
const heroRivers=legalForHero.map(r=>({river:r.river,probability:asymmetric.orderedHands[1].filter(h=>!hole(h).includes(r.river)).length/3/44}));
close(heroRivers.reduce((s,r)=>s+r.probability,0),1);
close(heroRivers.find(r=>r.river==='Js').probability,1/66);close(heroRivers.find(r=>r.river==='4c').probability,1/44);
const files=['research/solver-probe/src/bin/chance_export_probe.rs','research/solver-probe/target/release/chance_export_probe.exe','research/solver-probe/Cargo.lock',dir+'engine-chance-export-probe.json'];
const output={ok:true,status:'actual_chance_export_physical_checks_not_full_strategy',scenarios:2,physicalRiverRecords:riverRows,perHandRiverRows:handRows,unsupportedHandRows:invalidRows,independentJointRunouts:jointRunouts,summaries,
 engineGlobalCardsNotGivenHeroCards:true,givenAsQs:{legalRiverCount:46,JsProbability:1/66,fourClubsProbability:1/44},
 fileHashes:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')])),
 fullOriginalFlopSolved:false,learnerTrials:0,limitations:['Turn to river only, no flop-to-turn chance or nested isomorphism tested.','No bets: does not establish three-street strategy quality.','Not an NL50 benchmark or learning result.']};
fs.writeFileSync(dir+'engine-chance-export-verification.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({...output,fileHashes:undefined}));
