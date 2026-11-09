import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir = 'research/nevir-system/';
const crosswalk = JSON.parse(fs.readFileSync(dir + 'unit-c0-c9-release-crosswalk.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync(dir + 'unit-course-manifest.json', 'utf8'));
const ledger = JSON.parse(fs.readFileSync(dir + 'unit-reference-course-ledgers.json', 'utf8'));
const attachment = JSON.parse(fs.readFileSync(dir + 'unit-route-attachment.json', 'utf8'));
const principle = JSON.parse(fs.readFileSync(dir + 'principle-loop-unit-crosswalk.json', 'utf8'));

assert.equal(crosswalk.id, 'UNIT_C0_C9_RELEASE_CROSSWALK_V1');
assert.equal(crosswalk.status, 'paper_35_unit_c0_c9_release_crosswalk_not_released');
assert.equal(crosswalk.rows.length, 35);
assert.deepEqual(crosswalk.rows.map(x => x.unitId), attachment.allUnits);
assert.deepEqual(crosswalk.rows.map(x => x.unitId), manifest.rows.map(x => x.unitId));
assert.deepEqual(crosswalk.rows.map(x => x.unitId), ledger.rows.map(x => x.unitId));
assert.deepEqual(crosswalk.rows.map(x => x.unitId), principle.rows.map(x => x.unitId));
assert.deepEqual(crosswalk.stageOrder, ['C0_identity','C1_physical_facts','C2_reference_solve','C3_reference_quality','C4_course_policy','C5_difference','C6_successor_closure','C7_lesson_compile','C8_transfer_compile','C9_release_audit']);
assert.deepEqual(crosswalk.releaseGateOrder, ['map','guided','independent','adjacent','delayed','continuous']);
assert.deepEqual(crosswalk.representativeOrder, ['1.5','2.1','3.1','4.5','5.7']);
for (const row of crosswalk.rows) {
  assert.equal(row.requiredCStages.length, 10, `C stage count ${row.unitId}`);
  assert.deepEqual(row.requiredCStages, crosswalk.stageOrder);
  assert.deepEqual(row.releaseGateOrder, crosswalk.releaseGateOrder);
  assert.equal(row.parentFrame, crosswalk.groupParent[row.groupId], `parent ${row.unitId}`);
  assert.equal(row.returnTo, row.parentFrame, `return ${row.unitId}`);
  assert.equal(row.opensOnlyFromParent, true, `parent lock ${row.unitId}`);
  assert.equal(row.flatHomeVisible, false, `flat home ${row.unitId}`);
  assert.equal(typeof row.stopReason, 'string');
  assert.equal(row.learnerTrialVerified, false);
}
for (const [groupId, parent] of Object.entries(crosswalk.groupParent)) {
  assert.ok(crosswalk.rows.some(x => x.groupId === groupId && x.parentFrame === parent));
}
for (const rule of Object.values(crosswalk.globalRules)) assert.equal(rule, true);
assert.equal(crosswalk.currentEvidence.all35UnitsMapped, true);
assert.equal(crosswalk.currentEvidence.allParentsMatch, true);
assert.equal(crosswalk.currentEvidence.allCStagesDeclared, true);
assert.equal(crosswalk.currentEvidence.allReleaseGatesDeclared, true);
assert.equal(crosswalk.currentEvidence.all35ExactStrategyReady, false);
assert.equal(crosswalk.currentEvidence.learnerTrial, false);

const result = {
  ok: true,
  status: crosswalk.status,
  units: crosswalk.rows.length,
  stages: crosswalk.stageOrder.length,
  releaseGates: crosswalk.releaseGateOrder.length,
  representatives: crosswalk.representativeOrder,
  groups: Object.keys(crosswalk.groupParent).length,
  allParentsMatch: crosswalk.currentEvidence.allParentsMatch,
  exactStrategyReady: crosswalk.currentEvidence.all35ExactStrategyReady,
  runtimeAttached: crosswalk.currentEvidence.all35RuntimeAttached,
  learnerTrial: crosswalk.currentEvidence.learnerTrial
};
fs.writeFileSync(dir + 'unit-c0-c9-release-audit.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
