import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const mental = read('first-pass-mental-model-contract.json');
const visible = read('learner-visible-route-crosswalk.json');
const runtime = read('first-pass-runtime-output-crosswalk.json');
const slow = read('slow-single-step-execution-contract.json');
const stateMachine = read('first-lesson-visible-state-machine.json');

const route = mental.userRoute.map(x => x.id);
const visibleById = Object.fromEntries(visible.innerRoute.map(x => [x.id, x]));
const runtimeById = Object.fromEntries(runtime.mappings.map(x => [x.id, x]));
const actionByRoute = Object.groupBy(slow.observableActionChain.steps, x => x.route);
const stateById = Object.fromEntries(stateMachine.states.map(x => [x.id, x]));
const stateIdForRoute = routeId => routeId.replace('_context', '').replace('_board', '').replace('_range', '').replace('_compare', '').replace('_execute', '').replace('_update', '').replace('_close', '');

const aliases = {
  history: ['history', 'actionHistory'],
  pot: ['pot', 'potBB'],
  stacks: ['stacks', 'stacksBB', 'effectiveStackBB'],
  toCall: ['toCall', 'toCallBB'],
  handClass: ['handClass', 'handCategory'],
  improvementCards: ['improvementCards', 'improvingCards'],
  denominator: ['denominator', 'normalizationDenominator', 'rangeBeforeDenominator'],
  purpose: ['purpose', 'actionPurpose', 'reason'],
  policyIdentity: ['policyIdentity', 'answerIdentity', 'courseDecisionCandidate'],
  amount: ['amount', 'amountBB', 'amountOrNoBet'],
  potAfter: ['potAfter', 'potAfterBB'],
  stacksAfter: ['stacksAfter', 'stacksAfterBB'],
  responseOrCard: ['responseOrCard', 'newCardEffect'],
  rangeAfterOrStop: ['rangeAfterOrStop', 'rangeAfter', 'rangeAfterOrStopReason'],
  successorOrStop: ['successorOrStop', 'successorOrTerminal', 'stopOrSuccessor'],
  nextEntry: ['nextEntry', 'returnTo'],
  settlement: ['settlement'],
  decisionResultSeparation: ['decisionResultSeparation'],
  errorLayer: ['errorLayer'],
  oneSentenceReason: ['oneSentenceReason'],
  singleTransferField: ['singleTransferField', 'changedField']
};

const normalizeTargets = step => new Set([
  ...step.firstPassRequired,
  ...step.fullExecutionRequired,
  ...visibleById[step.id]?.requiredOutputs ?? [],
  ...actionByRoute[step.id]?.flatMap(x => x.visibleOutput) ?? []
]);

const canonical = field => aliases[field] ?? [field];
const fieldCoverage = (from, field) => {
  const targets = normalizeTargets(runtimeById[from]);
  const visibleTargets = new Set(visibleById[from]?.requiredOutputs ?? []);
  const actionTargets = new Set(actionByRoute[from]?.flatMap(x => x.visibleOutput) ?? []);
  const accepted = canonical(field);
  return {
    source: field,
    runtimeOrVisibleTargets: accepted.filter(x => targets.has(x)),
    visibleTargets: accepted.filter(x => visibleTargets.has(x)),
    actionChainTargets: accepted.filter(x => actionTargets.has(x)),
    covered: accepted.some(x => targets.has(x) || visibleTargets.has(x) || actionTargets.has(x))
  };
};

assert.equal(route.length, 7);
assert.equal(mental.handoffContract.successorConsumption.length, 7);
assert.equal(visible.innerRoute.length, 7);
assert.equal(runtime.mappings.length, 7);
assert.equal(slow.observableActionChain.steps.length, 8);

const cards = mental.memoryTokens.map(card => {
  const routeNode = card.id.replace('contextCard', 'p1_context')
    .replace('handCard', 'p2_board')
    .replace('rangeDeltaCard', 'p3_range')
    .replace('choiceCard', 'p4_compare')
    .replace('ledgerCard', 'p5_execute')
    .replace('changeCard', 'p6_update')
    .replace('reviewCard', 'p7_close');
  const actionSteps = actionByRoute[routeNode] ?? [];
  return {
    routeNode,
    cardId: card.id,
    required: card.required,
    consumedByNext: mental.handoffContract.successorConsumption.find(x => x.from === routeNode)?.payload ?? [],
    nextQuestion: visibleById[routeNode]?.question,
    visibleOutput: visibleById[routeNode]?.requiredOutputs ?? [],
    actionChainSteps: actionSteps.map(x => x.id),
    fieldCoverage: card.required.map(field => fieldCoverage(routeNode, field))
  };
});

const edges = mental.handoffContract.successorConsumption.map(edge => {
  const fromRuntime = runtimeById[edge.from];
  const toRuntime = runtimeById[edge.to];
  assert.ok(fromRuntime && toRuntime, `missing runtime mapping for ${edge.from} → ${edge.to}`);
  return {
    from: edge.from,
    to: edge.to,
    payload: edge.payload,
    usedBy: edge.usedBy,
    nextQuestion: visibleById[edge.to]?.question,
    nextRouteRequired: [...new Set([
      ...toRuntime.firstPassRequired,
      ...visibleById[edge.to]?.requiredOutputs ?? []
    ])],
    allPayloadNamed: edge.payload.every(Boolean),
    allPayloadConsumed: edge.payload.every(field => edge.usedBy.length > 0),
    parentRestoreRequired: true,
    stopIfMissing: visibleById[edge.from]?.stopReasons ?? []
  };
});

const orphanFields = cards.flatMap(card => card.fieldCoverage.filter(x => !x.covered).map(x => ({routeNode: card.routeNode, field: x.source})));
const actionChainOrder = slow.observableActionChain.steps.map(x => x.id);
const stateMachineAlignmentRows = Object.entries(stateMachine.handoffContract.requiredVisibleHandoffs).map(([routeNode, fields]) => {
  const stateId = stateIdForRoute(routeNode);
  const state = stateById[stateId];
  const missing = fields.filter(field => !state?.output.includes(field));
  return {routeNode, stateId, required: fields, output: state?.output ?? [], missing, complete: missing.length === 0};
});
const outerHandoffRows = stateMachine.outerHandoffContract.edges.map(edge => {
  const from = stateById[edge.from];
  const to = stateById[edge.to];
  const producedMissing = edge.payload.filter(field => !from?.output.includes(field));
  const consumedMissing = edge.payload.filter(field => !to?.requiredInputs.includes(field));
  return {
    from: edge.from,
    to: edge.to,
    payload: edge.payload,
    usedBy: edge.usedBy,
    producedMissing,
    consumedMissing,
    complete: producedMissing.length === 0 && consumedMissing.length === 0 && edge.usedBy.length > 0
  };
});
const result = {
  id: 'HANDOFF_CONSUMPTION_AUDIT_V1',
  status: 'paper_handoff_consumption_audited_runtime_and_learner_trial_missing',
  purpose: '检查首遍交接卡、用户可见输出、运行字段和慢速行动链是否真正连成可消费的顺序，而不是并列字段清单。',
  sources: [
    'first-pass-mental-model-contract.json',
    'learner-visible-route-crosswalk.json',
    'first-pass-runtime-output-crosswalk.json',
    'slow-single-step-execution-contract.json'
  ],
  route,
  actionChainOrder,
  cards,
  edges,
  audit: {
    allSevenCardsPresent: cards.length === 7,
    allEdgesPresent: edges.length === 7,
    everyPayloadHasConsumer: edges.every(x => x.allPayloadConsumed),
    everyCardHasNextQuestion: cards.every(x => Boolean(x.nextQuestion)),
    everyCardHasActionChainStep: cards.every(x => x.actionChainSteps.length > 0),
    orphanFields,
    orphanFieldCount: orphanFields.length,
    p3RangeMinimumVisible: visibleById.p3_range.requiredOutputs.includes('rangeBefore') &&
      visibleById.p3_range.requiredOutputs.includes('physicalRemovalReason') &&
      visibleById.p3_range.requiredOutputs.includes('actionFilterStatus') &&
      visibleById.p3_range.requiredOutputs.includes('rangeBeforeDenominator'),
    stateMachineAlignmentRows,
    stateMachineAlignmentComplete: stateMachineAlignmentRows.every(x => x.complete),
    outerHandoffRows,
    outerHandoffComplete: outerHandoffRows.every(x => x.complete),
    parentRestoreRule: mental.handoffContract.parentRestoreRule,
    unknownEvidenceStopsExactStrategy: mental.hardRules.missingEvidenceStopsExactStrategy,
    oneQuestionAtATime: mental.hardRules.onePrimaryQuestionPerScreen,
    onePrimaryActionAtATime: slow.observableActionChain.chainRules.onePrimaryActionAtATime
  },
  releaseRules: {
    orphanFieldBlocksStructureRelease: true,
    missingVisibleConsumerBlocksFirstPass: true,
    stateMachineHandoffMismatchBlocksRuntimeRelease: true,
    outerHandoffMismatchBlocksFirstPassRelease: true,
    missingRangeMinimumBlocksP3ToP4: true,
    missingSuccessorBlocksContinuousRoute: true,
    paperAuditDoesNotProveRuntime: true,
    paperAuditDoesNotProveLearnerMastery: true,
    paperAuditDoesNotProveNL50: true
  },
  currentEvidence: {
    paperAudit: true,
    runtimeImplemented: false,
    parentRestoreRuntime: false,
    learnerTrial: false,
    matchedReference: false,
    NL50Evidence: false
  }
};

fs.writeFileSync(path.join(dir, 'handoff-consumption-audit.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  ok: true,
  id: result.id,
  cards: result.cards.length,
  edges: result.edges.length,
  orphanFieldCount: result.audit.orphanFieldCount,
  p3RangeMinimumVisible: result.audit.p3RangeMinimumVisible,
  runtimeImplemented: result.currentEvidence.runtimeImplemented,
  learnerTrial: result.currentEvidence.learnerTrial
}, null, 2));
