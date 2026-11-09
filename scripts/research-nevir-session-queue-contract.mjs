import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');

const generator = read('automatic-question-generation-contract.json');
const coverage = read('full-course-coverage-and-release-contract.json');
const state = read('first-pass-state-evidence-crosswalk.json');
const routeBridge = read('unit-canonical-route-bridge.json');
const cognitive = read('route-cognitive-slow-execution-bridge.json');
const release = read('unified-learner-evidence-release-gates.json');

const canonicalRoute = ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7'];
const stages = ['first_pass','map','guided','independent','adjacent','delayed','continuous'];
const priority = [
  'route_repair_same_parent',
  'first_pass_representative',
  'current_unit_release_gap',
  'missing_coverage_pool',
  'adjacent_single_field_transfer',
  'delayed_recall',
  'continuous_integration'
];
const sessionFields = [
  'sessionVersion','sessionId','routeNode','parentSnapshotHash','unitId','queueStage','questionMode',
  'questionId','sourceFingerprint','configurationFingerprint','requestedRatios','coverageBefore',
  'firstAnswer','helpLevel','errorLayer','returnTo','coverageAfter','releaseStatus'
];
const identityKey = ['routeParent','unitId','sourceFingerprint','configurationFingerprint','changedField','entityHand','board','actionState','queueStage'];
const hardFilters = [
  'same_parent_frame',
  'physical_legal',
  'history_pot_stack_actor_consistent',
  'source_identity',
  'successor_or_explicit_stop',
  'exactly_one_changed_field_for_transfer',
  'unique_question_identity',
  'child_parent_lock',
  'visible_inputs_exclude_answer_and_unresolved_policy'
];

assert.deepEqual(state.canonicalRoute, canonicalRoute);
assert.equal(coverage.rows.length, 35);
assert.equal(routeBridge.rows.length, 35);
assert.equal(cognitive.rows.length, 12);
assert.equal(generator.schedulerContract.firstPassMustUseRepresentativeOnly, true);
assert.equal(generator.schedulerContract.repairOverridesUserRatios, true);
assert.equal(generator.schedulerContract.sessionOnly, true);
assert.equal(generator.ratioRules.sumMustEqualOne, true);
assert.equal(generator.ratioRules.missingPoolCannotBeInvented, true);
assert.equal(release.privacy, 'session_only_no_training_database');

const stageTransitions = [
  { from: 'first_pass', to: 'map', requires: ['firstPassRouteComplete','firstAnswerRecorded'] },
  { from: 'map', to: 'guided', requires: ['parentFrameIdentified','plainQuestionRepeated'] },
  { from: 'guided', to: 'independent', requires: ['firstAnswerSaved','requiredOutputComplete','sameParentRestore'] },
  { from: 'independent', to: 'adjacent', requires: ['answerBeforeHelp','errorLayerNamed','retryComplete'] },
  { from: 'adjacent', to: 'delayed', requires: ['exactlyOneChangedField','affectedLayerNamed','sameDenominatorVisual'] },
  { from: 'delayed', to: 'continuous', requires: ['orderRecalled','returnPointRecalled','rangeOrStopRecalled'] },
  { from: 'continuous', to: 'complete', requires: ['ledgerContinuity','rangeSnapshotContinuity','successorOrStop','resultSeparatedFromDecision'] }
];

const queueAlgorithm = [
  'load_session_only_state',
  'lock_current_parent_and_snapshot',
  'if_unresolved_error_then_select_nearest_missing_layer_same_parent',
  'else_if_first_pass_incomplete_then_select_next_representative_route_state',
  'else_select_current_unit_at_current_release_stage',
  'apply_physical_history_source_successor_and_identity_filters_in_order',
  'apply_requested_pool_ratio_without_silent_renormalization',
  'if_pool_empty_emit_unavailable_stop_card',
  'freeze_one_question_package_before_showing_it',
  'record_first_answer_and_stop_reason_before_explanation',
  'on_wrong_answer_return_to_nearest_missing_layer_without_advancing',
  'on_pass_record_coverage_and_release_evidence_then_advance_one_stage_only'
];

const queueContract = {
  id: 'SESSION_QUESTION_QUEUE_CONTRACT_V1',
  status: 'paper_deterministic_session_scheduler_specified_runtime_missing',
  purpose: '把路线、单元释放、题池比例、错误修复和缺资料停止合成一个确定性会话队列，避免随机出题或总分跳层。',
  sources: ['automatic-question-generation-contract.json','full-course-coverage-and-release-contract.json','first-pass-state-evidence-crosswalk.json','unit-canonical-route-bridge.json','route-cognitive-slow-execution-bridge.json','unified-learner-evidence-release-gates.json'],
  canonicalRoute,
  stages,
  priority,
  sessionFields,
  identityKey,
  hardFilters,
  stageTransitions,
  queueAlgorithm,
  ratioPolicy: {
    userEditable: coverage.poolControls.userAdjustable,
    sumMustEqualOne: true,
    exactRequestedRatiosPreserved: true,
    zeroRatioMeansPoolNotScheduled: true,
    unavailablePoolIsNotReplaced: true,
    edgeAndInternalBothRequiredForCoverageClose: true,
    repairQueueOverridesRatios: true,
    defaultRatios: null
  },
  errorPolicy: {
    unknownCountsAsWrong: true,
    wrongDoesNotAdvance: true,
    sameParentAfterError: true,
    firstAnswerPreserved: true,
    helpedRetryNotIndependent: true,
    resultDoesNotChangeDecisionGrade: true
  },
  stopCards: [
    { id: 'STOP_NO_SOURCE_IDENTITY', when: 'sourceIdentityMissing', visible: '资料身份不够，先停在当前层。', returnTo: 'currentParent' },
    { id: 'STOP_NO_POLICY', when: 'coursePolicyAndReferencePolicyMissing', visible: '没有足够依据判定精确动作，先停在当前层。', returnTo: 'currentParent' },
    { id: 'STOP_NO_SUCCESSOR', when: 'successorMissing', visible: '没有合法后继，先停在当前层。', returnTo: 'currentParent' },
    { id: 'STOP_POOL_EMPTY', when: 'requestedPoolEmpty', visible: '当前题池暂不可用，不用邻近题替代。', returnTo: 'currentParent' }
  ],
  currentEvidence: {
    paperContract: true,
    runtimeScheduler: false,
    sessionTrace: false,
    lowBaselineTrial: false,
    matchedReference: false,
    continuousThreeStreet: false,
    NL50Evidence: false
  }
};

write('session-question-queue-contract.json', queueContract);

const md = `# 204｜确定性会话出题与错误回退队列合同

\`\`\`json
{
  "parentDocument": "203_35项全量练习覆盖与嵌套释放计量合同.md",
  "routeNode": "session_question_queue_contract",
  "evidenceLevel": "paper_deterministic_session_scheduler_specified_runtime_missing",
  "opensChildren": ["session-question-queue-contract.json", "automatic-question-generation-contract.json", "full-course-coverage-and-release-contract.json"],
  "returnTo": "翻后教学系统_统一总纲.md",
  "currentStatus": "deterministic_queue_and_stop_cards_specified_not_runtime"
}
\`\`\`

## 为什么必须单独规定队列

覆盖计划只说明“应该练哪些类型”，还不能保证用户下一题出现得有顺序。204号把每次会话的选题优先级固定下来：先修复当前错误，再走首遍代表题，再补当前单元的释放缺口，再做边缘/内部覆盖、单变量迁移、延迟回忆和连续整合。用户设置的比例只影响可用题池中的分布，不能越过错误修复、父帧返回或释放阶段。

## 每次出题的实际顺序

\`\`\`text
锁定当前父帧和快照
→ 如果上一题错了，回到最近缺失层
→ 首遍未完成，只从五个代表题中取下一停点
→ 否则取当前单元当前释放阶段
→ 依次检查物理合法、历史/账本、资料身份、后继、单变量和题目唯一性
→ 按用户比例选择题池；题池为空就显示停止卡
→ 冻结完整题包后才显示题面
→ 先保存首答，再显示解析
→ 答对只前进一级，答错不跳层
\`\`\`

题包必须带有路线父帧、单元、来源指纹、配置指纹、题型、可见输入、主要动作、必需输出、判分身份、范围或停止原因和后继或停止。答案、隐藏频率、未来对手动作和未解决政策不能提前泄露给用户。

## 这套队列怎样保护初学者

它不让用户在35项之间自行找路，也不让总分把缺失的父层或错误回退覆盖掉。用户说“不知道”按错误处理，但仍留在原父帧；解释后的重答只用于修订题面，不算独立通过。整个状态只保存在当前会话，不建立学习者数据库。

机器规范见 [session-question-queue-contract.json](session-question-queue-contract.json)。目前已完成确定性规则和停止卡的纸面定义，运行时调度器、真实题池、比例校准和真人试读仍未完成。
`;
fs.writeFileSync(path.join(dir, '204_确定性会话出题与错误回退队列合同.md'), md);

console.log(JSON.stringify({
  ok: true,
  status: queueContract.status,
  prioritySteps: priority.length,
  hardFilters: hardFilters.length,
  sessionFields: sessionFields.length,
  stageTransitions: stageTransitions.length,
  runtimeScheduler: queueContract.currentEvidence.runtimeScheduler
}));
