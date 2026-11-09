import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const bridge = JSON.parse(fs.readFileSync(path.join(dir, 'unit-architecture-bridge.json'), 'utf8'));
const queue = JSON.parse(fs.readFileSync(path.join(dir, 'unit-field-completion-queue.json'), 'utf8'));
const route = JSON.parse(fs.readFileSync(path.join(dir, 'full-nested-learning-route.json'), 'utf8'));
const reps = JSON.parse(fs.readFileSync(path.join(dir, 'first-pass-representative-units.json'), 'utf8'));

const queueById = new Map(queue.queue.map(row => [row.unitId, row]));
const routeById = new Map(route.units.map(row => [row.unitId, row]));
if (bridge.rows.length !== 35 || queue.queue.length !== 35 || route.units.length !== 35) throw new Error('All source contracts must contain 35 units');

const levels = [
  { id: 'identity_only', label: '只确认身份', canDo: ['read_source_identity', 'physical_fact_if_available'], cannotDo: ['exact_action_grade', 'independent_transfer'] },
  { id: 'fact_frame', label: '事实题', canDo: ['read_legal_cards', 'read_best_five', 'check_ledger'], cannotDo: ['course_action_grade', 'range_policy_grade'] },
  { id: 'demonstration', label: '教师示范', canDo: ['watch_declared_comparison', 'repeat_parent_return'], cannotDo: ['claim_independent_mastery', 'claim_target_strategy'] },
  { id: 'guided', label: '带提示练习', canDo: ['answer_with_required_facts', 'use_one_contrast'], cannotDo: ['skip_parent', 'hide_missing_successor'] },
  { id: 'independent_candidate', label: '独立候选', canDo: ['first_attempt_before_explanation', 'single_variable_transfer'], cannotDo: ['enter_continuous_without_successor'] },
  { id: 'target_reference_ready', label: '目标参考就绪', canDo: ['grade_declared_course_policy', 'show_range_delta', 'continue_successor'], cannotDo: ['collapse_reference_and_course'] }
];

const independentChecks = [
  'firstAttemptBeforeExplanation',
  'actionAndAmountBothChecked',
  'reasonAtCorrectLayer',
  'rangeAfterOrExplicitStop',
  'ledgerAfterConserved',
  'successorOrExplicitStop'
];

const rows = bridge.rows.map((bridgeRow, index) => {
  const source = queueById.get(bridgeRow.unitId);
  const routeRow = routeById.get(bridgeRow.unitId);
  if (!source || !routeRow) throw new Error(`Missing source row for ${bridgeRow.unitId}`);
  const currentLevel = source.identityMissingFields.length > 0 ? 'identity_only' : 'fact_frame';
  return {
    sequence: index + 1,
    unitId: bridgeRow.unitId,
    label: bridgeRow.label,
    groupId: bridgeRow.groupId,
    parentFrame: bridgeRow.parentFrame,
    returnTo: bridgeRow.returnTo,
    firstPassRepresentative: reps.representatives.some(row => row.unit === bridgeRow.unitId),
    sourceIdentity: bridgeRow.evidenceIdentity,
    currentLevel,
    nextCompilationPhase: source.nextPhase,
    missingCanonicalFields: source.canonicalMissingFields,
    stopReason: source.stopReason,
    requiredForIndependent: ['factInputs', 'coursePolicy', 'referencePolicy', 'rangeBefore', 'rangeAfter', 'legalSuccessors', 'explanation', 'transferVariant', 'releaseStatus'],
    independentChecks,
    promotionOrder: ['identity_source', 'identity_canonical', 'fact_frame', 'course_policy', 'reference_policy', 'range_snapshots', 'successors', 'teaching_transfer', 'release'],
    releaseFlags: {
      factOpen: currentLevel !== 'identity_only' || source.identityMissingFields.length === 0,
      demonstrationOpen: false,
      guidedOpen: false,
      independentCandidateOpen: false,
      targetReferenceReady: false
    },
    invariants: {
      oneQuestion: Boolean(routeRow.oneQuestion),
      onePrimaryAction: Boolean(routeRow.onePrimaryAction),
      opensOnlyFromParent: routeRow.opensOnlyFromParent,
      returnsToSameParent: routeRow.returnTo === routeRow.parentFrame,
      unknownCountsAsWrong: true,
      missingEvidenceStops: true
    },
    currentEvidence: {
      strategyReady: false,
      learnerTrial: false,
      unseenTransfer: false,
      continuousReady: false
    }
  };
});

const output = {
  id: 'UNIT_LEARNER_RELEASE_MATRIX_V1',
  status: 'paper_unit_release_matrix_compiled_not_trialed',
  purpose: '为35项建立统一的学习者可见释放层级，禁止局部资料直接升级为独立策略题。',
  sources: ['unit-field-completion-queue.json', 'unit-architecture-bridge.json', 'full-nested-learning-route.json', 'first-pass-representative-units.json'],
  levels,
  promotionRules: {
    noLevelSkipping: true,
    identityBeforeFact: true,
    factBeforePolicy: true,
    policyBeforeReferenceGrade: true,
    rangeAndSuccessorBeforeContinuous: true,
    learnerTrialBeforeTargetReadiness: true,
    missingEvidenceStopsAtCurrentUnit: true,
    noFlatHomeMenu: true
  },
  rows,
  counts: {
    units: rows.length,
    firstPassRepresentatives: rows.filter(row => row.firstPassRepresentative).length,
    identityOnly: rows.filter(row => row.currentLevel === 'identity_only').length,
    factFrameOrHigher: rows.filter(row => row.currentLevel !== 'identity_only').length,
    independentCandidateOpen: rows.filter(row => row.releaseFlags.independentCandidateOpen).length,
    targetReferenceReady: rows.filter(row => row.releaseFlags.targetReferenceReady).length
  },
  currentEvidence: {
    all35HaveReleaseRows: rows.length === 35,
    allRowsHaveStops: rows.every(row => Boolean(row.stopReason)),
    allRowsHaveParentReturn: rows.every(row => row.invariants.returnsToSameParent),
    strategyReady: false,
    learnerTrial: false,
    NL50Evidence: false
  }
};

fs.writeFileSync(path.join(dir, 'unit-learner-release-matrix.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, counts: output.counts }));
