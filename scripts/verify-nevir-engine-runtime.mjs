import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const dir='research/nevir-system',runtimePath=`${dir}/engine-runtime-calibration.json`;
assert.ok(fs.existsSync(runtimePath),'Runtime result missing; a build or static contract is not a passed calibration.');
const runtime=JSON.parse(fs.readFileSync(runtimePath,'utf8')),request=JSON.parse(fs.readFileSync(`${dir}/reference-request-btn-bb-a72.json`,'utf8')),contract=JSON.parse(fs.readFileSync(`${dir}/engine-adapter-contract.json`,'utf8'));
assert.equal(runtime.status,'runtime_range_amount_and_river_calibration_passed_not_flop_solved');
assert.equal(runtime.sourceRevision,contract.engine.requestedRevision);
assert.equal(fs.readFileSync('research/solver-source/.git/HEAD','utf8').trim(),runtime.sourceRevision);
assert.equal(runtime.cardChecks,52);assert.equal(runtime.parsedRanges.length,2);
for(const role of ['oop','ip']){const r=runtime.parsedRanges.find(r=>r.role===role);assert.ok(r);assert.equal(r.physicalWeightChecks,1326);assert.equal(r.rootPositiveHands,request.ranges[role].summary.positiveAfterFlop);assert.equal(r.rootMass,request.ranges[role].summary.massAfterFlop);}
assert.equal(runtime.amountProbe.notActualFlopTree,true);assert.match(runtime.amountProbe.rootActions,/Bet\(182\)/);assert.match(runtime.amountProbe.afterCheckBet182,/Raise\(455\)/);
const expected={win:732,lose:-182,tie:275};assert.equal(runtime.evCalibrations.length,3);
for(const [id,call]of Object.entries(expected)){const r=runtime.evCalibrations.find(r=>r.id===id);assert.ok(r);assert.ok(Math.abs(r.runtimeFoldEV)<.02);assert.ok(Math.abs(r.runtimeCurrentCallEV-call)<.02);assert.equal(r.expectedCurrentCallEV,call);}
assert.equal(runtime.requestedFlopSolveStarted,false);assert.equal(runtime.NL50Reference,false);assert.equal(runtime.appChanged,false);
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const build=JSON.parse(fs.readFileSync(`${dir}/engine-build-attempt.json`,'utf8'));
assert.equal(build.completedAttempt.exitCode,0);
assert.equal(build.completedAttempt.sourceChanged,false);
assert.equal(build.completedAttempt.compatibilityFlag,'-A dangerous_implicit_autorefs');
const paths=['research/solver-source/Cargo.toml','research/solver-source/src/card.rs','research/solver-source/src/game/interpreter.rs','research/solver-source/src/action_tree.rs','research/solver-probe/Cargo.toml','research/solver-probe/Cargo.lock','research/solver-probe/src/main.rs'];
for(const p of paths)assert.ok(fs.existsSync(p),p);
const out={ok:true,status:'runtime_calibration_verified_not_requested_flop_solution',sourceRevision:runtime.sourceRevision,inputFingerprint:request.inputFingerprint,runtimeHash:sha(runtimePath),fileHashes:Object.fromEntries(paths.map(p=>[p,sha(p)])),checks:{cardRoundTrips:52,rangePhysicalWeights:2652,declaredRootRanges:2,tinyRiverAmountProbe:true,winLoseTieEVOracles:3},limits:['The three calibrations lock the path into check-bet, preventing a zero-reach action from masquerading as an EV test.','Only tiny river games were solved; the requested full A72 flop tree has not been built or solved.','This does not prove general solver correctness, full-game equilibrium or NL50 ability.','Research executable and source are isolated from app source; no user data saved.']};
out.buildContext={command:build.command,completedAttempt:build.completedAttempt,recordHash:sha(`${dir}/engine-build-attempt.json`)};
fs.writeFileSync(`${dir}/engine-runtime-verification.json`,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({ok:true,status:out.status,checks:out.checks},null,2));
