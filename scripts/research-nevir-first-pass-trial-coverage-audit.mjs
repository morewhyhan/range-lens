import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const packet = read('low-baseline-first-pass-trial-packet.json');
const acceptance = read('cross-age-low-baseline-acceptance.json');
const stateMachine = read('first-lesson-visible-state-machine.json');
const handoff = read('handoff-consumption-audit.json');
const outerPrompts = read('first-pass-outer-route-trial-prompts.json');
const outerKey = read('first-pass-outer-route-trial-key.json');
const outerValidation = read('first-pass-outer-route-validation.json');

const outerIds = ['L0', 'L1', 'L2', 'L3', 'L4'];
const innerIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
const fullReplayOrder = [...outerIds, ...innerIds];
const innerKeys = {
  p1: 'p1_context', p2: 'p2_board', p3: 'p3_range', p4: 'p4_compare',
  p5: 'p5_execute', p6: 'p6_update', p7: 'p7_close'
};
const stateById = Object.fromEntries(stateMachine.states.map(state => [state.id, state]));
const outer = packet.outerRouteCoverage;
const mappedOuter = Object.fromEntries(outerIds.map(id => [id, outer?.caseMapping?.[id] ?? []]));
const missingOuterCaseStates = outerIds.filter(id => mappedOuter[id].length === 0);
const promptById = Object.fromEntries(outerPrompts.cases.map(item => [item.id, item]));
const keyById = Object.fromEntries(outerKey.cases.map(item => [item.id, item]));
const mappedOuterCaseIds = Object.values(mappedOuter).flat();
const missingMappedPromptCases = mappedOuterCaseIds.filter(id => !promptById[id]);
const missingMappedKeyCases = mappedOuterCaseIds.filter(id => !keyById[id]);
const mappedCaseRouteMismatches = mappedOuterCaseIds.filter(id => promptById[id]?.routeNode !== keyById[id]?.routeNode);
const missingOuterInputs = outerIds.flatMap(id => {
  const state = stateById[id];
  return state ? [] : [id];
});
const innerCoverage = Object.fromEntries(innerIds.map(id => [id, packet.guidedCoverage?.[innerKeys[id]] ?? []]));
const missingInnerCoverage = innerIds.filter(id => {
  return !(packet.guidedCoverage?.[innerKeys[id]]?.length);
});
const requiredTasks = acceptance.firstPassTasks ?? [];
const requiredOuterTask = requiredTasks.includes('L0_to_L4_context_and_range_handoff');
const expectedFullGuidedOrder = [...mappedOuterCaseIds, ...packet.guidedOrder];
const fullGuidedOrder = packet.fullGuidedOrder ?? [];
const fullGuidedOrderExact = JSON.stringify(fullGuidedOrder) === JSON.stringify(expectedFullGuidedOrder);
const outerPrefixBeforeInner = JSON.stringify(fullGuidedOrder.slice(0, mappedOuterCaseIds.length)) === JSON.stringify(mappedOuterCaseIds);

const result = {
  id: 'FIRST_PASS_TRIAL_COVERAGE_AUDIT_V1',
  status: 'paper_trial_coverage_audited_outer_route_mapped_not_observed',
  purpose: '把“首遍”拆成可审计的外层L0→L4与内层p1→p7，防止只做翻后案例就误称完成了首遍。',
  sources: [
    'low-baseline-first-pass-trial-packet.json',
    'cross-age-low-baseline-acceptance.json',
    'first-lesson-visible-state-machine.json',
    'handoff-consumption-audit.json',
    'first-pass-outer-route-trial-prompts.json',
    'first-pass-outer-route-trial-key.json',
    'first-pass-outer-route-validation.json'
  ],
  requiredOuterOrder: outerIds,
  requiredInnerOrder: innerIds,
  outerRoute: {
    declared: Boolean(outer),
    contract: outer?.contract ?? null,
    order: outer?.requiredOrder ?? [],
    orderExact: JSON.stringify(outer?.requiredOrder ?? []) === JSON.stringify(outerIds),
    trialOrderBeforeInnerRoute: outer?.trialOrderBeforeInnerRoute === true,
    requiredInputsFollowStateMachine: outer?.requiredInputsFollowStateMachine === true,
    mappedCaseIds: mappedOuter,
    mappedOuterCaseCount: mappedOuterCaseIds.length,
    missingOuterCaseStates,
    promptCaseCount: outerPrompts.cases.length,
    answerCaseCount: outerKey.cases.length,
    missingMappedPromptCases,
    missingMappedKeyCases,
    mappedCaseRouteMismatches,
    missingStateDefinitions: missingOuterInputs,
    minimumPromptContract: outer?.minimumPromptContract ?? null,
    structureReplay: outer?.structureReplay ?? null,
    structureReplayOrderExact: JSON.stringify(outer?.structureReplay?.order ?? []) === JSON.stringify(fullReplayOrder),
    structureReplayChecks: outer?.structureReplay?.checks ?? [],
    status: outer?.status ?? 'missing'
  },
  innerRoute: {
    declared: innerIds.every(id => (packet.guidedCoverage?.[innerKeys[id]] ?? []).length > 0),
    coverage: innerCoverage,
    missingInnerCoverage,
    handoffCards: handoff.cards.length,
    handoffEdges: handoff.edges.length,
    handoffOrphanFields: handoff.audit.orphanFieldCount
  },
  firstPassAcceptance: {
    outerTaskRequiredByContract: requiredOuterTask,
    outerTaskHasCases: requiredOuterTask && missingOuterCaseStates.length === 0 && missingMappedPromptCases.length === 0 && missingMappedKeyCases.length === 0,
    allFirstPassTasksDeclared: requiredTasks.length === 7,
    fullGuidedOrderExact,
    outerPrefixBeforeInner,
    crossAgeTrialObserved: acceptance.currentEvidence.crossAgeTrial === true,
    packetParticipantObserved: packet.currentEvidence.participantObserved === true
  },
  semanticValidation: {
    status: outerValidation.status,
    routeOrderExact: outerValidation.semanticChecks.routeOrderExact,
    stateOutputShapesAligned: outerValidation.semanticChecks.stateOutputShapesAligned,
    noStrategyLeakage: outerValidation.semanticChecks.noStrategyLeakage,
    handoffCardsComplete: outerValidation.semanticChecks.handoffCardsComplete,
    chartCoordinateAndActionMatch: outerValidation.semanticChecks.chartCoordinateAndActionMatch,
    l4DoesNotInventExactRange: outerValidation.semanticChecks.l4DoesNotInventExactRange,
    participantObserved: outerValidation.currentEvidence.participantObserved
  },
  releaseRules: {
    missingOuterCaseBlocksCompleteFirstPassClaim: true,
    missingOuterObservationBlocksRuntimeRelease: true,
    semanticMismatchBlocksTrial: true,
    innerHandoffOrphansBlockTrial: true,
    paperCoverageDoesNotProveLearnerMastery: true,
    paperCoverageDoesNotProveNL50: true
  },
  currentEvidence: {
    paperAudit: true,
    outerRouteCasesMapped: mappedOuterCaseIds.length === outerIds.length && missingMappedPromptCases.length === 0 && missingMappedKeyCases.length === 0 && mappedCaseRouteMismatches.length === 0,
    outerRouteObserved: false,
    innerRouteDeclared: innerIds.every(id => (packet.guidedCoverage?.[innerKeys[id]] ?? []).length > 0),
    innerRouteObserved: packet.currentEvidence.participantObserved === true,
    fullGuidedOrderReady: fullGuidedOrderExact && outerPrefixBeforeInner,
    runtimeImplemented: false,
    learnerTrial: false,
    matchedReference: false,
    NL50Evidence: false
  }
};

fs.writeFileSync(path.join(dir, 'first-pass-trial-coverage-audit.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  ok: true,
  id: result.id,
  outerRouteDeclared: result.outerRoute.declared,
  mappedOuterCaseCount: result.outerRoute.mappedOuterCaseCount,
  missingOuterCaseStates: result.outerRoute.missingOuterCaseStates,
  innerRouteDeclared: result.innerRoute.declared,
  participantObserved: result.firstPassAcceptance.packetParticipantObserved,
  fullGuidedOrderExact: result.firstPassAcceptance.fullGuidedOrderExact,
  outerPrefixBeforeInner: result.firstPassAcceptance.outerPrefixBeforeInner
}, null, 2));
