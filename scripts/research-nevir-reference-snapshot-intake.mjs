import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');

const repoReport = read('external-repo-current-capability-report.json');
const snapshot = read('solver-snapshot-to-lesson-package.json');
const provenance = read('answer-provenance-and-grading-identity-contract.json');
const compiler = read('solver-course-visual-compiler-contract.json');

const roleNames = [
  'gto-wizard/equity-calculator',
  'b-inary/postflop-solver',
  'b-inary/wasm-postflop',
  'b-inary/desktop-postflop',
  'b-inary/holdem-hand-evaluator',
  'b-inary/poker-cfr'
];
assert.deepEqual(repoReport.sources.map(x => x.repo), roleNames);
assert.equal(snapshot.source.repo, 'b-inary/postflop-solver');
assert.equal(snapshot.inputIdentity.rangeIsConcreteWeightedCombos, true);
assert.equal(snapshot.inputIdentity.actionMenuIsPartOfProblemIdentity, true);
assert.equal(provenance.rules.equityIsNotAction, true);
assert.equal(compiler.sourceBoundaryRules.referenceStrategyIsNotCoursePolicy, true);

const identityFields = [
  'sourceRepo','sourceCommit','sourceTreeHash','license','licenseReview','buildFeatures',
  'gameType','tableSize','activePlayers','seatMap','positionModel','effectiveStackBB',
  'rakeModel','anteOrBlindStructure','street','history','board','deadCards',
  'rangesByPlayer','startingPotBB','actionMenu','raiseSizes','donkSizes',
  'allInThresholds','bunching','nodeLocking','storageMode','inputFingerprint'
];

const sourceRoles = {
  'gto-wizard/equity-calculator': {
    layer: 'fact_equity',
    allowed: ['exact_runout_enumeration','win','tie','pot_share_equity','dead_cards'],
    cannotBecome: ['weighted_range','action_frequency','bet_size','action_ev','successor_policy'],
    releaseRole: 'fact_only'
  },
  'b-inary/holdem-hand-evaluator': {
    layer: 'fact_hand_rank',
    allowed: ['best_five','hand_category','showdown_order'],
    cannotBecome: ['range_policy','action_frequency','action_ev','course_answer'],
    releaseRole: 'fact_only'
  },
  'b-inary/postflop-solver': {
    layer: 'reference_strategy',
    allowed: ['per_combo_strategy','action_ev','equity','reach_weights','range_after','successor_identity'],
    cannotBecome: ['course_policy','beginner_mastery','nl50_readiness'],
    releaseRole: 'offline_reference_only'
  },
  'b-inary/wasm-postflop': {
    layer: 'browser_solver_shell',
    allowed: ['worker_input_shape','node_navigation_reference','range_view_reference'],
    cannotBecome: ['training_route','grading_policy','learner_mastery'],
    releaseRole: 'ui_reference_only'
  },
  'b-inary/desktop-postflop': {
    layer: 'desktop_solver_shell',
    allowed: ['desktop_node_navigation','combo_view_reference','range_chart_reference'],
    cannotBecome: ['training_route','course_policy','nl50_readiness'],
    releaseRole: 'ui_reference_only'
  },
  'b-inary/poker-cfr': {
    layer: 'algorithm_test_reference',
    allowed: ['small_game_cfr_regression','algorithm_comparison'],
    cannotBecome: ['complete_postflop_reference','course_answer','target_benchmark'],
    releaseRole: 'research_only'
  }
};

const stages = [
  {
    id: 'I0_provenance',
    question: '这份结果到底来自哪一个仓库、提交、构建和许可证？',
    requires: ['sourceRepo','sourceCommit','sourceTreeHash','license','licenseReview','buildFeatures'],
    output: 'sourceIdentity',
    blocks: ['all_distribution','matched_reference']
  },
  {
    id: 'I1_problem_identity',
    question: '求解的游戏、牌面、范围、筹码和动作菜单是否与课程完全相同？',
    requires: identityFields.slice(6),
    output: 'inputFingerprint',
    blocks: ['strategy_grading','course_release']
  },
  {
    id: 'I2_raw_strategy',
    question: '每个真实节点是否有逐组合的动作、频率、EV和质量信息？',
    requires: ['nodeIdentity','privateCards','weights','normalizedWeights','availableActions','strategy','equity','expectedValues','quality'],
    output: 'referenceSnapshot',
    blocks: ['action_grading','range_after']
  },
  {
    id: 'I3_independent_recompute',
    question: '物理牌力、合法行动、组合分母、局部动作后范围和终结结果能否独立复算？',
    requires: ['bestFive','legalActions','fixedDenominator','rangeAfterFormula','settlementCheck','qualityCheck'],
    output: 'independentChecks',
    blocks: ['reference_release']
  },
  {
    id: 'I4_course_compile',
    question: '课程究竟删掉、合并或量化了什么，和原始参考差多少？',
    requires: ['coursePolicy','quantizationRule','differenceLedger','policyLoss','scope'],
    output: 'coursePackage',
    blocks: ['course_answer']
  },
  {
    id: 'I5_successor_closure',
    question: '动作以后下一节点、下一范围和停点是否真实存在并且可以继续？',
    requires: ['successorIdentityOrStopReason','expandedChanceCards','nextRangeStateOrStop','ledgerHandoff'],
    output: 'successorGraph',
    blocks: ['continuous_practice','three_street_claim']
  },
  {
    id: 'I6_static_release',
    question: '学习者看到的每一个答案能否回到来源、政策和停止原因？',
    requires: ['inputFingerprint','sourceIdentity','factSnapshot','referenceSnapshot','coursePolicy','differenceLedger','rangeSnapshots','successorGraph','lessonFrames','releaseDecision'],
    output: 'verifiedStaticLessonPackage',
    blocks: ['runtime_training','nl50_evidence']
  }
];

const perComboRequired = [
  'nodeIdentity','privateCards','physicalWeight','referenceActionFrequencyByCombo',
  'referenceActionValueByCombo','referenceEquityByCombo','reachWeight',
  'referenceAfterByAction','courseAfterByAction','differenceReasonByAction',
  'successorIdentityByAction','sourceFingerprint'
];

const matchRules = {
  exactFieldEquality: true,
  canonicalJsonBeforeHash: true,
  actionAmountIncludedInFingerprint: true,
  rangesAndWeightsIncludedInFingerprint: true,
  activePlayersSeparatedFromBunching: true,
  isomorphicChanceExpandedBeforeDisplay: true,
  unknownReferenceIsNotZero: true,
  missingSuccessorStopsAtParent: true,
  localCaseCannotFillMatchedReference: true,
  neighboringBoardCannotFillTargetNode: true,
  equityCannotSelectAction: true,
  solverOutputCannotBecomeCoursePolicyAutomatically: true
};

const releaseIdentities = [
  { id: 'fact_only', permits: ['p2_board','physical_filter'], grade: 'fact_check_only' },
  { id: 'demonstration', permits: ['teacher_walkthrough','visual_example'], grade: 'no_exact_strategy_grade' },
  { id: 'course_policy', permits: ['simplified_practice'], grade: 'course_policy_only' },
  { id: 'matched_reference', permits: ['exact_strategy_practice','range_after','successor'], grade: 'reference_and_course_checked' },
  { id: 'not_open', permits: ['stop_card'], grade: 'no_answer_key' }
];

const intake = {
  id: 'REFERENCE_SNAPSHOT_INTAKE_AND_MATCH_CONTRACT_V1',
  status: 'paper_reference_intake_schema_and_repo_role_boundaries_missing_matched_snapshot',
  purpose: '把外部仓库的事实、参考策略、界面参考和算法实验分开，并要求每一份可教学结果先冻结来源与输入指纹，再经过逐组合、独立复算、课程编译和后继闭合，最后才进入静态课包。',
  sources: ['external-repo-current-capability-report.json','repository-capabilities-evidence.json','solver-snapshot-to-lesson-package.json','answer-provenance-and-grading-identity-contract.json','solver-course-visual-compiler-contract.json','176_指定仓库当前公开能力与训练器映射报告.md','114_A72完整参考获取与验收规格.md'],
  sourceRoles,
  identityFields,
  stages,
  perComboRequired,
  matchRules,
  releaseIdentities,
  matchingAlgorithm: {
    canonicalObject: 'ordered JSON with explicit nulls, normalized cards, normalized action amounts and sorted weighted combinations',
    fingerprint: 'sha256(canonicalJson(identityFields))',
    matchDecision: 'all identityFields equal and source quality gates passed; one mismatch means unmatched',
    comparisonReport: ['field','expected','received','classification','blocks'],
    classifications: ['exact_match','config_mismatch','source_unverified','quality_insufficient','unknown']
  },
  staticPackageMinimum: [
    'sourceIdentity','inputFingerprint','factSnapshot','referenceSnapshot','coursePolicy',
    'differenceLedger','rangeSnapshots','successorGraph','lessonFrames','releaseDecision'
  ],
  stopCards: [
    { id: 'S0_source', when: '来源提交、许可证或构建特征缺失', userText: '资料来源还没有核对，先停在资料层。', returnTo: 'author_reference_intake' },
    { id: 'S1_mismatch', when: '目标配置任意字段不一致', userText: '这份参考和当前牌局设置不一样，不能拿来判动作。', returnTo: 'p1_context' },
    { id: 'S2_missing_action_after', when: '没有逐动作的动作后范围', userText: '这里只能看动作频率，不能练动作后范围。', returnTo: 'p6_update' },
    { id: 'S3_missing_successor', when: '后继节点或停止原因缺失', userText: '这里没有可靠的下一步，先停在当前节点。', returnTo: 'p6_update' },
    { id: 'S4_license', when: '许可证未核对或不允许分发', userText: '这份资料只能做研究参考，不能直接打包进软件。', returnTo: 'author_source_review' }
  ],
  currentEvidence: {
    repoRoleMapAudited: true,
    identitySchemaWritten: true,
    fingerprintAlgorithmWritten: true,
    perComboCompletenessWritten: true,
    independentRecomputeContractWritten: true,
    courseDifferenceContractLinked: true,
    matchedSnapshot: false,
    sourceLicenseReleaseReview: false,
    staticPackageReleased: false,
    runtimeTrainingIntegrated: false,
    learnerTrial: false,
    nl50Evidence: false
  },
  guards: {
    equityDoesNotImplyAction: true,
    handEvaluatorDoesNotImplyPolicy: true,
    uiReferenceDoesNotImplyTraining: true,
    sixMaxBunchingDoesNotImplySixActivePlayers: true,
    noMatchMeansNoExactGrade: true,
    noSuccessorMeansNoContinuousClaim: true,
    noLicenseReviewMeansNoDistribution: true,
    noPaperContractEqualsRuntime: true
  }
};

write('reference-snapshot-intake-and-match-contract.json', intake);

const md = `# 208｜参考快照接入、配置匹配与发布合同

\`\`\`json
{
  "parentDocument": "207_目标级准备度与NL50基准证据合同.md",
  "routeNode": "reference_snapshot_intake_and_match_contract",
  "evidenceLevel": "paper_reference_intake_schema_and_repo_role_boundaries_missing_matched_snapshot",
  "opensChildren": ["reference-snapshot-intake-and-match-contract.json", "external-repo-current-capability-report.json", "solver-snapshot-to-lesson-package.json"],
  "returnTo": "翻后教学系统_统一总纲.md",
  "currentStatus": "source_roles_and_match_contract_written_but_no_matched_release"
}
\`\`\`

## 这几个仓库在系统里各自只能做什么

\`equity-calculator\`和\`holdem-hand-evaluator\`只回答“牌面事实”：能不能组成某种牌、所有合法未来牌是什么、摊牌权益是多少。它们不能回答下注、弃牌或动作后范围。

\`postflop-solver\`才是“参考策略”来源：它可以提供逐组合的动作频率、动作EV、权益、到达权重、动作后范围和后继节点。但它的结果必须绑定完整求解输入；源码、界面或局部模型本身都不能直接变成课程答案。

\`wasm-postflop\`和\`desktop-postflop\`只借鉴节点导航、组合查看和范围图的表达；\`poker-cfr\`只作为小模型算法回归参考。它们都不等于本软件的嵌套教学路线，也不自动产生判分政策。

## 一份参考什么时候才算“匹配”

先把来源提交、树哈希、许可证、构建特征、六人桌/有效人数、位置、筹码、抽水、前序动作、牌面、双方加权范围、死牌、底池、动作金额和求解树配置全部写入规范化对象，再对这个对象计算输入指纹。任一字段不一致，就只能标为“配置不匹配”，不能用相近牌面、相邻下注尺度或本地小模型补齐。

匹配之后还要有逐组合的动作频率、动作EV、到达权重、每个动作后的范围、差异原因和真实后继。只有权益或最终胜率而没有动作后范围，不能开放范围变化练习；只有动作频率而没有后继，不能开放连续转牌/河牌练习。

## 进入课程的顺序

\`\`\`text
I0 来源身份与许可证
→ I1 完整问题指纹
→ I2 原始逐组合策略
→ I3 独立物理/组合/结算复算
→ I4 课程简化与差异账本
→ I5 后继和停止边界
→ I6 静态课包发布
\`\`\`

前两层只解决“资料是谁、题目是不是同一道题”；I2—I3才解决“参考结果是否足够完整”；I4把GTO参考和本课程的100%/50%/0%或动作规则分开；I5保证下一步真的存在；I6才允许训练器读取。运行时点击答案不能临时求解、猜政策或把未知当成弃牌。

## 学习者看到的停止方式

资料不足时显示停止卡并回到最近的父步骤：来源没核对就停在资料层，配置不匹配就回到局面确认，缺动作后范围就不能练范围变化，缺后继就停在当前节点，许可证没审查就不能打包。停止本身是正确结果，不是隐藏的错误答案。

机器合同见 [reference-snapshot-intake-and-match-contract.json](reference-snapshot-intake-and-match-contract.json)。当前已把仓库角色、指纹字段、逐组合最低字段、匹配算法和停止边界写死，但真实匹配快照、许可证发布审查、静态课包和运行时接入仍未完成。
`;
fs.writeFileSync(path.join(dir, '208_参考快照接入、配置匹配与发布合同.md'), md);

console.log(JSON.stringify({
  ok: true,
  status: intake.status,
  sourceRoles: Object.keys(sourceRoles).length,
  identityFields: identityFields.length,
  stages: stages.length,
  perComboRequired: perComboRequired.length,
  matchedSnapshot: intake.currentEvidence.matchedSnapshot,
  staticPackageReleased: intake.currentEvidence.staticPackageReleased
}));
