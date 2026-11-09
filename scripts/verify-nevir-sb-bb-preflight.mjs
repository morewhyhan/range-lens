import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const dir='research/nevir-system/',read=f=>JSON.parse(fs.readFileSync(dir+f,'utf8').replace(/^\uFEFF/,''));
const r=read('reference-request-sb-bb-qqq.json'),p=read('sb-bb-qqq-preflight.json'),m=read('memory-snapshot.json');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(dir+f)).digest('hex');
assert.equal(p.inputFingerprint,r.inputFingerprint);assert.equal(p.sourceRevision,fs.readFileSync('research/solver-source/.git/HEAD','utf8').trim());
assert.equal(hash('reference-request-btn-bb-a72.json'),r.originalA72.sha256);
assert.equal(p.strategyMemoryAllocated,false);assert.equal(p.solveStarted,false);
let checkedWeights=0;
for(const [seat,role]of ['oop','ip'].entries()){
 const expected=new Map(r.ranges[role].rootHands.map(h=>[[...h.hole].sort().join(''),h.weight]));
 assert.equal(p.orderedHands[seat].length,expected.size);
 for(const [i,h]of p.orderedHands[seat].entries()){
  const cards=h.match(/.{2}/g),key=cards.sort().join('');assert.equal(p.rootWeights[seat][i],expected.get(key));
  const other=r.ranges[role==='oop'?'ip':'oop'].rootHands;
  const mass=expected.get(key)*other.filter(o=>!o.hole.some(c=>cards.includes(c))).reduce((s,o)=>s+o.weight,0);
  assert.equal(p.rootCompatibleMassWeights[seat][i],mass);checkedWeights++;
 }
 assert.equal(p.rootCompatibleMassWeights[seat].reduce((s,w)=>s+w,0),r.jointPrior.unnormalizedMass);
}
for(const n of p.abstractNodes){
 let actor=0,paid=[0,0],total=[0,0],checked=false,ended=false,street=0;
 for(const action of n.history){
  assert.equal(ended,false);const other=actor^1,toCall=paid[other]-paid[actor];
  if(action==='Fold'){assert.ok(toCall>0);ended=true;continue;}
  if(action==='Check'){assert.equal(toCall,0);if(checked){street++;paid=[0,0];actor=0;checked=false;if(street===3)ended=true;}else{checked=true;actor=other;}}
  else if(action==='Call'){assert.ok(toCall>0);total[actor]+=toCall;paid[actor]+=toCall;street++;paid=[0,0];actor=0;checked=false;if(street===3||total.some(v=>v===9700))ended=true;}
  else{const a=/^(Bet|Raise|AllIn)\((\d+)\)$/.exec(action);assert.ok(a);const target=Number(a[2]),add=target-paid[actor];assert.ok(add>0&&target>paid[other]);if(a[1]==='Bet')assert.equal(toCall,0);if(a[1]==='Raise')assert.ok(toCall>0);total[actor]+=add;paid[actor]=target;if(a[1]==='AllIn')assert.equal(total[actor],9700);checked=false;actor=other;}
  assert.ok(total.every(v=>v>=0&&v<=9700));
 }
 assert.deepEqual(total,n.totalBet);assert.equal(600+total[0]+total[1]+9700-total[0]+9700-total[1]+40000,60000);
}
const budget=Math.max(0,Math.min(Math.floor(m.availablePhysicalBytes*.6),m.availablePhysicalBytes-2*1024**3));
const out={ok:true,status:'separate_full_graph_and_roots_verified_not_strategy',inputFingerprint:r.inputFingerprint,sourceRevision:p.sourceRevision,
 checkedRootWeights:checkedWeights,abstractHistories:p.abstractNodes.length,rootActions:p.rootActions,estimatedCompressedBytes:p.estimatedCompressedBytes,
 memory:{...m,budgetBytes:budget,compressedFits:p.estimatedCompressedBytes<=budget,notReserved:true,notWholeProcessPeak:true},originalA72Preserved:true,
 sourceHashes:{request:hash('reference-request-sb-bb-qqq.json'),preflight:hash('sb-bb-qqq-preflight.json'),memory:hash('memory-snapshot.json')},solveStarted:false,NL50Reference:false};
fs.writeFileSync(dir+'sb-bb-qqq-preflight-verification.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,checkedRootWeights:checkedWeights,abstractHistories:out.abstractHistories,compressedBytes:out.estimatedCompressedBytes,budgetBytes:budget,compressedFits:out.memory.compressedFits,originalA72Preserved:true}));
