import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {DECK,card,assertCards,evaluate,compare} from '../src/poker.js';
const dir='research/nevir-system/',d=JSON.parse(fs.readFileSync(dir+'engine-filtered-chance-probe.json','utf8'));
const hole=h=>h.match(/.{2}/g),hs=d.orderedHands.map(x=>x.map(hole)),close=(a,b,t=.02)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const compatible=(a,b)=>!a.some(c=>b.includes(c));
const bet=h=>h.every(c=>c[0]==='K')?1:h.some(c=>c[0]==='J')&&h.some(c=>c[0]==='K')?.5:0;
function share(board,a,b){assertCards([...board,...a,...b].map(card));const c=compare(evaluate([...board,...a].map(card)),evaluate([...board,...b].map(card)));return c>0?1:c<0?0:.5;}
const board=d.root.board;
let riverRecords=0,handRows=0,unsupportedRows=0,jointRunouts=0;const rootChecks=[];
for(const branch of d.branches){
 const weights=[hs[0].map(()=>1),hs[1].map(h=>branch.id==='bet_called'?bet(h):1-bet(h))];
 const pairs=[];for(let i=0;i<hs[0].length;i++)for(let j=0;j<hs[1].length;j++)if(compatible(hs[0][i],hs[1][j]))pairs.push({i,j,w:weights[0][i]*weights[1][j]});
 const branchMass=pairs.reduce((s,p)=>s+p.w,0);close(branch.branchMass,branchMass);
 const paid=branch.id==='bet_called'?182:0;assert.equal(branch.pot,550+2*paid);
 assert.deepEqual(branch.beforeDeal.totalBetAmount,[paid,paid]);
 for(let a=0;a<2;a++)for(let i=0;i<hs[a].length;i++)close(branch.beforeDeal.raw[a][i],weights[a][i]);
 let probabilitySum=0;
 for(const r of branch.records){
  riverRecords++;const s=r.state;assert.equal(s.board[4],r.river);assert.deepEqual(s.totalBetAmount,[paid,paid]);
  const mass=pairs.reduce((sum,p)=>sum+([...hs[0][p.i],...hs[1][p.j]].includes(r.river)?0:p.w),0);
  const probability=mass/branchMass/44;close(r.conditionalPublicProbability,probability,1e-8);probabilitySum+=probability;
  assert.equal(r.positiveCurrentReach,mass>0);
  for(let a=0;a<2;a++)for(let i=0;i<hs[a].length;i++){
   handRows++;const own=hs[a][i],raw=own.includes(r.river)?0:weights[a][i];
   const opp=hs[a^1].map((cards,j)=>({cards,w:weights[a^1][j]})).filter(o=>o.w>0&&compatible(own,o.cards)&&![...own,...o.cards].includes(r.river));
   const oppMass=opp.reduce((s,o)=>s+o.w,0);close(s.raw[a][i],raw);close(s.joint[a][i],raw*oppMass);
   if(!raw||!oppMass){unsupportedRows++;continue;}
   const eq=opp.reduce((sum,o)=>sum+o.w*share(s.board,own,o.cards),0)/oppMass;
   close(s.equity[a][i],eq,1e-5);close(s.EV[a][i],branch.pot*eq);
  }
 }
 close(probabilitySum,1,1e-8);
 for(let a=0;a<2;a++)for(let i=0;i<hs[a].length;i++){
  if(weights[a][i]===0)continue;
  const own=hs[a][i];let value=0,oppMass=0;
  hs[a^1].forEach((other,j)=>{const w=weights[a^1][j];if(!w||!compatible(own,other))return;oppMass+=w;
   const rivers=DECK.map(c=>c.id).filter(c=>![...board,...own,...other].includes(c));assert.equal(rivers.length,44);
   value+=w*rivers.reduce((s,c)=>s+share([...board,c],own,other),0)/44;
  });close(branch.beforeDeal.EV[a][i],branch.pot*value/oppMass);
 }
}
for(let a=0;a<2;a++)for(let i=0;i<hs[a].length;i++){
 const own=hs[a][i];let expected=0,n=0;
 for(const other of hs[a^1]){if(!compatible(own,other))continue;
  const p=bet(a===1?own:other),rivers=DECK.map(c=>c.id).filter(c=>![...board,...own,...other].includes(c));assert.equal(rivers.length,44);
  for(const river of rivers){const e=share([...board,river],own,other);expected+=p*(914*e-182)+(1-p)*550*e;n++;if(a===0)jointRunouts++;}
 }
 expected/=n;close(d.root.EV[a][i],expected);rootChecks.push({player:a,hand:d.orderedHands[a][i],independentRootEV:expected,engineRootEV:d.root.EV[a][i]});
}
const paid=d.branches.find(b=>b.id==='bet_called'),free=d.branches.find(b=>b.id==='all_checked');
const callIndex=d.facingBet.actions.indexOf('Call'),foldIndex=d.facingBet.actions.indexOf('Fold'),n=hs[0].length;
for(let i=0;i<n;i++){
 close(d.facingBet.actionEV[foldIndex*n+i],0);close(d.facingBet.actionEV[callIndex*n+i],paid.beforeDeal.EV[0][i]-182);
 const wrong=.5*paid.beforeDeal.EV[0][i]+.5*free.beforeDeal.EV[0][i];close(wrong-d.root.EV[0][i],91);
}
const jsPaid=paid.records.find(r=>r.river==='Js').conditionalPublicProbability,jsFree=free.records.find(r=>r.river==='Js').conditionalPublicProbability;
close(jsPaid,1/44,1e-8);close(jsFree,1/132,1e-8);close(.5*jsPaid+.5*jsFree,1/66,1e-8);
const files=['research/solver-probe/src/bin/filtered_chance_probe.rs','research/solver-probe/target/release/filtered_chance_probe.exe',dir+'engine-filtered-chance-probe.json'];
const out={ok:true,status:'action_filtered_chance_and_EV_origin_checked_not_target_strategy',riverRecords,handRows,unsupportedRows,independentJointRunouts:jointRunouts,rootChecks,
 rootComparedWithAllPhysicalRunouts:true,callEVEqualsPostCallEVMinus182:true,naiveGrossBranchAverageOverstatesRootByUnits:91,
 JsProbability:{afterBetCalled:jsPaid,afterBothCheck:jsFree,priorWeightedAverage:1/66},
 fileHashes:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')])),
 fullOriginalFlopSolved:false,learnerTrials:0,limits:['Fixed author locks and no river bets; not an optimal turn strategy.','No double-chance export yet.','No complete original lesson or NL50 reference.']};
fs.writeFileSync(dir+'engine-filtered-chance-verification.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({...out,fileHashes:undefined,rootChecks:undefined}));
