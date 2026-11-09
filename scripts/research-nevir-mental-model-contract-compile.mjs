import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const file = path.join(dir, 'first-pass-mental-model-contract.json');
const contract = JSON.parse(fs.readFileSync(file, 'utf8'));

contract.outerRoute = ['L0', 'L1', 'L2', 'L3', 'L4'];
contract.innerRoute = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
contract.fullLearnerRoute = [...contract.outerRoute, ...contract.innerRoute, 'replay_transfer'];
contract.innerRouteParent = 'L4';
contract.outerMemoryTokens = [
  { id: 'tableFrame', required: ['table', 'trainingGoal', 'startingStackBB'] },
  { id: 'contextFrame', required: ['heroSeat', 'villainSeat', 'actionHistory', 'actor', 'potBB', 'effectiveStackBB', 'toCallBB'] },
  { id: 'preflopCell', required: ['chartIdentity', 'gridCell', 'rangeOwner'] },
  { id: 'preflopAction', required: ['preflopActionIdentity', 'actionWeight'] },
  { id: 'startingRangeFrame', required: ['rangeSnapshotHash', 'rangeBefore', 'physicalFilter', 'denominator'] }
];

const checks = contract.testProtocol.checks;
if (!checks.some(x => x.id === 'outerInnerNestingRecall')) {
  checks.splice(1, 0, {
    id: 'outerInnerNestingRecall',
    prompt: '隐藏步骤标题后，先说五个外层，再说翻后七步，并指出翻后七步套在哪个父层。',
    fixture: 'outer_inner_nesting_recall',
    minimum: { outerNodes: 5, innerNodes: 7, parentBoundary: 'L4' },
    firstAnswerBeforeHelp: true
  });
}
contract.testProtocol.checks = checks;
contract.mentalModelContract = {
  outerAndInnerAreOneNestedRoute: true,
  outerAnchorCount: 5,
  innerStepCount: 7,
  innerParent: 'L4',
  replayRequiresBothLayers: true,
  routeRecallCannotPassWithInnerOnly: true,
  routeRecallCannotPassWithOuterOnly: true
};

fs.writeFileSync(file, JSON.stringify(contract, null, 2) + '\n');
const valid = JSON.stringify(contract.fullLearnerRoute) === JSON.stringify(['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7','replay_transfer'])
  && contract.outerMemoryTokens.length === 5
  && contract.testProtocol.checks.some(x => x.id === 'outerInnerNestingRecall');
console.log(JSON.stringify({ ok: valid, id: 'MENTAL_MODEL_CONTRACT_COMPILE_V1', outer: contract.outerRoute.length, inner: contract.innerRoute.length, checks: contract.testProtocol.checks.length }));
if (!valid) process.exitCode = 1;

