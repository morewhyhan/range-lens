import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLessonPackage, assertLessonPackage } from '../src/lesson-package.js';
import { POSTFLOP_LESSON_PACKAGE, POSTFLOP_REGISTRY } from '../src/postflop-registry.js';
import { DEFAULTS, strategyQuestion } from '../src/questions.js';
import { createPracticeQuestion, gradeTask } from '../src/curriculum.js';
import { activeRules } from '../src/rules.js';
import { assertReferenceCandidateNotLearnerReady, verifyReferenceCandidate } from '../src/gto-reference.js';
import { createMatchedEvidenceView } from '../src/matched-evidence.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseNode = (overrides = {}) => ({
  nodeId: 'demo',
  evidenceKind: 'course_only',
  sourceRefs: ['demo source'],
  gtoBinding: { status: 'course_only', claim: 'course_rule', views: [] },
  chartEvidence: { available: [], note: 'course only' },
  successor: { status: 'source_boundary' },
  ...overrides,
});

test('lesson package validates evidence identity and release boundaries', () => {
  const pkg = { packageId: 'demo', version: '1.0.0', config: {}, nodes: { demo: baseNode() }, questions: [], answerKeys: [] };
  assert.deepEqual(validateLessonPackage(pkg), { valid: true, errors: [] });
  assert.doesNotThrow(() => assertLessonPackage(pkg));
});

test('matched package cannot omit solver identity, range views or differences', () => {
  const pkg = {
    packageId: 'bad', version: '1.0.0', config: {}, nodes: {
      demo: baseNode({
        evidenceKind: 'matched',
        gtoBinding: { status: 'matched', views: [] },
      }),
    }, questions: [], answerKeys: [],
  };
  const result = validateLessonPackage(pkg);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('configFingerprint')));
  assert.ok(result.errors.some(error => error.includes('policy')));
});

test('question and answer contracts require provenance and a next boundary', () => {
  const pkg = {
    packageId: 'questions', version: '1.0.0', config: {}, nodes: { demo: baseNode() },
    questions: [{ instanceKey: 'q1', nodeId: 'demo', evidenceKind: 'course_only', prompt: '选择动作', options: [{ id: 'a', label: '过牌' }], interaction: 'single', available: true }],
    answerKeys: [{ questionKey: 'q1', accepted: 'a', sourceRefs: ['demo'], precision: { kind: 'exact' }, explanation: { text: '课程规则' }, nextNodeOrStop: 'stop' }],
  };
  assert.deepEqual(validateLessonPackage(pkg), { valid: true, errors: [] });
});

test('source registry is a validated course package and questions carry its evidence identity', () => {
  assert.equal(Object.keys(POSTFLOP_LESSON_PACKAGE.nodes).length, POSTFLOP_REGISTRY.length);
  assert.equal(POSTFLOP_LESSON_PACKAGE.questions[0].nodeId, 'I12');
  assert.equal(POSTFLOP_LESSON_PACKAGE.answerKeys[0].accepted, 'check');
  assert.equal(POSTFLOP_LESSON_PACKAGE.nodes.O01.evidenceKind, 'closed');
  const rule = activeRules.find(item => item.id === 'I12');
  const question = strategyQuestion({ ...DEFAULTS, module: 'flop', task: 'action' }, () => 0, rule, 'action');
  assert.equal(question.evidenceKind, 'course_only');
  assert.equal(question.gtoBinding.status, 'course_only');
  assert.equal(question.rangeContract.display, 'range_change_closed_until_policy_compiled');
});

const candidateFixture = (overrides = {}) => ({
  request: { inputFingerprint: 'same', engineRevision: 'rev-1', context: { flop: ['Qs', 'Qh', 'Qd'] } },
  result: {
    inputFingerprint: 'same',
    independentValidationPassed: false,
    sourceCourseConfigurationRecovered: false,
    NL50Reference: false,
    root: {
      actions: ['Check'], actor: 0, orderedHands: [['AsAh']],
      strategyActionMajor: [1], compatibleMassWeights: [[2]], jointReachMass: 2,
      currentActionEV: { 0: 0 },
    },
  },
  verification: {
    inputFingerprint: 'same', aggregates: [{ id: 'root', frequencies: [1] }],
    physicalReachWeightsChecked: 1, supportedDecisionRows: 1,
    independentTerminalHandEVChecks: 1, rootAndAfterCheckReloadExactlyPreserved: true,
  },
  views: {
    inputFingerprint: 'same', viewsNotForGrading: true,
    records: [{ id: 'root', views: [{ support: [{}] }, { support: [{}] }] }],
  },
  ...overrides,
});

test('reference candidate recomputes policy and remains outside learner grading', () => {
  const summary = verifyReferenceCandidate(candidateFixture());
  assert.equal(summary.status, 'reference_candidate_not_releasable');
  assert.deepEqual(summary.root.frequencies, [1]);
  assert.equal(summary.releaseBlockers.length, 4);
  assert.doesNotThrow(() => assertReferenceCandidateNotLearnerReady(summary));
  assert.throws(() => assertReferenceCandidateNotLearnerReady({ ...summary, status: 'matched_reference_ready_for_import' }));
});

test('reference candidate rejects a policy that is not normalized per combination', () => {
  const fixture = candidateFixture();
  fixture.result.root.strategyActionMajor = [0.5];
  assert.throws(() => verifyReferenceCandidate(fixture), /策略没有合计为1/);
});

test('the first course package question is reachable through the learner practice path', () => {
  const question = createPracticeQuestion('18', {
    variant: 'course', filter: { node: 'I12', all: true }, serial: 0, rng: () => 0.1,
  });
  assert.equal(question.sourceId, 'I12');
  assert.equal(question.authority, 'course');
  assert.equal(question.rangeContract.display, 'range_change_closed_until_policy_compiled');
  assert.equal(gradeTask(question, question.accepted[0]), true);
  assert.equal(gradeTask(question, '__unknown__'), false);
});

test('matched evidence adapter exposes the five chart layers from real package data', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const packagePath = path.join(here, '..', 'research', 'nevir-system', 'tiny-river-matched-package-v1.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const view = createMatchedEvidenceView(pkg, 'calibration-river-K7329-root', 'Bet(500)');
  assert.deepEqual(view.layers.map(layer => layer.id), ['policy', 'reach_before', 'reach_after', 'delta', 'successor']);
  assert.equal(view.selectedActionLabel, '下注 5 BB');
  assert.equal(view.actions.find(action => action.id === 'Bet(500)').frequency, 1);
  assert.equal(view.policyRows.length, 2);
  assert.equal(view.policyRows[0].cards[0].id, 'Qs');
  assert.equal(view.rangeAfter.length, 2);
  assert.equal(view.successor.find(edge => edge.action === 'Bet(500)').nextNodeId, 'calibration-river-K7329-after-bet');
});

test('matched evidence adapter refuses a course-only node', () => {
  const pkg = {
    packageId: 'x', version: '1.0.0', config: {},
    nodes: {
      demo: {
        nodeId: 'demo', evidenceKind: 'course_only', sourceRefs: ['demo'],
        gtoBinding: { status: 'course_only' }, chartEvidence: { available: [] },
        successor: { status: 'source_boundary' },
      },
    },
    questions: [], answerKeys: [],
  };
  assert.throws(() => createMatchedEvidenceView(pkg, 'demo'), /不是 matched/);
});

