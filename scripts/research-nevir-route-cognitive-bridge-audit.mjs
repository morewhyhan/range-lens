import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');

const state = read('first-pass-state-evidence-crosswalk.json');
const mental = read('first-pass-mental-model-contract.json');
const architecture = read('architecture-replay-contract.json');
const slow = read('slow-single-step-execution-contract.json');
const stopObservation = read('low-baseline-stop-observation-crosswalk.json');
const canonicalRoute = ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7'];
const architectureNodes = ['A1','A2','A3','A4','A5','A6','A7','A8'];
const slowPhases = ['F0_input_freeze','F1_layer_locate','F2_fact','F3_compare','F4_execute','F5_update_or_stop'];

const mapping = {
  L0: { phase: 'outer_context', cognitiveJob: '先知道这是哪张桌、今天只走哪条路线。', architectureNodes: ['A1'], slowPhases: ['F0_input_freeze','F1_layer_locate'], handoff: ['table','trainingGoal','startingStackBB'], replay: '说出桌面、目标、筹码和下一站。' },
  L1: { phase: 'outer_context', cognitiveJob: '把位置、历史、行动者和继续价格锁成当前局面。', architectureNodes: ['A1'], slowPhases: ['F0_input_freeze','F1_layer_locate'], handoff: ['heroSeat','villainSeat','actionHistory','actor','potBB','effectiveStackBB','toCallBB'], replay: '不看标题指出现在谁行动、发生了什么、继续要付多少。' },
  L2: { phase: 'preflop_anchor', cognitiveJob: '在固定图表中找到自己的坐标，不提前猜动作。', architectureNodes: ['A2'], slowPhases: ['F1_layer_locate','F2_fact'], handoff: ['chartIdentity','gridCell','rangeOwner'], replay: '给一个未见位置，指出图表、行列和范围所有者。' },
  L3: { phase: 'preflop_anchor', cognitiveJob: '把坐标格读成课程动作和权重。', architectureNodes: ['A2'], slowPhases: ['F2_fact','F3_compare'], handoff: ['preflopActionIdentity','actionWeight'], replay: '说明该格是哪个动作、权重如何读。' },
  L4: { phase: 'preflop_anchor', cognitiveJob: '把已知牌造成的物理排除和资料未知分开。', architectureNodes: ['A4'], slowPhases: ['F2_fact','F5_update_or_stop'], handoff: ['rangeSnapshotHash','rangeBefore','physicalFilter','denominator'], replay: '指出哪些组合不可能、哪些只是没有资料，并说出停止位置。' },
  p1: { phase: 'postflop_route', cognitiveJob: '进入翻后时先锁行动权、价格和前序范围。', architectureNodes: ['A1'], slowPhases: ['F0_input_freeze','F1_layer_locate'], handoff: ['actor','history','potBB','effectiveStackBB','toCallBB'], replay: '不看标题先指出翻后行动者和继续价格。' },
  p2: { phase: 'postflop_route', cognitiveJob: '先读牌面事实，再读自己的最佳五张和改善牌。', architectureNodes: ['A2','A3'], slowPhases: ['F2_fact'], handoff: ['bestFive','handClass','improvementCards'], replay: '在未见牌面上先说牌型，再说哪些牌会改善；不能跳到下注。' },
  p3: { phase: 'postflop_route', cognitiveJob: '把物理不可能、行动筛选和分母变化分开。', architectureNodes: ['A4'], slowPhases: ['F2_fact','F5_update_or_stop'], handoff: ['rangeBefore','physicalFilter','actionFilterStatus','denominator'], replay: '指出一个组合是被牌面排除还是被行动筛选，并保持同一坐标。' },
  p4: { phase: 'postflop_route', cognitiveJob: '在资料充分时比较合法动作；资料不足时停在政策边界。', architectureNodes: ['A5'], slowPhases: ['F3_compare'], handoff: ['legalActions','price','purpose','policyIdentity'], replay: '先说当前合法选择和价格，再说依据身份；没有依据就选择停止。' },
  p5: { phase: 'postflop_route', cognitiveJob: '把选择落成动作、金额、底池、后手和下一行动者。', architectureNodes: ['A6'], slowPhases: ['F4_execute'], handoff: ['action','amount','potAfter','stacksAfter','nextActor'], replay: '慢速点出动作并核对金额守恒，不能只点按钮。' },
  p6: { phase: 'postflop_route', cognitiveJob: '只指出回应或新牌改变的字段，并找到真实后继或停止。', architectureNodes: ['A7'], slowPhases: ['F5_update_or_stop'], handoff: ['responseOrCard','changedField','rangeAfterOrStop','successorOrStop'], replay: '只改一个字段时说出受影响层和下一步。' },
  p7: { phase: 'postflop_route', cognitiveJob: '把结算、决策结果、错误层和下一次练习入口分开。', architectureNodes: ['A8'], slowPhases: ['F5_update_or_stop'], handoff: ['settlement','decisionResultSeparation','errorLayer','nextEntry'], replay: '说出这手结束在哪里、错在第几层、下一题从哪里开始。' }
};

const stateRows = state.rows.map(row => ({
  stateId: row.stateId,
  frameId: row.frameId,
  phase: mapping[row.stateId].phase,
  cognitiveJob: mapping[row.stateId].cognitiveJob,
  architectureNodes: mapping[row.stateId].architectureNodes,
  slowPhases: mapping[row.stateId].slowPhases,
  centerVisual: row.centerVisual,
  plainQuestion: row.plainQuestion,
  primaryAction: row.primaryAction,
  handoff: row.requiredOutput,
  handoffMeaning: mapping[row.stateId].handoff,
  nextState: row.nextState,
  errorReturn: row.errorReturn,
  replayPrompt: mapping[row.stateId].replay,
  stopCondition: row.stopCondition,
  requiredStopObservation: stopObservation.rows.find(x => x.stateId === row.stateId).requiredAfterAnswer
}));

assert.deepEqual(state.canonicalRoute, canonicalRoute);
assert.deepEqual(stateRows.map(x => x.stateId), canonicalRoute);
assert.equal(stateRows.every(x => x.architectureNodes.length > 0 && x.slowPhases.length > 0), true);
assert.deepEqual([...new Set(stateRows.flatMap(x => x.architectureNodes))].sort(), architectureNodes.sort());
assert.deepEqual([...new Set(stateRows.flatMap(x => x.slowPhases))].sort(), slowPhases.sort());
assert.equal(stateRows.find(x => x.stateId === 'p2').architectureNodes.length, 2);
assert.equal(stateRows.every(x => x.handoff.length > 0), true);
assert.equal(stateRows.every(x => JSON.stringify([...x.handoff].sort()) === JSON.stringify([...state.rows.find(y => y.stateId === x.stateId).requiredOutput].sort())), true);
assert.equal(stateRows.every(x => x.replayPrompt.length > 0), true);
assert.equal(mental.mentalModelContract.outerAndInnerAreOneNestedRoute, true);
assert.equal(architecture.minimumStructureEvidence.length, 4);
assert.equal(slow.hardRules.firstAnswerBeforeHelp, true);

const bridge = {
  id: 'ROUTE_COGNITIVE_SLOW_EXECUTION_BRIDGE_V1',
  status: 'paper_route_cognitive_bridge_closed_runtime_and_trial_missing',
  purpose: '把用户12停点、脑内架构回放、慢速执行协议和首答观察接成一张不可跳步的教学交叉表。',
  sources: ['first-pass-state-evidence-crosswalk.json','first-pass-mental-model-contract.json','architecture-replay-contract.json','slow-single-step-execution-contract.json','low-baseline-stop-observation-crosswalk.json'],
  canonicalRoute,
  architectureNodes,
  slowPhases,
  rows: stateRows,
  releaseSequence: [
    'guided_route_12_stops',
    'outer_inner_order_recall',
    'unseen_layer_location',
    'two_same_parent_error_recoveries',
    'one_variable_holdout_before_explanation',
    'slow_single_step_with_action_or_stop',
    'continuous_route_only_after_successor_and_ledger_checks'
  ],
  rules: {
    all12StopsHaveCognitiveJob: true,
    everyArchitectureNodeIsUsed: true,
    everySlowPhaseIsUsed: true,
    p2ReadsBoardAndHandAsOneVisibleTask: true,
    everyHandoffMatchesStateRequiredOutput: true,
    everyHandoffIsNamedBeforeNextState: true,
    replayRequiresOuterAndInnerLayers: true,
    slowExecutionRequiresFirstAnswerBeforeHelp: true,
    missingPolicyOrSuccessorStopsExactGrade: true,
    buttonOnlyDoesNotPass: true,
    noAggregatePromotion: true
  },
  currentEvidence: {
    paperBridge: true,
    runtimeRouteAttached: false,
    fullGuidedTrial: false,
    architectureReplayObserved: false,
    slowExecutionObserved: false,
    unseenTransferObserved: false,
    continuousThreeStreetObserved: false,
    NL50Evidence: false
  }
};

write('route-cognitive-slow-execution-bridge.json', bridge);

const md = `# 201｜路线—脑内架构—慢执行交叉合同

\`\`\`json
{
  "parentDocument": "187_一遍到目标级的嵌套释放总架构合同.md",
  "routeNode": "route_cognitive_slow_execution_bridge",
  "evidenceLevel": "paper_route_cognitive_bridge_closed_runtime_and_trial_missing",
  "opensChildren": ["route-cognitive-slow-execution-bridge.json", "first-pass-state-evidence-crosswalk.json", "slow-single-step-execution-contract.json"],
  "returnTo": "翻后教学系统_统一总纲.md",
  "currentStatus": "12_stop_cognitive_and_slow_execution_mapping_closed_not_trialed"
}
\`\`\`

## 这份合同解决的具体问题

系统里已经分别写了路线、三层脑内模型、八个架构节点和六段慢执行，但分别存在时，仍可能出现一种假完整：每份文档单独看都合理，用户走到某个停点时却不知道这一停点到底在训练什么、下一步需要什么、回放时怎么证明自己记住了。

201号把它们压成一张逐停点交叉表。每一个 L0—L4、p1—p7 都同时拥有：

- 一个白话认知任务；
- 一个中心视觉和一个主要动作；
- 一个明确的交接字段集合；
- 对应的架构节点和慢执行阶段；
- 一条隐藏标题后的回放问题；
- 一个错误回退和资料不足时的停止边界。

## 用户是怎样从“看懂”走到“能慢慢做”

顺序固定为：

\`\`\`text
跟着走12个停点
→ 先回忆外层 L0—L4，再回忆内层 p1—p7
→ 在3个未见父帧中找到当前层和下一层
→ 在2个父帧各恢复1次错误，不能重新开一题
→ 只改1个字段，先指出受影响层再作答
→ 进入陌生单步，按输入→定位→事实→比较→执行→更新/停止慢慢交付
→ 所有开放节点都有真实后继并通过账本、范围和行动权检查后，才进入连续三街
\`\`\`

这保证“跟完一遍”只建立路线和思考骨架，不会把一次示范误当成策略内化；同时也保证慢执行不是重新背七个按钮，而是沿同一条路线逐层交付结果。

## 关键边界

p2同时承担“牌面关系”和“最佳五张/牌型/改善牌”两个相邻事实节点，但用户看到的是一个连续的读牌任务，不能在读完牌型后直接跳到下注。p3必须把物理排除、行动筛选和分母分开；p4资料不足时停在政策边界；p5必须核对金额和行动权；p6必须给出真实后继或停止原因；p7把结算结果和当时决策分开，留下下一次练习入口。

机器交叉表见 [route-cognitive-slow-execution-bridge.json](route-cognitive-slow-execution-bridge.json)。当前它只证明纸面映射闭合；运行时路线、真人回放、慢速陌生题、连续三街和NL50目标证据仍全部保持未观察状态。
`;
fs.writeFileSync(path.join(dir, '201_路线脑内架构与慢执行交叉合同.md'), md);

console.log(JSON.stringify({
  ok: true,
  status: bridge.status,
  stops: stateRows.length,
  architectureNodes: [...new Set(stateRows.flatMap(x => x.architectureNodes))].length,
  slowPhases: [...new Set(stateRows.flatMap(x => x.slowPhases))].length,
  runtimeRouteAttached: bridge.currentEvidence.runtimeRouteAttached,
  fullGuidedTrial: bridge.currentEvidence.fullGuidedTrial
}));
