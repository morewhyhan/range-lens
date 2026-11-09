import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const visibility = read('first-pass-visibility-contract.json');
const script = read('first-pass-user-facing-script-contract.json');
const principles = read('first-pass-principle-coverage.json');

assert.equal(visibility.id, 'FIRST_PASS_VISIBILITY_CONTRACT_V1');
assert.equal(script.id, 'FIRST_PASS_USER_FACING_SCRIPT_CONTRACT_V1');
assert.equal(principles.id, 'FIRST_PASS_PRINCIPLE_COVERAGE_V1');
assert.equal(visibility.steps.length, 7);
assert.equal(principles.principles.length, 12);

const forbiddenSurfaceTerms = ['ev', 'gto', 'cfr', 'blocker', 'backdoor', 'frequency', 'successor', 'denominator'];
const scriptByState = new Map(script.rows.map(row => [row.canonicalState, row]));
const findings = visibility.steps.map(step => {
  const scriptRow = scriptByState.get(step.id.split('_')[0]);
  assert.ok(step.visualBlocks.length <= visibility.rules.maxVisualBlocks, `${step.id}: too many visual blocks`);
  assert.ok(step.maxNewConcepts <= visibility.rules.oneNewUnmasteredConcept, `${step.id}: too many new concepts`);
  assert.ok(step.visibleNow.length > 0, `${step.id}: no visible input`);
  assert.ok(step.answerThen.length >= 0, `${step.id}: answerThen missing`);
  assert.ok(step.childDetails.length >= 0, `${step.id}: childDetails missing`);
  const question = scriptRow?.plainQuestion?.toLowerCase() ?? '';
  const leakedTerms = forbiddenSurfaceTerms.filter(term => question.includes(term));
  assert.deepEqual(leakedTerms, [], `${step.id}: forbidden technical term in plain question`);
  return {
    id: step.id,
    visibleCount: step.visibleNow.length,
    answerThenCount: step.answerThen.length,
    carriedHiddenCount: step.carriedHidden.length,
    childDetailsCount: step.childDetails.length,
    visualBlockCount: step.visualBlocks.length,
    maxNewConcepts: step.maxNewConcepts,
    plainQuestion: scriptRow?.plainQuestion ?? null,
    forbiddenSurfaceTerms: leakedTerms
  };
});

assert.equal(findings.every(row => row.visualBlockCount <= 3), true);
assert.equal(findings.every(row => row.maxNewConcepts <= 1), true);
assert.equal(findings.every(row => row.plainQuestion), true);
assert.equal(findings.find(row => row.id === 'p6_update').answerThenCount, 5);
assert.equal(findings.find(row => row.id === 'p2_board').childDetailsCount > 0, true);
assert.equal(findings.find(row => row.id === 'p6_update').childDetailsCount > 0, true);

const result = {
  id: 'FIRST_PASS_COGNITIVE_LOAD_AUDIT_V1',
  status: 'paper_visibility_and_plain_language_pass_runtime_and_beginner_trial_missing',
  purpose: '验证首遍每个父步骤只显示一个主要问题、最多三个视觉块和一个新概念，并把技术细节延迟到答后或子层。',
  sources: ['first-pass-visibility-contract.json', 'first-pass-user-facing-script-contract.json', 'first-pass-principle-coverage.json'],
  stepCount: findings.length,
  principleCount: principles.principles.length,
  findings,
  evidence: {
    paperVisibility: true,
    paperPlainLanguage: true,
    runtimeSurfaceChecked: false,
    lowBaselineParticipantObserved: false,
    revisionAfterTrial: false
  },
  releaseRules: {
    maxThreeVisualBlocks: true,
    maxOneNewUnmasteredConcept: true,
    technicalTermsCannotBeOnlyNavigation: true,
    hiddenFieldsAreCarriedNotDeleted: true,
    p6AnswerThenNotInitiallyVisible: true,
    paperPassDoesNotEqualBeginnerComprehension: true
  },
  currentConclusion: '纸面负荷与白话题面通过；需要真实运行时和低基础参与者观察来确认实际认知负荷，并据此修订。'
};

fs.writeFileSync(path.join(dir, 'first-pass-cognitive-load-audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  id: result.id,
  status: result.status,
  stepCount: result.stepCount,
  principleCount: result.principleCount,
  runtimeSurfaceChecked: result.evidence.runtimeSurfaceChecked,
  lowBaselineParticipantObserved: result.evidence.lowBaselineParticipantObserved
}, null, 2));
