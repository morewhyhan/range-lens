import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');

const goal = read('goal-level-acceptance-matrix.json');
const observable = read('final-goal-observable-acceptance.json');
const finalContract = read('final-goal-acceptance-contract.json');
const provenance = read('answer-provenance-and-grading-identity-contract.json');
const coverage = read('full-course-coverage-and-release-contract.json');
const queue = read('session-question-queue-contract.json');

const targetConfigFields = [
  'targetLabel','tableSize','gameType','effectiveStackBB','rakeModel','seatMap','positionModel','preflopActionMenu',
  'postflopActionMenu','openSizes','threeBetSizes','betSizeMenu','anteOrBlindStructure','sourceVersion','configurationFingerprint'
];
const scoreDimensions = [
  'routeLocation','inputFacts','handAndBoardFacts','physicalRangeFilter','actionOrCoursePolicy','amountAndLedger',
  'rangeAfterOrStop','successorOrStop','errorLayer','helpUse','firstAnswerIndependence'
];
const evidenceStages = [
  { id: 'T0_structure', requires: ['firstPassCompleted','outerInnerRecall','errorRecovery','singleFieldTransfer'], proves: '路线结构证据', cannotProve: ['strategyAccuracy','NL50Readiness'] },
  { id: 'T1_matched_course_package', requires: ['targetConfigFrozen','matchedInputFingerprint','coursePolicyLedger','rangeAndSuccessor'], proves: '指定课程配置下的课包可判分', cannotProve: ['learnerMastery','NL50Readiness'] },
  { id: 'T2_heldout_execution', requires: ['unexposedCases','dedupeByStructure','firstAnswerBeforeHelp','allScoreDimensions'], proves: '未曝光题中的可执行表现', cannotProve: ['realTableWinRate','universalNL50'] },
  { id: 'T3_independent_review', requires: ['frozenPackage','independentReconstruction','differenceLedgerReview','unknownNodesReported'], proves: '答案和来源可以被外部复核', cannotProve: ['longTermProfitability'] },
  { id: 'T4_real_decision_audit', requires: ['coveredConfigurationOnly','decisionLog','helpAndUnknownLog','longitudinalSample','externalBenchmark'], proves: '已覆盖配置下的真实决策表现', cannotProve: ['uncoveredSpots','guaranteedProfit'] }
];
const forbiddenSubstitutions = [
  'docs_or_green_tests_equal_NL50',
  'training_accuracy_equal_real_win_rate',
  'short_term_profit_equal_strategy_mastery',
  'equity_calculator_equal_action_policy',
  'local_solver_slice_equal_complete_reference',
  'average_score_hides_critical_layer',
  'unknown_node_treated_as_correct_action'
];

assert.equal(goal.goalCompletionVerified, false);
assert.equal(observable.currentEvidence.NL50Evidence, false);
assert.equal(finalContract.gates.partialEvidenceCannotPromoteGlobalGoal, true);
assert.equal(provenance.rules.provenanceDoesNotEqualLearnerMastery, true);
assert.equal(coverage.currentEvidence.matchedReference, false);
assert.equal(queue.currentEvidence.runtimeScheduler, false);

const benchmark = {
  id: 'TARGET_READINESS_AND_NL50_BENCHMARK_CONTRACT_V1',
  status: 'paper_target_benchmark_schema_frozen_fields_and_external_evidence_missing',
  purpose: '把目标级准备度拆成冻结配置、未曝光执行、独立复核和真实决策审计，不用年龄标签、文档数量或短期输赢宣称NL50。',
  sources: ['04_正确性与NL50验收方案.md','169_最终标准可观察验收与NL50边界合同.md','final-goal-observable-acceptance.json','goal-level-acceptance-matrix.json','final-goal-acceptance-contract.json','answer-provenance-and-grading-identity-contract.json','full-course-coverage-and-release-contract.json','session-question-queue-contract.json'],
  targetConfig: {
    requiredFields: targetConfigFields,
    fixedValues: {
      targetLabel: 'NL50',
      tableSize: 6,
      gameType: 'cash_holdem',
      effectiveStackBB: 100,
      rakeModel: null,
      seatMap: null,
      positionModel: null,
      preflopActionMenu: null,
      postflopActionMenu: null,
      openSizes: null,
      threeBetSizes: null,
      betSizeMenu: null,
      anteOrBlindStructure: null,
      sourceVersion: null,
      configurationFingerprint: null
    },
    rule: '任何必需字段为空时，只能标记target_configuration_unfrozen，不进入目标级判定。'
  },
  scoreDimensions,
  evidenceStages,
  holdoutRules: {
    freezeBeforeScoring: true,
    noTrainingCasesInHoldout: true,
    firstAnswerBeforeHelp: true,
    dedupeByStructureAndSource: true,
    doNotCountSameCaseRetryAsIndependent: true,
    exactlyOneChangedFieldForTransfer: true,
    reportUnknownAndInvalidSeparately: true,
    strataMustBeDeclared: ['parentState','unitGroup','street','actionState','boardClass','handClass','edgeOrInternal','answerIdentity'],
    noGlobalAveragePromotion: true
  },
  externalReview: {
    reviewerRebuildsFromInput: true,
    reviewerSeesFrozenVersionAndHashes: true,
    reviewerChecksDifferenceLedger: true,
    reviewerChecksUnknownStops: true,
    reviewerCannotUseLearnerOutcomeToChangeAnswerKey: true
  },
  realDecisionAudit: {
    coveredConfigurationOnly: true,
    recordFields: ['timestamp','configurationFingerprint','caseIdentity','firstAnswer','helpUse','unknownStop','decision','amount','rangeOrStop','successorOrStop','resultSeparateFromDecision'],
    outcomeIsNotDecisionGrade: true,
    minimumSampleSize: null,
    threshold: null,
    calibrationRequired: true,
    uncoveredSpotsRemainUnknown: true
  },
  forbiddenSubstitutions,
  rules: {
    allTargetConfigFieldsRequired: true,
    targetLabelDoesNotFixConfiguration: true,
    thresholdsMustBeCalibrated: true,
    everyStageHasNonSubstitutionBoundary: true,
    NL50RequiresAllEvidenceStages: true,
    noGuaranteeFromTrainingCompletion: true,
    noGuaranteeFromShortTermResults: true
  },
  currentEvidence: {
    schemaWritten: true,
    targetConfigurationFrozen: false,
    matchedReference: false,
    heldoutPackage: false,
    externalReview: false,
    realDecisionAudit: false,
    externalTargetBenchmark: false,
    NL50Evidence: false,
    goalCompletionVerified: false
  }
};

write('target-readiness-and-nl50-benchmark-contract.json', benchmark);

const md = `# 207｜目标级准备度与NL50基准证据合同

\`\`\`json
{
  "parentDocument": "206_首遍13帧用户执行脚本与双层回放合同.md",
  "routeNode": "target_readiness_and_nl50_benchmark_contract",
  "evidenceLevel": "paper_target_benchmark_schema_frozen_fields_and_external_evidence_missing",
  "opensChildren": ["target-readiness-and-nl50-benchmark-contract.json", "final-goal-observable-acceptance.json", "04_正确性与NL50验收方案.md"],
  "returnTo": "翻后教学系统_统一总纲.md",
  "currentStatus": "target_config_and_nl50_evidence_schema_written_not_frozen"
}
\`\`\`

## “达到NL50”必须先变成可核对的目标配置

NL50不是一个可以单独拿来判题的标签。至少要冻结六人现金桌、100BB、抽水、座位和位置、前序动作、前翻下注菜单、翻后下注菜单、课程版本和参考快照。任何一个关键字段为空，都只能报告“目标配置未冻结”，不能把其它配置的成绩合并进来。

## 证据顺序

\`\`\`text
T0 路线结构
→ T1 匹配课程课包
→ T2 未曝光慢速执行
→ T3 独立复核
→ T4 已覆盖配置下的真实决策审计
\`\`\`

每一级都有自己的结论边界。T0只能证明用户形成路线；T1只能证明课包可判分；T2只能证明未曝光题表现；T3只能证明答案可被重建；只有 T4 加上外部目标基准，才有资格讨论目标级准备度。任何阶段都不能把训练正确率直接换算成真实胜率或NL50保证。

## 未曝光题怎样防止自欺

保留题必须在冻结版本后生成，训练题和同结构近邻不能混入；同题重试不算独立；迁移题只改一个字段；边缘/内部、街次、行动状态、牌面类别和答案身份必须分层报告；未知节点和无效题单独报告，不得被平均分掩盖。真实牌局记录把结果和当时决策分开，输赢不能反写首答对错。

机器合同见 [target-readiness-and-nl50-benchmark-contract.json](target-readiness-and-nl50-benchmark-contract.json)。当前只是目标证据结构，目标配置、匹配参考、未曝光题包、独立复核和真实决策审计都还没有完成。
`;
fs.writeFileSync(path.join(dir, '207_目标级准备度与NL50基准证据合同.md'), md);

console.log(JSON.stringify({
  ok: true,
  status: benchmark.status,
  targetConfigFields: targetConfigFields.length,
  scoreDimensions: scoreDimensions.length,
  evidenceStages: evidenceStages.length,
  targetConfigurationFrozen: benchmark.currentEvidence.targetConfigurationFrozen,
  NL50Evidence: benchmark.currentEvidence.NL50Evidence
}));
