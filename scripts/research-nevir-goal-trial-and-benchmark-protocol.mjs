import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');

const observable = read('final-goal-observable-acceptance.json');
const crossAge = read('cross-age-low-baseline-acceptance.json');
const sessionEvidence = read('session-evidence-and-target-report-contract.json');
const target = read('target-readiness-and-nl50-benchmark-contract.json');
const route = read('learner-goal-route-canonical.json');
const queue = read('session-question-queue-contract.json');
assert.equal(observable.acceptanceDimensions.length, 8);
assert.equal(crossAge.firstPassTasks.length, 7);
assert.equal(sessionEvidence.gates.length, 5);
assert.equal(target.evidenceStages.length, 5);
assert.equal(route.outerRoute.length, 12);
assert.equal(queue.priority.length, 7);

const phases = [
  {
    id: 'P0_instrumentation',
    goal: '确认页面实际记录了首答、帮助、父帧、交接、错误层和停止原因。',
    cases: ['one guided first-pass frame','one child open and close','one injected error','one unknown answer'],
    requiredEvidence: ['runtimeRecordWriter','parentRestoreObserved','firstAnswerBeforeHelp','unknownRecorded'],
    passRule: '所有字段存在且顺序正确；缺字段先修仪表，不解释学习效果。',
    failureOwner: 'runtime_or_observation'
  },
  {
    id: 'P1_low_baseline_first_pass',
    goal: '验证低基础用户能沿唯一主线走完一次，并知道当前层、下一步和错误回退。',
    cases: ['L0-L4 outer route','p1-p7 inner route','two injected errors','one stop card'],
    requiredEvidence: ['allCanonicalStopsVisited','firstAnswerBeforeHelp','routeRecall','layerLocation','errorRecovery','parentRestore','stopReason'],
    passRule: '每个核心停点的语言、视觉、记忆、操作四通道都有记录；任何核心失败都不能被平均分隐藏。',
    failureOwner: 'copy_visual_route_or_host_prompt'
  },
  {
    id: 'P2_slow_single_step',
    goal: '验证用户在资料充分的陌生单步中能先定位，再完成事实、范围、比较、执行和更新。',
    cases: ['heldout base case','one amount contrast','one board contrast','one edge case','one internal case'],
    requiredEvidence: ['heldout','firstAnswerBeforeHelp','amountAndAction','rangeAfterOrStop','errorLayer','answerIdentity'],
    passRule: '按父步骤、街次、牌面类型、边缘/内部和答案身份分层；每个核心层都满足校准后的最低证据。',
    failureOwner: 'course_package_or_reference'
  },
  {
    id: 'P3_single_field_transfer',
    goal: '验证用户只面对一个变化字段时，能主动指出重新检查的层并重新作答。',
    cases: ['position contrast','board contrast','price contrast','history response contrast','turn card contrast'],
    requiredEvidence: ['exactlyOneChangedField','preservedFields','affectedLayer','firstAnswerBeforeHelp','returnTo'],
    passRule: '改变字段、保持字段和重新进入的层必须全部说对；原题重答不算迁移。',
    failureOwner: 'principle_card_or_question_generator'
  },
  {
    id: 'P4_continuous_three_street',
    goal: '验证翻牌、转牌、河牌之间的范围、账本、行动权和后继连续。',
    cases: ['unseen flop-to-turn-to-river route','one branch with stop card','one corrected upstream range'],
    requiredEvidence: ['successorOrStopEveryNode','rangeDenominatorContinuity','ledgerConservation','actionRightContinuity','settlementSeparate'],
    passRule: '任一开放节点缺真实后继或停止原因都不能通过连续路线；上游范围错误必须回到范围层。',
    failureOwner: 'successor_graph_or_range_ledger'
  },
  {
    id: 'P5_independent_reconstruction',
    goal: '验证外部复核者能从冻结输入、来源和差异账本重建课程答案。',
    cases: ['frozen representative package','frozen holdout package','unknown node','edge quantization node'],
    requiredEvidence: ['configurationFingerprint','sourceIdentity','referencePolicy','coursePolicy','differenceLedger','unknownStops'],
    passRule: '复核者不能看到学习者结果来修改答案；任何不能重建的字段都标为未知。',
    failureOwner: 'reference_or_compiler'
  },
  {
    id: 'P6_target_condition_audit',
    goal: '在冻结目标配置中对未曝光题、连续路线和真实决策进行目标级审计。',
    cases: ['heldout target package','independent review','covered real decision sample'],
    requiredEvidence: ['targetConfigFrozen','heldoutExecution','externalReview','continuousRoute','decisionAudit','externalBenchmark'],
    passRule: '只报告覆盖配置和分层结果；决策等级与输赢分开；没有外部基准就不讨论NL50准备度。',
    failureOwner: 'benchmark_or_external_review'
  }
];

const dimensions = [
  { id: 'route', source: 'observable.A1', measure: 'canonical states visited in order', strata: ['outer_or_inner','parentStep'], notProve: ['strategyAccuracy'] },
  { id: 'comprehension', source: 'observable.A3', measure: 'first answer, layer location, next/stop, return point', strata: ['stopId','channel','helpLevel'], notProve: ['NL50'] },
  { id: 'fact_math', source: 'observable.A4', measure: 'card legality, best five, price and ledger', strata: ['street','factType'], notProve: ['actionPolicy'] },
  { id: 'policy', source: 'observable.A5', measure: 'identity, action, range-after and successor', strata: ['answerIdentity','unitGroup','actionState'], notProve: ['realProfit'] },
  { id: 'transfer', source: 'observable.A6', measure: 'one changed field and affected layer', strata: ['changedField','parentStep','edgeOrInternal'], notProve: ['continuousSkill'] },
  { id: 'continuity', source: 'observable.A7', measure: 'three-street conservation and successor closure', strata: ['street','branch','boardClass'], notProve: ['uncoveredConfig'] },
  { id: 'target', source: 'observable.A8', measure: 'frozen target holdout and external review', strata: ['allDeclaredTargetStrata'], notProve: ['guaranteedProfit'] }
];

const trialRecord = {
  requiredFields: [
    'protocolVersion','phase','sessionId','caseId','routeRevision','targetConfigurationFingerprint',
    'firstAnswer','helpLevel','hostPromptType','requiredOutput','scoreVector','errorLayer',
    'returnTo','retryAnswer','changedField','preservedFields','successorOrStop','exitReason'
  ],
  timing: {
    allowed: ['sessionStartedAt','firstAnswerAt','helpAt','answerScoredAt','sessionClosedAt'],
    speedIsDescriptiveOnly: true,
    speedCannotGateRelease: true
  },
  assignment: {
    freezeCaseSetBeforeTrial: true,
    trainingCasesExcludedFromHoldout: true,
    structuralDeduplication: true,
    exactlyOneChangedFieldForTransfer: true,
    sameCaseRetryNotIndependent: true,
    unknownAndInvalidSeparate: true,
    noGlobalAveragePromotion: true
  },
  privacy: {
    memoryOnly: true,
    noDatabase: true,
    noLocalStorage: true,
    clearOnClose: true,
    explicitExportOnly: true
  }
};

const failureRouting = [
  { evidence: 'missing_runtime_event', owner: 'runtime', action: 'fix instrumentation before rerun', returnTo: 'P0_instrumentation' },
  { evidence: 'language_or_visual_failure', owner: 'teaching_surface', action: 'revise one prompt or visual anchor and preserve case', returnTo: 'P1_low_baseline_first_pass' },
  { evidence: 'fact_or_math_failure', owner: 'fact_compiler', action: 'recompute physical fact and ledger', returnTo: 'P2_slow_single_step' },
  { evidence: 'reference_or_policy_failure', owner: 'reference_compiler', action: 'stop exact grade and repair source/policy ledger', returnTo: 'P2_slow_single_step' },
  { evidence: 'transfer_failure', owner: 'principle_compiler', action: 'repair base/contrast/transfer card', returnTo: 'P3_single_field_transfer' },
  { evidence: 'successor_or_continuity_failure', owner: 'successor_graph', action: 'close successor or show stop card', returnTo: 'P4_continuous_three_street' },
  { evidence: 'external_reconstruction_failure', owner: 'benchmark', action: 'invalidate target claim and freeze release', returnTo: 'P5_independent_reconstruction' }
];

const report = {
  id: 'GOAL_TRIAL_AND_TARGET_BENCHMARK_PROTOCOL_V1',
  status: 'paper_trial_protocol_compiled_runtime_trial_and_external_benchmark_missing',
  purpose: '把一遍路线、慢速执行、单变量迁移、连续三街、独立复核和目标级审计组织成同一条可重复实验链；每个失败都回到责任层，不用总分或输赢掩盖断点。',
  sources: ['final-goal-observable-acceptance.json','cross-age-low-baseline-acceptance.json','session-evidence-and-target-report-contract.json','target-readiness-and-nl50-benchmark-contract.json','learner-goal-route-canonical.json','session-question-queue-contract.json'],
  phases,
  dimensions,
  trialRecord,
  failureRouting,
  releaseOrder: phases.map(x => x.id),
  stopRules: {
    noPhaseSkip: true,
    failedPhaseBlocksNextPhase: true,
    missingObservationIsUnknown: true,
    unknownDoesNotBecomePass: true,
    invalidCaseExcludedFromDenominator: true,
    learnerOutcomeCannotChangeAnswerKey: true,
    shortTermProfitCannotChangeDecisionGrade: true,
    noNL50DiscussionBeforeP6: true
  },
  currentEvidence: {
    protocolWritten: true,
    runtimeInstrumentation: false,
    lowBaselineTrial: false,
    slowExecutionTrial: false,
    transferTrial: false,
    continuousTrial: false,
    independentReconstruction: false,
    targetConditionAudit: false,
    nl50Evidence: false
  }
};

write('goal-trial-and-target-benchmark-protocol.json', report);

const md = `# 212｜一遍学习、迁移、连续路线与目标级复核实验协议

\`\`\`json
{
  "parentDocument": "209_单次会话证据与目标级报告合同.md",
  "routeNode": "goal_trial_and_target_benchmark_protocol",
  "evidenceLevel": "paper_trial_protocol_compiled_runtime_trial_and_external_benchmark_missing",
  "opensChildren": ["goal-trial-and-target-benchmark-protocol.json", "final-goal-observable-acceptance.json", "cross-age-low-baseline-acceptance.json"],
  "returnTo": "翻后教学系统_统一总纲.md",
  "currentStatus": "experiment_sequence_written_not_administered"
}
\`\`\`

## 不能只做一次“用户觉得懂了”的试读

验收必须按七个阶段走：先确认记录器，再做低基础首遍，再做陌生单步，再做单变量迁移，再走连续三街，之后让独立复核者重建答案，最后才在冻结目标配置中做目标级审计。上一阶段失败，下一阶段不能靠增加题量跳过。

## 七个阶段各自回答什么

1. **仪表层**：页面是否真实记录首答、帮助、父帧恢复、交接和停止原因。
2. **低基础首遍**：用户是否按顺序找到当前层、下一步和错误回退。
3. **慢速单步**：资料充分时，是否能完成事实、范围、比较、执行和更新。
4. **单变量迁移**：只改一个字段时，是否知道要回哪一层重新检查。
5. **连续三街**：范围分母、底池账本、行动权和真实后继是否连续。
6. **独立复核**：另一个人能否仅根据冻结输入和来源重建答案。
7. **目标级审计**：在未曝光题和覆盖配置的真实决策中，是否达到预先校准的目标标准。

## 怎样抽题和统计

题集在试读前冻结；训练题不能混入未曝光题；同题重试不算独立样本；迁移题只能改变一个字段；边缘/内部、街次、行动状态、答案身份和错误层必须分层报告。未知单独统计，题目本身无效则从分母排除。速度只用于观察易用性，不能成为通过条件。

每个阶段记录首答、帮助等级、主持者提示、必要输出、错误层、回退点、重试、迁移字段和后继/停止。发现问题后按责任层处理：运行时事件缺失修记录器，语言/视觉失败改一个提示，事实失败重算物理与账本，参考失败停止精确判分，迁移失败重做三卡，连续失败补后继，独立复核失败直接冻结目标声明。

## 目标级结论的边界

前五阶段只能证明路线、理解、执行和迁移；第六阶段只能证明答案可复核；只有第七阶段在冻结的六人现金桌、100BB、抽水、动作菜单和匹配参考上完成，才可以讨论目标级准备度。即使第七阶段通过，也不能把短期盈利或一次成绩说成保证进入 NL50。

机器协议见 [goal-trial-and-target-benchmark-protocol.json](goal-trial-and-target-benchmark-protocol.json)。当前实验顺序、记录字段、分层方法和失败回退已经写定，但运行时记录、真人试读、独立复核和目标级审计尚未实施。
`;
fs.writeFileSync(path.join(dir, '212_一遍学习、迁移、连续路线与目标级复核实验协议.md'), md);

console.log(JSON.stringify({
  ok: true,
  status: report.status,
  phases: phases.length,
  dimensions: dimensions.length,
  failureRoutes: failureRouting.length,
  runtimeInstrumentation: report.currentEvidence.runtimeInstrumentation,
  nl50Evidence: report.currentEvidence.nl50Evidence
}));
