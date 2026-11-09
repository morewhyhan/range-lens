import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const run = read('sb-bb-qqq-run-state-v2.json');
const verification = read('sb-bb-qqq-reference-verification-v2.json');
const reload = read('sb-bb-qqq-reload-comparison-v2.json');
const ranges = read('sb-bb-qqq-range-views-v2.json');
const closure = read('sb-bb-qqq-export-closure.json');
const rollouts = read('qqq-policy-rollouts-v2-verification.json');

assert.equal(run.status, 'finished_candidate_saved');
assert.equal(run.targetReached, true);
assert.equal(verification.ok, true);
assert.equal(verification.engineReportedTargetReached, true);
assert.equal(verification.rootAndAfterCheckReloadExactlyPreserved, true);
assert.equal(rollouts.ok, true);
assert.equal(rollouts.v2ForwardSampleBatchCompletedAndConsistent, true);
assert.equal(reload.rootStrategy.float32BitDifferences, 0);
assert.equal(reload.afterCheckStrategy.float32BitDifferences, 0);
assert.equal(closure.counts.missingActionEdges, 25);
assert.equal(closure.counts.missingChanceEdges, 143);

const phases = [
  {
    id: 'P0_identity',
    status: 'verified_for_candidate',
    evidence: ['inputFingerprint','sourceRevision','six_max_SB_BB_QQQ_configuration'],
    releases: ['author_review']
  },
  {
    id: 'P1_physical_facts',
    status: 'selected_scope_verified',
    evidence: ['physicalReachWeightsChecked','independentTerminalHandEVChecks','range_views'],
    releases: ['fact_visuals_in_selected_nodes','author_review']
  },
  {
    id: 'P2_reference_policy',
    status: 'candidate_reference_not_full_lesson_reference',
    evidence: ['target_reached','raw_strategy','raw_EV','reload_roundtrip','forward_rollout_consistency'],
    releases: ['reference_inspection_only'],
    blocks: ['course_answer','continuous_training']
  },
  {
    id: 'P3_course_policy',
    status: 'blocked_course_source_and_quantization_missing',
    evidence: [],
    blocks: ['course_answer','simplified_action_grading']
  },
  {
    id: 'P4_difference',
    status: 'blocked_reference_course_pair_missing',
    evidence: [],
    blocks: ['difference_ledger','simplification_loss_claim']
  },
  {
    id: 'P5_range_and_successors',
    status: 'range_views_present_successor_closure_incomplete',
    evidence: ['range_views'],
    missing: {actionEdges: closure.counts.missingActionEdges, chanceEdges: closure.counts.missingChanceEdges},
    blocks: ['arbitrary_continuous_practice','successor_based_grading']
  },
  {
    id: 'P6_teaching_frame',
    status: 'blocked_not_compiled',
    evidence: [],
    blocks: ['learner_route']
  },
  {
    id: 'P7_transfer',
    status: 'blocked_not_compiled',
    evidence: [],
    blocks: ['heldout_transfer']
  },
  {
    id: 'P8_release',
    status: 'blocked_by_P3_P5_P6_P7',
    evidence: [],
    blocks: ['learner_release','NL50_claim']
  }
];

const result = {
  id: 'QQQ_V2_COURSE_BRIDGE_AUDIT_V1',
  status: 'reference_candidate_verified_course_package_blocked',
  purpose: '把一份达到内部求解停止线的QQQ候选参考逐层映射到P0-P8课包编译合同，明确作者研究可用范围和学习者发布阻断。',
  sources: [
    'sb-bb-qqq-run-state-v2.json',
    'sb-bb-qqq-reference-verification-v2.json',
    'sb-bb-qqq-reload-comparison-v2.json',
    'sb-bb-qqq-range-views-v2.json',
    'sb-bb-qqq-export-closure.json',
    'qqq-policy-rollouts-v2-verification.json',
    'strategy-to-course-compiler-contract.json'
  ],
  inputFingerprint: verification.inputFingerprint,
  solverQuality: {
    iterations: verification.engineReportedIterations,
    metricBB: verification.engineReportedMetricBB,
    targetBB: 0.006,
    targetReached: verification.engineReportedTargetReached,
    selectedNodes: verification.nodes,
    physicalReachWeightsChecked: verification.physicalReachWeightsChecked,
    independentTerminalHandEVChecks: verification.independentTerminalHandEVChecks,
    forwardRolloutSamples: rollouts.samples,
    forwardRolloutLedgerChecks: rollouts.independentActionLedgerChecks
  },
  closure: {
    decisionNodes: closure.counts.decisionNodes,
    chanceNodes: closure.counts.chanceNodes,
    actionEdges: closure.counts.actionEdges,
    missingActionEdges: closure.counts.missingActionEdges,
    positivePhysicalChanceEdges: closure.counts.positivePhysicalChanceEdges,
    missingChanceEdges: closure.counts.missingChanceEdges
  },
  phases,
  allowedUses: ['作者查看选定节点的范围变化','独立复核账本和牌面事实','研究课程简化候选'],
  forbiddenUses: ['直接作为学习者精确判题','把QQQ推广为其他牌面策略','把缺失后继默认为过牌或弃牌','把内部求解指标写成NL50能力'],
  currentEvidence: {
    authorReferenceCandidate: true,
    coursePolicyCompiled: false,
    successorClosed: false,
    teachingFramesCompiled: false,
    heldoutTransferCompiled: false,
    learnerTrial: false,
    matchedTargetReferenceForAllUnits: false,
    NL50Evidence: false
  },
  releaseRules: {
    missingCoursePolicyBlocksP3: true,
    missingDifferenceLedgerBlocksP4: true,
    missingSuccessorBlocksP5: true,
    missingTeachingFrameBlocksP6: true,
    missingHeldoutTransferBlocksP7: true,
    anyBlockedPhaseBlocksLearnerRelease: true
  }
};

fs.writeFileSync(path.join(dir, 'qqq-v2-course-bridge-audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: result.id,
  status: result.status,
  targetReached: result.solverQuality.targetReached,
  missingActionEdges: result.closure.missingActionEdges,
  missingChanceEdges: result.closure.missingChanceEdges,
  coursePolicyCompiled: result.currentEvidence.coursePolicyCompiled
}, null, 2));
