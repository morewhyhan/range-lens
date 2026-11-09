import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{createThreebetSolver}=require('../desktop/threebet-solver.cjs'),{createSolverService}=require('../desktop/solver-service.cjs'),{openingRequest,preparePostflopRequest,category}=require('../desktop/postflop-coverage.cjs');
const executable=path.resolve('research/solver-probe/target/release/trainer_engine.exe');
test('arbitrary flops in all six categories independently solve and verify through three streets',{skip:process.platform!=='win32'||!fs.existsSync(executable),timeout:900000},async()=>{
 const parent=fs.realpathSync(path.resolve('research/runtime')),workDir=fs.mkdtempSync(path.join(parent,'coverage-native-'));let ready=null;
 const solver=createThreebetSolver({workDir,executable,createService:createSolverService,prepareRequest:i=>i.request,onReady:(scene,dir)=>{ready={scene,dir};}}),results=[];
 try{for(const board of [['As','Js','6s'],['7h','7d','7c'],['Ah','Qd','4h'],['Ks','Qh','Jd'],['Th','9h','8c'],['7s','5d','2c']]){
  const source=openingRequest('srp-CO-2.5');for(const [role,weights] of [['oop',{AA:1}],['ip',{KK:1}]])source.ranges[role]={id:'test-'+role,source:'explicit small integration-test ranges',action:role==='oop'?'call':'raise',classWeights:Object.fromEntries(Object.keys(source.ranges[role].classWeights).map(h=>[h,weights[h]||0])),rangeStringDraft:Object.entries(weights).map(([h,w])=>h+(w===1?'':':'+w)).join(',')};
  const request=preparePostflopRequest(source,board);ready=null;solver.start({scene:request.id,request});const deadline=Date.now()+180000;while(['solving','verifying'].includes(solver.status().state)&&Date.now()<deadline)await new Promise(r=>setTimeout(r,100));
  assert.equal(solver.status().state,'ready',JSON.stringify(solver.status()));const result=JSON.parse(fs.readFileSync(path.join(ready.dir,'result.json'))),report=JSON.parse(fs.readFileSync(path.join(ready.dir,'verification.json')));
  assert.equal(result.targetReached,true);assert.equal(report.threeStreetCheckAndBetCall,true);assert.deepEqual(result.root.board.slice().sort(),board.slice().sort());assert.ok(result.root.actions.filter(a=>a.startsWith('Bet')).length===2);
  results.push({board,category:category(board),inputFingerprint:request.inputFingerprint,errorBB:result.achievedMetricUnits/100,targetBB:result.targetMetricUnits/100,verifiedEdges:report.edges});
 }assert.equal(new Set(results.map(r=>r.category)).size,6);assert.equal(new Set(results.map(r=>r.inputFingerprint)).size,6);fs.writeFileSync(path.join(parent,'postflop-coverage-native.json'),JSON.stringify({ok:true,smallTestRanges:true,productionRanges:false,results},null,2));
 }finally{solver.stop();const resolved=path.resolve(workDir);assert.equal(path.dirname(resolved),parent);assert.ok(path.basename(resolved).startsWith('coverage-native-'));fs.rmSync(resolved,{recursive:true,force:true,maxRetries:6,retryDelay:150});}
});
