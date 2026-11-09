import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const prompts = read('first-pass-outer-route-trial-prompts.json');
const key = read('first-pass-outer-route-trial-key.json');
const stateMachine = read('first-lesson-visible-state-machine.json');
const ranges = JSON.parse(fs.readFileSync(path.join(root, 'src/data/ranges.json'), 'utf8'));

const requiredRoute = ['L0', 'L1', 'L2', 'L3', 'L4'];
const stateById = Object.fromEntries(stateMachine.states.map(state => [state.id, state]));
const promptById = Object.fromEntries(prompts.cases.map(item => [item.id, item]));
const keyById = Object.fromEntries(key.cases.map(item => [item.id, item]));
const bannedTerms = /\b(EV|GTO|CFR|blocker|backdoor|频率|极化|solver|求解器)\b/i;

assert.equal(prompts.id, 'FIRST_PASS_OUTER_ROUTE_TRIAL_PROMPTS_V1');
assert.equal(key.id, 'FIRST_PASS_OUTER_ROUTE_TRIAL_KEY_V1');
assert.deepEqual(prompts.administration.order, requiredRoute);
assert.deepEqual(key.route, requiredRoute);
assert.equal(prompts.cases.length, requiredRoute.length);
assert.equal(key.cases.length, requiredRoute.length);

const promptRoute = prompts.cases.map(item => item.routeNode);
const keyRoute = key.cases.map(item => item.routeNode);
assert.deepEqual(promptRoute, requiredRoute);
assert.deepEqual(keyRoute, requiredRoute);

const stateOutputAliases = {
  L0: ['table', 'trainingGoal', 'startingStackBB'],
  L1: ['heroSeat', 'villainSeat', 'actionHistory', 'actor', 'potBB', 'effectiveStackBB', 'toCallBB'],
  L2: ['chartIdentity', 'gridCell', 'rangeOwner'],
  L3: ['preflopActionIdentity', 'actionWeight'],
  L4: ['rangeSnapshotHash', 'rangeBefore', 'physicalFilter', 'denominator']
};
const caseChecks = prompts.cases.map(prompt => {
  const answer = keyById[prompt.id];
  const state = stateById[prompt.routeNode];
  assert.ok(answer, `missing answer key ${prompt.id}`);
  assert.equal(answer.routeNode, prompt.routeNode);
  assert.ok(state, `missing state ${prompt.routeNode}`);
  assert.deepEqual(
    [...prompt.allowedResponseShape.slice(0, stateOutputAliases[prompt.routeNode].length)].sort(),
    [...stateOutputAliases[prompt.routeNode]].sort()
  );
  assert.equal(prompt.next, state.next);
  assert.equal(prompt.errorReturn, state.errorReturn);
  assert.equal(prompt.noStrategy, true);
  assert.equal(prompt.allowedResponseShape.length > 0, true);
  assert.equal(prompt.primaryAction.length > 0, true);
  assert.equal(prompt.handoffCardTemplate.length > 0, true);
  assert.equal(answer.handoff.length > 0, true);
  assert.equal(bannedTerms.test(prompt.question), false, `technical leakage in ${prompt.id}`);
  assert.equal(bannedTerms.test(prompt.primaryAction), false, `technical leakage in action ${prompt.id}`);
  return {
    id: prompt.id,
    routeNode: prompt.routeNode,
    outputFields: prompt.allowedResponseShape,
    expectedFields: Object.keys(answer.expected),
    next: prompt.next,
    errorReturn: prompt.errorReturn,
    noStrategy: prompt.noStrategy
  };
});

const btnChart = ranges.find(chart => chart.id === 'open-BTN');
assert.ok(btnChart, 'open-BTN chart missing');
const ako = btnChart.hands.AKo;
assert.ok(ako, 'AKo missing from open-BTN chart');
assert.deepEqual(ako, { row: 1, col: 0, action: { raise: 1 } });
const l2 = keyById.OL03.expected;
const l3 = keyById.OL04.expected;
assert.equal(l2.chartIdentity, btnChart.id);
assert.equal(l2.gridCell.hand, 'AKo');
assert.deepEqual({ row: l2.gridCell.row, col: l2.gridCell.col }, { row: ako.row, col: ako.col });
assert.equal(l3.preflopActionIdentity, Object.keys(ako.action)[0]);
assert.equal(l3.actionWeight, ako.action[l3.preflopActionIdentity]);

const scenario = prompts.sharedScenario;
assert.equal(scenario.players, 6);
assert.equal(scenario.startingStackBB, 100);
assert.equal(scenario.heroSeat, 'BTN');
assert.deepEqual(scenario.heroHole, ['As', 'Kd']);
assert.equal(scenario.currentActor, 'BTN');
assert.equal(scenario.potBB, 5.5);
assert.equal(scenario.effectiveStackBB, 97.5);
assert.equal(scenario.toCallBB, 0);

const result = {
  id: 'FIRST_PASS_OUTER_ROUTE_VALIDATION_V1',
  status: 'outer_trial_packet_semantically_valid_paper_only',
  purpose: '独立校验首遍外层题面、答案键、状态机输出和本地翻前图表是否互相一致。',
  sources: [
    'first-pass-outer-route-trial-prompts.json',
    'first-pass-outer-route-trial-key.json',
    'first-lesson-visible-state-machine.json',
    'src/data/ranges.json'
  ],
  route: requiredRoute,
  caseChecks,
  chartCheck: {
    chartId: btnChart.id,
    hand: 'AKo',
    gridCell: { row: ako.row, col: ako.col },
    action: ako.action,
    sourceMatch: true
  },
  scenarioCheck: {
    sixMax: scenario.players === 6,
    startingStackBB: scenario.startingStackBB,
    heroSeat: scenario.heroSeat,
    currentActor: scenario.currentActor,
    potBB: scenario.potBB,
    effectiveStackBB: scenario.effectiveStackBB,
    toCallBB: scenario.toCallBB
  },
  semanticChecks: {
    routeOrderExact: true,
    promptAndKeyRouteAligned: JSON.stringify(promptRoute) === JSON.stringify(keyRoute),
    stateOutputShapesAligned: true,
    noStrategyLeakage: caseChecks.every(item => item.noStrategy),
    handoffCardsComplete: prompts.cases.every(item => item.handoffCardTemplate.length > 0) &&
      key.cases.every(item => item.handoff.length > 0),
    chartCoordinateAndActionMatch: true,
    l4DoesNotInventExactRange: keyById.OL05.expected.rangeSnapshotHash === 'compiler_output_required' &&
      keyById.OL05.expected.rangeBefore === 'reference_or_course_package_required'
  },
  currentEvidence: {
    paperValidation: true,
    runtimeAttached: false,
    participantObserved: false,
    matchedReference: false,
    NL50Evidence: false
  },
  releaseRules: {
    semanticMismatchBlocksTrial: true,
    strategyLeakageBlocksStructureTrial: true,
    missingL4ReferenceMustStopExactStrategy: true,
    paperValidationDoesNotProveLearnerMastery: true,
    paperValidationDoesNotProveNL50: true
  }
};

fs.writeFileSync(path.join(dir, 'first-pass-outer-route-validation.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  ok: true,
  id: result.id,
  routeStates: result.route.length,
  chartCoordinateAndActionMatch: result.semanticChecks.chartCoordinateAndActionMatch,
  noStrategyLeakage: result.semanticChecks.noStrategyLeakage,
  l4DoesNotInventExactRange: result.semanticChecks.l4DoesNotInventExactRange,
  participantObserved: result.currentEvidence.participantObserved
}, null, 2));
