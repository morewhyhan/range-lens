import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {charts} from '../src/preflop.js';
import {publicMass,afterAction,splitHand,classOf,dealPair,mixFor,drawWeighted} from '../src/postflop-model.js';
import {card,evaluate,compare} from '../src/poker.js';
const {createSolverService}=createRequire(import.meta.url)('../desktop/solver-service.cjs');
const dataDir=path.resolve(process.argv[2]||'research/postflop-pilot');
const inputRequest=JSON.parse(fs.readFileSync(path.join(dataDir,'request.json')));
const service=createSolverService({dataDir,executable:path.resolve('research/solver-probe/target/release/trainer_engine.exe'),requireVerification:false});
const near=(a,b,t=4e-5)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let nodes=0,weights=0,edges=0,settlements=0;const examined=new Set();
async function inspect(n){
 const key=JSON.stringify(n.historyIndices);if(examined.has(key))return;examined.add(key);nodes++;
 const joint=publicMass(n);for(let side=0;side<2;side++)joint.joint[side].forEach((w,i)=>{near(w,n.compatibleMassWeights[side][i]);weights++;if(splitHand(n.orderedHands[side][i]).some(c=>n.board.includes(c)))assert.equal(n.rawWeights[side][i],0);});
 if(n.actor!==null){const count=n.orderedHands[n.actor].length;let sum=0;for(let a=0;a<n.actions.length;a++)sum+=publicMass(n,afterAction(n,a)).total;near(sum,joint.total);
  for(let i=0;i<count;i++)if(joint.joint[n.actor][i]>0){const row=mixFor(n,n.actor,i);near(row.reduce((s,p)=>s+p.frequency,0),1);row.forEach(p=>assert.ok(Number.isFinite(p.ev)&&p.frequency>=0&&p.frequency<=1));}
 }
}
async function child(n,a){const c=await service.node([...n.historyIndices,a]);edges++;
 if(n.chance){assert.equal(c.board.length,n.board.length+1);for(let s=0;s<2;s++)n.rawWeights[s].forEach((w,i)=>near(c.rawWeights[s][i],splitHand(n.orderedHands[s][i]).includes(c.board.at(-1))?0:w));}
 else{const expected=afterAction(n,a);for(let s=0;s<2;s++)expected[s].forEach((w,i)=>near(w,c.rawWeights[s][i]));const before=n.totalBetAmount,after=c.totalBetAmount;assert.ok(after.every((v,i)=>v>=before[i]&&v<=inputRequest.effectiveStack));if(n.actions[a]==='Check'||n.actions[a]==='Fold')assert.deepEqual(after,before);if(n.actions[a]==='Call')assert.equal(after[n.actor],before[n.actor^1]);}
 await inspect(c);return c;
}
try{
 const info=service.info(),request=JSON.parse(fs.readFileSync(path.join(dataDir,'request.json')));
 const {inputFingerprint,...payload}=request;assert.equal(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'),inputFingerprint);
 for(const [side,key] of [[0,'oop'],[1,'ip']]){
  const range=request.ranges[key],chart=charts.find(c=>c.id===range.id);assert.ok(chart);for(const hand of info.root.orderedHands[side]){
   const expected=chart.hands[classOf(hand)].action[range.action]||0;near(range.classWeights[classOf(hand)],expected);
   near(info.root.rawWeights[side][info.root.orderedHands[side].indexOf(hand)],expected);
  }
 }
 const root=await service.node([]);await inspect(root);
 for(let a=0;a<root.actions.length;a++){
  const first=await child(root,a);
  if(first.actor!==null)for(let b=0;b<first.actions.length;b++)await child(first,b);
 }
 // Complete check-through with multiple physically distinct runouts, including rank/suit changes.
 for(const turn of ['Kc','7d','2s','9h']){
  let n=root;
  while(!n.terminal){if(n.chance){const wanted=n.board.length===3?turn:'Qc';const c=n.chanceCards.find(c=>c.card===wanted)||n.chanceCards[0];n=await child(n,c.id);}else{const a=n.actions.indexOf('Check');assert.ok(a>=0);n=await child(n,a);}}
  assert.equal(n.board.length,5);assert.deepEqual(n.totalBetAmount,[0,0]);
  // Independent best-five ranking of selected supported terminal holdings.
  for(const i of [0,40,120,250])if(n.rawWeights[0][i]>0){const own=n.orderedHands[0][i],ours=evaluate([...n.board,...splitHand(own)].map(card));let mass=0,value=0;
   n.orderedHands[1].forEach((h,j)=>{const w=n.rawWeights[1][j];if(!w||splitHand(h).some(c=>own.includes(c)||n.board.includes(c)))return;const cmp=compare(ours,evaluate([...n.board,...splitHand(h)].map(card)));mass+=w;value+=w*(cmp>0?inputRequest.startingPot:cmp===0?inputRequest.startingPot/2:0);});
   if(mass>0){near(n.terminalEV[0][i],value/mass,.002);settlements++;}
  }
 }
 // Complete bet/call line on all streets, exercising money and action transitions.
 let n=root;while(!n.terminal){if(n.chance)n=await child(n,n.chanceCards.find(c=>c.card===(n.board.length===3?'Kc':'Qc'))?.id??n.chanceCards[0].id);else{const a=n.actions.findIndex(a=>a.startsWith('Bet('));n=await child(n,a>=0?a:n.actions.indexOf('Call'));}}
 assert.equal(n.board.length,5);assert.ok(n.totalBetAmount[0]>0);assert.equal(n.totalBetAmount[0],n.totalBetAmount[1]);
 // Seeded hidden-card trajectories cover both actor roles, raises, folds and runout filtering.
 let seed=20261101;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let trial=0;trial<12;trial++){let n=root;const hero=trial%2,pair=dealPair(root,hero,rng);
  for(let step=0;!n.terminal&&step<64;step++){
   let a;if(n.chance){const used=[...splitHand(pair.hero),...splitHand(pair.opponent)],choices=n.chanceCards.filter(c=>!used.includes(c.card));assert.ok(choices.length);a=choices[Math.floor(rng()*choices.length)].id;}
   else{const h=n.actor===hero?pair.hero:pair.opponent,i=n.orderedHands[n.actor].indexOf(h);assert.ok(n.rawWeights[n.actor][i]>0);a=drawWeighted(mixFor(n,n.actor,i).map(p=>p.frequency),rng);}
   n=await child(n,a);
  }assert.equal(n.terminal,true);
 }
 await assert.rejects(service.node([99]));assert.equal((await service.node([])).board.length,3);
 const output={ok:true,inputFingerprint,solverReportedExploitabilityBB:info.result.errorBB,scope:request.scope,verifiedNodes:nodes,physicalWeightChecks:weights,edges,independentTerminalChecks:settlements,completeCheckAndBetCallRoutes:true,hiddenCardTrials:12,allRuntimeHistoriesAvailable:true,independentSecondSolver:false,files:Object.fromEntries(['request.json','result.json','strategy.bin'].map(f=>[f,hash(path.join(dataDir,f))])),engineSHA256:hash(path.resolve('research/solver-probe/target/release/trainer_engine.exe'))};
 fs.writeFileSync(path.join(dataDir,'verification.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
}finally{service.stop();}
