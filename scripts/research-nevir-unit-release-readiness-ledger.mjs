import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const manifest = read('unit-course-manifest.json');
const frontier = read('unit-three-card-compilation-frontier.json');
const routeBridge = read('unit-canonical-route-bridge.json');
const fieldAudit = read('unit-execution-field-audit.json');
const crosswalk = read('unit-c0-c9-release-crosswalk.json');
const candidateLedger = read('material-unit-crosswalk.json');

assert.equal(manifest.rows.length, 35);
assert.equal(frontier.rows.length, 105);
assert.equal(routeBridge.rows.length, 35);
assert.equal(fieldAudit.units.length, 35);

const cardsByUnit = new Map();
for (const card of frontier.rows) {
  if (!cardsByUnit.has(card.unitId)) cardsByUnit.set(card.unitId, []);
  cardsByUnit.get(card.unitId).push(card);
}
const auditByUnit = new Map(fieldAudit.units.map(row => [row.id, row]));
const bridgeByUnit = new Map(routeBridge.rows.map(row => [row.unitId, row]));
const manifestRows = [];
const failures = [];

function readiness(unit, field, cards) {
  const presence = unit.compilerFields?.presence ?? {};
  const missing = unit.compilerFields?.missing ?? [];
  const base = cards.find(card => card.mode === 'base');
  const allCardsRegistered = cards.length === 3 && ['base', 'contrast', 'transfer'].every(mode => cards.some(card => card.mode === mode));
  const allCardsSameParent = allCardsRegistered && cards.every(card => card.parentFrame === unit.route.parentFrame && card.returnTo === unit.route.returnTo);
  const canonicalFieldsPresent = Object.values(presence).every(value => value === 'present');
  const factFieldsPresent = ['unitId', 'parentFrame', 'sourceIdentity', 'factInputs', 'question', 'errorReturn'].every(name => presence[name] === 'present');
  const referenceReady = unit.release?.currentEvidence?.matchedReference === true || unit.release?.exactStrategyReady === true || unit.evidence?.fullMatchingTargetPolicyVerified === true;
  const cardAnswersCompiled = cards.every(card => card.answerContentPresent === true || card.currentEvidence?.answerCompiled === true);
  const rangeReady = cards.every(card => card.currentEvidence?.rangeAfter === true);
  const successorReady = cards.every(card => card.currentEvidence?.successor === true);
  let currentLevel = 'identity_only';
  if (factFieldsPresent) currentLevel = 'fact_frame';
  if (cardAnswersCompiled && !referenceReady) currentLevel = 'course_candidate';
  if (referenceReady && rangeReady && successorReady && canonicalFieldsPresent) currentLevel = 'strategy_candidate';
  if (unit.release?.currentEvidence?.runtime === true && unit.release?.currentEvidence?.learnerTrial === true) currentLevel = 'learner_released';
  const firstMissingMinimumPhase = base?.firstMissingMinimumPhase ?? 'identity_source';
  return {
    currentLevel,
    missingCanonicalFields: missing,
    firstMissingMinimumPhase,
    allCardsRegistered,
    allCardsSameParent,
    factFieldsPresent,
    canonicalFieldsPresent,
    cardAnswersCompiled,
    referenceReady,
    rangeReady,
    successorReady,
    exactStrategyReady: unit.release?.exactStrategyReady === true,
    runtimeAttached: unit.release?.currentEvidence?.runtime === true,
    learnerTrial: unit.release?.currentEvidence?.learnerTrial === true,
    blockingEvidence: unit.release?.blockingEvidence ?? [],
    blockers: unit.release?.blockers ?? []
  };
}

for (const unit of manifest.rows) {
  const cards = cardsByUnit.get(unit.unitId) ?? [];
  const field = auditByUnit.get(unit.unitId);
  const bridge = bridgeByUnit.get(unit.unitId);
  if (!field || !bridge) failures.push(`${unit.unitId}:missing-joined-row`);
  if (bridge && `${bridge.canonicalParentState}_compare` !== unit.route.parentFrame && !(bridge.canonicalParentState === 'p4' && unit.route.parentFrame === 'p4_compare') && !(bridge.canonicalParentState === 'p6' && unit.route.parentFrame === 'p6_update')) failures.push(`${unit.unitId}:parent-mismatch`);
  if (cards.length !== 3) failures.push(`${unit.unitId}:card-count-${cards.length}`);
  if (cards.length === 3 && !cards.every(card => card.unitId === unit.unitId)) failures.push(`${unit.unitId}:card-unit-mismatch`);
  const readinessState = readiness(unit, field, cards);
  if (!readinessState.allCardsSameParent) failures.push(`${unit.unitId}:card-parent-or-return-mismatch`);
  if (readinessState.exactStrategyReady) failures.push(`${unit.unitId}:exact-strategy-promoted-without-release-audit`);
  manifestRows.push({
    sequence: unit.sequence,
    unitId: unit.unitId,
    label: unit.label,
    parentFrame: unit.route.parentFrame,
    groupId: unit.route.groupId,
    routeStop: unit.route.routeStop,
    sourceIdentity: unit.inputIdentity?.sourceScopedStatus ?? unit.inputIdentity?.identityCandidate?.scope ?? null,
    primaryPrinciple: unit.learningContract?.primaryPrinciple ?? null,
    requiredOutputs: unit.learningContract?.requiredOutputs ?? [],
    readiness: readinessState,
    cards: cards.map(card => ({
      cardId: card.cardId,
      mode: card.mode,
      firstMissingMinimumPhase: card.firstMissingMinimumPhase,
      exactGradeBlockedBy: card.exactGradeBlockedBy,
      cardStatus: card.cardStatus,
      answerContentPresent: card.answerContentPresent,
      releaseIdentity: card.releaseIdentity
    }))
  });
}

assert.deepEqual(failures, []);
const counts = manifestRows.reduce((acc, row) => {
  acc.byCurrentLevel[row.readiness.currentLevel] = (acc.byCurrentLevel[row.readiness.currentLevel] ?? 0) + 1;
  if (row.readiness.canonicalFieldsPresent) acc.canonicalFieldsComplete += 1;
  if (row.readiness.cardAnswersCompiled) acc.unitsWithCompiledCards += 1;
  if (row.readiness.referenceReady) acc.unitsWithMatchedReference += 1;
  if (row.readiness.rangeReady) acc.unitsWithRangeAfter += 1;
  if (row.readiness.successorReady) acc.unitsWithSuccessor += 1;
  if (row.readiness.runtimeAttached) acc.runtimeAttached += 1;
  if (row.readiness.learnerTrial) acc.learnerTrial += 1;
  return acc;
}, { byCurrentLevel: {}, canonicalFieldsComplete: 0, unitsWithCompiledCards: 0, unitsWithMatchedReference: 0, unitsWithRangeAfter: 0, unitsWithSuccessor: 0, runtimeAttached: 0, learnerTrial: 0 });

const output = {
  id: 'UNIT_RELEASE_READINESS_LEDGER_V1',
  status: 'paper_35_unit_readiness_ledger_complete_not_released',
  purpose: '把35项的父层、身份、必需输出、三张练习卡、参考策略、动作后范围、后继、运行时和学习者证据合并为逐项发布账本；列出什么已经存在、什么只能做事实/示范、什么必须停。',
  sources: ['unit-course-manifest.json','unit-three-card-compilation-frontier.json','unit-canonical-route-bridge.json','unit-execution-field-audit.json','unit-c0-c9-release-crosswalk.json','material-unit-crosswalk.json'],
  hardRules: {
    all35UnitsMustBeListed: true,
    exactlyThreeCardsPerUnit: true,
    cardsStayInsideDeclaredParent: true,
    missingCanonicalFieldStops: true,
    missingReferenceDoesNotBecomeCourseAnswer: true,
    missingRangeAfterOrSuccessorStopsExactPractice: true,
    runtimeAndLearnerTrialAreSeparateGates: true,
    aggregateScoreCannotPromoteUnit: true
  },
  counts: {
    units: manifestRows.length,
    ...counts,
    exactStrategyReady: manifestRows.filter(row => row.readiness.exactStrategyReady).length,
    releaseReady: manifestRows.filter(row => row.readiness.currentLevel === 'learner_released').length,
    failures: failures.length
  },
  rows: manifestRows,
  currentEvidence: {
    allUnitsJoined: true,
    allCardsRegistered: manifestRows.every(row => row.readiness.allCardsRegistered),
    allCardsParentSafe: manifestRows.every(row => row.readiness.allCardsSameParent),
    exactStrategyReady: false,
    runtimeObserved: false,
    learnerTrialObserved: false,
    NL50Evidence: false
  },
  releaseGate: {
    status: 'blocked_until_unit_identity_reference_policy_range_successor_and_trial_gates_close',
    nextOrder: ['identity_source','identity_canonical','fact_frame','course_policy','reference_policy','range_snapshots','successors','teaching_transfer','release']
  }
};
fs.writeFileSync(path.join(dir, 'unit-release-readiness-ledger.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, counts: output.counts, failures: failures.length }));
