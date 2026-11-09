import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const contract = read('first-pass-full-guided-administration.json');
const packet = read('low-baseline-first-pass-trial-packet.json');
const coverage = read('first-pass-trial-coverage-audit.json');
const acceptance = read('cross-age-low-baseline-acceptance.json');
const outerPrompts = read('first-pass-outer-route-trial-prompts.json');
const structurePrompts = read('first-pass-structure-prompts.json');
const packetCases = read('first-pass-structure-packet.json');

const expectedOrder = packet.fullGuidedOrder;
const guidedPhases = contract.phases.filter(phase => ['F1_outer_guided', 'F2_inner_guided'].includes(phase.id));
const administeredCaseOrder = guidedPhases.flatMap(phase => phase.cases);
const knownCaseIds = new Set([
  ...outerPrompts.cases.map(item => item.id),
  ...structurePrompts.cases.map(item => item.id),
  ...packet.trialFactCases.map(item => item.id),
  ...packet.holdoutCases.map(item => item.id)
]);

assert.equal(contract.id, 'FIRST_PASS_FULL_GUIDED_ADMINISTRATION_V1');
assert.deepEqual(contract.canonicalOrder, expectedOrder);
assert.deepEqual(administeredCaseOrder, expectedOrder);
assert.deepEqual(contract.routeOrder, ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7']);
assert.deepEqual(contract.phases.map(phase => phase.id), ['F0_setup','F1_outer_guided','F2_inner_guided','F3_hidden_structure_replay','F4_error_recovery','F5_one_variable_transfer']);
for (const id of expectedOrder) assert.ok(knownCaseIds.has(id), `missing case ${id}`);
assert.deepEqual(contract.hostPromptLadder.map(level => level.level), ['H0','H1','H2','H3','H4','H5']);
assert.equal(contract.hostPromptLadder.filter(level => level.countsAsIndependent).map(level => level.level).join(','), 'H0,H1,H2,H3');
assert.equal(contract.hardRules.firstAnswerAlwaysRecorded, true);
assert.equal(contract.hardRules.firstAnswerBeforeAnyHelp, true);
assert.equal(contract.hardRules.answerAfterHelpNeverOverwritesFirstAnswer, true);
assert.equal(contract.hardRules.aggregateScoreCannotMaskCoreFailure, true);
assert.equal(contract.currentEvidence.participantObserved, false);
assert.equal(coverage.currentEvidence.fullGuidedOrderReady, true);
assert.equal(acceptance.passRules.perStopAndPerChannel, true);

const requiredObservationFields = [
  'firstAnswer', 'hostPromptCount', 'hostPromptType', 'currentLayerSelfLocated',
  'primaryActionCompleted', 'nextLayerSelfLocated', 'returnPointSelfLocated',
  'errorLayer', 'parentRestore', 'changedField', 'successorOrStopSelfLocated'
];
const missingObservationFields = requiredObservationFields.filter(field => !contract.recordFields.includes(field));
assert.deepEqual(missingObservationFields, []);

const result = {
  id: 'FIRST_PASS_FULL_GUIDED_ADMINISTRATION_AUDIT_V1',
  status: 'paper_admin_contract_audited_not_trialed',
  purpose: '核对完整首遍试读合同是否真的能按唯一顺序执行，并且把首答、提示、错误回退和结构回放记录下来。',
  sources: [
    'first-pass-full-guided-administration.json',
    'low-baseline-first-pass-trial-packet.json',
    'first-pass-trial-coverage-audit.json',
    'cross-age-low-baseline-acceptance.json'
  ],
  canonicalOrder: contract.canonicalOrder,
  phaseOrder: contract.phases.map(phase => phase.id),
  administeredCaseOrder,
  checks: {
    fullGuidedOrderMatchesPacket: JSON.stringify(administeredCaseOrder) === JSON.stringify(expectedOrder),
    outerBeforeInner: JSON.stringify(administeredCaseOrder.slice(0, 5)) === JSON.stringify(expectedOrder.slice(0, 5)),
    allCasesResolvable: expectedOrder.every(id => knownCaseIds.has(id)),
    routeOrderMatchesStateMachine: JSON.stringify(contract.routeOrder) === JSON.stringify(['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7']),
    hostPromptLadderComplete: contract.hostPromptLadder.length === 6,
    independentHelpLevelsSeparated: contract.hostPromptLadder.filter(level => level.countsAsIndependent).length === 4,
    observationFieldsComplete: missingObservationFields.length === 0,
    firstAnswerBeforeHelp: contract.hardRules.firstAnswerBeforeAnyHelp,
    errorRecoveryPhasePresent: contract.phases.some(phase => phase.id === 'F4_error_recovery'),
    oneVariableTransferPhasePresent: contract.phases.some(phase => phase.id === 'F5_one_variable_transfer')
  },
  missingObservationFields,
  releaseRules: {
    missingPhaseBlocksTrial: true,
    orderMismatchBlocksTrial: true,
    missingFirstAnswerRecordBlocksIndependentPass: true,
    H4OrH5BeforeFirstAnswerBlocksIndependentPass: true,
    paperAuditDoesNotProveLearnerMastery: true,
    paperAuditDoesNotProveNL50: true
  },
  currentEvidence: {
    paperAudit: true,
    runtimeImplemented: false,
    participantObserved: false,
    structureReplayObserved: false,
    errorRecoveryObserved: false,
    oneVariableTransferObserved: false,
    matchedReference: false,
    NL50Evidence: false
  }
};

fs.writeFileSync(path.join(dir, 'first-pass-full-guided-administration-audit.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  ok: true,
  id: result.id,
  cases: result.administeredCaseOrder.length,
  fullGuidedOrderMatchesPacket: result.checks.fullGuidedOrderMatchesPacket,
  outerBeforeInner: result.checks.outerBeforeInner,
  observationFieldsComplete: result.checks.observationFieldsComplete,
  participantObserved: result.currentEvidence.participantObserved
}, null, 2));
