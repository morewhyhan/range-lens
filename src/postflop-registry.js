import { allRules } from './rules.js';
import { assertLessonPackage } from './lesson-package.js';

// These are the only source-backed teaching routes currently present in the
// supplied workbook. A route is a short, replayable teaching fragment; it is
// not a claim that every node has a complete solver successor.
const ROUTES = [
  { id: 'line1', label: 'IP 3bet · 小注后空白转牌', ids: ['I05', 'T01'] },
  { id: 'line2', label: 'IP 3bet · 大注后转牌变化', ids: ['T02', 'T03', 'T04'] },
  { id: 'line3', label: 'IP SRP · 超池后河牌变化', ids: ['T07', 'R07'] },
  { id: 'line4', label: 'OOP 3bet · 过牌加注后转牌', ids: ['O07', 'T08'] },
  { id: 'line5', label: '河牌 · 读牌与执行', ids: ['R01', 'R02', 'R03', 'R05'] },
];

const routeByNode = new Map();
for (const route of ROUTES) {
  route.ids.forEach((nodeId, index) => routeByNode.set(nodeId, {
    routeId: route.id,
    routeLabel: route.label,
    nextNodeId: route.ids[index + 1] ?? null,
    step: index + 1,
    steps: route.ids.length,
  }));
}

function taskIds(rule) {
  const tasks = [];
  if (rule.size != null) tasks.push('size');
  if (rule.direction) tasks.push('action');
  if (rule.frequency) tasks.push('frequency');
  if (rule.hands?.length) tasks.push('hand');
  if (rule.task === 'odds') tasks.push('odds');
  return tasks;
}

function answerAuthority(rule) {
  if (rule.pending) return 'closed';
  return rule.exploit ? 'conditional' : 'course';
}

function rangeContract(rule) {
  const hasExamples = Boolean(rule.hands?.length);
  return {
    // No current source row contains a complete per-combo strategy vector for
    // this node. Keeping this explicit prevents a direction or example hand
    // from being mistaken for a full range policy.
    status: hasExamples ? 'partial_examples_only' : 'not_provided_by_source',
    before: 'inherited_reach_weight',
    operation: 'w_after(h,a) = w_before(h) × policy(a|h,node)',
    required: ['exact per-combo action policy', 'opponent response policy', 'legal board/action filter'],
    display: 'range_change_closed_until_policy_compiled',
  };
}

function successorContract(rule) {
  const route = routeByNode.get(rule.id);
  if (route) {
    return {
      status: route.nextNodeId ? 'teaching_route' : 'teaching_route_terminal',
      routeId: route.routeId,
      routeLabel: route.routeLabel,
      nextNodeId: route.nextNodeId,
      step: route.step,
      steps: route.steps,
    };
  }
  return {
    status: 'source_boundary',
    nextNodeId: null,
    stopReason: rule.pending
      ? '资料明确标注待补，策略题关闭。'
      : '当前来源没有完整后继动作／响应树，只开放本节点已声明的事实或课程动作。',
  };
}

function gtoBindingContract(rule) {
  if (rule.pending) {
    return {
      status: 'closed',
      claim: 'unavailable',
      views: [],
      reason: '源材料待补，不能声称GTO或课程策略。',
    };
  }
  // The current package has no solver output with a frozen, matching input
  // fingerprint. Keep the course rule usable, but make the missing GTO layer
  // explicit so a UI cannot accidentally label it as solver-optimal.
  return {
    status: 'course_only',
    claim: 'course_rule',
    views: ['policy', 'reach_before', 'reach_after', 'delta', 'successor'],
    matched: false,
    solver: null,
    configFingerprint: null,
    reason: '待导入匹配配置的逐组合策略、范围和后继输出。',
  };
}

/**
 * One authoritative coverage record for every source-backed postflop node.
 * The registry deliberately records closed boundaries instead of silently
 * promoting an incomplete source row into a strategy answer.
 */
export const POSTFLOP_REGISTRY = allRules.map(rule => ({
  id: rule.id,
  street: rule.street,
  scenario: rule.scenario,
  category: rule.category,
  source: rule.source,
  authority: answerAuthority(rule),
  available: !rule.pending && taskIds(rule).length > 0,
  condition: rule.condition || null,
  tasks: taskIds(rule),
  gto: gtoBindingContract(rule),
  range: rangeContract(rule),
  successor: successorContract(rule),
  closedReason: rule.pending ? '源材料明确标注【资料待补】。' : null,
}));

export const POSTFLOP_COVERAGE = Object.freeze({
  total: POSTFLOP_REGISTRY.length,
  available: POSTFLOP_REGISTRY.filter(x => x.available).length,
  course: POSTFLOP_REGISTRY.filter(x => x.authority === 'course').length,
  conditional: POSTFLOP_REGISTRY.filter(x => x.authority === 'conditional').length,
  closed: POSTFLOP_REGISTRY.filter(x => x.authority === 'closed').length,
  closedIds: POSTFLOP_REGISTRY.filter(x => x.authority === 'closed').map(x => x.id),
});

// The source registry is also the first static lesson package. It intentionally
// contains course/conditional boundaries but no invented solver output.
export const POSTFLOP_LESSON_PACKAGE = Object.freeze({
  packageId: 'postflop-source-v1',
  version: '1.0.0',
  config: Object.freeze({
    tableSize: 6,
    stackBb: 100,
    activePlayers: 'source_node_scope',
    solverReference: 'not_loaded',
  }),
  nodes: Object.freeze(Object.fromEntries(POSTFLOP_REGISTRY.map(node => [node.id, {
    nodeId: node.id,
    evidenceKind: node.authority === 'closed' ? 'closed' : node.authority === 'conditional' ? 'conditional' : 'course_only',
    sourceRefs: [node.source],
    gtoBinding: node.gto,
    chartEvidence: { available: [], note: '尚未导入逐组合策略；不显示伪精确范围图。' },
    successor: node.successor,
    range: node.range,
    closedReason: node.closedReason,
  }]))),
  // A first concrete course-only teaching item. It is deliberately a source
  // rule, not a solver answer; importing a solver later must replace this
  // identity rather than silently changing its meaning.
  questions: [{
    instanceKey: 'I12-action-course-v1',
    nodeId: 'I12',
    evidenceKind: 'course_only',
    prompt: '356 两同花、IP 3bet 底池，这个课程节点先做什么？',
    options: [{ id: 'check', label: '先整体过牌' }, { id: 'bet', label: '先下注' }],
    interaction: 'single',
    available: true,
  }],
  answerKeys: [{
    questionKey: 'I12-action-course-v1',
    accepted: 'check',
    sourceRefs: ['01 有位置3bet · B39 / D39 / E39'],
    precision: { kind: 'exact_course_rule', label: '课程动作原样判分' },
    explanation: { text: '本例先整体过牌，保留手牌权益，到转牌重新判断。' },
    nextNodeOrStop: 'source_boundary',
  }],
});

assertLessonPackage(POSTFLOP_LESSON_PACKAGE);

export function assertPostflopRegistry() {
  if (POSTFLOP_COVERAGE.total !== 58) throw new Error(`翻后来源节点数变化：${POSTFLOP_COVERAGE.total}`);
  if (POSTFLOP_COVERAGE.available !== 53) throw new Error(`开放翻后节点数变化：${POSTFLOP_COVERAGE.available}`);
  if (POSTFLOP_COVERAGE.closed !== 5) throw new Error(`关闭翻后节点数变化：${POSTFLOP_COVERAGE.closed}`);
  if (POSTFLOP_COVERAGE.closedIds.join(',') !== 'O01,O02,S06,P01,P07') throw new Error('资料待补节点集合变化');
  for (const node of POSTFLOP_REGISTRY) {
    if (!node.id || !node.source || !node.authority || !node.successor || !node.range) {
      throw new Error(`翻后节点登记不完整：${node.id}`);
    }
    if (node.available && !node.tasks.length) throw new Error(`开放节点没有可判分任务：${node.id}`);
    if (!node.available && node.authority !== 'closed') throw new Error(`不可用节点权限错误：${node.id}`);
    if (node.authority === 'closed' && node.gto.status !== 'closed') throw new Error(`关闭节点GTO权限错误：${node.id}`);
    if (node.available && node.gto.status === 'matched') throw new Error(`当前包意外声称已有匹配GTO：${node.id}`);
  }
  return POSTFLOP_COVERAGE;
}

