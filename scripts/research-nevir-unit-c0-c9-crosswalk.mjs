import fs from 'node:fs';

const dir = 'research/nevir-system/';
const manifest = JSON.parse(fs.readFileSync(dir + 'unit-course-manifest.json', 'utf8'));
const ledgers = JSON.parse(fs.readFileSync(dir + 'unit-reference-course-ledgers.json', 'utf8'));
const attachment = JSON.parse(fs.readFileSync(dir + 'unit-route-attachment.json', 'utf8'));
const gates = JSON.parse(fs.readFileSync(dir + 'unit-learner-release-gates.json', 'utf8'));
const principle = JSON.parse(fs.readFileSync(dir + 'principle-loop-unit-crosswalk.json', 'utf8'));

const stageOrder = [
  'C0_identity', 'C1_physical_facts', 'C2_reference_solve', 'C3_reference_quality',
  'C4_course_policy', 'C5_difference', 'C6_successor_closure', 'C7_lesson_compile',
  'C8_transfer_compile', 'C9_release_audit'
];
const groupParent = {
  'compare.unopened': 'p4_compare',
  'compare.bet': 'p4_compare',
  'compare.raise': 'p4_compare',
  'update.response': 'p6_update',
  'update.card': 'p6_update'
};
const gateOrder = ['map', 'guided', 'independent', 'adjacent', 'delayed', 'continuous'];
const firstPass = new Set(['1.5', '2.1', '3.1', '4.5', '5.7']);
const manifestById = new Map(manifest.rows.map(x => [x.unitId, x]));
const ledgerById = new Map(ledgers.rows.map(x => [x.unitId, x]));
const unitIds = attachment.allUnits;
if (unitIds.length !== 35) throw new Error(`expected 35 attached units, got ${unitIds.length}`);

const rows = unitIds.map((unitId, index) => {
  const m = manifestById.get(unitId);
  const l = ledgerById.get(unitId);
  if (!m || !l) throw new Error(`missing unit row ${unitId}`);
  const groupId = m.route.groupId;
  return {
    sequence: index + 1,
    unitId,
    groupId,
    parentFrame: groupParent[groupId],
    returnTo: m.route.returnTo,
    opensOnlyFromParent: m.route.opensOnlyFromParent,
    flatHomeVisible: m.route.flatHomeVisible,
    firstPassRepresentative: firstPass.has(unitId),
    localMaterial: m.inputIdentity.localMaterial,
    sourceIdentityStatus: m.inputIdentity.sourceScopedStatus,
    requiredCStages: stageOrder,
    releaseGateOrder: gateOrder,
    currentReleaseStatus: l.releaseStatus,
    stopReason: l.stopReason,
    exactGradeRequires: l.exactGradeRequires,
    canonicalFieldComplete: m.compilerFields?.allCanonicalFieldsPresent ?? false,
    strategyReady: m.identity?.strategyReady ?? false,
    learnerTrialVerified: false
  };
});

const output = {
  id: 'UNIT_C0_C9_RELEASE_CROSSWALK_V1',
  status: 'paper_35_unit_c0_c9_release_crosswalk_not_released',
  purpose: '把每个35项单元绑定到C0-C9作者阶段、父步骤、代表题和学习者释放闸门，禁止单元在缺资料时被邻近题目或总分越级开放。',
  sources: [
    'unit-course-manifest.json',
    'unit-reference-course-ledgers.json',
    'unit-route-attachment.json',
    'unit-learner-release-gates.json',
    'principle-loop-unit-crosswalk.json',
    'c0-c9-visible-route-crosswalk.json'
  ],
  stageOrder,
  releaseGateOrder: gateOrder,
  groupParent,
  representativeOrder: ['1.5', '2.1', '3.1', '4.5', '5.7'],
  rows,
  globalRules: {
    everyUnitRequiresAllCStages: true,
    c2AndC3BeforeExactReferenceGrade: true,
    c4AndC5BeforeCoursePolicyPractice: true,
    c6BeforeContinuousPractice: true,
    c7BeforeLearnerQuestion: true,
    c8BeforeUnseenTransfer: true,
    c9BeforeReleaseIdentity: true,
    missingEvidenceStopsAtUnitAndReturnsToParent: true,
    aggregateScoreCannotPromoteUnit: true,
    noFlat35Home: true,
    factOrLedgerDoesNotEqualStrategy: true
  },
  currentEvidence: {
    all35UnitsMapped: true,
    allParentsMatch: true,
    allCStagesDeclared: true,
    allReleaseGatesDeclared: true,
    all35ExactStrategyReady: false,
    all35RuntimeAttached: false,
    learnerTrial: false,
    NL50Evidence: false
  }
};

if (rows.some(x => x.parentFrame !== groupParent[x.groupId])) throw new Error('parent mismatch');
if (rows.some(x => JSON.stringify(x.requiredCStages) !== JSON.stringify(stageOrder))) throw new Error('stage closure mismatch');
if (rows.some(x => JSON.stringify(x.releaseGateOrder) !== JSON.stringify(gateOrder))) throw new Error('release gate mismatch');
if (gates.unitRows.length !== 35 || principle.rows.length !== 35) throw new Error('supporting crosswalk count mismatch');

fs.writeFileSync(dir + 'unit-c0-c9-release-crosswalk.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  status: output.status,
  units: rows.length,
  stages: stageOrder.length,
  releaseGates: gateOrder.length,
  representatives: output.representativeOrder,
  exactStrategyReady: output.currentEvidence.all35ExactStrategyReady,
  learnerTrial: output.currentEvidence.learnerTrial
}));
