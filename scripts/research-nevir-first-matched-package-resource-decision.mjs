import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');

const minimal = read('minimal-matched-first-hand-package.json');
const spec = read('a72-reference-acquisition-spec.json');
const runbook = read('a72-c0-c5-execution-runbook.json');
const closure = read('first-course-closure-audit.json');
const requestManifest = read('unit-reference-snapshot-request-manifest.json');
assert.equal(minimal.config.board.join(','), 'As,7h,2d');
assert.equal(spec.candidateId, 'REF_BTN_BB_A72_100_zero_rake_research_v1');
assert.equal(runbook.executionOrder.join(','), 'C0,C1,C2,C3,C4,C5');
assert.equal(closure.nextPriority, 'close_A72_C0_to_C5_with_raw_reference_and_independent_recompute');
assert.equal(requestManifest.counts.firstPassRepresentatives, 5);

const learnerRoute = ['entry','p1_context','p2_board','p3_range','p4_compare','p5_execute','p6_update','p7_close','replay','holdout'];
const packageNodes = [
  { id: 'entry', source: 'preflop-snapshot-contract', requires: ['preflopInputFingerprint','literalWeightedRanges','positionAndHistory'], release: 'preflight_only', stop: 'missing_or_mismatched_input' },
  { id: 'p1_context', source: 'C0_identity', requires: ['actualActionIdsAndAmounts','inputFingerprint','licenseIdentity'], release: 'context_fact', stop: 'C0_not_closed' },
  { id: 'p2_board', source: 'C1_independent_physical_snapshot', requires: ['bestFive','physicalRunouts','physicalFilter','fixedDenominator'], release: 'fact_only', stop: 'C1_not_closed' },
  { id: 'p3_range', source: 'C2_reference_policy_plus_C3_range_update', requires: ['perComboFrequency','reachWeight','rangeBefore','rangeAfterByAction','differenceLedger'], release: 'strategy_candidate', stop: 'C2_or_C3_missing' },
  { id: 'p4_compare', source: 'C2_reference_policy_plus_course_policy', requires: ['legalActionMenu','perActionEV','courseVector','policyLoss'], release: 'course_policy_candidate', stop: 'reference_or_policy_missing' },
  { id: 'p5_execute', source: 'ledger_and_action_adapter', requires: ['selectedAction','actualAmount','potAfter','stackAfter','nextActor'], release: 'execution_candidate', stop: 'amount_or_action_right_missing' },
  { id: 'p6_update', source: 'C3_range_update_plus_C4_successor', requires: ['actionConditionedRange','newCardFilter','nextRangeState','successorOrStop'], release: 'continuous_candidate', stop: 'C3_or_C4_missing' },
  { id: 'p7_close', source: 'C5_terminal_and_ledger_closure', requires: ['terminalPolicy','terminalLedger','showdownFact','resultSeparateFromAction'], release: 'close_candidate', stop: 'C5_missing' },
  { id: 'replay', source: 'session-evidence-and-target-report-contract', requires: ['firstAnswerBeforeHelp','routeRecall','errorRecovery','parentRestore'], release: 'trial_candidate', stop: 'trial_missing' },
  { id: 'holdout', source: 'goal-trial-and-target-benchmark-protocol', requires: ['exactlyOneChangedField','heldoutCase','independentScoring','successorOrStop'], release: 'transfer_candidate', stop: 'holdout_missing' }
];

const gates = [
  { id: 'C0', name: 'identity_and_adapter', opens: ['entry','p1_context'], blocks: ['exact_action','course_policy'], current: runbook.currentEvidence.sourceBuildVerified && runbook.currentEvidence.testedActionAdapter ? 'pass_candidate' : 'blocked_adapter' },
  { id: 'C1', name: 'independent_physical_snapshot', opens: ['p2_board','physical_filter'], blocks: ['flop_policy'], current: runbook.currentEvidence.independentC1Recompute ? 'pass_fact_candidate' : 'blocked_fact' },
  { id: 'C2', name: 'flop_reference_policy', opens: ['p3_range','p4_compare'], blocks: ['action_grade','range_after'], current: runbook.currentEvidence.matchedFlopPolicy ? 'pass' : 'blocked_reference' },
  { id: 'C3', name: 'action_conditioned_range_update', opens: ['p6_update'], blocks: ['range_after_lesson'], current: runbook.currentEvidence.actionConditionedRanges ? 'pass' : 'blocked_range_update' },
  { id: 'C4', name: 'turn_successor_closure', opens: ['turn_continuity'], blocks: ['continuous_turn'], current: runbook.currentEvidence.turnSuccessors ? 'pass' : 'blocked_successor' },
  { id: 'C5', name: 'river_terminal_and_ledger_closure', opens: ['p7_close','continuous_three_street'], blocks: ['continuous_lesson','NL50'], current: runbook.currentEvidence.riverTerminalClosure ? 'pass' : 'blocked_terminal' }
];

const resourceDecision = {
  currentStatus: 'resource_blocked_before_C2_solve',
  preflightSource: 'flop-tree-preflight-verification.json',
  compressedEstimateBytes: runbook.gates.find(x => x.id === 'C2').resourceGuard.compressedEstimateBytes,
  conservativeBudgetBytes: runbook.gates.find(x => x.id === 'C2').resourceGuard.conservativeBudgetBytes,
  compressedFits: runbook.gates.find(x => x.id === 'C2').resourceGuard.compressedFits,
  solveStarted: runbook.currentEvidence.solverStarted,
  allowedWhileBlocked: ['C0_adapter_tests','C1_physical_fact_checks','course_screen_and_stop_cards','reference_request_and_license_review'],
  forbiddenWhileBlocked: ['partial_solver_output_as_GTO','action_grade','action_conditioned_range_lesson','continuous_three_street_claim'],
  validPaths: [
    { id: 'A_precomputed_snapshot', requires: ['matchingInputFingerprint','sourceCommit','licenseReview','rawPerComboRows','successorGraph'], result: 'reopen_C2_without_local_solve' },
    { id: 'B_resource_adaptation', requires: ['pinnedBuild','memory_or_compression_change','independent_recompute','newFingerprint'], result: 'rerun_C0_to_C1_then_reassess_C2' },
    { id: 'C_external_reference', requires: ['sameConfiguration','sourceAndLicenseReview','independentRecompute','rawRows'], result: 'reopen_C2_with_external_snapshot' }
  ],
  invalidPaths: ['drop_actions_to_fit_memory','use_neighbor_board','use_finite_model_as_full_reference','use_equity_as_action','silently_change_rake_or_ranges']
};

const out = {
  id: 'FIRST_MATCHED_PACKAGE_RESOURCE_AND_RELEASE_DECISION_V1',
  status: 'a72_first_package_selected_C0_C1_fact_open_C2_resource_blocked_no_strategy_release',
  purpose: '把第一套匹配首手课包的路线、C0-C5依赖和资源停止决策固定下来，防止在求解资源不足时用半成品冒充完整GTO。',
  sources: ['minimal-matched-first-hand-package.json','a72-reference-acquisition-spec.json','a72-c0-c5-execution-runbook.json','first-course-closure-audit.json','unit-reference-snapshot-request-manifest.json','flop-tree-preflight-verification.json'],
  candidate: {
    candidateId: spec.candidateId,
    config: minimal.config,
    reasonSelected: ['C1_independent_snapshot_exists','six_max_100BB_route_anchor','full_flop_turn_river_action_tree_declared','parent_frame_and_holdout_schema_exists'],
    doesNotMean: ['matched_strategy','course_policy','NL50_readiness']
  },
  learnerRoute,
  packageNodes,
  gates,
  resourceDecision,
  firstPassRepresentatives: ['1.5','2.1','3.1','4.5','5.7'],
  releaseDecision: {
    currentIdentity: 'starting_range_fact_or_postflop_demonstration_candidate',
    allowed: ['p1_context_fact','p2_board_fact','physical_filter_demonstration','stop_card'],
    blocked: ['precise_action_grade','action_after_range','continuous_three_street','independent_transfer','NL50_claim']
  },
  currentEvidence: {
    candidateSelected: true,
    configFrozen: true,
    C0SourceBuild: runbook.currentEvidence.sourceBuildVerified,
    C0Adapter: runbook.currentEvidence.testedActionAdapter,
    C1Fact: runbook.currentEvidence.independentC1Recompute,
    C2Reference: runbook.currentEvidence.matchedFlopPolicy,
    C3RangeAfter: runbook.currentEvidence.actionConditionedRanges,
    C4TurnSuccessor: runbook.currentEvidence.turnSuccessors,
    C5RiverClosure: runbook.currentEvidence.riverTerminalClosure,
    resourceFits: resourceDecision.compressedFits,
    coursePolicy: runbook.currentEvidence.coursePolicyCompiled,
    learnerTrial: runbook.currentEvidence.learnerTrial,
    NL50Evidence: runbook.currentEvidence.NL50Evidence
  },
  guards: {
    resourceFailureIsNotPartialGTO: true,
    C1FactIsNotC2Policy: true,
    missingC3BlocksRangeAfterLesson: true,
    missingC4BlocksContinuousTurn: true,
    missingC5BlocksContinuousThreeStreet: true,
    noActionFromEquity: true,
    noNeighborSubstitution: true,
    noNL50Claim: true
  }
};

write('first-matched-package-resource-and-release-decision.json', out);

const md = `# 213｜首个匹配首手课包的资源选择与停止决策

\`\`\`json
{
  "parentDocument": "173_最小匹配首手课包字段与闭合发布合同.md",
  "routeNode": "first_matched_package_resource_and_release_decision",
  "evidenceLevel": "a72_first_package_selected_C0_C1_fact_open_C2_resource_blocked_no_strategy_release",
  "opensChildren": ["first-matched-package-resource-and-release-decision.json", "a72-reference-acquisition-spec.json", "a72-c0-c5-execution-runbook.json"],
  "returnTo": "翻后教学系统_统一总纲.md",
  "currentStatus": "A72_selected_fact_open_reference_resource_blocked"
}
\`\`\`

## 为什么先选 A72

A72 是目前最适合作为第一套完整闭环样板的候选：六人现金桌、100BB、BTN 开池后 BB 防守、A♠7♥2♦ 翻牌，C1 物理范围已经有独立复核，动作树也已经明确声明。它只是“课包候选”，不代表策略已经求解或可以判下注。

## 用户路线和作者闸门必须分开

用户看到的是：局面 → 牌力 → 范围 → 比较 → 执行 → 更新 → 收口 → 回放 → 单变量迁移。作者侧必须先按 C0 到 C5 闭合：输入和动作适配、物理快照、翻牌策略、动作后范围、转牌后继、河牌终局和账本。任何作者闸门没有通过，用户路线就在最近父步骤显示停止卡。

## 当前资源阻断的含义

预检显示翻牌树压缩估计约 5.19GB，高于保守预算约 4.08GB，当前没有开始求解。因此现在允许继续做 C0 适配测试、C1 事实核对、停止卡和参考请求；禁止把局部求解、有限模型、相邻牌面或权益计算当成完整策略。

合法的下一步只有三类：取得完全匹配的预计算快照；改变资源/压缩配置后重新冻结输入并重做 C0/C1；或取得同配置、可复核、许可清楚的外部参考。任何让动作树变小但不重新计算指纹和祖先后继的做法都不能发布。

当前 A72 只能开放事实层和示范层。C2 未通过，不能判精确动作；C3 未通过，不能教动作后范围；C4 未通过，不能教连续转牌；C5 未通过，不能声称三街闭合。机器决策见 [first-matched-package-resource-and-release-decision.json](first-matched-package-resource-and-release-decision.json)。
`;
fs.writeFileSync(path.join(dir, '213_首个匹配首手课包的资源选择与停止决策.md'), md);

console.log(JSON.stringify({
  ok: true,
  status: out.status,
  candidateId: out.candidate.candidateId,
  learnerRouteNodes: learnerRoute.length,
  gates: gates.length,
  compressedEstimateBytes: resourceDecision.compressedEstimateBytes,
  conservativeBudgetBytes: resourceDecision.conservativeBudgetBytes,
  compressedFits: resourceDecision.compressedFits,
  C1Fact: out.currentEvidence.C1Fact,
  C2Reference: out.currentEvidence.C2Reference
}));
