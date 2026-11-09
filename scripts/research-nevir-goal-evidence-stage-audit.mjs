import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const target = read('target-readiness-and-nl50-benchmark-contract.json');
const finalGoal = read('final-goal-observable-acceptance.json');
const trial = read('goal-trial-and-target-benchmark-protocol.json');
const standard = read('target-standard-sequential-teaching-and-nl50-closure-contract.json');
const architecture = read('first-pass-learner-architecture-audit.json');
const visual = read('low-baseline-visual-language-audit.json');
const unitReadiness = read('unit-release-readiness-ledger.json');
const referenceClosure = read('reference-course-closure-ledger.json');

const stageRows = [
  {
    id: 'T0_structure',
    requires: target.evidenceStages.find(stage => stage.id === 'T0_structure').requires,
    paperEvidence: finalGoal.currentEvidence.paperRoute && architecture.currentEvidence.paperAligned && visual.currentEvidence.paperAligned,
    runtimeEvidence: standard.currentEvidence.runtimeNestedRoute && architecture.currentEvidence.runtimeObserved,
    learnerEvidence: trial.currentEvidence.lowBaselineTrial && visual.currentEvidence.lowBaselineTrialObserved,
    proves: '路线结构证据',
    cannotProve: ['strategyAccuracy','NL50Readiness']
  },
  {
    id: 'T1_matched_course_package',
    requires: target.evidenceStages.find(stage => stage.id === 'T1_matched_course_package').requires,
    paperEvidence: unitReadiness.rows.length === 35 && referenceClosure.phases.length === 9,
    runtimeEvidence: false,
    learnerEvidence: false,
    proves: '指定配置下的课包可判分',
    cannotProve: ['learnerMastery','NL50Readiness']
  },
  {
    id: 'T2_heldout_execution',
    requires: target.evidenceStages.find(stage => stage.id === 'T2_heldout_execution').requires,
    paperEvidence: target.holdoutRules.freezeBeforeScoring && target.holdoutRules.firstAnswerBeforeHelp,
    runtimeEvidence: trial.currentEvidence.slowExecutionTrial,
    learnerEvidence: finalGoal.currentEvidence.unseenTransfer && trial.currentEvidence.slowExecutionTrial,
    proves: '未曝光题中的可执行表现',
    cannotProve: ['realTableWinRate','universalNL50']
  },
  {
    id: 'T3_independent_review',
    requires: target.evidenceStages.find(stage => stage.id === 'T3_independent_review').requires,
    paperEvidence: target.externalReview.reviewerRebuildsFromInput && target.externalReview.reviewerChecksDifferenceLedger,
    runtimeEvidence: trial.currentEvidence.independentReconstruction,
    learnerEvidence: trial.currentEvidence.independentReconstruction,
    proves: '答案和来源可被外部复核',
    cannotProve: ['longTermProfitability']
  },
  {
    id: 'T4_real_decision_audit',
    requires: target.evidenceStages.find(stage => stage.id === 'T4_real_decision_audit').requires,
    paperEvidence: target.realDecisionAudit.coveredConfigurationOnly && target.realDecisionAudit.outcomeIsNotDecisionGrade,
    runtimeEvidence: trial.currentEvidence.targetConditionAudit,
    learnerEvidence: trial.currentEvidence.targetConditionAudit && finalGoal.currentEvidence.externalTargetBenchmark,
    proves: '已覆盖配置下的真实决策表现',
    cannotProve: ['uncoveredSpots','guaranteedProfit']
  }
];

for (const row of stageRows) {
  row.status = row.learnerEvidence ? 'observed' : row.runtimeEvidence ? 'runtime_only' : row.paperEvidence ? 'paper_only' : 'blocked';
  row.releaseReady = row.status === 'observed';
}
const failures = [];
if (stageRows.length !== 5) failures.push('stage-count');
if (stageRows.some(row => row.id === 'T0_structure' && row.status !== 'paper_only')) failures.push('T0-status');
if (stageRows.some(row => row.id === 'T1_matched_course_package' && row.status === 'observed')) failures.push('T1-false-pass');
if (stageRows.some(row => row.id === 'T2_heldout_execution' && row.status === 'observed')) failures.push('T2-false-pass');
if (stageRows.some(row => row.id === 'T3_independent_review' && row.status === 'observed')) failures.push('T3-false-pass');
if (stageRows.some(row => row.id === 'T4_real_decision_audit' && row.status === 'observed')) failures.push('T4-false-pass');
if (finalGoal.currentEvidence.NL50Evidence !== false) failures.push('NL50-claim');
assert.deepEqual(failures, []);

const output = {
  id: 'GOAL_EVIDENCE_STAGE_AUDIT_V1',
  status: 'paper_goal_evidence_stages_separated_runtime_and_target_evidence_missing',
  purpose: '把“跟完一遍”“慢速可执行”“单变量迁移”“连续三街”“独立复核”和“NL50目标”拆成不可互相替代的证据阶段。',
  sources: ['target-readiness-and-nl50-benchmark-contract.json','final-goal-observable-acceptance.json','goal-trial-and-target-benchmark-protocol.json','target-standard-sequential-teaching-and-nl50-closure-contract.json','first-pass-learner-architecture-audit.json','low-baseline-visual-language-audit.json','unit-release-readiness-ledger.json','reference-course-closure-ledger.json'],
  stages: stageRows,
  counts: {
    stages: stageRows.length,
    paperOnly: stageRows.filter(row => row.status === 'paper_only').length,
    runtimeOnly: stageRows.filter(row => row.status === 'runtime_only').length,
    observed: stageRows.filter(row => row.status === 'observed').length,
    blocked: stageRows.filter(row => row.status === 'blocked').length,
    releaseReady: stageRows.filter(row => row.releaseReady).length,
    failures: failures.length
  },
  currentEvidence: {
    paperStageMap: true,
    runtimeInstrumentation: trial.currentEvidence.runtimeInstrumentation,
    lowBaselineTrial: trial.currentEvidence.lowBaselineTrial,
    heldoutExecution: trial.currentEvidence.slowExecutionTrial,
    independentReview: trial.currentEvidence.independentReconstruction,
    realDecisionAudit: trial.currentEvidence.targetConditionAudit,
    NL50Evidence: false,
    goalCompletionVerified: false
  },
  forbiddenSubstitutions: target.forbiddenSubstitutions,
  releaseGate: {
    passed: false,
    reason: '阶段地图已闭合，但没有任何学习者观察、未曝光执行、外部重建或真实决策证据；不能从文档或绿灯审计推导NL50。'
  }
};
fs.writeFileSync(path.join(dir, 'goal-evidence-stage-audit.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, counts: output.counts, statuses: stageRows.map(row => `${row.id}:${row.status}`) }));
