import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const bridge = JSON.parse(fs.readFileSync(path.join(dir, 'unit-architecture-bridge.json'), 'utf8'));
const queue = JSON.parse(fs.readFileSync(path.join(dir, 'unit-field-completion-queue.json'), 'utf8'));
const reps = JSON.parse(fs.readFileSync(path.join(dir, 'first-pass-representative-units.json'), 'utf8'));
const release = JSON.parse(fs.readFileSync(path.join(dir, 'unit-learner-release-matrix.json'), 'utf8'));

const repIds = new Set(reps.representatives.map(row => row.unit));
const queueById = new Map(queue.queue.map(row => [row.unitId, row]));
const releaseById = new Map(release.rows.map(row => [row.unitId, row]));
const sharedConfig = ['position', 'preflopHistory', 'boardOrder', 'rootRanges', 'potBB', 'stacksBB', 'rake', 'actionTree', 'solverCommit', 'sourceFingerprint'];
const requiredOutputs = ['courseOrReferencePolicy', 'actionFrequency', 'actionEV', 'reachWeight', 'rangeBefore', 'rangeAfterByAction', 'normalizationDenominator', 'physicalFilter', 'actionFilter', 'successorCards', 'successorIndex'];

const rows = bridge.rows.map((row, index) => {
  const q = queueById.get(row.unitId);
  const r = releaseById.get(row.unitId);
  if (!q || !r) throw new Error(`Missing source row for ${row.unitId}`);
  return {
    requestSequence: index + 1,
    unitId: row.unitId,
    label: row.label,
    groupId: row.groupId,
    parentFrame: row.parentFrame,
    returnTo: row.returnTo,
    priority: repIds.has(row.unitId) ? 'P0_first_pass_representative' : 'P1_group_expansion',
    sourceIdentity: row.evidenceIdentity,
    currentIdentityStatus: q.identityStatus,
    missingIdentityFields: q.identityMissingFields,
    exactGradeRequires: row.exactGradeRequires,
    requiredSharedConfig: sharedConfig,
    requiredOutputs,
    requiredCourseArtifacts: ['coursePolicy', 'simplificationDiff', 'boundary', 'teacherKey', 'transferVariant'],
    acceptanceGates: ['C0_identity', 'C1_fact', 'C2_reference_policy', 'C3_action_conditioned_range', 'C4_successors', 'C5_reference_quality'],
    missingReferenceAction: row.missingEvidenceAction,
    stopReason: row.stopReasonWhenMissing,
    received: false,
    exactStrategyReady: false,
    learnerTrialReady: false,
    noNeighborSubstitution: true,
    noUiRoundingAsAnswer: true,
    noEquityToActionShortcut: true,
    releaseMatrixLevel: r.currentLevel
  };
});

const output = {
  id: 'ALL35_REFERENCE_REQUEST_MATRIX_V1',
  status: 'reference_request_matrix_prepared_no_nodes_received',
  purpose: '把35项各自需要的匹配参考输入、输出和停止边界列清，作为作者侧请求与验收清单。',
  sources: ['unit-architecture-bridge.json', 'unit-field-completion-queue.json', 'unit-learner-release-matrix.json', 'first-pass-representative-units.json'],
  sharedConfig,
  requiredOutputs,
  hardRules: {
    fixedInputIdentityRequired: true,
    referenceAndCoursePolicySeparate: true,
    sameDenominatorForRangeBeforeAfter: true,
    missingSuccessorBlocksContinuousPractice: true,
    neighborNodeCannotFillMissingNode: true,
    uiRoundingCannotBeGradingSource: true,
    equityCannotDetermineAction: true
  },
  rows,
  counts: {
    units: rows.length,
    firstPassRepresentatives: rows.filter(row => row.priority === 'P0_first_pass_representative').length,
    groupExpansion: rows.filter(row => row.priority === 'P1_group_expansion').length,
    received: rows.filter(row => row.received).length,
    exactStrategyReady: rows.filter(row => row.exactStrategyReady).length,
    learnerTrialReady: rows.filter(row => row.learnerTrialReady).length
  },
  currentEvidence: {
    all35RequestsSpecified: rows.length === 35,
    referenceNodesReceived: 0,
    exactStrategyReady: false,
    learnerTrial: false,
    NL50Evidence: false
  }
};

fs.writeFileSync(path.join(dir, 'all35-reference-request-matrix.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, counts: output.counts }));
