import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const route = read('full-nested-learning-route.json');
const manifest = read('unit-course-manifest.json');
const architecture = read('unit-architecture-bridge.json');
const canonical = read('unit-canonical-route-bridge.json');
const release = read('unit-learner-release-matrix.json');
const errors = read('unit-error-feedback-matrix.json');
const outcomes = read('unit-outcome-matrix.json');
const representativeIds = new Set(route.firstPass.sequence);
const byId = (rows) => new Map(rows.map((row) => [row.unitId, row]));
const architectureById = byId(architecture.rows);
const canonicalById = byId(canonical.rows);
const releaseById = byId(release.rows);
const errorById = byId(errors.rows);
const outcomeById = byId(outcomes.rows);
const routeUnitById = byId(route.units);

const expectedGroups = [
  'compare.unopened',
  'compare.bet',
  'compare.raise',
  'update.response',
  'update.card'
];

const units = manifest.rows.map((row) => {
  const id = row.unitId;
  const a = architectureById.get(id);
  const c = canonicalById.get(id);
  const r = releaseById.get(id);
  const e = errorById.get(id);
  const o = outcomeById.get(id);
  const ru = routeUnitById.get(id);
  const missingCanonicalFields = Object.entries(row.compilerFields?.presence ?? {})
    .filter(([, status]) => status === 'missing')
    .map(([field]) => field);

  return {
    sequence: row.sequence,
    unitId: id,
    label: row.label,
    groupId: row.route.groupId,
    groupOrder: row.route.groupOrder,
    childOrder: row.route.childOrder,
    userParent: c.canonicalParentState,
    returnTo: c.canonicalReturnState,
    primaryQuestion: row.learningContract.question,
    primaryAction: ru?.onePrimaryAction ?? 'answer_primary_question',
    requiredOutputs: row.learningContract.requiredOutputs,
    handoff: {
      nextArchitectureNode: a.nextArchitectureNode,
      outputProjection: a.requiredOutputProjection,
      successorOrStop: 'rangeAfterOrStopReason'
    },
    errorReturn: {
      primaryErrorLayer: e.primaryErrorLayer,
      allowedLayers: e.allowedErrorLayers,
      returnStep: e.returnTo,
      retrySequence: e.feedbackSequence
    },
    firstPassRepresentative: representativeIds.has(id),
    firstPassRole: representativeIds.has(id) ? 'one_child_demo' : 'deferred_child',
    release: {
      currentLevel: r.currentLevel,
      nextCompilationPhase: r.nextCompilationPhase,
      exactGradeRequires: a.exactGradeRequires,
      missingEvidenceAction: a.missingEvidenceAction,
      stopReason: a.stopReasonWhenMissing,
      requiredForIndependent: r.requiredForIndependent,
      transferRequired: row.learningContract.transfer.required,
      transferStatus: row.learningContract.transfer.status
    },
    source: {
      evidence: a.evidence,
      identity: a.evidenceIdentity,
      localMaterial: a.localMaterial,
      sourceScopedStatus: row.inputIdentity.sourceScopedStatus
    },
    canonicalFieldsMissing: missingCanonicalFields,
    currentEvidence: {
      strategyReady: r.currentEvidence.strategyReady,
      learnerTrial: r.currentEvidence.learnerTrial,
      unseenTransfer: r.currentEvidence.unseenTransfer,
      continuousReady: r.currentEvidence.continuousReady,
      outcomeStatus: o.currentEvidence.status
    },
    guards: {
      oneQuestion: r.invariants.oneQuestion,
      onePrimaryAction: r.invariants.onePrimaryAction,
      opensOnlyFromParent: r.invariants.opensOnlyFromParent,
      returnsToSameParent: r.invariants.returnsToSameParent,
      unknownCountsAsWrong: r.invariants.unknownCountsAsWrong,
      missingEvidenceStops: r.invariants.missingEvidenceStops,
      flatHomeVisible: c.flatHomeVisible
    }
  };
});

const duplicateIds = units.map((row) => row.unitId).filter((id, index, all) => all.indexOf(id) !== index);
const groupCounts = Object.fromEntries(expectedGroups.map((group) => [
  group,
  units.filter((row) => row.groupId === group).length
]));
const routeStateIds = route.outerRoute.map((state) => state.id);
const requiredRouteStateIds = ['L0', 'L1', 'L2', 'L3', 'L4', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
const structuralChecks = {
  canonicalRouteExact: JSON.stringify(routeStateIds) === JSON.stringify(requiredRouteStateIds),
  nestedOuterToInner: route.outerRoute.find((state) => state.id === 'L4')?.next === 'p1',
  all35Mapped: units.length === 35 && duplicateIds.length === 0,
  allFiveGroupsPresent: expectedGroups.every((group) => groupCounts[group] > 0),
  allUnitsHaveOneParent: units.every((row) => Boolean(row.userParent)),
  allUnitsReturnToSameParent: units.every((row) => row.userParent === row.returnTo),
  allUnitsHaveOneQuestion: units.every((row) => typeof row.primaryQuestion === 'string' && row.primaryQuestion.length > 0),
  allUnitsHaveOnePrimaryAction: units.every((row) => Boolean(row.primaryAction)),
  allUnitsHaveRequiredOutputs: units.every((row) => row.requiredOutputs.length >= 4),
  allUnitsHaveErrorReturn: units.every((row) => row.errorReturn.returnStep && row.errorReturn.retrySequence.length > 0),
  allUnitsHaveStopBoundary: units.every((row) => row.release.missingEvidenceAction && row.release.stopReason),
  allUnitsHaveTransferContract: units.every((row) => row.release.transferRequired === true),
  noFlatHomeVisible: units.every((row) => row.guards.flatHomeVisible === false),
  firstPassHasOneRepresentativePerGroup: route.firstPass.sequence.length === expectedGroups.length &&
    expectedGroups.every((group) => units.filter((row) => row.groupId === group && row.firstPassRepresentative).length === 1),
  deferredUnitsRemainInsideParent: units.filter((row) => !row.firstPassRepresentative).every((row) => row.userParent === row.returnTo)
};

const contentChecks = {
  allCanonicalStrategyFieldsComplete: units.every((row) => row.canonicalFieldsMissing.length === 0),
  allExactStrategiesReady: units.every((row) => row.currentEvidence.strategyReady),
  allSuccessorsReady: units.every((row) => row.currentEvidence.continuousReady),
  allLearnerTrialsObserved: units.every((row) => row.currentEvidence.learnerTrial),
  allUnseenTransfersObserved: units.every((row) => row.currentEvidence.unseenTransfer)
};

const result = {
  id: 'USER_FIRST_COMPLETE_ROUTE_CONTRACT_V1',
  status: 'paper_user_first_nested_route_closed_content_runtime_and_learner_evidence_missing',
  objective: '让低基础学习者只沿一条顺序嵌套路线走一次，就看懂翻前到翻后每一步的目的、交接、错误回退和35项后台能力怎样进入父帧；之后再按同一父帧逐项释放、单变量迁移和连续三街。',
  sources: [
    'full-nested-learning-route.json',
    'unit-course-manifest.json',
    'unit-architecture-bridge.json',
    'unit-canonical-route-bridge.json',
    'unit-learner-release-matrix.json',
    'unit-error-feedback-matrix.json',
    'unit-outcome-matrix.json'
  ],
  userJourney: {
    firstPass: ['L0', 'L1', 'L2', 'L3', 'L4', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
    firstPassRepresentatives: [...route.firstPass.sequence],
    afterFirstPass: ['U1_structure_recall', 'U2_same_parent_practice', 'U3_slow_single_step', 'U4_adjacent_transfer', 'U5_delayed_recall', 'U6_continuous_three_street', 'U7_target_review'],
    releaseOrder: ['map', 'guided', 'independent', 'adjacent', 'delayed', 'continuous'],
    userVisibleRule: '永远只显示当前父步骤、一个问题、一个主动作和一个下一步/停止；35项不形成首页菜单。'
  },
  parentFrames: route.innerRoute.map((step) => ({
    id: step.id,
    plainLabel: step.plainLabel,
    question: step.question,
    handoff: step.handoff,
    childGroups: step.childGroups
  })),
  groupCounts,
  units,
  structuralChecks,
  contentChecks,
  currentEvidence: {
    paperRoute: Object.values(structuralChecks).every(Boolean),
    completeStrategyCourse: false,
    runtimeReadsCanonicalRoute: false,
    learnerFirstPassObserved: false,
    learnerTransferObserved: false,
    continuousThreeStreetObserved: false,
    targetBenchmarkObserved: false
  },
  guards: {
    paperRouteDoesNotEqualRuntime: true,
    structuralMappingDoesNotEqualExactStrategy: true,
    firstPassDoesNotEqual35UnitMastery: true,
    continuousRouteDoesNotEqualNL50: true,
    missingEvidenceStopsAtParent: true,
    unknownCountsAsWrong: true,
    noFlatHomeMenu: true
  },
  limitations: [
    '所有35项目前完成的是结构挂接和停止边界，不是匹配GTO策略课包。',
    '动作、动作后范围和后继必须在参考快照与课程政策编译完成后才可精确判分。',
    '运行时尚未读取本合同；真人首遍、迁移、连续三街和NL50目标复核均未发生。'
  ]
};

fs.writeFileSync(path.join(dir, 'user-first-complete-route-contract.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: result.id,
  status: result.status,
  units: result.units.length,
  structuralChecks: Object.values(structuralChecks).every(Boolean),
  contentChecks,
  currentEvidence: result.currentEvidence
}, null, 2));
