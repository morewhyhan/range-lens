import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createThreebetSolver}=require('../desktop/threebet-solver.cjs');
const {createSolverService}=require('../desktop/solver-service.cjs');
const executable=path.resolve('research/solver-probe/target/release/trainer_engine.exe');
test('native 3bet solve verifies both position roles through river, including sized AllIn actions',{skip:process.platform!=='win32'||!fs.existsSync(executable),timeout:60000},async()=>{
 const parent=fs.realpathSync(path.resolve('research/runtime')),workDir=fs.mkdtempSync(path.join(parent,'poker-threebet-test-'));
 let ready=null;const solver=createThreebetSolver({workDir,executable,createService:createSolverService,onReady:(scene,dir)=>{ready={scene,dir};}});
 try{for(const [scene,size,oop,ip] of [['3bet-ip',8,{QQ:1},{AA:1,AKs:.5}],['3bet-oop',11,{AA:1,AKs:.5},{QQ:1}]]){
  ready=null;solver.start({scene,size,oop,ip});const deadline=Date.now()+25000;
  while(['solving','verifying'].includes(solver.status().state)&&Date.now()<deadline)await new Promise(r=>setTimeout(r,100));
  assert.equal(solver.status().state,'ready',JSON.stringify(solver.status()));assert.equal(ready.scene,scene);
  const report=JSON.parse(fs.readFileSync(path.join(ready.dir,'verification.json')));assert.equal(report.threeStreetCheckAndBetCall,true);assert.ok(report.edges>=20);
  const result=JSON.parse(fs.readFileSync(path.join(ready.dir,'result.json')));assert.equal(result.targetReached,true);assert.ok(result.achievedMetricUnits<=result.targetMetricUnits);
 }}finally{solver.stop();const resolved=path.resolve(workDir);assert.equal(path.dirname(resolved),parent);assert.ok(path.basename(resolved).startsWith('poker-threebet-test-'));fs.rmSync(resolved,{recursive:true,force:true,maxRetries:6,retryDelay:150});}
});
