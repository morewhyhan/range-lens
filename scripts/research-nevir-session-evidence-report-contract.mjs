import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');

const unified = read('unified-learner-evidence-release-gates.json');
const target = read('target-readiness-and-nl50-benchmark-contract.json');
const stopObservation = read('low-baseline-stop-observation-crosswalk.json');
const firstPass = read('first-pass-user-facing-script-contract.json');
assert.equal(unified.privacy, 'session_only_no_training_database');
assert.equal(target.holdoutRules.firstAnswerBeforeHelp ?? true, true);
assert.equal(stopObservation.rows.length, 12);
assert.equal(firstPass.rows.length, 13);

const observationFields = [
  'firstAnswer','currentLayerSelfLocated','visualAnchorPointed','primaryActionCompleted',
  'nextLayerOrStopSelfLocated','returnPointSelfLocated','handoffProduced','hostPromptCount',
  'errorLayer','parentRestoreObserved','changedFieldIdentified','retryAnswer',
  'exitReason','helpLevel','answerIdentity'
];

const scoreDimensions = [
  'routeLocation','inputFacts','handAndBoardFacts','physicalRangeFilter','actionOrCoursePolicy',
  'amountAndLedger','rangeAfterOrStop','successorOrStop','errorLayer','helpUse','firstAnswerIndependence'
];

const eventTypes = [
  'session_started','frame_seen','first_answer_recorded','help_requested','answer_scored',
  'error_layer_classified','parent_frame_restored','handoff_recorded','retry_recorded',
  'transfer_field_changed','successor_checked','stop_card_shown','session_closed'
];

const statuses = ['correct','incorrect','unknown','not_applicable'];
const gates = [
  { id: 'T0_structure', sourceGate: 'V2_hidden_structure_recall', minimum: ['routeLocation','firstAnswerIndependence','errorLayer'], proves: '路线结构和回退证据', blocks: ['strategy_mastery','NL50'] },
  { id: 'T1_matched_course_package', sourceGate: 'V4_unseen_slow_single_step', minimum: ['inputFacts','handAndBoardFacts','actionOrCoursePolicy','amountAndLedger','rangeAfterOrStop','successorOrStop'], proves: '匹配课包内可判分的慢执行', blocks: ['target_readiness'] },
  { id: 'T2_heldout_execution', sourceGate: 'V4_unseen_slow_single_step', minimum: ['firstAnswerIndependence','helpUse','errorLayer','exactlyOneChangedField'], proves: '未曝光题迁移', blocks: ['continuous_claim_without_successor'] },
  { id: 'T3_independent_review', sourceGate: 'V6_target_external_review', minimum: ['answerIdentity','sourceFingerprint','differenceLedgerReview','unknownReported'], proves: '答案可被重建', blocks: ['NL50'] },
  { id: 'T4_real_decision_audit', sourceGate: 'V6_target_external_review', minimum: ['configurationFingerprint','decisionLog','resultSeparateFromDecision','externalBenchmark'], proves: '已覆盖配置下的真实决策审计', blocks: ['uncovered_spots','profit_guarantee'] }
];

const sessionRecord = {
  required: [
    'ephemeralSessionId','courseVersion','targetConfigurationFingerprint','startedAt','routeVersion',
    'gateAtStart','gateAtEnd','caseIdentity','seenOrHeldout','parentStep','unitId',
    'sourceIdentity','answerIdentity','inputFingerprint','frameRecords','eventLog','scoreVector',
    'releaseDecision','clearedOnClose'
  ],
  frameRecord: [
    'frameId','routeIndex','parentStep','caseId','seenOrHeldout','firstAnswer','firstAnswerAt',
    'helpLevelBeforeAnswer','hostInterventionBeforeAnswer','requiredOutput','observation',
    'answerStatus','answerIdentity','errorLayer','returnTo','retryAnswer','handoff','stopReason'
  ],
  observationFields,
  eventTypes,
  scoreDimensions,
  answerStatus: statuses
};

const scoring = {
  firstAnswerIsAuthoritative: true,
  helpAfterFirstAnswerCannotRepairFirstAnswer: true,
  unknownIsPracticeIncorrect: true,
  unknownIsReportedSeparately: true,
  invalidCaseIsExcludedFromDenominator: true,
  retryIsNotIndependentAttempt: true,
  firstAnswerAndPostHelpAnswerBothStored: true,
  resultDoesNotChangeDecisionGrade: true,
  missingSourceStopsStrategyGrade: true,
  missingSuccessorStopsContinuityGrade: true,
  scoreVectorUsesExplicitStatus: true,
  noGlobalAveragePromotion: true,
  allDimensionsMustHaveStatusOrNotApplicable: true
};

const strata = [
  'parentState','unitGroup','street','actionState','boardClass','handClass',
  'edgeOrInternal','answerIdentity','seenOrHeldout','helpLevel','errorLayer'
];

const report = {
  id: 'SESSION_EVIDENCE_AND_TARGET_REPORT_CONTRACT_V1',
  status: 'paper_session_evidence_and_target_report_schema_written_runtime_and_trials_missing',
  purpose: '把一次练习的观察、判分、错误回退、单变量迁移、连续路线和目标级汇总统一为临时会话证据；不建立数据库、不把帮助后的改正覆盖首答，也不把一次成绩或牌局输赢当成NL50证明。',
  sources: ['unified-learner-evidence-release-gates.json','target-readiness-and-nl50-benchmark-contract.json','low-baseline-stop-observation-crosswalk.json','first-pass-user-facing-script-contract.json','200_低基础逐停点观察与四通道证据交叉合同.md','207_目标级准备度与NL50基准证据合同.md'],
  sessionRecord,
  scoring,
  strata,
  gates,
  aggregation: {
    perCase: ['firstAnswerStatus','postHelpStatus','unknown','invalid','helpLevel','errorLayer','returnTo','successorOrStop'],
    perStratum: ['attempts','independentFirstAnswers','correctFirstAnswers','incorrectFirstAnswers','unknownCount','invalidCount','helpRate','errorLayerCounts','coverage'],
    reportUnknownAndInvalidSeparately: true,
    reportEveryStratum: true,
    denominatorExcludesInvalidOnly: true,
    noPromotionFromGlobalAverage: true,
    noLongTermStorage: true
  },
  privacyAndStorage: {
    storageMode: 'memory_only',
    noDatabase: true,
    noLocalStorage: true,
    noAccount: true,
    clearOnReloadOrSessionClose: true,
    exportOnlyWhenExplicitlyRequested: true,
    exportedArtifactIsEvidenceSnapshotNotTrainingDatabase: true
  },
  userVisibleReport: {
    alwaysShow: ['currentCorrectOrIncorrect','unknownCountsAsIncorrect','currentReturnPoint','nextActionOrStop'],
    optionalAfterSession: ['firstAnswerRate','helpRate','errorLayerSummary','heldoutTransferSummary','continuitySummary'],
    hideAuthorCodes: true,
    neverShow: ['NL50_ready_before_all_gates','profit_guarantee','age_as_evidence']
  },
  releaseRules: {
    gateOrderMustBeMonotonic: true,
    failedGateReturnsToItsParent: true,
    noSkipByAnswerCount: true,
    noSkipBySpeed: true,
    noSkipByHelpedAnswer: true,
    noSkipByShortTermResult: true,
    everyHeldoutCaseRequiresFirstAnswerBeforeExplanation: true,
    everyContinuousCaseRequiresSuccessorOrStop: true
  },
  currentEvidence: {
    schemaWritten: true,
    crosswalkToUnifiedProtocol: true,
    crosswalkToTargetBenchmark: true,
    runtimeRecordWriter: false,
    runtimeScorer: false,
    learnerTrial: false,
    heldoutReport: false,
    continuousReport: false,
    externalReview: false,
    nl50Evidence: false
  }
};

write('session-evidence-and-target-report-contract.json', report);

const md = `# 209｜单次会话证据与目标级报告合同

\`\`\`json
{
  "parentDocument": "207_目标级准备度与NL50基准证据合同.md",
  "routeNode": "session_evidence_and_target_report_contract",
  "evidenceLevel": "paper_session_evidence_and_target_report_schema_written_runtime_and_trials_missing",
  "opensChildren": ["session-evidence-and-target-report-contract.json", "unified-learner-evidence-release-gates.json", "target-readiness-and-nl50-benchmark-contract.json"],
  "returnTo": "翻后教学系统_统一总纲.md",
  "currentStatus": "session_only_evidence_schema_written_not_runtime_connected"
}
\`\`\`

## 每道题只记录一次真正的首答

系统在用户第一次点选或说出答案时就写入首答、时间、帮助等级和当前父步骤。之后的解析、提示和重试仍然记录，但不能把“看过答案后改对”覆盖成第一次答对。\`我不知道\`按用户要求计为错误，同时单独记为 unknown，防止它和普通错误混在一起；题目本身资料不完整则记为 invalid，并从成绩分母排除。

每个停点还要记录当前层是否找对、视觉锚点是否指对、主要动作是否完成、下一步或停止点是否说对、父帧是否恢复、错误落在哪一层以及交接是否产生。这样才能区分“不会牌力”“不会找范围”“不会比较动作”“不会算金额”和“不会回到下一步”。

## 不建立学习数据库

证据只在当前会话内存中存在；刷新或关闭就清除，不要求账号、云端同步或长期学习记录。用户界面只显示当前题的对错、回退位置和下一步，结束时可以看到本次会话的小结；若以后需要外部复核，才由明确操作导出一份带版本和指纹的证据快照。它是验收材料，不是数据库。

## 从一次练习到目标评估的五层报告

\`\`\`text
T0 结构：能否按顺序定位、回忆和回退
T1 课包：在匹配资料中能否慢速完成事实、动作、金额、范围和后继
T2 迁移：未曝光题中只改一个字段，首答是否独立
T3 复核：别人能否从指纹、来源和差异账本重建答案
T4 真实审计：在覆盖配置中记录真实决策，并把输赢与决策等级分开
\`\`\`

每层只证明自己的范围。总平均不能掩盖某个父步骤、边缘牌、内部牌、某个街次或某种错误层的断点；连续三街缺真实后继时，报告必须停在当前节点。速度、题量、短期盈利和年龄都不能越过闸门。

机器合同见 [session-evidence-and-target-report-contract.json](session-evidence-and-target-report-contract.json)。目前已把临时记录、判分、分层汇总和发布边界写死，但运行时记录器、未曝光报告、连续三街报告和独立审查还没有完成。
`;
fs.writeFileSync(path.join(dir, '209_单次会话证据与目标级报告合同.md'), md);

console.log(JSON.stringify({
  ok: true,
  status: report.status,
  observationFields: observationFields.length,
  scoreDimensions: scoreDimensions.length,
  eventTypes: eventTypes.length,
  gates: gates.length,
  sessionOnly: report.privacyAndStorage.storageMode,
  learnerTrial: report.currentEvidence.learnerTrial
}));
