import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const userStandard = read('user-standard-requirement-audit.json');
const userScript = read('first-pass-user-facing-script-contract.json');
const visibleState = read('first-lesson-visible-state-machine.json');
const coverage = read('first-pass-screen-coverage-matrix.json');
const principles = read('first-pass-principle-coverage.json');

assert.equal(userStandard.id, 'USER_STANDARD_REQUIREMENT_AUDIT_V1');
assert.equal(userScript.id, 'FIRST_PASS_USER_FACING_SCRIPT_CONTRACT_V1');
assert.equal(visibleState.id, 'FIRST_LESSON_VISIBLE_STATE_MACHINE_V1');
assert.equal(coverage.id, 'FIRST_PASS_SCREEN_COVERAGE_MATRIX_V1');
assert.equal(principles.id, 'FIRST_PASS_PRINCIPLE_COVERAGE_V1');
assert.deepEqual(principles.principles.map(x => x.id), ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10', 'P11', 'P12']);
assert.equal(principles.principles.length, 12);
assert.deepEqual(userStandard.firstPassProtocol.observableChecks.map(x => x.id), [
  'P1_order_followed',
  'P2_hidden_structure_recall',
  'P3_parent_restore',
  'P4_error_return',
  'P5_unseen_slow_execution',
  'P6_continuous_handoff'
]);

const frameIds = new Set(userScript.frameIds);
const stateIds = new Set(visibleState.route);
const coverageIds = new Set(coverage.rows.map(row => row.id));
const requireFrames = (...ids) => ids.forEach(id => assert.ok(frameIds.has(id), `Unknown first-pass frame ${id}`));
const requireStates = (...ids) => ids.forEach(id => assert.ok(stateIds.has(id), `Unknown canonical state ${id}`));
const requireCoverage = (...ids) => ids.forEach(id => assert.ok(coverageIds.has(id), `Missing coverage row ${id}`));

const checks = [
  {
    id: 'P1_order_followed',
    paperFrames: userScript.frameIds.slice(0, 12),
    canonicalStates: userScript.canonicalRoute,
    paperFields: ['allCanonicalStatesVisited', 'orderedRoute', 'noFlatMenuShortcut'],
    minimum: '12个规范状态全部按唯一next链按序到达'
  },
  {
    id: 'P2_hidden_structure_recall',
    paperFrames: ['G12_recall_transfer'],
    canonicalStates: ['L0', 'L1', 'L2', 'L3', 'L4', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
    paperFields: ['routeRecall', 'layerLocation', 'nextHandoffRecalled'],
    minimum: '隐藏标题后能说出外层/内层顺序，并定位至少3个未见层'
  },
  {
    id: 'P3_parent_restore',
    paperFrames: ['G6_p2_hand', 'G8_p4_compare', 'G10_p6_update'],
    canonicalStates: ['p2', 'p4', 'p6'],
    paperFields: ['parentFrameHashBefore', 'parentFrameHashAfter', 'childClosedToSameParent'],
    minimum: '子层关闭后父题牌、历史、金额、首答和主问题保持不变'
  },
  {
    id: 'P4_error_return',
    paperFrames: userScript.frameIds.slice(0, 12),
    canonicalStates: userScript.canonicalRoute,
    paperFields: ['firstAnswerBeforeHelp', 'errorLayer', 'returnTo', 'secondAnswer'],
    minimum: '答错后只补当前缺失事实，并在同一父题重答'
  },
  {
    id: 'P5_unseen_slow_execution',
    paperFrames: ['G12_recall_transfer'],
    canonicalStates: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
    paperFields: ['unseenCase', 'exactlyOneChangedField', 'amountChecked', 'rangeAfterOrStop', 'successorOrStop'],
    minimum: '至少一题匹配参考的未见单步，按局面→牌面→范围→比较→动作→更新完成'
  },
  {
    id: 'P6_continuous_handoff',
    paperFrames: ['G9_p5_execute', 'G10_p6_update', 'G11_p7_close'],
    canonicalStates: ['p5', 'p6', 'p7'],
    paperFields: ['successorOrStopEveryNode', 'ledgerConservation', 'rangeConservation', 'actionRightContinuity'],
    minimum: '只在后继闭合课包中完成翻牌、转牌、河牌连续交接'
  }
];

for (const check of checks) {
  requireFrames(...check.paperFrames);
  requireStates(...check.canonicalStates);
  assert.ok(check.paperFields.length > 0);
}
requireCoverage(...userScript.canonicalRoute);
assert.equal(userScript.frameIds.length, 13);
assert.equal(visibleState.route.length, 12);
assert.equal(coverage.rows.filter(row => userScript.canonicalRoute.includes(row.id)).length, 12);

const result = {
  id: 'FIRST_PASS_STRUCTURE_OBSERVATION_AUDIT_V1',
  status: 'paper_structure_observation_mapped_runtime_and_learner_evidence_missing',
  purpose: '把首遍结构形成的六个观察镜头逐一落到13帧黄金路径和12个规范状态，防止结构要求停留在口号。',
  sources: [
    'user-standard-requirement-audit.json',
    'first-pass-user-facing-script-contract.json',
    'first-lesson-visible-state-machine.json',
    'first-pass-screen-coverage-matrix.json',
    'first-pass-principle-coverage.json'
  ],
  canonicalRoute: userScript.canonicalRoute,
  structuralFrameCount: userScript.frameIds.length,
  principleCount: principles.principles.length,
  principleCoverage: {
    firstIntroductionTotal: principles.coverageCounts.firstIntroductionTotal,
    routeStepsWithPrinciples: Object.keys(principles.coverageCounts).filter(key => key !== 'firstIntroductionTotal'),
    allHaveQuestionVisualHandoffAndTransfer: principles.principles.every(x => x.question && x.visible && x.handoff?.length && x.transferField)
  },
  protocolCheckCount: checks.length,
  checks,
  evidence: {
    paperRoute: true,
    paperFrameMapping: true,
    runtimeTelemetry: false,
    learnerObserved: false,
    matchedReferenceForUnseenExecution: false,
    continuousSuccessorClosure: false,
    targetNL50Evidence: false
  },
  releaseRules: {
    allSixChecksRequiredForStructureClaim: true,
    p5RequiresMatchedReference: true,
    p6RequiresSuccessorClosure: true,
    firstPassDoesNotEqualMastery: true,
    structureDoesNotEqualNL50: true,
    narrativeFramesCannotReplaceStructuralFrames: true
  },
  currentConclusion: '纸面映射已闭合；运行时没有记录六个镜头，且没有低基础学习者首答、未见慢做或连续三街观察，因此不能发布结构形成或NL50声明。'
};

fs.writeFileSync(path.join(dir, 'first-pass-structure-observation-audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  id: result.id,
  status: result.status,
  structuralFrameCount: result.structuralFrameCount,
  protocolCheckCount: result.protocolCheckCount,
  runtimeTelemetry: result.evidence.runtimeTelemetry,
  learnerObserved: result.evidence.learnerObserved
}, null, 2));
