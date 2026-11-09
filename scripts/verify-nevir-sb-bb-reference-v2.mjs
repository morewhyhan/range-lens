// Independent physical reach and selected terminal arithmetic; not a second equilibrium solver.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {card,evaluate,compare} from '../src/poker.js';
const dir='research/nevir-system/';
const read=f=>JSON.parse(fs.readFileSync(dir+f));
const req=read('reference-request-sb-bb-qqq.json'),run=read('sb-bb-qqq-reference-result-v2.json'),data=read('sb-bb-qqq-reload-export-v2.json');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
assert.equal(run.inputFingerprint,req.inputFingerprint);assert.equal(data.inputFingerprint,req.inputFingerprint);
assert.equal(hash(dir+req.originalA72.file),req.originalA72.sha256);
assert.equal(data.rootStrategyAndEVExactlyPreserved,true);assert.equal(data.afterCheckStrategyAndEVExactlyPreserved,true);
for(const [loaded,saved] of [[data.nodes[0],run.root],[data.nodes[1],run.afterSBCheck]]){
 for(const [a,b] of [[loaded.strategyActionMajor,saved.strategyActionMajor],[loaded.actionEV,saved.currentActionEV]]){
  assert.equal(a.length,b.length);a.forEach((x,i)=>assert.equal(Math.fround(x),Math.fround(b[i])));
 }
}
assert.equal(data.nodes.length,14);
const close=(a,b,t=1e-5)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const hole=h=>h.match(/.{2}/g),key=h=>hole(h).sort().join('');
const root=data.nodes[0],byHistory=new Map(data.nodes.map(n=>[JSON.stringify(n.historyIndices),n]));
const roots=['oop','ip'].map(r=>new Map(req.ranges[r].rootHands.map(h=>[h.hole.slice().sort().join(''),h.weight])));
const hands=root.orderedHands.map(hs=>hs.map(hole));
const compat=hands[0].map(a=>hands[1].map(b=>!a.some(c=>b.includes(c))));
let weights=0,actionRows=0,unsupportedRows=0,terminalChecks=0;
let maxTerminalDoubleDifference=0,maxTerminalFloat32ReplayDifference=0;
const terminalDoubleToleranceUnits=8*600*2**-23,terminalReplayToleranceUnits=2*600*2**-23;
const aggregates=[];
for(const n of data.nodes){
 assert.deepEqual(n.orderedHands,root.orderedHands);assert.equal(new Set(n.board).size,n.board.length);
 let expected;
 if(n.historyIndices.length===0)expected=root.orderedHands.map((hs,s)=>hs.map(h=>roots[s].get(key(h))));
 else{
  const history=n.historyIndices.slice(0,-1),p=byHistory.get(JSON.stringify(history));assert.ok(p,`Missing parent ${history}`);
  const last=n.historyIndices.at(-1);expected=p.rawWeights.map(ws=>ws.slice());
  if(p.chance){
   assert.equal(n.board.length,p.board.length+1);const newCard=n.board.at(-1);
   assert.equal(card(newCard).rank-2,Math.floor(last/4));assert.equal('cdhs'[last%4],card(newCard).suit);
   expected=expected.map((ws,s)=>ws.map((w,i)=>hands[s][i].includes(newCard)?0:w));
  }else{
   assert.ok(!p.terminal);const a=p.actor,len=hands[a].length;
   expected[a]=expected[a].map((w,i)=>w*p.strategyActionMajor[last*len+i]);
  }
 }
 const joint=[hands[0].map(()=>0),hands[1].map(()=>0)];
 for(let i=0;i<hands[0].length;i++)for(let j=0;j<hands[1].length;j++)if(compat[i][j]){
  const m=expected[0][i]*expected[1][j];joint[0][i]+=m;joint[1][j]+=m;
 }
 for(let s=0;s<2;s++)for(let i=0;i<hands[s].length;i++){
  close(n.rawWeights[s][i],expected[s][i]);close(n.compatibleMassWeights[s][i],joint[s][i],3e-5);weights++;
  if(hands[s][i].some(c=>n.board.includes(c)))assert.equal(n.rawWeights[s][i],0);
 }
 const mass=joint[0].reduce((s,w)=>s+w,0);close(mass,joint[1].reduce((s,w)=>s+w,0));
 if(n.actor!==null){
  const a=n.actor,len=hands[a].length;assert.equal(n.strategyActionMajor.length,n.actions.length*len);assert.equal(n.actionEV.length,n.actions.length*len);
  const freq=n.actions.map(()=>0);
  for(let i=0;i<len;i++){
   if(!(joint[a][i]>0)){unsupportedRows++;continue;}
   let sum=0;for(let x=0;x<n.actions.length;x++){
    const p=n.strategyActionMajor[x*len+i];assert.ok(p>=0&&p<=1);sum+=p;freq[x]+=joint[a][i]*p;assert.ok(Number.isFinite(n.actionEV[x*len+i]));
   }close(sum,1);actionRows++;
  }
  aggregates.push({id:n.id,actor:a,actions:n.actions,compatibleMass:mass,frequencies:freq.map(f=>mass>0?f/mass:null)});
 }
 if(n.terminal){
  // This sampled branch contains only checks; no post-root investment to deduct.
  assert.deepEqual(n.totalBetAmount,[0,0]);assert.equal(n.board.length,5);
  const ranks=hands.map(hs=>hs.map(h=>h.some(c=>n.board.includes(c))?null:evaluate([...n.board,...h].map(card))));
  for(let s=0;s<2;s++)for(let i=0;i<hands[s].length;i++){
   if(!(joint[s][i]>0))continue;
   let value=0,m=0,winMass=0,loseMass=0;
   for(let j=0;j<hands[s^1].length;j++){
    if(!(s===0?compat[i][j]:compat[j][i])||!ranks[s^1][j])continue;
    const w=n.rawWeights[s^1][j];const cmp=compare(ranks[s][i],ranks[s^1][j]);m+=w;value+=w*(cmp>0?600:cmp===0?300:0);if(cmp>0)winMass+=w;if(cmp<0)loseMass+=w;
   }
   assert.ok(m>0);
   const observed=n.terminalEV[s][i],exact=value/m;
   // Reproduce the documented f32 win/lose storage and bias restoration, using independently
   // ranked physical pairs. Near-zero EV suffers cancellation against the 300-unit bias.
   const f=Math.fround,comb=req.jointPrior.unnormalizedMass;
   const cf=f(f(300/comb*winMass)+f(-300/comb*loseMass));
   const factor=f(f(comb)*f(n.rawWeights[s][i]/n.compatibleMassWeights[s][i]));
   const replay=f(f(cf*factor)+300);
   const error=Math.abs(observed-exact),replayError=Math.abs(observed-replay);
   maxTerminalDoubleDifference=Math.max(maxTerminalDoubleDifference,error);maxTerminalFloat32ReplayDifference=Math.max(maxTerminalFloat32ReplayDifference,replayError);
   assert.ok(error<=terminalDoubleToleranceUnits,`Terminal double-reference error ${error}`);
   assert.ok(replayError<=terminalReplayToleranceUnits,`Terminal f32 replay error ${replayError}`);terminalChecks++;
  }
 }
}
assert.ok(terminalChecks>0);
const files=[dir+'reference-request-sb-bb-qqq.json',dir+'sb-bb-qqq-reference-result-v2.json',dir+'sb-bb-qqq-reload-export-v2.json',dir+'sb-bb-qqq-reference-v2.bin',
 'research/solver-probe/Cargo.toml','research/solver-probe/Cargo.lock','research/solver-probe/src/bin/sb_bb_qqq_reference_v2.rs','research/solver-probe/src/bin/sb_bb_qqq_reload_v2.rs',
 'research/solver-probe/target/release/sb_bb_qqq_reference_v2.exe','research/solver-probe/target/release/sb_bb_qqq_reload_v2.exe'];
const fileHashes={};
for(const f of files){const digest=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(f))digest.update(chunk);fileHashes[f]=digest.digest('hex');}
const out={ok:true,status:'selected_physical_reach_and_terminal_arithmetic_verified_not_independent_full_strategy_accuracy',inputFingerprint:req.inputFingerprint,
 nodes:data.nodes.length,physicalReachWeightsChecked:weights,supportedDecisionRows:actionRows,unsupportedDecisionRows:unsupportedRows,independentTerminalHandEVChecks:terminalChecks,
 terminalNumerics:{maxDoubleReferenceDifferenceUnits:maxTerminalDoubleDifference,maxFloat32ArithmeticReplayDifferenceUnits:maxTerminalFloat32ReplayDifference,
 doubleToleranceUnits:terminalDoubleToleranceUnits,float32ReplayToleranceUnits:terminalReplayToleranceUnits,unitsPerBB:100,
 scope:'Arithmetic roundoff of selected check-through terminal values; not solver convergence or strategic accuracy.'},
 engineReportedIterations:run.iterations,engineReportedMetricBB:run.achievedMetricUnits/100,engineReportedTargetReached:run.targetReached,rootAndAfterCheckReloadExactlyPreserved:true,
 aggregates,sourceHashes:fileHashes,originalA72Preserved:true,sourceCourseConfigurationRecovered:false,fullIndependentBestResponseVerified:false,
 fullCoursePolicyEvaluated:false,NL50Reference:false,appChanged:false,learnerTrials:0};
fs.writeFileSync(dir+'sb-bb-qqq-reference-verification-v2.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({...out,sourceHashes:undefined,aggregates:undefined}));
