import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const itinerary = read('guided-course-itinerary.json');
const golden = read('first-pass-golden-path.json');
const alignment = read('first-pass-golden-path-alignment-audit.json');
const expectedStructuralRoute = ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7'];
const expectedGoldenFrames = 13;

assert.equal(itinerary.firstPass.frames.length, 18);
assert.equal(itinerary.canonicalRelationship.canonicalLearnerSurface, 'first-pass-golden-path.json');
assert.deepEqual(itinerary.canonicalRelationship.canonicalStructuralRoute, expectedStructuralRoute);
assert.equal(itinerary.canonicalRelationship.narrativeFrameRole.includes('not a second homepage'), true);
assert.equal(itinerary.canonicalRelationship.compressionRule.includes('13-frame structural route'), true);
assert.ok(itinerary.canonicalRelationship.notAllowed.includes('skip_L2_L3_L4'));
assert.equal(golden.frames.length, expectedGoldenFrames);
assert.deepEqual(golden.canonicalStateRoute, expectedStructuralRoute);
assert.equal(alignment.checks.goldenRouteMatchesFrameIds, true);

const result = {
  id: 'FIRST_PASS_SURFACE_SCOPE_AUDIT_V1',
  status: 'paper_surface_scope_separated_not_runtime',
  purpose: '把13帧结构主线与18帧叙事示范明确分层，防止原始手牌连续性材料再次变成平铺首页或被误当成18个策略决定。',
  sources: ['guided-course-itinerary.json','first-pass-golden-path.json','first-pass-golden-path-alignment-audit.json'],
  structuralRoute: expectedStructuralRoute,
  structuralFrameCount: golden.frames.length,
  narrativeFrameCount: itinerary.firstPass.frames.length,
  checks: {
    canonicalSurfaceDeclared: itinerary.canonicalRelationship.canonicalLearnerSurface === 'first-pass-golden-path.json',
    structuralRouteMatchesGoldenPath: JSON.stringify(itinerary.canonicalRelationship.canonicalStructuralRoute) === JSON.stringify(golden.canonicalStateRoute),
    narrativeFramesNotCanonicalHomepage: itinerary.canonicalRelationship.narrativeFrameRole.includes('not a second homepage'),
    compressionRulePresent: itinerary.canonicalRelationship.compressionRule.includes('13-frame structural route'),
    outerStepsCannotBeSkipped: itinerary.canonicalRelationship.notAllowed.includes('skip_L2_L3_L4'),
    goldenPathAlignmentPassed: alignment.checks.goldenRouteMatchesFrameIds
  },
  currentEvidence: {
    paperAudit: true,
    runtimeImplemented: false,
    participantObserved: false,
    narrativeRouteTrial: false,
    structureMastery: false,
    NL50Evidence: false
  }
};

fs.writeFileSync(path.join(dir, 'first-pass-surface-scope-audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: result.id,
  structuralFrameCount: result.structuralFrameCount,
  narrativeFrameCount: result.narrativeFrameCount,
  canonicalSurfaceDeclared: result.checks.canonicalSurfaceDeclared,
  participantObserved: result.currentEvidence.participantObserved
}, null, 2));
