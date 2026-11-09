// First original-course comparison dossier. No missing policies are invented.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {card,evaluate,assertCards} from '../src/poker.js';
const dir='research/nevir-system/',read=f=>JSON.parse(fs.readFileSync(dir+f,'utf8').replace(/^\uFEFF/,''));
const claims=read('source-claims.json'),request=read('reference-request-btn-bb-a72.json'),tree=read('flop-tree-preflight.json'),memory=read('flop-tree-preflight-verification.json');
const f=claims.fragments.find(f=>f.id==='N1-L40');assert.ok(f.text.includes('22')&&f.text.includes('诈唬'));
const source=fs.readFileSync(f.source.file),sourceHash=crypto.createHash('sha256').update(source).digest('hex');assert.equal(sourceHash,f.source.sha256);
assert.equal(source.toString('utf8').split(/\r?\n/)[f.source.line-1].trim(),f.text);
assert.deepEqual(request.context.flop,['As','7h','2d']);assert.equal(tree.inputFingerprint,request.inputFingerprint);
const board=request.context.flop,remainingTwos=['2c','2h','2s'];
const sets=[];
for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
 const hole=[remainingTwos[i],remainingTwos[j]],cards=[...board,...hole].map(card);assertCards(cards);
 const value=evaluate(cards);assert.deepEqual(value.value,[3,2,14,7]);
 assert.equal(cards.filter(c=>c.rank===2).length,3);
 sets.push({hole,bestFive:value.value,currentCategory:value.name});
}
const targets=request.ranges.ip.rootHands.filter(h=>['KQs','KQo','Q3s'].includes(h.hand)).map(h=>{
 const compatibleBB=request.ranges.oop.rootHands.filter(o=>!o.hole.some(c=>h.hole.includes(c)));
 return {hole:h.hole,handClass:h.hand,ipInitialWeight:h.weight,
  priorBBEligiblePhysicalCombos:compatibleBB.length,priorBBEligibleRelativeMass:compatibleBB.reduce((s,o)=>s+o.weight,0),
  conditionTime:'Before BB first flop action, conditioned on this exact BTN hand.',
  bbAfterObservedCheckRange:null,bbResponseToSmallBet:null,actionValues:null,
  baselineCourseAction:h.hand.startsWith('KQ')?'check':'bet_small',adjustedAdoptedCourseAction:'bet_small',
  notACompletePolicy:true};
});
assert.equal(targets.length,20);
assert.deepEqual(Object.fromEntries(['KQs','KQo','Q3s'].map(c=>[c,targets.filter(h=>h.handClass===c).length])),{KQs:4,KQo:12,Q3s:4});
const output={status:'original_course_comparison_inputs_and_blockers_not_strategy_validation',source:{file:f.source.file,sha256:sourceHash,section:f.source.section,reviews:['R06','R07','R37'],textHazardFragment:f.id},
 goal:'Compare original basic and adjusted A72 course prescriptions to matched references, then teach verified simplification without losing full-hand structure.',
 root:{requestFile:'reference-request-btn-bb-a72.json',inputFingerprint:request.inputFingerprint,context:request.context,immutableOriginalRequestPreserved:true},
 courseDecision:{actor:'BTN',observedPrefix:['BB check'],potBB:5.5,stacksBB:[97.5,97.5],toCallBB:0},
 originalCourseConfigRecovered:false,declaredTrainingConfig:{sixMax:true,initialStackBB:100,openBB:2.5,rake:0,startingRanges:'User simplified charts; not recovered original GTO ranges.'},
 sourcePrecision:{basicRules:'KQ check, Q3 bet_small as adopted course rules; not full exact-frequency solver data.',reportedAggregateBetFrequency:'about50%, not a 50% policy for every hand',adjustedRule:'Adopt final range-small-bet simplification only when its additional response assumptions are stated.',numericAdjustedOpponentPolicy:null,reportedXR:'about9%, aggregate claim only, not applied per hand'},
 currentActualMenus:tree.actualAbstractMenus,actualSmallBet:{amountUnits:182,potUnits:550,ratio:182/550,label:'Actual engine33% rounded amount; not exact mathematical1/3.'},
 sizeStudyStatus:'Current draft has one non-all-in flop size; it cannot establish optimality versus20%,25%,40% or other unlisted sizes. Do not change original request or claim size comparison solved.',
 physicalReview:{'22':{sourceClaimStatus:'requires_source_resolution',sourceFragment:f.id,legalPhysicalCombos:3,allHaveThreeTwos:true,sets,
  blockedUse:'Do not teach this literal22 example as a weak one-pair-to-bluff conversion.',notInferred:'Current made-hand strength alone does not determine optimal raise, call, check or source speaker intent.'}},
 targets,
 readiness:{originalSolveStarted:request.solve.started,originalRootSolved:false,bbCheckPolicyObtained:false,completeCoursePoliciesObtained:false,actionEVReady:false,fullPolicyLossReady:false,freeDeviationAssessmentReady:false,rangeChartsReady:false,ordinaryExecutionRulesOnly:'Existing source-rule exercises stay explicitly source-rule exercises; not upgraded to GTO-validated.'},
 resourceObservation:{memoryUtc:memory.memorySnapshot.observedUtc,freePhysicalBytes:memory.memorySnapshot.availablePhysicalBytes,executionBudgetBytes:memory.executionGuard.budgetBytes,compressedEstimateBytes:memory.actualEngineEstimatedBytes.compressed,fits:memory.executionGuard.compressedFits,notReserved:true},
 nextRequiredEvidence:['Full same-config original root reference without forcing BB check.','Positive-support BB check branch with raw per-hand policy and updated ranges.','Current hand/action EV plus complete future policy on compared branches.','Explicit adjusted opponent policy before adjusted-reference claims.','Separate same-tree course policy evaluation and free deviations; no arbitrary completion of unspecified hands.'],
 appChanged:false,learnerTrials:0,newNL50Reference:false};
assert.equal(output.readiness.originalRootSolved,false);
fs.writeFileSync(dir+'a72-course-comparison-request.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,courseTargetPhysicalHands:20,physical22Sets:3,rawReferenceReady:false,rootInputFingerprint:request.inputFingerprint,memoryBudgetBytes:output.resourceObservation.executionBudgetBytes}));
