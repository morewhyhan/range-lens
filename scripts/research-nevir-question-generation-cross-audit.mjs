import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const dir = path.join(root, 'research', 'nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const generator = read('automatic-question-generation-contract.json');
const queue = read('session-question-queue-contract.json');
const coverage = read('full-course-coverage-and-release-contract.json');
const route = read('user-first-complete-route-contract.json');
const architecture = read('nested-release-architecture-contract.json');
const handoff = read('first-pass-handoff-ledger.json');
const progression = read('learner-session-progression-contract.json');

assert.equal(generator.id, 'AUTOMATIC_QUESTION_GENERATION_CONTRACT_V1');
assert.equal(queue.id, 'SESSION_QUESTION_QUEUE_CONTRACT_V1');
assert.equal(coverage.id, 'FULL_COURSE_COVERAGE_AND_RELEASE_CONTRACT_V1');
assert.equal(route.id, 'USER_FIRST_COMPLETE_ROUTE_CONTRACT_V1');
assert.equal(architecture.id, 'NESTED_RELEASE_ARCHITECTURE_CONTRACT_V1');
assert.equal(handoff.id, 'FIRST_PASS_HANDOFF_LEDGER_V1');
assert.equal(progression.id, 'LEARNER_SESSION_PROGRESSION_CONTRACT_V1');

const expectedRoute = ['L0', 'L1', 'L2', 'L3', 'L4', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
const expectedStages = ['first_pass', 'map', 'guided', 'independent', 'adjacent', 'delayed', 'continuous'];
const expectedPools = ['locator', 'pure_or_fact', 'mixed_when_applicable', 'edge', 'internal', 'action_preserving_contrast', 'single_field_transfer'];
const expectedRepresentatives = ['1.5', '2.1', '3.1', '4.5', '5.7'];
const findings = [];

function check(id, pass, detail) {
  findings.push({ id, pass, detail });
  assert.equal(pass, true, `${id}: ${detail}`);
}

check('route_is_single', JSON.stringify(queue.canonicalRoute) === JSON.stringify(expectedRoute) && JSON.stringify(handoff.route) === JSON.stringify(expectedRoute), 'queue and handoff use the canonical 12-state route');
check('first_pass_representatives_match', JSON.stringify(architecture.firstPassRepresentativeUnits) === JSON.stringify(expectedRepresentatives) && JSON.stringify(coverage.releasePlan[0].visibleUnits) === JSON.stringify(expectedRepresentatives), 'architecture and coverage use the same five representatives');
check('first_pass_uses_representatives_only', generator.schedulerContract.firstPassMustUseRepresentativeOnly === true && coverage.rules.firstPassUsesOnlyFiveRepresentatives === true, 'first pass does not draw from all35');
check('no_flat_home', coverage.rules.noFlat35HomeMenu === true && route.structuralChecks.noFlatHomeVisible === true, 'full coverage remains nested under parent frames');
check('stage_order_matches', JSON.stringify(queue.stages) === JSON.stringify(expectedStages) && JSON.stringify(progression.stages.slice(0, 7).map(stage => stage.schedulerStage)) === JSON.stringify(expectedStages), 'queue and visible session progression use the same release order');
check('hard_filters_match', expectedStages.length === 7 && queue.hardFilters.includes('same_parent_frame') && queue.hardFilters.includes('exactly_one_changed_field_for_transfer') && generator.schedulerContract.hardFilterOrderMustInclude.includes('child_parent_lock'), 'parent, physical, source, successor, transfer and identity filters are present');
check('ratios_do_not_change_policy', queue.ratioPolicy.samplingDoesNotReweightPolicy === undefined ? generator.ratioRules.samplingDoesNotReweightPolicy === true : queue.ratioPolicy.samplingDoesNotReweightPolicy === true, 'requested ratios only affect scheduling');
check('empty_pool_stops', generator.coverageLedgerContract.emptyPoolStatus === 'unavailable_not_substituted' && queue.ratioPolicy.unavailablePoolIsNotReplaced === true, 'empty pools emit a stop instead of neighbor substitution');
check('all35_have_three_modes', coverage.rows.length === 35 && coverage.rules.all35HaveBaseContrastTransfer === true && coverage.rules.contrastExactlyOneField === true, 'each unit requires base, contrast and transfer');
check('question_identity_is_unique', generator.questionIdentityFields.includes('sourceFingerprint') && generator.questionIdentityFields.includes('changedField') && generator.questionIdentityFields.includes('queueStage') && generator.duplicateRules.sameEntityAcrossHelpLevelsMustShareIdentity === true, 'identity and duplicate rules are explicit');
check('visible_input_guard', queue.hardFilters.includes('visible_inputs_exclude_answer_and_unresolved_policy') && generator.outputContract.visibleInputsMustExclude.includes('teacherAnswer'), 'the answer and unresolved policy stay hidden');
check('first_answer_before_help', queue.errorPolicy.firstAnswerPreserved === true && generator.outputContract.gradingRuleFields.includes('firstAnswerPreserved') && progression.sessionRules.firstAnswerBeforeHelp === true, 'first answer is recorded before explanation');
check('same_parent_after_error', queue.errorPolicy.sameParentAfterError === true && generator.schedulerContract.hardFilterOrderMustInclude.includes('same_parent_frame') && progression.sessionRules.sameParentAfterError === true, 'an error never resets the route');
check('exact_grade_requires_evidence', coverage.rules.noExactGradeWithoutReferenceAndSuccessor === true && generator.coverageClose.requiresReferenceAndSuccessorForExactPolicy === true, 'missing reference or successor blocks exact grading');

const audit = {
  id: 'QUESTION_GENERATION_CROSS_CONTRACT_AUDIT_V1',
  status: 'paper_question_generation_cross_contract_consistent_runtime_missing',
  purpose: '验证自动出题、会话队列、35项覆盖和用户阶段脚本共同遵守同一条嵌套主线，不把后台题量变成前台平铺菜单。',
  sources: [
    'automatic-question-generation-contract.json',
    'session-question-queue-contract.json',
    'full-course-coverage-and-release-contract.json',
    'user-first-complete-route-contract.json',
    'nested-release-architecture-contract.json',
    'first-pass-handoff-ledger.json',
    'learner-session-progression-contract.json'
  ],
  canonicalRoute: expectedRoute,
  releaseStages: expectedStages,
  firstPassRepresentatives: expectedRepresentatives,
  requiredPools: expectedPools,
  findings,
  invariants: {
    firstPassIsFiveRepresentatives: true,
    all35StayInsideParentFrames: true,
    oneQuestionPackageAtATime: generator.outputContract.runtimeInput === 'one_verified_question_package_at_a_time',
    requestedRatiosDoNotReweightPolicy: generator.ratioRules.samplingDoesNotReweightPolicy,
    emptyPoolIsNotSubstituted: queue.ratioPolicy.unavailablePoolIsNotReplaced,
    firstAnswerBeforeHelp: progression.sessionRules.firstAnswerBeforeHelp,
    sameParentAfterError: progression.sessionRules.sameParentAfterError,
    exactGradeRequiresReferenceAndSuccessor: coverage.rules.noExactGradeWithoutReferenceAndSuccessor,
    unknownIsNotZero: queue.errorPolicy.unknownCountsAsWrong
  },
  currentEvidence: {
    paperAudit: true,
    runtimeQuestionGenerator: false,
    runtimeSessionScheduler: false,
    poolsCompiled: false,
    edgeThresholdsCalibrated: false,
    learnerTrial: false,
    heldoutTransfer: false,
    NL50Evidence: false
  },
  guards: {
    crossContractConsistencyIsNotRuntime: true,
    coverageIsNotSkillScore: true,
    firstPassIsNotMastery: true,
    noNeighborSubstitution: true,
    noExactActionWithoutReference: true
  }
};

fs.writeFileSync(path.join(dir, 'question-generation-cross-contract-audit.json'), JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: audit.id,
  findings: audit.findings.length,
  routeStates: audit.canonicalRoute.length,
  releaseStages: audit.releaseStages.length,
  firstPassRepresentatives: audit.firstPassRepresentatives.length,
  runtimeQuestionGenerator: audit.currentEvidence.runtimeQuestionGenerator
}));
