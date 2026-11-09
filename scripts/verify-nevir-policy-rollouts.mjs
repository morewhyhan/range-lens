// Independent replay/settlement and bounded sampling intervals. Never certifies GTO accuracy.
import fs from 'node:fs';
import readline from 'node:readline';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {card,evaluate,compare} from '../src/poker.js';
const dir='research/nevir-system/',calibration=process.argv.includes('--calibration'),stem=calibration?'policy-rollout-calibration':'qqq-policy-rollouts-v2';
const meta=JSON.parse(fs.readFileSync(dir+stem+'-metadata.json'));
const near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`),hole=h=>h.match(/.{2}/g),key=h=>h.slice().sort().join('');
const indexed=meta.orderedHands.map(hs=>new Map(hs.map((h,i)=>[key(hole(h)),i])));
const stats=new Map(meta.cases.map(c=>[c.id,{case:c,n:0,sum:0,sum2:0,folds:0,showdowns:0,allInRunouts:0,publicDeals:0,pairCounts:new Map()}]));
let actions=0,refunds=0;
function payout(holding,board,paid,folded){
 if(folded!==null){const r=[0,0];r[folded]=-paid[folded];r[folded^1]=meta.startingPotUnits+paid[folded];return r;}
 assert.equal(board.length,5);const cmp=compare(evaluate([...board,...holding[0]].map(card)),evaluate([...board,...holding[1]].map(card)));
 const total=meta.startingPotUnits+paid[0]+paid[1];return [0,1].map(s=>(cmp===0?total/2:(cmp>0?0:1)===s?total:0)-paid[s]);
}
function replay(row){
 const known=[...meta.initialBoard,...row.hole.flat()];assert.equal(new Set(known).size,known.length);known.forEach(card);
 const board=meta.initialBoard.slice(),paid=[0,0];let street=[0,0],actor=0,checks=0,folded=null,closed=false,terminal=false,runout=false;
 for(const event of row.events){
  if(event.deal){assert.ok(closed&&!terminal&&board.length<5);assert.ok(!known.includes(event.deal));known.push(event.deal);board.push(event.deal);street=[0,0];actor=0;checks=0;closed=false;stats.get(row.case).publicDeals++;continue;}
  if(event.runout){assert.ok(terminal&&runout&&folded===null&&board.length<5);assert.ok(!known.includes(event.runout));known.push(event.runout);board.push(event.runout);stats.get(row.case).allInRunouts++;continue;}
  assert.ok(!terminal&&!closed);assert.equal(event.actor,actor);const other=actor^1,toCall=street[other]-street[actor];assert.ok(toCall>=0);actions++;
  if(event.action==='Fold'){assert.ok(toCall>0);folded=actor;terminal=true;if(paid[other]>paid[actor])refunds++;}
  else if(event.action==='Check'){assert.equal(toCall,0);checks++;if(checks===2){closed=true;if(board.length===5)terminal=true;}}
  else if(event.action==='Call'){assert.ok(toCall>0);paid[actor]+=toCall;street[actor]+=toCall;closed=true;if(paid.every(x=>x===meta.effectiveStackUnits)){terminal=true;runout=board.length<5;}else if(board.length===5)terminal=true;}
  else{
   const m=/^(Bet|Raise|AllIn)\((\d+)\)$/.exec(event.action);assert.ok(m);const target=Number(m[2]);
   if(m[1]==='Bet')assert.equal(toCall,0);if(m[1]==='Raise')assert.ok(toCall>0);assert.ok(target>street[other]);
   const add=target-street[actor];assert.ok(add>0);paid[actor]+=add;street[actor]=target;checks=0;
   if(m[1]==='AllIn')assert.equal(paid[actor],meta.effectiveStackUnits);
  }
  assert.ok(paid.every(x=>x>=0&&x<=meta.effectiveStackUnits));actor=other;
 }
 assert.ok(terminal);assert.equal(folded,row.folded);assert.deepEqual(board,row.board);assert.deepEqual(paid,row.paid);
 if(folded===null)assert.equal(paid[0],paid[1]);const reward=payout(row.hole,board,paid,folded);near(reward[0]+reward[1],meta.startingPotUnits);
 return reward;
}
const sourceLines=readline.createInterface({input:fs.createReadStream(dir+meta.rawFile),crlfDelay:Infinity});
for await(const line of sourceLines){
 const row=JSON.parse(line),s=stats.get(row.case);assert.ok(s);assert.equal(row.trial,s.n);
 const ids=row.hole.map((h,seat)=>indexed[seat].get(key(h)));assert.ok(ids.every(i=>i!==undefined));
 ids.forEach((i,seat)=>assert.ok(meta.rootWeightHalfUnits[seat][i]>0));
 if(s.case.fixed)assert.equal(ids[s.case.fixed[0]],s.case.fixed[1]);
 const reward=replay(row),value=reward[s.case.comparePlayer]/100;
 assert.ok(value>=-meta.effectiveStackUnits/100&&value<=(meta.startingPotUnits+meta.effectiveStackUnits)/100);
 s.n++;s.sum+=value;s.sum2+=value*value;s.folds+=row.folded!==null;s.showdowns+=row.folded===null;
 const k=ids.join(',');s.pairCounts.set(k,(s.pairCounts.get(k)??0)+1);
}
assert.equal([...stats.values()].reduce((n,s)=>n+s.n,0),meta.samples);
const nodes=new Map(meta.calibrationNodes.map(n=>[JSON.stringify(n.historyIndices),n]));
function exactPair(i,j,history=[],paid=[0,0],street=[0,0],lastActor=null,lastAction=null){
 const n=nodes.get(JSON.stringify(history));assert.ok(n);if(n.terminal){return payout([hole(meta.orderedHands[0][i]),hole(meta.orderedHands[1][j])],meta.initialBoard,paid,lastAction==='Fold'?lastActor:null);}
 const a=n.actor,own=a===0?i:j,len=meta.orderedHands[a].length;const probs=n.actions.map((_,x)=>n.strategy[x*len+own]),sum=probs.reduce((s,p)=>s+p,0);assert.ok(sum>0);
 const result=[0,0];n.actions.forEach((action,x)=>{const p=probs[x]/sum;if(p===0)return;const nextPaid=paid.slice(),nextStreet=street.slice();
  if(action==='Call'){nextPaid[a]+=street[a^1]-street[a];nextStreet[a]=street[a^1];}
  else if(!['Fold','Check'].includes(action)){const to=Number(action.match(/\((\d+)\)/)[1]);nextPaid[a]+=to-street[a];nextStreet[a]=to;}
  const r=exactPair(i,j,[...history,x],nextPaid,nextStreet,a,action);for(let s=0;s<2;s++)result[s]+=p*r[s];
 });return result;
}
const confidenceDelta=.01,K=meta.cases.length,range=(2*meta.effectiveStackUnits+meta.startingPotUnits)/100;
const records=[];
for(const s of stats.values()){
 assert.equal(s.n,s.case.trials);const mean=s.sum/s.n,variance=Math.max(0,(s.sum2-s.n*mean*mean)/(s.n-1));
 const log=Math.log(4*K/confidenceDelta),radius=Math.sqrt(2*variance*log/s.n)+7*range*log/(3*(s.n-1));
 const expected=s.case.expectedEngineUnits/100;
 const result={id:s.case.id,n:s.n,meanBB:mean,standardErrorBB:Math.sqrt(variance/s.n),engineExpectedBB:expected,differenceBB:mean-expected,
  intervalRadiusBB:radius,intervalContainsEngineValue:Math.abs(mean-expected)<=radius,folds:s.folds,showdowns:s.showdowns,publicDeals:s.publicDeals,allInRunoutCards:s.allInRunouts};
 if(calibration){
  let exact=0,mass=0;const distribution=[];
  for(let i=0;i<meta.orderedHands[0].length;i++)for(let j=0;j<meta.orderedHands[1].length;j++){
   if(s.case.fixed&&[i,j][s.case.fixed[0]]!==s.case.fixed[1])continue;
   if(hole(meta.orderedHands[0][i]).some(c=>hole(meta.orderedHands[1][j]).includes(c)))continue;
   const w=meta.rootWeightHalfUnits[0][i]*meta.rootWeightHalfUnits[1][j];mass+=w;distribution.push({i,j,w});exact+=w*exactPair(i,j)[s.case.comparePlayer]/100;
  }
  exact/=mass;result.independentExactBB=exact;result.engineMinusIndependentExactBB=expected-exact;
  for(const {i,j,w}of distribution){const actual=(s.pairCounts.get([i,j].join(','))??0)/s.n;const target=w/mass;const radius=Math.sqrt(Math.log(2*distribution.length*K/1e-6)/(2*s.n));assert.ok(Math.abs(actual-target)<=radius,'Root distribution incompatible with declared conditional sampler');}
  // Conservative finite-model comparison includes the engine's 16-bit value-storage scale.
  assert.ok(Math.abs(expected-exact)<2*(meta.startingPotUnits+meta.effectiveStackUnits)*mass/(32767*100));
 }
 records.push(result);
}
const success=records.every(r=>r.intervalContainsEngineValue);
const files=[dir+stem+'-metadata.json',dir+meta.rawFile,'research/solver-probe/src/bin/policy_rollout_probe.rs','research/solver-probe/target/release/policy_rollout_probe.exe','research/solver-probe/Cargo.lock','scripts/verify-nevir-policy-rollouts.mjs'];
const hashes={};for(const f of files){const h=crypto.createHash('sha256');for await(const b of fs.createReadStream(f))h.update(b);hashes[f]=h.digest('hex');}
const out={ok:success,status:calibration?'tiny_river_exact_policy_and_sampler_calibration_not_full_tree':'full_declared_tree_forward_sampling_consistency_not_best_response_or_accuracy_proof',calibration,samples:meta.samples,independentActionLedgerChecks:actions,uncalledBetFoldCases:refunds,records,
 intervals:{method:'Two-sided empirical Bernstein, theorem4 plus union bound across fixed cases',source:'https://arxiv.org/pdf/0907.3740',familyDelta:confidenceDelta,assumption:'Ideal independent bounded draws; actual run uses fixed-seed SplitMix64 pseudorandom draws, not a proof of IID randomness.',notSolverTargetErrorBound:true,fixedSampleSizeNoSeedHunting:true},
 sourceHashes:hashes,v2ForwardSampleBatchCompletedAndConsistent:!calibration&&success,fullTreeExhaustivelyValidated:false,independentBestResponseVerified:false,solverTargetCertified:false,coursePolicyQualityVerified:false,learnerTrials:0,appChanged:false};
fs.writeFileSync(dir+stem+'-verification.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({...out,sourceHashes:undefined}));
if(!success)process.exitCode=1;
