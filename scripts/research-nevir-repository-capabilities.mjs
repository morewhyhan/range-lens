// Source inspection inventory. This never installs, compiles or executes upstream code.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir='research/nevir-system/';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function inspect(repository,treeFile,root){
 const tree=JSON.parse(fs.readFileSync(dir+treeFile));
 const files=[];
 function walk(folder){for(const e of fs.readdirSync(folder,{withFileTypes:true})){
  const full=path.join(folder,e.name);
  if(e.isDirectory())walk(full);
  else if(e.name.endsWith('.blob.json')){
   const blob=JSON.parse(fs.readFileSync(full));assert.equal(blob.encoding,'base64');
   const bytes=Buffer.from(blob.content,'base64');
   const gitSHA=crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex');assert.equal(gitSHA,blob.sha);
   const rel=path.relative(root,full).replaceAll('\\','/').slice(0,-10);
   const sourcePath=rel==='test-workflow'?'.github/workflows/test.yml':rel;
   assert.ok(tree.tree.some(e=>e.path===sourcePath&&e.sha===gitSHA));
   const decoded=full.slice(0,-10)+(rel==='test-workflow'?'.yml':'');
   assert.deepEqual(fs.readFileSync(decoded),bytes);
   files.push({sourcePath,localFile:decoded.replaceAll('\\','/'),gitBlobSHA:gitSHA,sha256:hash(bytes),size:bytes.length,permalink:`https://github.com/${repository}/blob/${tree.sha}/${sourcePath}`});
  }
 }}walk(root);
 return {repository,revision:tree.sha,inspection:'Selected source files, not an audit of every line or a runtime qualification.',files,treeSHA256:hash(fs.readFileSync(dir+treeFile))};
}
const equity=inspect('gto-wizard/equity-calculator','equity-calculator-remote-tree.json','research/equity-calculator-inspection/1d34a02c8e67fa5274d10620a74b6844472028fb');
const desktop=inspect('b-inary/desktop-postflop','desktop-postflop-remote-tree.json','research/desktop-postflop-inspection/0c15f97f204e5533b09cd83fda5939c110a98e75');
assert.equal(equity.files.length,14);assert.equal(desktop.files.length,9);
const eqRoot='research/equity-calculator-inspection/'+equity.revision+'/',desktopRoot='research/desktop-postflop-inspection/'+desktop.revision+'/';
const eq=fs.readFileSync(eqRoot+'src/eqcalc.cc','utf8'),pre=fs.readFileSync(eqRoot+'src/holdem_preflop.h','utf8'),gui=fs.readFileSync(desktopRoot+'src-tauri/src/solver.rs','utf8');
assert.ok(eq.includes('is_heads_up_holdem_preflop')&&eq.includes('holdem_preflop_counts(hands_cards)'));
assert.ok(pre.includes("47'008")&&pre.includes("1'712'304"));
assert.ok(gui.includes('w < 0.0005')&&gui.includes('game.expected_values_detail(game.current_player())'));
const metadata=JSON.parse(fs.readFileSync(dir+'equity-calculator-remote-metadata.json'));
assert.equal(metadata.full_name,equity.repository);assert.equal(metadata.license,null);
const noLicensePath=JSON.parse(fs.readFileSync(dir+'equity-calculator-remote-tree.json')).tree.every(e=>!/(^|\/)(licen[sc]e|copying)(\.|$)/i.test(e.path));assert.equal(noLicensePath,true);
const engineRevision=fs.readFileSync('research/solver-source/.git/HEAD','utf8').trim();
const engineFiles=['src/card.rs','src/action_tree.rs','src/game/interpreter.rs','src/solver.rs','src/utility.rs','Cargo.toml','examples/basic.rs'];
const engine={repository:'b-inary/postflop-solver',revision:engineRevision,inspection:'Existing fixed source plus prior isolated runtime calibrations; full requested strategy not solved.',files:engineFiles.map(f=>({sourcePath:f,sha256:hash(fs.readFileSync('research/solver-source/'+f)),permalink:`https://github.com/b-inary/postflop-solver/blob/${engineRevision}/${f}`}))};
const priorEvidence=['engine-export-verification.json','engine-range-view-evidence.json','flop-tree-preflight-verification.json','reference-request-btn-bb-a72.json','unlocked-policy-evaluation-evidence.json','reference-request-sb-bb-qqq.json','sb-bb-qqq-preflight-verification.json','storage-roundtrip-verification.json','solver-lock-history.json',
 'sb-bb-qqq-reference-verification.json','sb-bb-qqq-reload-comparison.json','sb-bb-qqq-root-policy-diagnostics.json','sb-bb-qqq-fold-identification.json','sb-bb-qqq-quality-attempt-v2-preparation.json','qqq-range-lesson-verification.json','qqq-range-image-review.json',
 'sb-bb-qqq-v2-validation-preparation.json','sb-bb-qqq-reference-result-v2.json','sb-bb-qqq-run-state-v2.json','sb-bb-qqq-reference-verification-v2.json','sb-bb-qqq-range-views-v2.json','sb-bb-qqq-root-policy-diagnostics-v2.json','sb-bb-qqq-fold-identification-v2.json','qqq-policy-rollouts-v2-metadata.json','qqq-policy-rollouts-v2.jsonl','qqq-policy-rollouts-v2-verification.json','policy-rollout-calibration-verification.json','sb-bb-qqq-export-closure.json'];
const qqq=JSON.parse(fs.readFileSync(dir+'sb-bb-qqq-reference-verification.json'));
const qqqV2=JSON.parse(fs.readFileSync(dir+'sb-bb-qqq-reference-verification-v2.json'));
const qqqV2State=JSON.parse(fs.readFileSync(dir+'sb-bb-qqq-run-state-v2.json'));
const qqqV2Range=JSON.parse(fs.readFileSync(dir+'sb-bb-qqq-range-views-v2.json'));
const qqqV2Root=JSON.parse(fs.readFileSync(dir+'sb-bb-qqq-root-policy-diagnostics-v2.json'));
const qqqV2Fold=JSON.parse(fs.readFileSync(dir+'sb-bb-qqq-fold-identification-v2.json'));
const qqqRollouts=JSON.parse(fs.readFileSync(dir+'qqq-policy-rollouts-v2-verification.json'));
const liveFile=fs.existsSync(dir+'sb-bb-qqq-run-state-v2.json')?dir+'sb-bb-qqq-run-state-v2.json':dir+'sb-bb-qqq-run-state.json';
const live=fs.existsSync(liveFile)?JSON.parse(fs.readFileSync(liveFile)):null;
const locked=JSON.parse(fs.readFileSync(dir+'engine-export-probe.json'));
const lockCounterexamples=locked.cases.map(c=>{
 const n=c.nodes.find(n=>n.historyIndices.length===0),row=n.rows.find(r=>r.hand==='QsQh');
 assert.equal(c.returnedMetric,0);assert.deepEqual(row.strategyByAction,[1,0]);
 const gainUnits=row.engineEVByAction[1]-row.engineEVByAction[0];assert.ok(gainUnits>0);
 const mass=n.compatibleJointMassWeights[0][row.handIndex]/n.jointReachMass;
 return {case:c.id,reportedLockedMetric:0,hand:row.hand,lockedAction:n.actions[0],alternative:n.actions[1],currentEVUnits:row.engineEVByAction[0],alternativeEVUnits:row.engineEVByAction[1],handConditionalGainBB:gainUnits/locked.unitsPerBB,rootCompatibleMassShare:mass,rootGainOfChangingOnlyThisHandBB:mass*gainUnits/locked.unitsPerBB,scope:'Existing locked tiny-model action EVs against the same fixed continuation; positive feasible deviation, not a full unrestricted best-response computation.'};
});
const output={status:'repository_source_capability_review_not_integration_or_strategy_completion',reviewedOn:'2026-10-21',snapshotAtUtc:new Date().toISOString(),equity,desktop,engine,
 separateQQQRun:live?{source:liveFile.slice(dir.length),statusAtSnapshot:live.status,pid:live.pid,inputFingerprint:live.inputFingerprint,lastObservedProgress:live.progress??null,unlocked:true,fullDeclaredThreeStreetTree:true,independentValidationPassed:false,replacesA72:false}:null,
 completedQQQFirstAttempt:{iterations:240,targetReached:qqq.engineReportedTargetReached,engineMetricBB:qqq.engineReportedMetricBB,selectedNodesChecked:qqq.nodes,
  physicalReachWeightsChecked:qqq.physicalReachWeightsChecked,independentTerminalHandEVChecks:qqq.independentTerminalHandEVChecks,
  terminalNumerics:qqq.terminalNumerics,fullIndependentStrategyAccuracyVerified:false,courseAnswersReleased:0},
  completedQQQV2:{iterations:qqqV2.engineReportedIterations,targetReached:qqqV2.engineReportedTargetReached,engineMetricBB:qqqV2.engineReportedMetricBB,
   runState:qqqV2State.status,selectedNodesChecked:qqqV2.nodes,physicalReachWeightsChecked:qqqV2.physicalReachWeightsChecked,
   supportedDecisionRows:qqqV2.supportedDecisionRows,unsupportedDecisionRows:qqqV2.unsupportedDecisionRows,
   independentTerminalHandEVChecks:qqqV2.independentTerminalHandEVChecks,rangeViews:qqqV2Range,
   rootOnlyDiagnostics:{rootOnlyDeviationGainBB:qqqV2Root.rootOnlyDeviationGainBB,courseAnswersGenerated:qqqV2Root.courseAnswersGenerated},
   foldIdentification:{baselinePublicFold:qqqV2Fold.baselinePublicFold,hypotheticalPublicFold:qqqV2Fold.hypotheticalPublicFold,courseAnswersGenerated:qqqV2Fold.courseAnswersGenerated},
   forwardRollouts:{status:qqqRollouts.status,samples:qqqRollouts.samples,actionLedgerChecks:qqqRollouts.independentActionLedgerChecks,fullTreeExhaustivelyValidated:qqqRollouts.fullTreeExhaustivelyValidated,independentBestResponseVerified:qqqRollouts.independentBestResponseVerified,solverTargetCertified:qqqRollouts.solverTargetCertified,coursePolicyQualityVerified:qqqRollouts.coursePolicyQualityVerified},
   fullIndependentStrategyAccuracyVerified:false,courseAnswersReleased:0},
 facts:{equityFixedPhysicalHands:true,equityPublicWeightedRangeAPI:false,equityBettingStrategyAPI:false,equityPureWinTieAndPotShare:true,equityHUPreflopTableClasses:47008,equityLicenseMetadata:null,equityLicenseFileFound:!noLicensePath,
  equityCurrentExtensionRunLocally:false,desktopCurrentAppRunLocally:false,desktopBackendTruncatesReachBelow:0.0005,
  postflopTwoActivePlayers:true,sixSeatBackgroundIsNotSixActivePlayerSolve:true,fullRequestedFlopSolved:false,commercialGtoWizardSolutionsObtained:false},
 recommendedRoles:{equity:'Independent physical-equity component candidate, pending license/build/validation.',engine:'Author-side matched subgame reference computation and raw export.',desktop:'Reference for node navigation, physical combos and charts; not the learner UI or grading export.'},
 lockedMetricCounterexamples:lockCounterexamples,
 independentDeviationEvaluation:{source:'unlocked-policy-evaluation-evidence.json',verifiedScope:'Existing two tiny zero-rake river menus only; recursive and exhaustive pure-policy maxima agree.',fullCourseEvaluationCompleted:false},
 requiredBridge:'Match settings and root ranges, obtain an unsimplified declared-action-tree reference, compile the course as a separate policy, compare in the same game with explicit continuations, then generate simplified training and range charts.',
 priorEvidenceHashes:Object.fromEntries(priorEvidence.map(f=>[f,hash(fs.readFileSync(dir+f))])),
 notVerified:['All upstream code correctness','Current equity extension portability or runtime','Full matched course baseline and target NL50 strategy','Course simplification loss and exploitability','Real adult beginner learning'],productChanged:false,learnerTrials:0};
fs.writeFileSync(dir+'repository-capabilities-evidence.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,equitySourceFiles:14,desktopSourceFiles:9,engineSourceFiles:engineFiles.length,equityLicenseConfirmed:false,equityRunLocally:false,fullRequestedFlopSolved:false}));
