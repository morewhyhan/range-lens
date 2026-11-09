import { card } from './poker.js';
import { charts } from './preflop.js';
import { POSTFLOP_REGISTRY } from './postflop-registry.js';

/**
 * The first lesson is intentionally a small deterministic route.  It is an
 * adapter around the existing chart/rule data, not a second strategy engine.
 * The route is useful even while exact postflop solver snapshots are closed:
 * facts and course policy remain teachable, while unsupported range claims
 * stop explicitly.
 */
export const GOLDEN_ROUTE = [
  'G0_welcome', 'G1_context', 'G2_preflop_chart', 'G3_preflop_action',
  'G4_range_bridge', 'G5_p1_context', 'G6_p2_hand', 'G7_p3_range',
  'G8_p4_compare', 'G9_p5_execute', 'G10_p6_update', 'G11_p7_close',
  'G12_recall_transfer',
];

export const GOLDEN_HAND = 'AKo';
export const GOLDEN_CHART = charts.find(chartItem => chartItem.id === 'threebet-BTN') || charts[0];
export const GOLDEN_HOLE = ['Ah', 'Kc'].map(card);
export const GOLDEN_BOARD = ['Ks', 'Th', '5d'].map(card);
export const GOLDEN_TURN_BOARD = [...GOLDEN_BOARD, card('2d')];
export const GOLDEN_SOURCE_NODE = POSTFLOP_REGISTRY.find(node => node.id === 'T01');
export const GOLDEN_SUCCESSOR = Object.freeze({
  nodeId: 'T01-前序',
  sourceNodeId: GOLDEN_SOURCE_NODE?.id || 'T01',
  status: 'teaching_route',
  routeId: GOLDEN_SOURCE_NODE?.successor?.routeId || 'line1',
  nextNodeId: GOLDEN_SOURCE_NODE?.id || 'T01',
  step: 1,
  steps: 2,
});
export const GOLDEN_TABLE = Object.freeze({
  players: 6,
  effectiveStackBB: 100,
  heroSeat: 'BTN',
  villainSeat: 'CO',
  actor: 'BTN',
  potBB: 18,
  toCallBB: 0,
  history: ['CO 开池 2.5BB', 'BTN 3bet 到 8BB', 'CO 跟注', 'CO 翻牌过牌'],
});

export const HAND_RANK_ORDER = Object.freeze([
  '高牌', '一对', '两对', '三条', '顺子', '同花', '葫芦', '四条', '同花顺',
]);

export const GOLDEN_OUTPUT_FIELDS = Object.freeze({
  G0_welcome: ['table', 'trainingGoal', 'startingStackBB'],
  G1_context: ['heroSeat', 'actionHistory', 'actor', 'potBB', 'toCallBB'],
  G2_preflop_chart: ['chartIdentity', 'gridCell', 'rangeOwner'],
  G3_preflop_action: ['preflopActionIdentity', 'actionWeight'],
  G4_range_bridge: ['rangeSnapshotHash', 'physicalFilter', 'denominator'],
  G5_p1_context: ['actor', 'actionHistory', 'potBB', 'toCallBB'],
  G6_p2_hand: ['board', 'heroHole', 'handCategory', 'bestFive', 'improvingCards'],
  G7_p3_range: ['blockedCombos', 'physicalRemovalReason', 'actionFilterStatus', 'denominator'],
  G8_p4_compare: ['legalActions', 'price', 'courseDecisionCandidate', 'policyIdentity'],
  G9_p5_execute: ['selectedAction', 'amountBB', 'potAfterBB', 'stacksAfterBB', 'nextActor'],
  G10_p6_update: ['changedField', 'rangeAfterOrUnknown', 'successorOrTerminal'],
  G11_p7_close: ['settlementOrBoundary', 'decisionResultSeparation', 'errorLayer'],
  G12_recall_transfer: ['outerRoute', 'innerRoute', 'parentFrame', 'oneVariableTransfer'],
});

export const GOLDEN_HANDOFFS = Object.freeze(GOLDEN_ROUTE.map((id, index) => ({
  from: id,
  to: GOLDEN_ROUTE[index + 1] || 'next_session_or_stop',
  outputFields: GOLDEN_OUTPUT_FIELDS[id],
})));

const courseSource = '课程路线 line1 · T01 的 KT5 翻牌 B33 前序 · 05 转牌路线 · B8 / D8 / E8';
const chartEntry = GOLDEN_CHART.hands[GOLDEN_HAND];

export const GOLDEN_FRAMES = Object.freeze([
  {
    id: 'G0_welcome',
    title: '先把这一手牌摆清楚',
    question: '这是一张什么桌，今天只练哪一条路线？',
    primaryAction: '确认桌面并开始',
    kind: 'table',
    answer: 'start',
    options: [{ id: 'start', label: '6人现金桌 · 100BB · 只练这一手' }],
    source: '产品定义：六人现金桌、100BB、首遍双层路线',
    evidenceKind: 'fact_only',
    output: 'tableFrame',
    explanation: '先固定桌型、有效筹码和今天的学习范围；没有这些条件，后面的金额和行动顺序都没有参照。',
  },
  {
    id: 'G1_context',
    title: '先看现在发生什么',
    question: '现在轮到谁？前面发生了什么？要继续要付多少钱？',
    primaryAction: '确认行动者',
    kind: 'context',
    answer: 'BTN',
    options: [{ id: 'BTN', label: 'BTN（你） · 现在轮到你，待补 0BB' }, { id: 'CO', label: 'CO（对手）' }],
    source: '首遍主线 G1 · 行动历史和账本事实',
    evidenceKind: 'fact_only',
    output: 'contextFrame',
    explanation: 'CO已经翻牌过牌，行动回到BTN；当前没有待补金额，因此下一步先读牌，不先猜下注。',
  },
  {
    id: 'G2_preflop_chart',
    title: '先找到自己的坐标',
    question: '我的牌在这张图的哪一格？先只找到坐标。',
    primaryAction: '点击 AKo 的格子',
    kind: 'chart',
    answer: 'cell',
    options: [{ id: 'cell', label: `AKo · 第 ${chartEntry.row + 1} 行第 ${chartEntry.col + 1} 列` }],
    source: `翻前图表 ${GOLDEN_CHART.id} · ${GOLDEN_CHART.source}`,
    evidenceKind: 'course_only',
    output: 'preflopCell',
    explanation: '这一帧只确认图表、位置和坐标，不把翻前格子直接解释成翻后下注策略。',
  },
  {
    id: 'G3_preflop_action',
    title: '再读这个格子的动作',
    question: '这个格子代表什么翻前课程动作？权重是多少？',
    primaryAction: '确认动作和权重',
    kind: 'action',
    answer: 'raise',
    options: [{ id: 'raise', label: '3bet · 100%' }, { id: 'fold', label: '弃牌 · 0%' }, { id: 'mix', label: '混合动作 · 50/50' }],
    source: `翻前图表 ${GOLDEN_CHART.id} · ${GOLDEN_HAND} 的动作向量`,
    evidenceKind: 'course_only',
    output: 'preflopAction',
    explanation: 'AKo 在这张3bet图中是 raise=1；这是图表给定的课程频率，不额外推导未知动作。',
  },
  {
    id: 'G4_range_bridge',
    title: '把物理排除和行动筛选分开',
    question: '哪些组合因为已知牌不可能？哪些只是还没有资料？',
    primaryAction: '标记一组物理排除',
    kind: 'range',
    answer: 'physical',
    options: [{ id: 'physical', label: 'AhKc 已在你手里：对手不可能拿这组牌' }, { id: 'action', label: '对手行动后这组牌变少' }, { id: 'unknown', label: '把没有资料当成平均权重' }],
    source: '首遍主线 G4 · 已知牌物理过滤；没有逐组合动作后范围',
    evidenceKind: 'fact_only',
    output: 'startingRangeFrame',
    explanation: 'AhKc 的移除是实体牌约束，不能把它说成对手行动筛选。行动后的精确权重在当前资料中没有提供，因此到这里明确停住。',
  },
  {
    id: 'G5_p1_context',
    title: '翻牌后再确认一次行动权',
    question: '翻牌后现在轮到谁？继续需要多少钱？',
    primaryAction: '确认行动权和价格',
    kind: 'context',
    answer: 'BTN',
    options: [{ id: 'BTN', label: 'BTN（你） · 过牌后没有待补金额' }, { id: 'CO', label: 'CO（对手） · 仍在行动' }],
    source: 'T01 前序的局面事实 · IP 3bet 底池',
    evidenceKind: 'fact_only',
    output: 'contextCard',
    explanation: 'CO已经完成过牌，BTN有位置并且待补为0；行动事实和策略结论要分开。',
  },
  {
    id: 'G6_p2_hand',
    title: '再看我的牌现在多大',
    question: '我现在能组成的最好五张是什么？下一张可能怎样改善？',
    primaryAction: '确认牌型',
    kind: 'hand',
    answer: 'pair',
    options: [{ id: 'pair', label: '一对K，A踢脚' }, { id: 'high-card', label: 'A高' }, { id: 'two-pair', label: '两对' }],
    source: '标准牌力枚举 · 当前公共牌和底牌',
    evidenceKind: 'fact_only',
    output: 'handCard',
    explanation: 'AhKc 与 KsTh5d 组成一对K，A是最高踢脚；这只确认牌力，不直接决定下注。',
  },
  {
    id: 'G7_p3_range',
    title: '看范围发生了哪一种变化',
    question: '哪些组合不可能、变少或留下？这里是物理变化还是行动变化？',
    primaryAction: '选择变化身份',
    kind: 'range',
    answer: 'physical',
    options: [{ id: 'physical', label: '已知牌造成物理排除' }, { id: 'action', label: '动作后权重变少' }, { id: 'closed', label: '精确行动后范围未提供，停止' }],
    source: '课程范围合同：range_change_closed_until_policy_compiled',
    evidenceKind: 'closed',
    output: 'rangeDeltaCard',
    explanation: '本题可以确定物理排除；资料没有逐组合行动概率，所以不把整体颜色图伪装成动作后范围。',
  },
  {
    id: 'G8_p4_compare',
    title: '比较当前有依据的动作',
    question: '在当前资料下，现在有哪些合法选择？每个选择解决什么问题？',
    primaryAction: '选择课程动作',
    kind: 'policy',
    answer: '33',
    options: [{ id: '33', label: '按 T01 前序下注 33% 底池' }, { id: '67', label: '下注 67% 底池' }, { id: 'gto', label: '把它称为精确GTO最优' }],
    source: courseSource,
    evidenceKind: 'course_only',
    output: 'choiceCard',
    explanation: 'T01明确给出了KT5翻牌的B33前序，故本题答案是33%课程动作；它不是匹配求解器的GTO频率。',
  },
  {
    id: 'G9_p5_execute',
    title: '把动作和账本做完整',
    question: '点哪个按钮？投入多少？行动接下来给谁？',
    primaryAction: '确认金额',
    kind: 'money',
    answer: '6',
    options: [{ id: '6', label: '下注 6BB（底池18BB的33%）' }, { id: '0', label: '过牌 0BB' }, { id: '12', label: '下注 12BB' }],
    source: '底池与筹码守恒公式：18 × 33% = 6BB',
    evidenceKind: 'fact_only',
    output: 'ledgerCard',
    explanation: '下注后底池为24BB，BTN后手为94BB；行动回到CO。金额和行动权都由账本计算。',
  },
  {
    id: 'G10_p6_update',
    title: '动作后只更新改变的那一项',
    question: '对手回应后，具体改变了什么？下一步接哪里？',
    primaryAction: '确认变化字段',
    kind: 'update',
    answer: 'history',
    options: [{ id: 'history', label: '行动历史和待补金额改变' }, { id: 'board', label: '公共牌立刻改变' }, { id: 'range', label: '直接得到精确动作后范围' }],
    source: 'T01 前序合同 · line1：T01-前序 → T01；精确范围仍关闭',
    evidenceKind: 'closed',
    output: 'changeCard',
    explanation: '对手跟注并发出空白转牌2♦后，进入资料明确的T01节点；行动后逐组合范围没有被补写。',
  },
  {
    id: 'G11_p7_close',
    title: '在资料边界收束这一手牌',
    question: '这手牌到哪里结束？如果错了，错在第几层？',
    primaryAction: '确认停止位置',
    kind: 'close',
    answer: 'boundary',
    options: [{ id: 'boundary', label: '在T01入口收束，下一段再练转牌动作' }, { id: 'winloss', label: '用输赢倒推刚才的动作' }, { id: 'solver', label: '没有配置也显示GTO答案' }],
    source: 'line1 教学段边界 · T01 后续动作另起一帧练习',
    evidenceKind: 'closed',
    output: 'reviewCard',
    explanation: '结果不能替代决策依据；本首遍在T01入口收束，下一段再练转牌75%课程动作，并保留错误层供回看。',
  },
  {
    id: 'G12_recall_transfer',
    title: '最后把路线说出来',
    question: '先说外层路线，再说翻后七步；陌生变化要回哪一层？',
    primaryAction: '复述双层路线',
    kind: 'recall',
    answer: 'route',
    options: [{ id: 'route', label: '外层定位 → 翻前图表 → 范围桥 → 翻后 p1–p7；变化回对应父层' }, { id: 'menu', label: '打开全部练习菜单再凭感觉选' }, { id: 'result', label: '只记住最后输赢' }],
    source: '首遍黄金路径 G0–G12 · 双层路线回忆与单变量迁移',
    evidenceKind: 'course_only',
    output: 'nestedStructureEvidence',
    explanation: '首遍要记住的是可执行路线：看清现在、比较选择、做出动作、更新后再看；陌生变化回到发生变化的父层。',
  },
]);

// The first source-backed successor is kept in the same shell as the first
// pass.  It is deliberately small: T01 gives a course action and two named
// hand roles, but it does not provide a complete per-combo strategy vector.
export const T01_ROUTE = Object.freeze([
  'T01_0_turn_context',
  'T01_1_size',
  'T01_2_hand_role',
  'T01_3_boundary',
]);

export const T01_FRAMES = Object.freeze([
  {
    id: 'T01_0_turn_context',
    title: '先确认转牌局面',
    question: '翻牌 B33 被跟、转牌 2♦ 对手过牌后，现在轮到谁？',
    primaryAction: '确认行动权',
    kind: 'turn',
    answer: 'BTN',
    options: [{ id: 'BTN', label: 'BTN（你） · 现在轮到你' }, { id: 'CO', label: 'CO（对手）' }],
    source: '05 转牌路线 · B8 / D8 / E8 · T01',
    evidenceKind: 'fact_only',
    output: 'turnContext',
    explanation: '翻牌下注被跟，转牌对手过牌，行动回到有位置的 BTN。先确认行动权，再读课程动作。',
  },
  {
    id: 'T01_1_size',
    title: '再读这一张转牌的课程尺寸',
    question: 'T01 把这一张空白转牌的第二枪固定练成多大？',
    primaryAction: '选择课程尺寸',
    kind: 'policy',
    answer: '75',
    options: [{ id: '75', label: '75% 底池' }, { id: '33', label: '33% 底池' }, { id: '100', label: '100% 底池' }],
    policyTitle: 'T01 · 课程第二枪',
    policySize: 75,
    source: '05 转牌路线 · B8 / D8 / E8 · T01',
    evidenceKind: 'course_only',
    output: 'turnSize',
    explanation: '资料给出 B70～B100；为了练习固定取 75%。这是课程简化尺寸，不是匹配求解器频率。',
  },
  {
    id: 'T01_2_hand_role',
    title: '最后区分手牌任务',
    question: '哪一手牌是资料明确写出的强价值候选？',
    primaryAction: '选择手牌角色',
    kind: 'hand-task',
    answer: 'AA',
    options: [{ id: 'AA', label: 'AA · 强价值候选' }, { id: 'QQ', label: 'QQ · 中等摊牌，不自动第二枪' }, { id: 'any', label: '所有手牌都自动第二枪' }],
    source: '05 转牌路线 · T01 choices',
    evidenceKind: 'course_only',
    output: 'turnHandRole',
    explanation: '资料明确给出 AA 为强价值候选、QQ 为中等摊牌不自动第二枪；没有完整组合频率，不能扩展成全范围答案。',
  },
  {
    id: 'T01_3_boundary',
    title: '在证据边界停止',
    question: 'T01 是否提供了完整的逐组合下注频率和后续响应树？',
    primaryAction: '确认资料边界',
    kind: 'close',
    answer: 'closed',
    options: [{ id: 'closed', label: '没有，保留课程动作并停止' }, { id: 'matched', label: '有，可以直接称为精确 GTO' }, { id: 'guess', label: '按牌力自行补齐频率' }],
    source: 'T01 节点登记 · range_change_closed_until_policy_compiled',
    evidenceKind: 'closed',
    output: 'turnBoundary',
    explanation: 'T01 只开放课程动作和两个手牌角色示例；逐组合频率、动作后范围与真实响应树尚未提供，因此在这里停止，不猜。',
  },
]);

export const ROUTE_FRAMES = Object.freeze({
  golden: GOLDEN_FRAMES,
  t01: T01_FRAMES,
});

export const ROUTE_IDS = Object.freeze({
  golden: GOLDEN_ROUTE,
  t01: T01_ROUTE,
});

const FRAME_BY_ROUTE = new Map(Object.entries(ROUTE_FRAMES).map(([route, frames]) => [route, new Map(frames.map(frame => [frame.id, frame]))]));

function framesFor(route = 'golden') {
  return ROUTE_FRAMES[route] || ROUTE_FRAMES.golden;
}

function idsFor(route = 'golden') {
  return ROUTE_IDS[route] || ROUTE_IDS.golden;
}

export function frameAt(index, route = 'golden') {
  const frames = framesFor(route);
  return frames[Math.max(0, Math.min(index, frames.length - 1))];
}

export function frameById(id, route = 'golden') {
  return FRAME_BY_ROUTE.get(route)?.get(id) || FRAME_BY_ROUTE.get('golden').get(id);
}

export function createGoldenSession(route = 'golden') {
  return {
    route: ROUTE_FRAMES[route] ? route : 'golden',
    frameIndex: 0,
    score: { right: 0, wrong: 0 },
    answers: [],
    lastResult: null,
    child: null,
    status: 'active',
  };
}

export function currentGoldenFrame(session) {
  return frameAt(session.frameIndex, session.route);
}

export function answerGolden(session, answer) {
  if (!session || session.status === 'complete') return session;
  if (session.lastResult && !session.lastResult.correct) return session;
  const frame = currentGoldenFrame(session);
  const value = String(answer);
  const correct = value !== '__unknown__' && value === frame.answer;
  const record = { frameId: frame.id, answer: value, correct };
  if (!correct) {
    return {
      ...session,
      score: { ...session.score, wrong: session.score.wrong + 1 },
      answers: [...session.answers, record],
      lastResult: { ...record, expected: frame.answer, explanation: frame.explanation },
    };
  }
  const routeFrames = framesFor(session.route);
  const nextIndex = session.frameIndex + 1;
  return {
    ...session,
    frameIndex: Math.min(nextIndex, routeFrames.length - 1),
    score: { ...session.score, right: session.score.right + 1 },
    answers: [...session.answers, record],
    lastResult: { ...record, explanation: frame.explanation },
    status: nextIndex >= routeFrames.length ? 'complete' : 'active',
  };
}

export function clearGoldenResult(session) {
  return session?.lastResult ? { ...session, lastResult: null } : session;
}

export function advanceGoldenAfterError(session) {
  if (!session?.lastResult || session.lastResult.correct) return session;
  const routeFrames = framesFor(session.route);
  const nextIndex = session.frameIndex + 1;
  return {
    ...session,
    frameIndex: Math.min(nextIndex, routeFrames.length - 1),
    lastResult: null,
    status: nextIndex >= routeFrames.length ? 'complete' : 'active',
  };
}

export function openGoldenChild(session, childId = 'hand-rank-ladder') {
  if (session?.status === 'complete') return session;
  return { ...session, child: { id: childId, parentFrameId: currentGoldenFrame(session).id, selected: [] } };
}

export function closeGoldenChild(session) {
  return session?.child ? { ...session, child: null } : session;
}

export function selectGoldenChild(session, rank) {
  if (!session?.child) return session;
  const selected = [...session.child.selected, rank].filter((value, index, values) => values.indexOf(value) === index);
  return { ...session, child: { ...session.child, selected } };
}

export function goldenRouteAudit() {
  return routeAudit('golden');
}

export function routeAudit(route = 'golden') {
  const frames = framesFor(route);
  const routeIds = idsFor(route);
  const ids = frames.map(frame => frame.id);
  const frameMap = FRAME_BY_ROUTE.get(route) || FRAME_BY_ROUTE.get('golden');
  const missing = routeIds.filter(id => !frameMap.has(id));
  const duplicate = ids.filter((id, index) => ids.indexOf(id) !== index);
  const wrongOrder = routeIds.join('|') !== ids.join('|');
  const invalidAnswers = frames.filter(frame => !frame.answer || !frame.options.some(option => option.id === frame.answer));
  const missingOutputs = frames.filter(frame => !frame.output && !GOLDEN_OUTPUT_FIELDS[frame.id]?.length).map(frame => frame.id);
  return { ok: !missing.length && !duplicate.length && !wrongOrder && !invalidAnswers.length && !missingOutputs.length, missing, duplicate, wrongOrder, invalidAnswers: invalidAnswers.map(frame => frame.id), missingOutputs };
}

