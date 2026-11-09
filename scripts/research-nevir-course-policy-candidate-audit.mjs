import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const ledger = JSON.parse(fs.readFileSync(path.join(dir, 'course-policy-candidate-ledger.json'), 'utf8'));
const material = JSON.parse(fs.readFileSync(path.join(dir, 'material-policy-classification.json'), 'utf8'));

assert.equal(ledger.id, 'COURSE_POLICY_CANDIDATE_LEDGER_V1');
assert.equal(ledger.candidates.length, 122);
assert.equal(ledger.counts.byPolicyIdentity.course_rule, 110);
assert.equal(ledger.counts.byPolicyIdentity.population_exploit, 12);
assert.equal(ledger.counts.exactStrategyReady, 0);
assert.equal(ledger.counts.coursePolicyCompiled, 0);
assert.equal(ledger.counts.learnerTrial, 0);
assert.equal(ledger.currentEvidence.sourceHashesMatched, true);
assert.equal(ledger.currentEvidence.coursePolicyReleased, false);

const materialById = new Map(material.rows.map(row => [row.id, row]));
const failures = [];
for (const candidate of ledger.candidates) {
  const source = materialById.get(candidate.materialId);
  if (!source) failures.push(`${candidate.candidateId}:missing-material-row`);
  if (source && candidate.sourceTextHash !== source.sourceTextHash) failures.push(`${candidate.candidateId}:hash-mismatch`);
  if (candidate.candidateStatus !== 'source_explicit_but_not_compiled') failures.push(`${candidate.candidateId}:status-promoted`);
  if (candidate.exactStrategyReady !== false) failures.push(`${candidate.candidateId}:exact-strategy-ready`);
  if (candidate.coursePolicyFingerprint !== null) failures.push(`${candidate.candidateId}:fingerprint-present`);
  if (!candidate.requiredCompilerChecks.includes('frequency_vs_size_separation')) failures.push(`${candidate.candidateId}:missing-frequency-size-check`);
  if (!candidate.requiredCompilerChecks.includes('policyScope')) failures.push(`${candidate.candidateId}:missing-policy-scope-check`);
  if (candidate.policyIdentity === 'course_rule') {
    if (!candidate.requiredCompilerChecks.includes('explicit_course_policy_or_matched_reference')) failures.push(`${candidate.candidateId}:missing-course-reference-check`);
    if (candidate.forbiddenPromotion.includes('simplified_reference')) failures.push(`${candidate.candidateId}:course-rule-forbidden-simplified-reference`);
  }
  if (candidate.policyIdentity === 'population_exploit') {
    for (const check of ['populationModel', 'triggerCondition', 'opponentResponseReference']) {
      if (!candidate.requiredCompilerChecks.includes(check)) failures.push(`${candidate.candidateId}:missing-${check}`);
    }
    if (!candidate.forbiddenPromotion.includes('raw_reference') || !candidate.forbiddenPromotion.includes('simplified_reference')) failures.push(`${candidate.candidateId}:exploit-promotion-not-blocked`);
  }
  if (candidate.numericMentions.some(mention => mention.typed === 'frequency_or_untyped' && /\d/.test(mention.raw)) && candidate.explicitActions.length === 0) {
    // A number without an action remains a candidate to interpret; it must not silently become a policy.
    if (!candidate.requiredCompilerChecks.includes('frequency_vs_size_separation')) failures.push(`${candidate.candidateId}:untyped-number-without-separation-gate`);
  }
}

assert.deepEqual(failures, []);
const output = {
  id: 'COURSE_POLICY_CANDIDATE_LEDGER_AUDIT_V1',
  status: 'paper_course_policy_candidate_ledger_complete_not_compiled',
  sourceLedger: 'course-policy-candidate-ledger.json',
  checks: {
    candidateCount: ledger.candidates.length,
    courseRuleCandidates: ledger.counts.byPolicyIdentity.course_rule,
    populationExploitCandidates: ledger.counts.byPolicyIdentity.population_exploit,
    sourceHashesMatched: ledger.currentEvidence.sourceHashesMatched,
    exactStrategyReady: ledger.counts.exactStrategyReady,
    coursePolicyCompiled: ledger.counts.coursePolicyCompiled,
    learnerTrial: ledger.counts.learnerTrial,
    untypedNumbersCannotPromote: true,
    exploitCannotPromoteToGTO: true,
    failures: failures.length
  },
  releaseGate: {
    passed: false,
    reason: '候选已抽取但尚未完成政策身份、来源范围、动作分母、差异账本、后继节点与参考快照匹配；因此不能进入可判分题库。'
  }
};
fs.writeFileSync(path.join(dir, 'course-policy-candidate-ledger-audit.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, checks: output.checks }));
