import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const fieldQueue = read('unit-field-completion-queue.json');
const referenceRequests = read('unit-reference-snapshot-request-manifest.json');
const manifest = read('unit-course-manifest.json');
const route = read('user-first-complete-route-contract.json');
const release = read('unit-learner-release-matrix.json');

const phaseOrder = fieldQueue.phaseOrder.map((phase) => phase.id);
const phaseIndex = new Map(phaseOrder.map((phase, index) => [phase, index]));
const requestById = new Map(referenceRequests.rows.map((row) => [row.unitId, row]));
const releaseById = new Map(release.rows.map((row) => [row.unitId, row]));
const routeById = new Map(route.units.map((row) => [row.unitId, row]));

const rows = fieldQueue.queue.map((queueRow) => {
  const manifestRow = manifest.rows.find((row) => row.unitId === queueRow.unitId);
  const request = requestById.get(queueRow.unitId);
  const releaseRow = releaseById.get(queueRow.unitId);
  const routeRow = routeById.get(queueRow.unitId);
  const currentPhase = queueRow.currentPhase ?? queueRow.nextPhase ?? 'identity_source';
  const missingFields = manifestRow?.compilerFields?.presence
    ? Object.entries(manifestRow.compilerFields.presence).filter(([, value]) => value === 'missing').map(([field]) => field)
    : [];
  const nextPhase = phaseOrder[Math.min((phaseIndex.get(currentPhase) ?? 0) + 1, phaseOrder.length - 1)];

  return {
    sequence: queueRow.sequence,
    unitId: queueRow.unitId,
    label: manifestRow?.label ?? queueRow.unitId,
    groupId: routeRow?.groupId ?? queueRow.groupId,
    parentFrame: routeRow?.userParent ?? routeRow?.parentFrame ?? queueRow.parentFrame,
    returnTo: routeRow?.returnTo ?? queueRow.parentFrame,
    firstPassRepresentative: routeRow?.firstPassRepresentative ?? false,
    currentPhase,
    nextPhase,
    currentLevel: releaseRow?.currentLevel ?? 'identity_only',
    missingCanonicalFields: missingFields,
    currentStopReason: request?.currentStopReason ?? queueRow.stopReason ?? '缺少当前阶段所需字段',
    nextAuthorAction: queueRow.nextEvidenceTask ?? fieldQueue.phaseOrder.find((phase) => phase.id === nextPhase)?.purpose ?? '继续补齐当前阶段字段',
    exactPolicyOpen: Boolean(releaseRow?.currentEvidence?.strategyReady),
    learnerExposure: routeRow?.firstPassRepresentative ? 'first_pass_representative' : 'deferred_inside_parent',
    requiredReferenceOutputs: request?.referenceRequest?.requiredOutputs ?? []
  };
});

const groupIds = [...new Set(rows.map((row) => row.groupId))];
const representativeRows = rows.filter((row) => row.firstPassRepresentative);
const currentPhaseCounts = Object.fromEntries(phaseOrder.map((phase) => [
  phase,
  rows.filter((row) => row.currentPhase === phase).length
]));

const checks = {
  all35Listed: rows.length === 35 && new Set(rows.map((row) => row.unitId)).size === 35,
  phaseOrderHasAllDependencies: JSON.stringify(phaseOrder) === JSON.stringify([
    'identity_source',
    'identity_canonical',
    'fact_frame',
    'course_policy',
    'reference_policy',
    'range_snapshots',
    'successors',
    'teaching_transfer',
    'release'
  ]),
  everyRowHasParentAndReturn: rows.every((row) => row.parentFrame && row.returnTo === row.parentFrame),
  everyRowHasStopReason: rows.every((row) => row.currentStopReason),
  representativeExactlyOnePerGroup: groupIds.length === 5 && representativeRows.length === 5 && groupIds.every((group) => rows.filter((row) => row.groupId === group && row.firstPassRepresentative).length === 1),
  noExactPolicyBeforeReferenceAndSuccessor: rows.every((row) => !row.exactPolicyOpen || phaseIndex.get(row.currentPhase) >= phaseIndex.get('release')),
  noNeighborSubstitution: referenceRequests.sharedRules.noNeighborSubstitution === true,
  noFiniteModelPromotion: referenceRequests.sharedRules.noLocalFiniteModelPromotion === true,
  learnerExposureStillNested: rows.every((row) => row.learnerExposure !== 'flat_home')
};

const result = {
  id: 'AUTHOR_COURSE_COMPILATION_FRONTIER_V1',
  status: 'paper_author_queue_ordered_identity_first_reference_and_successor_blocked',
  purpose: '把35项的作者补齐顺序、当前阻塞、下一动作和学习者释放边界合并成一条不可跳级的编译队列。',
  sources: [
    'unit-field-completion-queue.json',
    'unit-reference-snapshot-request-manifest.json',
    'unit-course-manifest.json',
    'user-first-complete-route-contract.json',
    'unit-learner-release-matrix.json'
  ],
  phaseOrder,
  currentPhase: fieldQueue.authorFrontier.activePhase,
  phaseCounts: currentPhaseCounts,
  firstPassRepresentatives: representativeRows.map((row) => row.unitId),
  rows,
  checks,
  releaseRules: {
    identityBeforeFact: true,
    factBeforeCoursePolicy: true,
    coursePolicyBeforeReferenceGrade: true,
    referenceBeforeRangeAfter: true,
    rangeAfterBeforeSuccessor: true,
    successorBeforeContinuous: true,
    teachingTransferBeforeIndependentCandidate: true,
    missingEvidenceStopsAtCurrentParent: true,
    noFlatHomeMenu: true
  },
  currentEvidence: {
    structuralQueue: Object.values(checks).every(Boolean),
    exactPolicyReadyCount: rows.filter((row) => row.exactPolicyOpen).length,
    referenceReadyCount: 0,
    successorReadyCount: 0,
    runtimeAttached: false,
    learnerTrialObserved: false,
    targetBenchmarkObserved: false
  },
  limitations: [
    '这张表是作者侧编译队列，不是用户菜单。',
    '当前身份候选和局部模型不能替代匹配参考策略。',
    '只要动作后范围或合法后继缺失，精确判分和连续路线继续关闭。'
  ]
};

fs.writeFileSync(path.join(dir, 'author-course-compilation-frontier.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: result.id,
  status: result.status,
  currentPhase: result.currentPhase,
  units: result.rows.length,
  phaseCounts: result.phaseCounts,
  checksPass: Object.values(result.checks).every(Boolean),
  currentEvidence: result.currentEvidence
}, null, 2));
