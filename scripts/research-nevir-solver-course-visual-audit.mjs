import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir = 'research/nevir-system/';
const c = JSON.parse(fs.readFileSync(dir + 'solver-course-visual-compiler-contract.json', 'utf8'));
const packageCrosswalk = JSON.parse(fs.readFileSync(dir + 'course-package-field-crosswalk.json', 'utf8'));
const rangeVisual = JSON.parse(fs.readFileSync(dir + 'range-delta-visual-closure.json', 'utf8'));
const route = JSON.parse(fs.readFileSync(dir + 'learner-goal-route-canonical.json', 'utf8'));

assert.equal(c.id, 'SOLVER_COURSE_VISUAL_COMPILER_CONTRACT_V1');
assert.equal(c.status, 'paper_visual_compiler_contract_not_implemented');
assert.deepEqual(c.userVisibleSequence, [
  'context', 'physicalFacts', 'rangeBefore', 'compareChoices',
  'executeLedger', 'rangeAfter', 'successorOrStop', 'restatementAndTransfer'
]);
assert.equal(c.dataLayers.length, c.userVisibleSequence.length);
assert.deepEqual(c.dataLayers.map(x => x.id), c.userVisibleSequence);
assert.deepEqual(c.dataLayers.map(x => x.routeStep), [
  'p1_context', 'p2_board', 'p3_range', 'p4_compare',
  'p5_execute', 'p6_update', 'p6_update', 'p7_close'
]);
assert.deepEqual(c.dataLayers.map(x => x.consumesFrom), [
  ['initialInput'], ['contextSnapshot'], ['handAndBoardFacts'],
  ['rangeBeforeAndPhysicalRemoval'], ['courseDecisionCandidate'],
  ['actionLedgerAndActor'], ['rangeAfterAndChangeReason'], ['successorOrStop']
]);
for (const layer of c.dataLayers) {
  assert.ok(layer.requiredFields.length >= 3, `too few fields: ${layer.id}`);
  assert.ok(layer.plainQuestion && layer.handoff && layer.blocks, `incomplete layer: ${layer.id}`);
  assert.ok(layer.visible.length >= 2, `too little visual output: ${layer.id}`);
}
assert.equal(c.visualRules.oneCentralVisualPerStep, true);
assert.equal(c.visualRules.same13x13CoordinateBeforeAfter, true);
assert.equal(c.visualRules.sameScaleBeforeAfter, true);
assert.equal(c.visualRules.sameDenominatorBeforeAfter, true);
assert.equal(c.visualRules.physicalImpossibleDistinctFromActionFiltered, true);
assert.equal(c.visualRules.unknownReferenceDistinctFromZero, true);
assert.equal(c.visualRules.colorIsNotSoleSemanticChannel, true);
assert.deepEqual(Object.keys(c.formulaContract), [
  'physicalWeight', 'referenceAfter', 'courseAfter', 'viewShare', 'rangeDelta', 'policyLoss'
]);
assert.deepEqual(c.handoffConsumption, {
  initialInput: 'contextSnapshot',
  contextSnapshot: 'handAndBoardFacts',
  handAndBoardFacts: 'rangeBeforeAndPhysicalRemoval',
  rangeBeforeAndPhysicalRemoval: 'courseDecisionCandidate',
  courseDecisionCandidate: 'actionLedgerAndActor',
  actionLedgerAndActor: 'rangeAfterAndChangeReason',
  rangeAfterAndChangeReason: 'successorOrStop',
  successorOrStop: 'closeAndTransferField',
  closeAndTransferField: 'terminal_or_heldout_transfer'
});
const packageOutputs = new Set(packageCrosswalk.outputContract.map(x => x.courseOutput));
for (const layer of c.dataLayers) {
  const lineage = c.fieldLineage[layer.id];
  assert.ok(lineage, `missing field lineage ${layer.id}`);
  assert.deepEqual(Object.keys(lineage).sort(), [...layer.requiredFields].sort(), `lineage fields mismatch ${layer.id}`);
  for (const [field, source] of Object.entries(lineage)) {
    assert.ok(packageOutputs.has(source), `unknown package source ${layer.id}:${field}:${source}`);
  }
}
for (const [id, value] of Object.entries(c.sourceBoundaryRules)) assert.equal(value, true, `boundary ${id}`);
assert.equal(c.releaseGates.length, 6);
assert.deepEqual(c.releaseGates.map(x => x.id), ['V0_fact','V1_range','V2_compare','V3_range_change','V4_continuous','V5_transfer']);
assert.equal(c.runtimeIntegration.frontendReadsOnly, 'verified_static_lesson_package');
assert.equal(c.runtimeIntegration.solveOnAnswerClick, false);
assert.equal(c.runtimeIntegration.runtimeInfersMissingPolicy, false);
assert.equal(c.currentEvidence.compilerImplemented, false);
assert.equal(c.currentEvidence.matchedReference, false);

assert.deepEqual(packageCrosswalk.formulaContract.viewShare, 'after(h,a) / sum_h(after(h,a))');
assert.equal(packageCrosswalk.solverFieldRules.equityDoesNotImplyAction, true);
assert.equal(packageCrosswalk.solverFieldRules.courseAfterRequiresExplicitCoursePolicy, true);
assert.deepEqual(rangeVisual.stateSequence, ['rangeBefore','physicalAfter','actionAfter','successorAfter']);
assert.equal(rangeVisual.viewRules.same13x13Coordinate, true);
assert.equal(rangeVisual.viewRules.sameDenominator, true);
assert.equal(rangeVisual.releaseGates.unknownDistinctFromZero, true);
assert.deepEqual(route.postflopSequentialChain, ['p1_context','p2_board','p3_range','p4_compare','p5_execute','p6_update','p7_close']);
assert.equal(route.screenContract.oneQuestion, true);
assert.equal(route.screenContract.onePrimaryAction, true);

const result = {
  ok: true,
  status: c.status,
  layers: c.dataLayers.length,
  userVisibleSequence: c.userVisibleSequence,
  formulas: Object.keys(c.formulaContract).length,
  releaseGates: c.releaseGates.length,
  handoffEdges: Object.keys(c.handoffConsumption).length,
  fieldLineageFields: Object.values(c.fieldLineage).reduce((sum, fields) => sum + Object.keys(fields).length, 0),
  rangeChartRules: {
    sameCoordinate: c.visualRules.same13x13CoordinateBeforeAfter,
    sameDenominator: c.visualRules.sameDenominatorBeforeAfter,
    unknownDistinctFromZero: c.visualRules.unknownReferenceDistinctFromZero
  },
  fieldReaderAudit: c.currentEvidence.fieldReaderAudit,
  fieldLineageAudit: c.currentEvidence.fieldLineageAudit,
  runtimeImplemented: c.currentEvidence.compilerImplemented && c.currentEvidence.rangeRuntime,
  learnerTrial: c.currentEvidence.learnerTrial
};
fs.writeFileSync(dir + 'solver-course-visual-audit.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
