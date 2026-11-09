import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir = 'research/nevir-system/';
const crosswalk = JSON.parse(fs.readFileSync(dir + 'principle-loop-unit-crosswalk.json', 'utf8'));
const closure = JSON.parse(fs.readFileSync(dir + 'principle-unit-closure.json', 'utf8'));
const nested = JSON.parse(fs.readFileSync(dir + 'full-nested-learning-route.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync(dir + 'unit-course-manifest.json', 'utf8'));
const releaseGates = JSON.parse(fs.readFileSync(dir + 'unit-learner-release-gates.json', 'utf8'));
const expectedParent = {
  'compare.unopened': 'p4_compare',
  'compare.bet': 'p4_compare',
  'compare.raise': 'p4_compare',
  'update.response': 'p6_update',
  'update.card': 'p6_update'
};
const rowsById = new Map(crosswalk.rows.map(row => [row.unitId, row]));
const closureById = new Map(closure.units.map(row => [row.unitId, row]));

assert.equal(crosswalk.rows.length, 35, 'crosswalk must enumerate exactly 35 units');
assert.equal(closure.units.length, 35, 'closure must enumerate exactly 35 units');
assert.equal(new Set(crosswalk.rows.map(row => row.unitId)).size, 35, 'unit ids must be unique');
assert.deepEqual(
  nested.masteryPass.sequence,
  crosswalk.rows.map(row => row.unitId),
  'mastery route must use the same deterministic unit order as the crosswalk'
);
assert.deepEqual(
  manifest.rows.map(row => row.unitId),
  crosswalk.rows.map(row => row.unitId),
  'joined course manifest must not reorder or omit units'
);
assert.deepEqual(
  releaseGates.unitRows.map(row => row.unitId),
  crosswalk.rows.map(row => row.unitId),
  'learner release gates must not reorder or omit units'
);

const errors = [];
for (const row of crosswalk.rows) {
  const closureRow = closureById.get(row.unitId);
  if (!closureRow) {
    errors.push(`${row.unitId}: missing closure row`);
    continue;
  }
  if (expectedParent[row.groupId] !== row.parentFrame) {
    errors.push(`${row.unitId}: group ${row.groupId} must return to ${expectedParent[row.groupId]}, got ${row.parentFrame}`);
  }
  const manifestRow = manifest.rows.find(candidate => candidate.unitId === row.unitId);
  if (!manifestRow) {
    errors.push(`${row.unitId}: missing joined manifest row`);
  } else {
    if (manifestRow.route.parentFrame !== row.parentFrame) errors.push(`${row.unitId}: manifest parent differs from crosswalk`);
    if (manifestRow.route.returnTo !== row.parentFrame) errors.push(`${row.unitId}: unit does not return to its parent`);
    if (manifestRow.route.groupId !== row.groupId) errors.push(`${row.unitId}: manifest group differs from crosswalk`);
    if (manifestRow.route.flatHomeVisible !== false) errors.push(`${row.unitId}: flat home visibility is not disabled`);
    if (manifestRow.route.opensOnlyFromParent !== true) errors.push(`${row.unitId}: unit can open outside parent`);
  }
  const releaseRow = releaseGates.unitRows.find(candidate => candidate.unitId === row.unitId);
  if (!releaseRow) {
    errors.push(`${row.unitId}: missing learner release row`);
  } else {
    if (releaseRow.groupId !== row.groupId) errors.push(`${row.unitId}: release group differs from crosswalk`);
    if (releaseRow.parentFrame !== row.parentFrame) errors.push(`${row.unitId}: release parent differs from crosswalk`);
    if (releaseRow.returnTo !== row.parentFrame) errors.push(`${row.unitId}: release return point differs from parent`);
    if (releaseRow.representative !== Boolean(row.firstPassRepresentative)) errors.push(`${row.unitId}: representative flag differs from crosswalk`);
    if (releaseRow.firstPassVisible !== Boolean(row.firstPassRepresentative)) errors.push(`${row.unitId}: first-pass visibility differs from crosswalk`);
  }
  // `principles` is the parent-frame principle set. `primaryPrinciple` may be
  // an explicit reinforcement principle from the source closure, so it must
  // be present in one of those two declared sets rather than guessed.
  const declaredPrinciples = new Set([
    ...row.principles,
    ...(closureRow.explicitReinforcement ?? [])
  ]);
  if (!declaredPrinciples.has(row.primaryPrinciple)) {
    errors.push(`${row.unitId}: primary ${row.primaryPrinciple} is not declared by parent or explicit reinforcement`);
  }
  if (row.baseCase?.required !== true) errors.push(`${row.unitId}: base card is not required`);
  if (row.contrastCase?.required !== true) errors.push(`${row.unitId}: contrast card is not required`);
  if (row.contrastCase?.exactlyOneChangedField !== true) errors.push(`${row.unitId}: contrast card does not enforce one changed field`);
  if (row.transferCase?.required !== true) errors.push(`${row.unitId}: transfer card is not required`);
  if (row.transferCase?.hideUnitLabel !== true) errors.push(`${row.unitId}: transfer label is not hidden`);
  if (row.transferCase?.identifyChangedFieldBeforeAnswer !== true) errors.push(`${row.unitId}: transfer does not require changed-field identification`);
  if (!row.stopIfMissing || !row.exactGradeRequires) errors.push(`${row.unitId}: missing stop or exact-grade boundary`);
}

const representativeRows = crosswalk.rows.filter(row => Number.isInteger(row.firstPassRepresentative?.order));
assert.equal(representativeRows.length, 5, 'first-pass representative set must contain five units');
assert.deepEqual(
  representativeRows.map(row => row.firstPassRepresentative.order).sort((a, b) => a - b),
  [1, 2, 3, 4, 5],
  'representative order must be 1..5 without duplicates'
);

if (errors.length) {
  console.error(JSON.stringify({ ok: false, status: 'paper_crosswalk_inconsistent', errors }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    ok: true,
    status: 'paper_crosswalk_consistent_not_released',
    units: crosswalk.rows.length,
    groups: Object.keys(expectedParent).length,
    representatives: representativeRows.map(row => row.unitId),
    runtimeImplemented: false,
    learnerTrialVerified: false
  }));
}
