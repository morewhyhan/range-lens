import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const bridge = JSON.parse(fs.readFileSync(path.join(dir, 'unit-architecture-bridge.json'), 'utf8'));
const canonical = JSON.parse(fs.readFileSync(path.join(dir, 'learner-goal-route-canonical.json'), 'utf8'));
const practice = JSON.parse(fs.readFileSync(path.join(dir, 'principle-practice-queue.json'), 'utf8'));
const representativeSpec = JSON.parse(fs.readFileSync(path.join(dir, 'first-pass-representative-units.json'), 'utf8'));

const expectedGroups = ['compare.unopened', 'compare.bet', 'compare.raise', 'update.response', 'update.card'];
const expectedRepresentatives = representativeSpec.representatives.map(item => item.unit);
if (expectedRepresentatives.length !== 5) throw new Error('Expected five representative units');
if (bridge.rows.length !== 35) throw new Error(`Expected 35 bridge rows, got ${bridge.rows.length}`);
if (JSON.stringify(bridge.groupOrder) !== JSON.stringify(expectedGroups)) throw new Error('Unexpected group order');
if (canonical.postflopSequentialChain.join(',') !== 'p1_context,p2_board,p3_range,p4_compare,p5_execute,p6_update,p7_close') throw new Error('Canonical postflop chain drifted');

const allUnits = bridge.rows.map((row, index) => ({
  sequence: index + 1,
  unitId: row.unitId,
  label: row.label,
  groupId: row.groupId,
  parentFrame: row.parentFrame,
  returnTo: row.returnTo,
  childOrder: row.childOrder,
  primaryArchitectureNode: row.primaryArchitectureNode,
  prerequisites: row.prerequisiteArchitectureNodes,
  oneQuestion: row.teachingQuestion,
  onePrimaryAction: row.requiredOutputs[0],
  requiredOutputs: row.requiredOutputs,
  outputProjection: row.requiredOutputProjection,
  evidence: row.evidence,
  evidenceIdentity: row.evidenceIdentity,
  releaseIdentity: row.exactGradeRequires,
  missingEvidenceAction: row.missingEvidenceAction,
  stopReason: row.stopReasonWhenMissing,
  opensOnlyFromParent: row.opensOnlyFromParent,
  flatHomeVisible: row.flatHomeVisible,
  firstPassVisible: expectedRepresentatives.includes(row.unitId),
  firstPassRole: expectedRepresentatives.includes(row.unitId) ? 'representative' : 'deferred_child',
  practiceLanes: practice.lanes.map(lane => lane.id),
  currentEvidence: row.currentEvidence
}));

const firstPassUnits = allUnits.filter(unit => unit.firstPassVisible);
const masteryUnits = allUnits;
const groupCounts = Object.fromEntries(expectedGroups.map(group => [group, allUnits.filter(unit => unit.groupId === group).length]));

const output = {
  id: 'FULL_NESTED_LEARNING_ROUTE_V1',
  status: 'paper_full_sequence_compiled_not_trialed',
  purpose: '把外层顺序、首遍代表题和35项完整熟练路线编成同一个可返回的嵌套路由。',
  sources: ['learner-goal-route-canonical.json', 'unit-architecture-bridge.json', 'first-pass-representative-units.json', 'principle-practice-queue.json'],
  outerRoute: canonical.outerRoute.map(step => ({ id: step.id, next: step.next, output: step.output })),
  mainRoute: canonical.postflopSequentialChain,
  firstPass: {
    rule: '先走完整外层和七个翻后父步骤；每个后台组只打开一个代表子题，建立“进入—判断—返回”的结构。',
    sequence: firstPassUnits.map(unit => unit.unitId),
    representativePerGroup: true,
    groupCounts,
    afterEachChild: 'restore_parent_and_continue_main_route',
    doesNotClaim: ['all35_mastery', 'matched_strategy', 'NL50']
  },
  masteryPass: {
    rule: '沿用首遍已经建立的父帧顺序，在同一父帧内按组和组内顺序逐项开放35个子题；不建立35项首页。',
    sequence: masteryUnits.map(unit => unit.unitId),
    groupOrder: expectedGroups,
    allUnitsCount: masteryUnits.length,
    afterEachChild: 'restore_parent_before_next_child',
    noFlatHome: true
  },
  progression: [
    { id: 'map', purpose: '展示当前父步骤、唯一问题和返回点', independent: false },
    { id: 'guided', purpose: '保留必要事实和一个对照', independent: false },
    { id: 'independent', purpose: '隐藏提示，只保留必要输入', independent: true },
    { id: 'adjacent', purpose: '只改变一个字段，检查结构迁移', independent: true },
    { id: 'delayed', purpose: '隔开目标机制后重新召回', independent: true },
    { id: 'continuous', purpose: '串起动作、范围、账本和后继', independent: true }
  ],
  unitFrameContract: {
    oneQuestion: true,
    onePrimaryAction: true,
    oneOpenChildAtATime: true,
    parentRestoredBeforeNextChild: true,
    firstAnswerPreserved: true,
    unknownCountsAsWrong: true,
    missingEvidenceStopsAtUnit: true,
    missingSuccessorStopsContinuousRoute: true,
    strategyIdentityMustBeExplicit: true,
    rangeAfterMustUseSameDenominator: true
  },
  units: allUnits,
  completionEvidence: [
    { id: 'order_recall', evidence: '能在隐藏标题后说出L0→L4和p1→p7顺序', required: 'firstPass' },
    { id: 'parent_return', evidence: '每个子题完成后回到正确父帧，不跳到首页', required: 'firstPass' },
    { id: 'all35_route', evidence: '35项都在同一父帧链中逐项开放且各自有停止原因', required: 'masteryPass' },
    { id: 'one_variable_transfer', evidence: '只改一个字段时能指出需重查的层', required: 'adjacent' },
    { id: 'continuous_integration', evidence: '动作、范围、账本、后继和结果分离地连续传递', required: 'continuous' },
    { id: 'unseen_transfer', evidence: '陌生牌面能沿同一路由找到当前步骤并完成慢速判断', required: 'release' }
  ],
  currentEvidence: {
    routeCompiled: true,
    all35Mapped: true,
    runtimeImplemented: false,
    completeMatchedStrategy: false,
    lowBaselineTrial: false,
    unseenTransfer: false,
    NL50Evidence: false
  }
};

fs.writeFileSync(path.join(dir, 'full-nested-learning-route.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, firstPassUnits: firstPassUnits.length, masteryUnits: masteryUnits.length, groups: groupCounts }));
