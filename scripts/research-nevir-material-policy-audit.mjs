import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const input = JSON.parse(fs.readFileSync(path.join(dir, 'material-policy-classification.json'), 'utf8'));
assert.equal(input.id, 'MATERIAL_POLICY_CLASSIFICATION_V1');
assert.equal(input.counts.materialRows, 374);
assert.equal(input.counts.reviewedClaims, 45);
assert.equal(input.noteSources.length, 7);
assert.equal(input.counts.unclassifiedRows, 0);
assert.equal(input.counts.exactStrategyReadyRows, 0);
assert.equal(input.counts.runtimeAttachedRows, 0);
assert.equal(input.counts.learnerVerifiedRows, 0);

const allowed = new Set(Object.keys(input.policyIdentityRules));
for (const row of input.rows) {
  assert.ok(allowed.has(row.policyIdentity), row.id);
  assert.ok(row.sourceTextHash?.length === 64, row.id);
  assert.ok(Array.isArray(row.requires) && row.requires.length > 0, row.id);
  assert.ok(Array.isArray(row.forbiddenPromotion), row.id);
  assert.ok(row.route?.parentFrame && row.route?.nestedTask && row.route?.primaryQuestion && row.route?.returnTo && row.route?.nextFrame, row.id);
  assert.ok(row.route.primaryQuestion.length > 0, row.id);
  if (row.route.parentFrame !== 'author_only') assert.ok(Array.isArray(row.principleIds) && row.principleIds.length > 0, row.id);
  if (row.policyIdentity === 'unknown_stop') {
    assert.ok(['missing_material', 'explicit_scope_stop'].includes(row.sourceKind), row.id);
    assert.equal(row.releaseBand, 'not_open', row.id);
    assert.equal(row.route.nextFrame, 'stop_at_parent', row.id);
  }
  if (row.policyIdentity === 'population_exploit') {
    assert.ok(row.requires.includes('populationModel'), row.id);
    assert.ok(row.requires.includes('triggerCondition'), row.id);
    assert.ok(row.forbiddenPromotion.includes('raw_reference'), row.id);
  }
  if (row.policyIdentity === 'course_rule') {
    assert.ok(row.requires.includes('courseSourceReference'), row.id);
    assert.ok(row.requires.includes('policyScope'), row.id);
  }
  if (row.policyIdentity === 'illustration') assert.equal(row.releaseBand === 'demonstration_only' || row.releaseBand === 'navigation_only' || row.releaseBand === 'author_only', true, row.id);
}
for (const claim of input.reviewedClaims) {
  assert.ok(allowed.has(claim.policyIdentity), claim.reviewId);
  assert.equal(claim.gradeable, false, claim.reviewId);
  if (claim.status === 'requires_source_resolution') assert.equal(claim.stopIfUnresolved, true, claim.reviewId);
}

const output = {
  id: 'MATERIAL_POLICY_CLASSIFICATION_AUDIT_V1',
  status: 'paper_material_policy_classification_complete_no_strategy_or_learner_release',
  materialRows: input.rows.length,
  reviewedClaims: input.reviewedClaims.length,
  identities: input.counts.byPolicyIdentity,
  allRowsClassified: input.counts.unclassifiedRows === 0,
  allRowsHashBound: input.rows.every(row => row.sourceTextHash?.length === 64),
  allRowsRouted: input.rows.every(row => row.route?.parentFrame && row.route?.primaryQuestion && row.route?.returnTo),
  parentFrameCoverage: input.counts.byParentFrame,
  allUserRowsHavePrincipleLink: input.rows.filter(row => row.route.parentFrame !== 'author_only').every(row => row.principleIds.length > 0),
  principleCoverage: input.counts.byPrinciple,
  unresolvedClaimsStop: input.reviewedClaims.filter(row => row.stopIfUnresolved).length,
  exactStrategyReady: false,
  runtimeAttached: false,
  learnerVerified: false,
  NL50Evidence: false
};
fs.writeFileSync(path.join(dir, 'material-policy-classification-audit.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, ...output }));
