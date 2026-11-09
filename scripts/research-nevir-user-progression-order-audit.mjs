import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const alias = read('release-stage-alias-bridge.json');
const runtime = read('user-stage-runtime-adoption-contract.json');
const gates = read('unified-learner-evidence-release-gates.json');

const userOrder = [
  'U0_guided_route',
  'U1_structure_recall',
  'U2_same_parent_practice',
  'U3_slow_single_step',
  'U4_adjacent_transfer',
  'U5_delayed_recall',
  'U6_continuous_three_street',
  'U7_target_review'
];
assert.equal(alias.id, 'RELEASE_STAGE_ALIAS_BRIDGE_V1');
assert.equal(runtime.id, 'USER_STAGE_RUNTIME_ADOPTION_CONTRACT_V1');
assert.equal(gates.id, 'UNIFIED_LEARNER_EVIDENCE_RELEASE_GATES_V1');
assert.deepEqual(alias.stageMap.userFacingOrder, userOrder);
assert.deepEqual(runtime.canonicalUserStages, userOrder);
assert.equal(runtime.transitions.length, 8);
assert.deepEqual(runtime.transitions.map(x => x.from), userOrder);
assert.deepEqual(runtime.transitions.map(x => x.to), [...userOrder.slice(1), null]);

const gateByUserStage = new Map();
for (const [gateId, row] of Object.entries(alias.stageMap.evidenceGates)) {
  if (row.userStage) gateByUserStage.set(row.userStage, gateId);
}
assert.deepEqual([...gateByUserStage.keys()], [
  'U0_guided_route',
  'U1_structure_recall',
  'U4_adjacent_transfer',
  'U3_slow_single_step',
  'U6_continuous_three_street',
  'U7_target_review'
]);
assert.equal(gateByUserStage.get('U3_slow_single_step'), 'V4_unseen_slow_single_step');
assert.equal(gateByUserStage.get('U4_adjacent_transfer'), 'V3_single_variable_transfer');

const transitionRequirements = new Map(runtime.transitions.map(row => [row.from, row.requires]));
assert.ok(transitionRequirements.get('U2_same_parent_practice').includes('requiredOutputComplete'));
assert.ok(transitionRequirements.get('U3_slow_single_step').includes('matchedOrDeclaredPolicy'));
assert.ok(transitionRequirements.get('U4_adjacent_transfer').includes('exactlyOneChangedField'));
assert.ok(transitionRequirements.get('U6_continuous_three_street').includes('rangeConservation'));
assert.ok(transitionRequirements.get('U7_target_review').includes('externalBenchmark'));

const result = {
  id: 'USER_PROGRESSION_ORDER_AUDIT_V1',
  status: 'paper_user_order_is_canonical_numeric_author_alias_order_is_non_monotonic_and_runtime_missing',
  purpose: '确认用户看到的U0—U7顺序不被V数字、P/S阶段或单元releaseStage打乱，并把每次升级的最低交付固定下来。',
  sources: ['release-stage-alias-bridge.json', 'user-stage-runtime-adoption-contract.json', 'unified-learner-evidence-release-gates.json'],
  canonicalUserOrder: userOrder,
  transitions: runtime.transitions.map(row => ({ from: row.from, to: row.to, gate: row.gate, requires: row.requires })),
  gateAliasOrder: Object.fromEntries(gateByUserStage),
  numericAliasOrderDiffers: true,
  userOrderMustWin: true,
  evidence: {
    paperOrder: true,
    paperTransitionRequirements: true,
    runtimeUsesCanonicalStage: false,
    runtimeUsesSingleNextChain: false,
    learnerProgressionObserved: false,
    targetEvidence: false
  },
  guards: {
    numericGateNamesCannotDefineUserOrder: true,
    userStageCannotAdvanceFromScoreOrSpeed: true,
    missingEvidenceStopsCurrentStage: true,
    unitReleaseDoesNotCreateHomeRoute: true,
    continuousDoesNotEqualNL50: true
  },
  currentConclusion: '纸面顺序和升级交付已闭合；由于运行时仍未采用U0—U7，当前页面不能宣称已经只有一条用户进阶路线。'
};

fs.writeFileSync(path.join(dir, 'user-progression-order-audit.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  id: result.id,
  status: result.status,
  stages: result.canonicalUserOrder.length,
  runtimeUsesCanonicalStage: result.evidence.runtimeUsesCanonicalStage,
  numericAliasOrderDiffers: result.numericAliasOrderDiffers
}, null, 2));
