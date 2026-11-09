import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const file = path.join(path.resolve('.'), 'research/nevir-system/reference-course-closure-ledger.json');
const ledger = JSON.parse(fs.readFileSync(file, 'utf8'));
assert.equal(ledger.id, 'REFERENCE_COURSE_CLOSURE_LEDGER_V1');
assert.equal(ledger.phases.length, 9);
assert.equal(ledger.gates.length, 8);
assert.equal(ledger.currentEvidence.rawReferenceCandidate, true);
assert.equal(ledger.currentEvidence.matchedTargetReference, false);
assert.equal(ledger.currentEvidence.coursePolicyCompiled, false);
assert.equal(ledger.currentEvidence.successorClosed, false);
assert.equal(ledger.currentEvidence.teachingFramesCompiled, false);
assert.equal(ledger.currentEvidence.heldoutTransferCompiled, false);
assert.equal(ledger.currentEvidence.learnerTrial, false);
assert.equal(ledger.releaseGate.passed, false);
assert.ok(ledger.firstBlockedGate);

const failures = [];
if (ledger.counts.passedGates >= ledger.gates.length) failures.push('all-gates-passed-without-release');
if (ledger.currentEvidence.coursePolicyCompiled && !ledger.currentEvidence.matchedTargetReference) failures.push('course-policy-without-matched-reference');
if (ledger.currentEvidence.successorClosed && ledger.candidate.missingActionEdges > 0) failures.push('successor-closed-with-missing-edges');
if (!ledger.forbiddenUses.includes('直接作为学习者精确判题')) failures.push('missing-forbidden-exact-grading');
if (!ledger.forbiddenUses.includes('把缺失后继默认为过牌或弃牌')) failures.push('missing-forbidden-invented-successor');
assert.deepEqual(failures, []);

const output = {
  id: 'REFERENCE_COURSE_CLOSURE_AUDIT_V1',
  status: 'candidate_reference_pipeline_audited_not_released',
  sourceLedger: 'reference-course-closure-ledger.json',
  checks: {
    phases: ledger.phases.length,
    gates: ledger.gates.length,
    passedGates: ledger.counts.passedGates,
    blockedGates: ledger.counts.blockedGates,
    firstBlockedGate: ledger.firstBlockedGate,
    targetUnknownFields: ledger.counts.targetUnknownFields,
    solverCandidateOnly: ledger.currentEvidence.rawReferenceCandidate && !ledger.currentEvidence.matchedTargetReference,
    coursePolicyNotPromoted: !ledger.currentEvidence.coursePolicyCompiled,
    successorNotInvented: !ledger.currentEvidence.successorClosed,
    learnerTrialNotClaimed: !ledger.currentEvidence.learnerTrial,
    failures: failures.length
  },
  releaseGate: {
    passed: false,
    reason: '现有QQQ只是达到内部停止线的作者侧参考候选；输入目标配置尚未完全冻结，且课程政策、差异账本、后继闭合、教学帧和迁移尚未完成。'
  }
};
fs.writeFileSync(path.join(path.dirname(file), 'reference-course-closure-audit.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, checks: output.checks }));
