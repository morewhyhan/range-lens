import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const file = path.join(dir, 'first-lesson-visible-state-machine.json');
const machine = JSON.parse(fs.readFileSync(file, 'utf8'));
const golden = JSON.parse(fs.readFileSync(path.join(dir, 'first-pass-golden-path.json'), 'utf8'));
const frameById = Object.fromEntries(golden.frames.map(frame => [frame.id, frame]));
const stateToFrame = {
  L0: 'G0_welcome', L1: 'G1_context', L2: 'G2_preflop_chart', L3: 'G3_preflop_action', L4: 'G4_range_bridge',
  p1: 'G5_p1_context', p2: 'G6_p2_hand', p3: 'G7_p3_range', p4: 'G8_p4_compare', p5: 'G9_p5_execute', p6: 'G10_p6_update', p7: 'G11_p7_close'
};

const labels = {
  L0: {
    centerVisual: '六人桌、有效筹码和训练目标',
    primaryAction: '确认桌面与目标',
    stopCondition: '桌面、目标或有效筹码未确认时停在当前层。',
    snapshotFields: ['table', 'trainingGoal', 'startingStackBB']
  },
  L1: {
    centerVisual: '座位、行动箭头、历史、底池和待补金额',
    primaryAction: '点行动者并确认待补',
    stopCondition: '位置、历史、行动者、底池或待补金额不完整时停在当前层。',
    snapshotFields: ['heroSeat', 'villainSeat', 'actionHistory', 'actor', 'potBB', 'effectiveStackBB', 'toCallBB']
  },
  L2: {
    centerVisual: '固定翻前图表与169格坐标',
    primaryAction: '点击当前牌的坐标格',
    stopCondition: '图表身份或格子坐标未确定时停在当前层，不猜动作。',
    snapshotFields: ['chartIdentity', 'gridCell', 'rangeOwner']
  },
  L3: {
    centerVisual: '选中格、动作图例和动作权重',
    primaryAction: '确认格子动作和权重',
    stopCondition: '动作身份、权重或来源缺失时停在当前层。',
    snapshotFields: ['preflopActionIdentity', 'actionWeight']
  },
  L4: {
    centerVisual: '动作前范围、已知牌物理过滤和范围分母',
    primaryAction: '标记物理排除并确认范围分母',
    stopCondition: '范围来源、物理过滤或分母缺失时停在当前层。',
    snapshotFields: ['rangeSnapshotHash', 'rangeBefore', 'physicalFilter', 'denominator']
  },
  p1: {
    centerVisual: '翻后牌桌、行动箭头、底池、后手和待补',
    primaryAction: '确认翻后行动权和价格',
    stopCondition: '翻后行动者、历史、价格或前序范围没有确认时停在当前层。',
    snapshotFields: ['rangeSnapshotHash', 'board', 'holeCards', 'actionHistory', 'actor', 'potBB', 'stacksBB', 'toCallBB']
  },
  p2: {
    centerVisual: '公共牌、底牌、最佳五张和牌力顺序',
    primaryAction: '拼出最佳五张并点牌型',
    stopCondition: '牌面、底牌、最佳五张、牌型或改善牌未确认时停在当前层。',
    snapshotFields: ['board', 'heroHole', 'bestFive', 'handCategory', 'draws', 'improvingCards']
  },
  p3: {
    centerVisual: '同坐标范围前后图、物理排除和分母',
    primaryAction: '点组合并选择变化身份',
    stopCondition: '范围分母、物理过滤或行动筛选身份不完整时停在当前层。',
    snapshotFields: ['rangeBefore', 'blockedCombos', 'physicalRemovalReason', 'rangeBeforeDenominator', 'actionFilterStatus', 'actionAfterOrUnknown', 'denominator']
  },
  p4: {
    centerVisual: '价格、合法动作、动作目的和政策身份',
    primaryAction: '选择有依据的动作或停止',
    stopCondition: '没有匹配参考或明确课程政策时停在当前层，不伪造精确答案。',
    snapshotFields: ['legalActions', 'price', 'courseDecisionCandidate', 'reason', 'policyIdentity']
  },
  p5: {
    centerVisual: '动作按钮、金额、底池后变化和下一行动者',
    primaryAction: '点击动作并确认金额',
    stopCondition: '动作金额、底池、后手或下一行动者不守恒时停在当前层。',
    snapshotFields: ['action', 'amountOrNoBet', 'nextActor', 'ledgerAfter', 'potAfterBB', 'stacksAfterBB']
  },
  p6: {
    centerVisual: '一个变化高亮、动作后范围和真实后继',
    primaryAction: '确认变化并进入真实后继或停止',
    stopCondition: '变化字段、动作后范围、账本或真实后继缺失时停在当前层。',
    snapshotFields: ['changedField', 'rangeAfterOrStopReason', 'successorOrTerminal', 'ledgerAfter']
  },
  p7: {
    centerVisual: '结算账本、决策与结果分栏和路线回放',
    primaryAction: '确认结束原因并选择回退层',
    stopCondition: '结束原因、错误层或单变量迁移字段未表达时停在当前层。',
    snapshotFields: ['oneSentenceReason', 'stopOrSuccessor', 'singleTransferField']
  }
};

const innerIds = new Set(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']);
for (const state of machine.states) {
  const key = state.id;
  const label = labels[key];
  if (!label) throw new Error(`missing visual contract for ${key}`);
  state.stateId = state.id;
  state.parentStateId = innerIds.has(key) ? 'L4' : null;
  const frame = frameById[stateToFrame[key]];
  if (!frame) throw new Error(`missing golden frame for ${key}`);
  state.question = frame.ask;
  state.primaryAction = frame.primaryAction;
  state.plainQuestion = frame.ask;
  state.centerVisual = label.centerVisual;
  state.visibleInputs = [...state.requiredInputs];
  state.requiredOutput = [...state.output];
  state.nextState = state.next;
  state.openChildren = [...state.children];
  state.snapshotFields = label.snapshotFields;
  state.stopCondition = label.stopCondition;
}

const outputAdditions = {
  p6: ['responseOrCard'],
  p7: ['settlement', 'decisionResultSeparation', 'errorLayer', 'nextEntry']
};
for (const [stateId, fields] of Object.entries(outputAdditions)) {
  const state = machine.states.find(x => x.id === stateId);
  state.output = [...new Set([...state.output, ...fields])];
}
machine.handoffContract.requiredVisibleHandoffs.p6 = ['responseOrCard', 'changedField', 'rangeAfterOrStopReason', 'successorOrTerminal', 'ledgerAfter'];
machine.handoffContract.requiredVisibleHandoffs.p7 = ['settlement', 'decisionResultSeparation', 'errorLayer', 'nextEntry', 'oneSentenceReason', 'stopOrSuccessor', 'singleTransferField'];

machine.stateSchema = [
  'stateId', 'parentStateId', 'plainQuestion', 'centerVisual', 'primaryAction',
  'visibleInputs', 'requiredInputs', 'requiredOutput', 'nextState', 'errorReturn',
  'stopReasons', 'stopCondition', 'openChildren', 'snapshotFields'
];
machine.visibleStateContract = {
  oneQuestion: true,
  onePrimaryAction: true,
  oneCenterVisual: true,
  visibleInputsMustBeExplicit: true,
  stopConditionMustBePlainLanguage: true,
  everyInnerStateParentIsL4: true,
  runtimeAttached: false,
  beginnerTrial: false
};

fs.writeFileSync(file, JSON.stringify(machine, null, 2) + '\n');

const required = machine.stateSchema;
const missing = machine.states.flatMap(state => required.filter(field => state[field] === undefined).map(field => `${state.id}.${field}`));
const valid = missing.length === 0 && machine.states.every(state => state.parentStateId === null || state.parentStateId === 'L4');
console.log(JSON.stringify({ ok: valid, id: 'VISIBLE_STATE_FIELD_COMPILE_V1', states: machine.states.length, schemaFields: required.length, missing }));
if (!valid) process.exitCode = 1;

