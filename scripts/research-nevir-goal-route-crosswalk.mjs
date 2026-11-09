import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const route = read('learner-goal-route-canonical.json');
const stateCrosswalk = read('first-pass-state-evidence-crosswalk.json');
const goals = read('goal-level-acceptance-matrix.json');
const release = read('final-goal-release-audit.json');

const canonicalRoute = ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7'];
const cStages = ['C0','C1','C2','C3','C4','C5','C6','C7','C8','C9'];
const proofFieldRegistry = {
  currentState: 'first-pass-state-evidence-crosswalk.json.stateId',
  nextState: 'first-pass-state-evidence-crosswalk.json.nextState',
  parentFrame: 'first-pass-state-evidence-crosswalk.json.parentStateId',
  parentRestore: 'first-lesson-visible-state-machine.json.parentRestore',
  onePrimaryAction: 'first-pass-state-evidence-crosswalk.json.primaryAction',
  stateInputs: 'first-pass-state-evidence-crosswalk.json.requiredInputs',
  handoffOutputs: 'first-pass-state-evidence-crosswalk.json.requiredOutput',
  missingEvidenceStop: 'first-pass-state-evidence-crosswalk.json.stopCondition',
  firstPassReplay: 'architecture-replay-contract.json',
  unitParent: 'unit-c0-c9-release-crosswalk.json.parentFrame',
  unitReturn: 'unit-c0-c9-release-crosswalk.json.returnTo',
  representativeGate: 'unit-c0-c9-release-crosswalk.json.firstPassRepresentative',
  flatHomeVisible: 'learner-goal-route-canonical.json.screenContract.dashboardHomeForbidden',
  errorLayer: 'unit-error-feedback-matrix.json.errorLayer',
  errorReturn: 'first-pass-state-evidence-crosswalk.json.errorReturn',
  orderRecall: 'structure-formation-acceptance-contract.json.orderRecall',
  layerLocation: 'structure-formation-acceptance-contract.json.layerLocation',
  oneVariableTransfer: 'structure-formation-acceptance-contract.json.oneVariableTransfer',
  rangeBefore: 'solver-course-visual-compiler-contract.json.rangeBefore',
  physicalFilter: 'solver-course-visual-compiler-contract.json.physicalFilter',
  actionFilter: 'solver-course-visual-compiler-contract.json.actionFilter',
  rangeAfter: 'solver-course-visual-compiler-contract.json.rangeAfter',
  fixedDenominator: 'solver-course-visual-compiler-contract.json.rangeChartRules.sameDenominator',
  layerReason: 'slow-single-step-execution-contract.json.layerReason',
  amountChecked: 'learner-execution-output-contract.json.amountChecked',
  courseAction: 'learner-execution-output-contract.json.courseAction',
  successorOrStop: 'slow-single-step-execution-contract.json.successorOrStop',
  independentFirstAttempt: 'slow-single-step-execution-contract.json.independentFirstAttempt',
  changedField: 'slow-transfer-ladder.json.changedField',
  heldoutItem: 'slow-transfer-ladder.json.heldoutItem',
  firstAttemptBeforeExplanation: 'unified-learner-evidence-release-gates.json.firstAttemptBeforeExplanation',
  rangeConservation: 'continuous-state-ledger-contract.json.rangeConservation',
  ledgerConservation: 'continuous-state-ledger-contract.json.ledgerConservation',
  actionOwner: 'continuous-state-ledger-contract.json.actionOwner',
  settlementPolicy: 'first-course-closure-audit.json.settlementIndependentOfResult',
  inputFingerprint: 'solver-snapshot-to-lesson-package.json.inputFingerprint',
  referenceSnapshot: 'solver-snapshot-to-lesson-package.json.referenceSnapshot',
  coursePolicy: 'reference-to-course-closure-contract.json.coursePolicy',
  differenceLedger: 'reference-to-course-closure-contract.json.differenceLedger',
  successorGraph: 'solver-snapshot-to-lesson-package.json.successorGraph',
  releaseStatus: 'unit-learner-release-gates.json.releaseStatus',
  frozenTargetConfig: 'final-goal-observable-acceptance.json.frozenTargetConfiguration',
  unseenHoldout: 'final-goal-observable-acceptance.json.unseenHoldout',
  independentReview: 'final-goal-observable-acceptance.json.independentReview',
  continuousResults: 'final-goal-observable-acceptance.json.continuousResults',
  realDecisionAudit: 'final-goal-observable-acceptance.json.realDecisionAudit'
};
const goalToRoute = {
  G1: {routeNodes: canonicalRoute, authorStages: ['C7','C9'], proofFields: ['currentState','nextState','parentFrame','parentRestore','onePrimaryAction']},
  G2: {routeNodes: ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7'], authorStages: ['C0','C1','C7','C9'], proofFields: ['stateInputs','handoffOutputs','missingEvidenceStop','firstPassReplay']},
  G3: {routeNodes: canonicalRoute, authorStages: ['C0','C1','C2','C4','C6','C7','C9'], proofFields: ['unitParent','unitReturn','representativeGate','flatHomeVisible','missingEvidenceStop']},
  G4: {routeNodes: ['p1','p2','p3','p4','p5','p6','p7'], authorStages: ['C7','C8','C9'], proofFields: ['errorLayer','errorReturn','orderRecall','layerLocation','oneVariableTransfer']},
  G5: {routeNodes: ['p3','p4','p6'], authorStages: ['C1','C2','C4','C5','C6','C7'], proofFields: ['rangeBefore','physicalFilter','actionFilter','rangeAfter','fixedDenominator']},
  G6: {routeNodes: ['p1','p2','p3','p4','p5','p6','p7'], authorStages: ['C4','C5','C6','C7'], proofFields: ['layerReason','amountChecked','courseAction','successorOrStop','independentFirstAttempt']},
  G7: {routeNodes: ['p3','p4','p6','p7'], authorStages: ['C5','C6','C7','C8','C9'], proofFields: ['changedField','heldoutItem','firstAttemptBeforeExplanation','errorLayer']},
  G8: {routeNodes: ['p6','p7'], authorStages: ['C1','C4','C5','C6','C7','C9'], proofFields: ['successorOrStop','rangeConservation','ledgerConservation','actionOwner','settlementPolicy']},
  G9: {routeNodes: ['p3','p4','p5','p6'], authorStages: cStages, proofFields: ['inputFingerprint','referenceSnapshot','coursePolicy','differenceLedger','successorGraph','releaseStatus']},
  G10: {routeNodes: canonicalRoute, authorStages: ['C0','C1','C2','C3','C4','C5','C6','C7','C8','C9'], proofFields: ['frozenTargetConfig','unseenHoldout','independentReview','continuousResults','realDecisionAudit']}
};

const goalById = new Map(goals.requirements.map(row => [row.id, row]));
const stateIds = stateCrosswalk.rows.map(row => row.stateId);
assert.deepEqual(stateIds, canonicalRoute, 'state crosswalk must use canonical route order');
assert.deepEqual(route.outerRoute.map(row => row.id), canonicalRoute, 'goal route must remain canonical');
assert.equal(goals.requirements.length, 10);
assert.deepEqual(goals.requirements.map(row => row.id), Object.keys(goalToRoute));

const rows = Object.entries(goalToRoute).map(([goalId, mapping]) => {
  const goal = goalById.get(goalId);
  assert.ok(goal, `missing goal ${goalId}`);
  for (const node of mapping.routeNodes) assert.ok(canonicalRoute.includes(node), `${goalId} unknown route node ${node}`);
  for (const stage of mapping.authorStages) assert.ok(cStages.includes(stage), `${goalId} unknown author stage ${stage}`);
  assert.ok(mapping.proofFields.length > 0);
  return {
    goalId,
    goalName: goal.name,
    requiredEvidence: goal.requiredEvidence,
    routeNodes: mapping.routeNodes,
    authorStages: mapping.authorStages,
    proofFields: mapping.proofFields,
    paperSources: goal.authoritativeSources,
    currentStatus: goal.currentStatus,
    blocking: goal.blocking,
    releaseGate: `R${Number(goalId.slice(1)) - 1}`
  };
});
const allProofFields = [...new Set(rows.flatMap(row => row.proofFields))];
assert.equal(allProofFields.every(field => typeof proofFieldRegistry[field] === 'string'), true, 'every proof field must have an authoritative source');
const terminalOutputFields = {p7: ['stopOrSuccessor']};
const routeOutputConsumption = stateCrosswalk.rows.map((row, index) => {
  const next = stateCrosswalk.rows[index + 1];
  const nextInputs = next?.requiredInputs ?? [];
  const localConsumers = [...row.memoryRequired, ...row.independentEvidence];
  const terminal = terminalOutputFields[row.stateId] ?? [];
  const fields = row.requiredOutput.map(field => ({
    field,
    consumedByNextState: nextInputs.includes(field),
    consumedByCurrentEvidence: localConsumers.includes(field),
    terminal: terminal.includes(field)
  }));
  return {
    stateId: row.stateId,
    nextState: row.nextState,
    fields,
    unconsumed: fields.filter(item => !item.consumedByNextState && !item.consumedByCurrentEvidence && !item.terminal).map(item => item.field)
  };
});
assert.equal(routeOutputConsumption.every(row => row.unconsumed.length === 0), true, 'every route output must reach the next state, current evidence, or an explicit terminal');

const routeNodeCoverage = Object.fromEntries(canonicalRoute.map(node => [node, rows.filter(row => row.routeNodes.includes(node)).map(row => row.goalId)]));
const authorStageCoverage = Object.fromEntries(cStages.map(stage => [stage, rows.filter(row => row.authorStages.includes(stage)).map(row => row.goalId)]));
const output = {
  id: 'GOAL_ROUTE_REQUIREMENT_CROSSWALK_V1',
  status: 'paper_goal_to_route_and_author_stage_crosswalk_closed_runtime_missing',
  purpose: '将最终目标的十项可验收要求直接落到用户12状态、作者C0-C9阶段和可见交接字段，防止目标要求停留在抽象口号。',
  sourceDocuments: ['goal-level-acceptance-matrix.json','learner-goal-route-canonical.json','first-pass-state-evidence-crosswalk.json','final-goal-release-audit.json'],
  canonicalRoute,
  authorStages: cStages,
  requirements: rows,
  proofFieldRegistry,
  proofFieldCoverage: Object.fromEntries(allProofFields.map(field => [field, proofFieldRegistry[field]])),
  routeOutputConsumption,
  routeNodeCoverage,
  authorStageCoverage,
  rules: {
    everyGoalRequirementMapped: rows.length === goals.requirements.length,
    everyCanonicalStateMapped: canonicalRoute.every(node => routeNodeCoverage[node]?.length > 0),
    everyAuthorStageMapped: cStages.every(stage => authorStageCoverage[stage]?.length > 0),
    proofFieldsAreRegistered: rows.every(row => row.proofFields.length > 0) && allProofFields.every(field => proofFieldRegistry[field]),
    everyProofFieldHasAuthoritativeSource: allProofFields.every(field => typeof proofFieldRegistry[field] === 'string'),
    everyRouteOutputConsumedOrTerminal: routeOutputConsumption.every(row => row.unconsumed.length === 0),
    paperMappingDoesNotPromoteRuntime: true,
    learnerEvidenceCannotBeInferredFromMapping: true,
    noGoalStatusPromoted: rows.every((row, index) => row.currentStatus === goals.requirements[index].currentStatus)
  },
  currentEvidence: {
    allTenRequirementsMapped: true,
    allTwelveRouteStatesMapped: true,
    allTenAuthorStagesMapped: true,
    paperSourcesRegistered: true,
    runtimeImplemented: release.currentEvidence.runtimeImplemented,
    matchedReference: release.currentEvidence.matchedReference,
    beginnerTrial: release.currentEvidence.beginnerTrial,
    heldoutTransfer: release.currentEvidence.heldoutTransfer,
    continuousThreeStreet: release.currentEvidence.continuousThreeStreet,
    NL50Evidence: release.currentEvidence.NL50Evidence,
    goalCompletionVerified: false
  }
};

assert.equal(output.rules.everyGoalRequirementMapped, true);
assert.equal(output.rules.everyCanonicalStateMapped, true);
assert.equal(output.rules.everyAuthorStageMapped, true);
assert.equal(output.rules.proofFieldsAreRegistered, true);
assert.equal(output.rules.everyProofFieldHasAuthoritativeSource, true);
assert.equal(output.rules.everyRouteOutputConsumedOrTerminal, true);
assert.equal(output.rules.noGoalStatusPromoted, true);
assert.equal(output.currentEvidence.goalCompletionVerified, false);
fs.writeFileSync(path.join(dir, 'goal-route-requirement-crosswalk.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ok:true,status:output.status,requirements:rows.length,routeStates:canonicalRoute.length,authorStages:cStages.length,runtimeImplemented:output.currentEvidence.runtimeImplemented,goalCompletionVerified:false}));
