import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {DECK,card,assertCards,evaluate,compare} from '../src/poker.js';
const dir='research/nevir-system/',d=JSON.parse(fs.readFileSync(dir+'engine-double-chance-probe.json','utf8'));
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`),hole=h=>h.match(/.{2}/g);
const hs=d.orderedHands.map(list=>list.map(hole)),flop=d.root.board,deck=DECK.map(c=>c.id),pairs=[];
for(let i=0;i<hs[0].length;i++)for(let j=0;j<hs[1].length;j++)if(!hs[0][i].some(c=>hs[1][j].includes(c)))pairs.push([i,j]);assert.equal(pairs.length,9);
const cache=new Map();
function share(i,j,t,r){const key=[i,j,...[t,r].sort()].join('/');if(cache.has(key))return cache.get(key);
 const board=[...flop,t,r];assertCards([...board,...hs[0][i],...hs[1][j]].map(card));
 const c=compare(evaluate([...board,...hs[0][i]].map(card)),evaluate([...board,...hs[1][j]].map(card))),e=c>0?1:c<0?0:.5;cache.set(key,e);return e;
}
function win(a,i,j,t,r){return a===0?share(i,j,t,r):1-share(j,i,t,r);}
function legalOpp(a,i,extra){return hs[a^1].map((o,j)=>({o,j})).filter(({o})=>![...hs[a][i],...o].some(c=>extra.includes(c)));}
let turnRows=0,riverRows=0,handRows=0,unsupportedRows=0,rootOrderedRunouts=0,totalPath=0;
assert.equal(d.turns.length,49);close(d.turns.reduce((s,t)=>s+t.publicProbability,0),1);
for(const t of d.turns){
 turnRows++;assert.equal(t.state.board[3],t.turn);assert.deepEqual(t.state.board.slice(0,3),flop);assert.deepEqual(t.state.totalBetAmount,[0,0]);
 const turnPairs=pairs.filter(([i,j])=>![...hs[0][i],...hs[1][j]].includes(t.turn));close(t.publicProbability,turnPairs.length/9/45);
 assert.equal(t.rivers.length,48);close(t.rivers.reduce((s,r)=>s+r.conditionalPublicProbability,0),1);
 for(let a=0;a<2;a++)for(let i=0;i<hs[a].length;i++){
  const opps=legalOpp(a,i,[t.turn]),raw=hs[a][i].includes(t.turn)?0:1;
  close(t.state.raw[a][i],raw);close(t.state.joint[a][i],opps.length);
  if(!opps.length)continue;let sum=0,count=0;
  for(const {o,j} of opps){const rivers=deck.filter(c=>![...flop,t.turn,...hs[a][i],...o].includes(c));assert.equal(rivers.length,44);for(const r of rivers){sum+=win(a,i,j,t.turn,r);count++;}}
  close(t.state.equity[a][i],sum/count);close(t.state.EV[a][i],550*sum/count,.02);
 }
 for(const r of t.rivers){
  riverRows++;assert.notEqual(r.river,t.turn);assert.equal(r.state.board[3],t.turn);assert.equal(r.state.board[4],r.river);assert.deepEqual(r.state.totalBetAmount,[0,0]);
  const valid=turnPairs.filter(([i,j])=>![...hs[0][i],...hs[1][j]].includes(r.river));
  const p=valid.length/9/45/44;close(r.orderedRunoutPublicProbability,p,1e-10);close(t.publicProbability*r.conditionalPublicProbability,p,1e-10);totalPath+=p;
  for(let a=0;a<2;a++)for(let i=0;i<hs[a].length;i++){
   handRows++;const raw=hs[a][i].some(c=>[t.turn,r.river].includes(c))?0:1,opps=legalOpp(a,i,[t.turn,r.river]);
   close(r.state.raw[a][i],raw);close(r.state.joint[a][i],opps.length);
   if(!opps.length){unsupportedRows++;continue;}
   const eq=opps.reduce((s,{j})=>s+win(a,i,j,t.turn,r.river),0)/opps.length;
   close(r.state.equity[a][i],eq);close(r.state.EV[a][i],550*eq,.02);
  }
 }
}
close(totalPath,1);
const rootChecks=[];
for(let a=0;a<2;a++)for(let i=0;i<hs[a].length;i++){
 let sum=0,count=0;
 for(const {o,j} of legalOpp(a,i,[])){
  const turns=deck.filter(c=>![...flop,...hs[a][i],...o].includes(c));assert.equal(turns.length,45);
  for(const t of turns)for(const r of turns.filter(c=>c!==t)){sum+=win(a,i,j,t,r);count++;if(a===0)rootOrderedRunouts++;}
 }
 close(d.root.equity[a][i],sum/count);close(d.root.EV[a][i],550*sum/count,.02);rootChecks.push({player:a,hand:d.orderedHands[a][i],equity:sum/count,engineEquity:d.root.equity[a][i]});
}
assert.equal(rootOrderedRunouts,17820);assert.equal(riverRows,2352);assert.ok(d.turnRepresentatives.length<49);
const path=(t,r)=>d.turns.find(x=>x.turn===t).rivers.find(x=>x.river===r).orderedRunoutPublicProbability;
assert.notEqual(path('Ah','Qh'),path('Ah','Ad'));
const files=['research/solver-probe/src/bin/double_chance_probe.rs','research/solver-probe/target/release/double_chance_probe.exe',dir+'engine-double-chance-probe.json'];
const out={ok:true,status:'physical_double_chance_and_nested_suit_swap_calibration_not_target_strategy',turnRows,physicalRiverRows:riverRows,perHandRiverRows:handRows,unsupportedHandRows:unsupportedRows,independentOrderedJointRunouts:rootOrderedRunouts,cachedDistinctPairRunouts:cache.size,
 turnRepresentativeCount:d.turnRepresentatives.length,actualPhysicalTurnCount:49,orderedPublicRunoutsNotUniform:true,totalOrderedPublicProbability:totalPath,rootChecks,
 fileHashes:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')])),
 fullOriginalFlopSolved:false,learnerTrials:0,limits:['No bets: no evidence for action-conditioned double-chance EV or complete betting strategy.','This small symmetric configuration does not validate every possible nested mapping.','No original requested flop solve, NL50 reference or learner outcome.']};
fs.writeFileSync(dir+'engine-double-chance-verification.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({...out,fileHashes:undefined,rootChecks:undefined}));
