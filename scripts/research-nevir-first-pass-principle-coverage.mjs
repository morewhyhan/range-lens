import fs from 'node:fs';
import assert from 'node:assert/strict';

const p=JSON.parse(fs.readFileSync('research/nevir-system/first-pass-principle-coverage.json','utf8'));
assert.equal(p.id,'FIRST_PASS_PRINCIPLE_COVERAGE_V1');
assert.equal(p.status,'paper_coverage_contract_not_trialed');
assert.deepEqual(p.route,['L1_preflop_context','L2_preflop_grid','L3_preflop_action','L4_range_handoff','p1_context','p2_board','p3_range','p4_compare','p5_execute','p6_update','p7_close']);
assert.equal(p.principles.length,12);
assert.deepEqual(p.principles.map(x=>x.id),['P01','P02','P03','P04','P05','P06','P07','P08','P09','P10','P11','P12']);
assert.equal(new Set(p.principles.map(x=>x.firstStep)).size,7);
for(const x of p.principles){
  assert.ok(x.name&&x.architectureNode&&x.question&&x.visible&&x.handoff.length>=1&&x.allowedIdentity&&x.mustNotInfer&&x.transferField);
}
assert.deepEqual(p.coverageCounts,{firstIntroductionTotal:12,L1:2,p2:2,p3:2,p4:2,p5:1,p6:2,p7:1});
assert.deepEqual(p.recheckCounts,{p1:2});
for(const key of ['eachPrincipleHasOneFirstStep','firstStepsFollowRoute','onePrimaryQuestionPerPrinciple','oneCentralVisualPerPrinciple','childOpensOnlyFromParent','physicalFilterSeparatedFromActionFilter','missingEvidenceStopsAtCurrentPrinciple','firstPassDoesNotClaimStrategyMastery','firstPassDoesNotClaimNL50']) assert.equal(p.rules[key],true);
assert.equal(p.currentEvidence.runtimeImplemented,false);
assert.equal(p.currentEvidence.lowBaselineTrial,false);
assert.equal(p.stopCardSource,'first-hand-gap-frame-cards.json');
assert.equal(p.currentEvidence.allPrinciplesHaveFrameOrStop,true);
console.log(JSON.stringify({ok:true,status:p.status,principles:p.principles.length,route:p.route.length,trial:p.currentEvidence.lowBaselineTrial}));
