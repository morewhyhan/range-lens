import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const generator = read('automatic-question-generation-contract.json');
const scheduler = read('learner-evidence-driven-scheduler.json');
const route = read('learner-goal-route-canonical.json');
const crosswalk = read('principle-loop-unit-crosswalk.json');

const errors = [];
const requiredFilters = generator.schedulerContract.hardFilterOrderMustInclude;
for (const filter of requiredFilters) {
  if (!scheduler.hardFilterOrder.includes(filter)) errors.push(`scheduler missing hard filter ${filter}`);
}
const expectedRoute = route.outerRoute.map(row => row.id);
if (JSON.stringify(scheduler.modes.firstPass.route) !== JSON.stringify(expectedRoute)) {
  errors.push('first-pass scheduler route differs from canonical route');
}
const expectedRepresentatives = crosswalk.representativeManifest.units;
if (JSON.stringify(scheduler.modes.firstPass.representatives) !== JSON.stringify(expectedRepresentatives)) {
  errors.push('first-pass scheduler representatives differ from crosswalk');
}
for (const event of ['wrong','unknown','missing_reference','missing_successor','child_close']) {
  const transition = scheduler.eventTransitions[event];
  if (!transition?.next || !transition?.promotion) errors.push(`${event}: missing deterministic next or promotion rule`);
}
if (scheduler.exposure.hardRepairOverridesRatios !== true) errors.push('repair must override user ratios');
if (scheduler.exposure.answerWeightsUnchanged !== true) errors.push('sampling must not rewrite answer weights');
if (scheduler.exposure.emptyPoolStops !== true) errors.push('empty pool must stop rather than substitute');
if (scheduler.guards.noCrossParentRepair !== true) errors.push('cross-parent repair must be forbidden');
if (scheduler.guards.noRandomStrategyAnswer !== true) errors.push('random strategy answer must be forbidden');
if (scheduler.sessionOnly !== true) errors.push('scheduler state must remain session-only');

const result = {
  id: 'QUESTION_SCHEDULER_AUDIT_V1',
  status: errors.length ? 'paper_question_scheduler_contract_gap_found' : 'paper_question_scheduler_contract_consistent_not_runtime',
  sources: [
    'automatic-question-generation-contract.json',
    'learner-evidence-driven-scheduler.json',
    'learner-goal-route-canonical.json',
    'principle-loop-unit-crosswalk.json'
  ],
  checks: {
    allRequiredFiltersPresent: errors.every(error => !error.includes('missing hard filter')),
    firstPassRouteMatchesCanonical: errors.every(error => !error.includes('first-pass scheduler route')),
    representativesMatchCrosswalk: errors.every(error => !error.includes('representatives differ')),
    deterministicRepairTransitions: ['wrong','unknown','missing_reference','missing_successor','child_close'].every(event => Boolean(scheduler.eventTransitions[event]?.next)),
    samplingCannotRewritePolicy: scheduler.exposure.answerWeightsUnchanged === true,
    emptyPoolStops: scheduler.exposure.emptyPoolStops === true,
    sessionOnly: scheduler.sessionOnly === true
  },
  currentEvidence: {
    compilerImplemented: false,
    runtimeAttached: false,
    learnerTrial: false,
    matchedReference: false,
    NL50Evidence: false
  }
};
fs.writeFileSync(path.join(dir, 'question-scheduler-audit.json'), JSON.stringify(result, null, 2) + '\n');
if (errors.length) {
  console.error(JSON.stringify({ ok: false, status: result.status, errors }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, status: result.status, routeStates: expectedRoute.length, representatives: expectedRepresentatives.length }));
}
