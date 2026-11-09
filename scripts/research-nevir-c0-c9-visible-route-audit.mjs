import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir = 'research/nevir-system/';
const crosswalk = JSON.parse(fs.readFileSync(dir + 'c0-c9-visible-route-crosswalk.json', 'utf8'));
const closure = JSON.parse(fs.readFileSync(dir + 'reference-to-course-closure-contract.json', 'utf8'));
const packageCrosswalk = JSON.parse(fs.readFileSync(dir + 'course-package-field-crosswalk.json', 'utf8'));
const visual = JSON.parse(fs.readFileSync(dir + 'solver-course-visual-compiler-contract.json', 'utf8'));

assert.equal(crosswalk.id, 'C0_C9_VISIBLE_ROUTE_CROSSWALK_V1');
assert.equal(crosswalk.status, 'paper_c0_c9_to_visible_route_crosswalk_not_runtime');
const stages = closure.stages.map(x => x.id);
assert.deepEqual(crosswalk.canonicalStageOrder, stages);
assert.equal(crosswalk.stageRows.length, 10);
assert.deepEqual(crosswalk.stageRows.map(x => x.stage), stages);
assert.deepEqual(crosswalk.stageRows.map(x => x.output), closure.stages.map(x => x.output));
assert.deepEqual(crosswalk.visibleRoute, visual.userVisibleSequence);
const visible = new Set([...visual.userVisibleSequence, 'authorOnly', 'all_visible_steps', 'author_release_gate']);
for (const row of crosswalk.stageRows) {
  assert.ok(row.visibleAt.length >= 1, `stage has no visible owner: ${row.stage}`);
  assert.ok(row.consumedBy.length >= 1, `stage has no consumer: ${row.stage}`);
  for (const id of row.visibleAt) assert.ok(visible.has(id), `unknown visible layer ${row.stage}:${id}`);
}
const stageOutputs = crosswalk.stageRows.map(x => x.output);
assert.deepEqual(new Set(stageOutputs), new Set(closure.stages.map(x => x.output)));
const packageOutputs = packageCrosswalk.outputContract.map(x => x.courseOutput);
const learnerOutputs = crosswalk.stageRows.flatMap(x => [x.output, ...(x.additionalOutputs || [])]).filter(x => !crosswalk.authorOnlyOutputs.includes(x));
assert.deepEqual(new Set(learnerOutputs), new Set(packageOutputs));
const allCrosswalkOutputs = new Set([...learnerOutputs, ...crosswalk.authorOnlyOutputs]);
const visibleLineageSources = new Set(Object.values(visual.fieldLineage).flatMap(fields => Object.values(fields)));
for (const source of visibleLineageSources) assert.ok(allCrosswalkOutputs.has(source), `visible source is not mapped to C stage: ${source}`);
assert.equal(crosswalk.mappingRules.everyCStageHasOneRow, true);
assert.equal(crosswalk.mappingRules.stageOrderIsCanonical, true);
assert.equal(crosswalk.mappingRules.authorOnlyIsNotLearnerStep, true);
assert.equal(crosswalk.mappingRules.authorOnlyOutputsAreNotLearnerPackage, true);
assert.equal(crosswalk.mappingRules.missingC2BlocksExactAction, true);
assert.equal(crosswalk.mappingRules.missingC3BlocksRangeChange, true);
assert.equal(crosswalk.mappingRules.missingC6BlocksContinuousPractice, true);
assert.equal(crosswalk.mappingRules.missingC8BlocksTransfer, true);
assert.equal(crosswalk.currentEvidence.allTenStagesMapped, true);
assert.equal(crosswalk.currentEvidence.allPackageOutputsMapped, true);
assert.equal(crosswalk.currentEvidence.matchedReference, false);

const result = {
  ok: true,
  status: crosswalk.status,
  stages: crosswalk.stageRows.length,
  visibleLayers: crosswalk.visibleRoute.length,
  outputsMapped: learnerOutputs.length,
  authorOnlyOutputs: crosswalk.authorOnlyOutputs,
  visibleFieldSourcesMapped: true,
  authorOnlyStages: crosswalk.stageRows.filter(x => x.visibleAt.includes('authorOnly')).map(x => x.stage),
  runtimeImplemented: crosswalk.currentEvidence.runtimeImplemented,
  learnerTrial: crosswalk.currentEvidence.learnerTrial
};
fs.writeFileSync(dir + 'c0-c9-visible-route-audit.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
