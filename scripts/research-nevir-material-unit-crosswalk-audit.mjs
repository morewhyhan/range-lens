import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const crosswalk = JSON.parse(fs.readFileSync(path.join(dir, 'material-unit-crosswalk.json'), 'utf8'));
const material = JSON.parse(fs.readFileSync(path.join(dir, 'material-policy-classification.json'), 'utf8'));
const requests = JSON.parse(fs.readFileSync(path.join(dir, 'unit-reference-snapshot-request-manifest.json'), 'utf8'));
assert.equal(crosswalk.id, 'MATERIAL_UNIT_CROSSWALK_V1');
assert.equal(crosswalk.rows.length, material.rows.length);
assert.equal(crosswalk.rows.length, 374);
assert.equal(crosswalk.counts.exactUnitRows, 0);
assert.equal(crosswalk.currentEvidence.exactUnitBinding, false);
const validGroups = new Set(requests.rows.map(row => row.groupId));
const validStatuses = new Set(['candidate_unit_pending_identity_match', 'author_only', 'stop_at_parent', 'mechanism_parent_only']);
for (const row of crosswalk.rows) {
  assert.ok(validStatuses.has(row.mappingStatus), row.materialId);
  assert.ok(Array.isArray(row.candidateGroups), row.materialId);
  for (const group of row.candidateGroups) assert.ok(validGroups.has(group), `${row.materialId}:${group}`);
  if (row.mappingStatus === 'candidate_unit_pending_identity_match') {
    assert.ok(row.candidateGroups.length > 0, row.materialId);
    assert.ok(row.candidateUnitIds.length > 0, row.materialId);
    assert.equal(row.requiredMatchFields.includes('canonicalIdentityMatch'), false, row.materialId);
    assert.ok(row.nextGate.includes('canonicalIdentityMatch'), row.materialId);
  }
  if (row.mappingStatus === 'author_only') {
    assert.equal(row.candidateGroups.length, 0, row.materialId);
    assert.equal(row.parentFrame, 'author_only', row.materialId);
  }
  if (row.mappingStatus === 'stop_at_parent') assert.ok(row.nextGate.includes('parentFrameReturn'), row.materialId);
  if (row.mappingStatus === 'mechanism_parent_only') assert.equal(row.candidateGroups.length, 0, row.materialId);
}
assert.equal(crosswalk.currentEvidence.everyMaterialRowAccountedFor, true);
const output = {
  id: 'MATERIAL_UNIT_CROSSWALK_AUDIT_V1',
  status: 'paper_material_unit_disposition_complete_exact_binding_not_released',
  materialRows: crosswalk.rows.length,
  allRowsAccountedFor: crosswalk.rows.length === material.rows.length,
  allCandidateGroupsKnown: crosswalk.rows.every(row => row.candidateGroups.every(group => validGroups.has(group))),
  candidateRows: crosswalk.counts.candidateRows,
  exactUnitRows: crosswalk.counts.exactUnitRows,
  authorOnlyRows: crosswalk.counts.authorOnlyRows,
  stopRows: crosswalk.counts.stopRows,
  mechanismRows: crosswalk.counts.mechanismRows,
  exactUnitBinding: false,
  matchedReference: false,
  learnerTrial: false,
  NL50Evidence: false
};
fs.writeFileSync(path.join(dir, 'material-unit-crosswalk-audit.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, ...output }));
