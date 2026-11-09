import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const bridge = read('qqq-v2-course-bridge-audit.json');
const compiler = read('strategy-to-course-compiler-contract.json');
const target = read('target-config-source-ledger.json');
const resolution = read('target-config-resolution-plan.json');
const candidateLedger = read('course-policy-candidate-ledger.json');

assert.equal(bridge.id, 'QQQ_V2_COURSE_BRIDGE_AUDIT_V1');
assert.equal(compiler.id, 'STRATEGY_TO_COURSE_COMPILER_CONTRACT_V1');
assert.equal(candidateLedger.id, 'COURSE_POLICY_CANDIDATE_LEDGER_V1');

const phaseById = new Map(bridge.phases.map(phase => [phase.id, phase]));
const requiredPhaseOrder = ['P0_identity','P1_physical_facts','P2_reference_policy','P3_course_policy','P4_difference','P5_range_and_successors','P6_teaching_frame','P7_transfer','P8_release'];
const phaseRows = requiredPhaseOrder.map(id => {
  const phase = phaseById.get(id);
  assert.ok(phase, `missing ${id}`);
  return {
    phaseId: id,
    status: phase.status,
    evidence: phase.evidence ?? [],
    missing: phase.missing ?? null,
    releases: phase.releases ?? [],
    blocks: phase.blocks ?? []
  };
});

const targetUnknown = Object.entries(target.fields)
  .filter(([, value]) => ['required_unknown', 'candidate_not_frozen', 'unresolved'].includes(value.status))
  .map(([field, value]) => ({ field, status: value.status, value: value.value ?? null }));

const gateRows = [
  { gateId: 'G0_identity', required: ['inputFingerprint','sourceRevision','gameFrame','rangeFingerprint','actionTreeFingerprint','rakeModel'], passed: phaseById.get('P0_identity').status === 'verified_for_candidate' && targetUnknown.length === 0 },
  { gateId: 'G1_raw_reference', required: ['referenceActionFrequency','referenceEV','referenceRangeAfter','successorGraph','solverQuality'], passed: phaseById.get('P2_reference_policy').status === 'full_reference_closed' },
  { gateId: 'G2_course_policy', required: ['courseSource','coursePolicyFingerprint','quantizationRule','policyScope'], passed: phaseById.get('P3_course_policy').status === 'course_policy_compiled' },
  { gateId: 'G3_difference_ledger', required: ['actionDelta','rangeDelta','evDelta','supportChanged','boundaryCases'], passed: phaseById.get('P4_difference').status === 'difference_ledger_closed' },
  { gateId: 'G4_range_successor', required: ['rangeAfterByAction','fixedDenominatorView','nextStateSnapshots','stopReason'], passed: phaseById.get('P5_range_and_successors').status === 'range_and_successor_closed' },
  { gateId: 'G5_teaching_frame', required: ['oneQuestion','onePrimaryAction','explanation','errorLayer','returnTo'], passed: phaseById.get('P6_teaching_frame').status === 'teaching_frame_compiled' },
  { gateId: 'G6_transfer', required: ['singleChangedField','heldoutSourceIdentity','independentAnswerKey'], passed: phaseById.get('P7_transfer').status === 'transfer_compiled' },
  { gateId: 'G7_release', required: ['allRequiredFieldsPresent','fingerprintsMatch','learnerTrialStatusExplicit'], passed: phaseById.get('P8_release').status === 'release_ready' }
];
const firstBlocked = gateRows.find(gate => !gate.passed);

const output = {
  id: 'REFERENCE_COURSE_CLOSURE_LEDGER_V1',
  status: 'candidate_reference_and_course_pipeline_separated_release_blocked',
  purpose: '把现有求解候选逐阶段接到课程编译闸门，明确原始参考、课程规则、差异账本、范围后继、教学帧、迁移和发布之间不能跳级。',
  sources: ['qqq-v2-course-bridge-audit.json','strategy-to-course-compiler-contract.json','target-config-source-ledger.json','target-config-resolution-plan.json','course-policy-candidate-ledger.json'],
  candidate: {
    inputFingerprint: bridge.inputFingerprint,
    solverQuality: bridge.solverQuality,
    decisionNodes: bridge.closure.decisionNodes,
    chanceNodes: bridge.closure.chanceNodes,
    actionEdges: bridge.closure.actionEdges,
    missingActionEdges: bridge.closure.missingActionEdges,
    missingChanceEdges: bridge.closure.missingChanceEdges
  },
  targetConfiguration: {
    unknownOrUnfrozenFields: targetUnknown,
    resolutionOrder: resolution.resolutionOrder,
    targetReferenceMatch: bridge.currentEvidence.matchedTargetReferenceForAllUnits
  },
  phases: phaseRows,
  gates: gateRows,
  firstBlockedGate: firstBlocked?.gateId ?? null,
  counts: {
    phases: phaseRows.length,
    passedGates: gateRows.filter(gate => gate.passed).length,
    blockedGates: gateRows.filter(gate => !gate.passed).length,
    targetUnknownFields: targetUnknown.length,
    candidateCourseRules: candidateLedger.counts.byPolicyIdentity.course_rule,
    candidatePopulationExploits: candidateLedger.counts.byPolicyIdentity.population_exploit
  },
  allowedUses: bridge.allowedUses,
  forbiddenUses: bridge.forbiddenUses,
  currentEvidence: {
    rawReferenceCandidate: bridge.currentEvidence.authorReferenceCandidate,
    matchedTargetReference: bridge.currentEvidence.matchedTargetReferenceForAllUnits,
    coursePolicyCompiled: bridge.currentEvidence.coursePolicyCompiled,
    differenceLedgerClosed: phaseById.get('P4_difference').status === 'difference_ledger_closed',
    successorClosed: bridge.currentEvidence.successorClosed,
    teachingFramesCompiled: bridge.currentEvidence.teachingFramesCompiled,
    heldoutTransferCompiled: bridge.currentEvidence.heldoutTransferCompiled,
    learnerTrial: bridge.currentEvidence.learnerTrial,
    NL50Evidence: bridge.currentEvidence.NL50Evidence
  },
  releaseGate: {
    passed: false,
    reason: `第一处阻断为${firstBlocked?.gateId ?? 'unknown'}；任何后续阶段不能用默认值跳过。`,
    nextAction: firstBlocked ? `补齐${firstBlocked.required.join('、')}` : '等待独立学习者试读和目标复核'
  }
};
fs.writeFileSync(path.join(dir, 'reference-course-closure-ledger.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, firstBlockedGate: output.firstBlockedGate, counts: output.counts }));
