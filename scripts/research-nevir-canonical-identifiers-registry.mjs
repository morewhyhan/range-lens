import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const dir = path.join(root, 'research', 'nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const canonical = read('learner-goal-route-canonical.json');
const routeAudit = read('route-consistency-audit.json');
const unitBridge = read('unit-canonical-route-bridge.json');
const routeContract = read('user-first-complete-route-contract.json');
const handoff = read('first-pass-handoff-ledger.json');
const progression = read('learner-session-progression-contract.json');

assert.equal(canonical.id, 'LEARNER_GOAL_ROUTE_CANONICAL_V1');
assert.equal(routeAudit.id, 'ROUTE_CONSISTENCY_AUDIT_V1');
assert.equal(unitBridge.id, 'UNIT_CANONICAL_ROUTE_BRIDGE_V1');
assert.equal(routeContract.id, 'USER_FIRST_COMPLETE_ROUTE_CONTRACT_V1');
assert.equal(handoff.id, 'FIRST_PASS_HANDOFF_LEDGER_V1');
assert.equal(progression.id, 'LEARNER_SESSION_PROGRESSION_CONTRACT_V1');

const outer = canonical.outerRoute.map(row => row.id);
const backendPostflop = canonical.postflopSequentialChain;
const expectedOuter = ['L0', 'L1', 'L2', 'L3', 'L4', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
const expectedBackend = ['p1_context', 'p2_board', 'p3_range', 'p4_compare', 'p5_execute', 'p6_update', 'p7_close'];
const frameMap = {
  L0: { surface: 'L0', backend: 'L0', frameId: 'G0_welcome', parent: null },
  L1: { surface: 'L1', backend: 'L1', frameId: 'G1_context', parent: null },
  L2: { surface: 'L2', backend: 'L2', frameId: 'G2_preflop_chart', parent: null },
  L3: { surface: 'L3', backend: 'L3', frameId: 'G3_preflop_action', parent: null },
  L4: { surface: 'L4', backend: 'L4', frameId: 'G4_range_bridge', parent: null },
  p1: { surface: 'p1', backend: 'p1_context', frameId: 'G5_p1_context', parent: 'L4' },
  p2: { surface: 'p2', backend: 'p2_board', frameId: 'G6_p2_hand', parent: 'L4' },
  p3: { surface: 'p3', backend: 'p3_range', frameId: 'G7_p3_range', parent: 'L4' },
  p4: { surface: 'p4', backend: 'p4_compare', frameId: 'G8_p4_compare', parent: 'L4' },
  p5: { surface: 'p5', backend: 'p5_execute', frameId: 'G9_p5_execute', parent: 'L4' },
  p6: { surface: 'p6', backend: 'p6_update', frameId: 'G10_p6_update', parent: 'L4' },
  p7: { surface: 'p7', backend: 'p7_close', frameId: 'G11_p7_close', parent: 'L4' },
  replay_transfer: { surface: 'replay_transfer', backend: 'replay_transfer', frameId: 'G12_recall_transfer', parent: 'L4' }
};
const aliases = {
  p1_context: 'p1',
  p2_board: 'p2',
  p3_range: 'p3',
  p4_compare: 'p4',
  p5_execute: 'p5',
  p6_update: 'p6',
  p7_close: 'p7',
  p4_author_alias: 'p4',
  p6_author_alias: 'p6',
  L6_author_only: 'p4',
  L7_author_only: 'p6'
};
const groupParents = {
  'compare.unopened': 'p4',
  'compare.bet': 'p4',
  'compare.raise': 'p4',
  'update.response': 'p6',
  'update.card': 'p6'
};
const stages = ['first_pass', 'map', 'guided', 'independent', 'adjacent', 'delayed', 'continuous'];

assert.deepEqual(outer, expectedOuter);
assert.deepEqual(backendPostflop, expectedBackend);
assert.deepEqual(routeAudit.canonicalOrder.outer, expectedOuter);
assert.deepEqual(handoff.route, expectedOuter);
assert.deepEqual(progression.stages.slice(0, 7).map(stage => stage.schedulerStage), stages);
assert.equal(Object.keys(frameMap).length, 13);
assert.equal(new Set(Object.values(frameMap).map(row => row.frameId)).size, 13);
assert.equal(unitBridge.rows.length, 35);
assert.equal(routeContract.units.length, 35);
for (const row of unitBridge.rows) {
  assert.equal(groupParents[row.groupId], row.canonicalParentState);
  assert.equal(row.legacyAliasExposure, 'author_only_not_user_facing');
}
for (const row of routeContract.units) {
  assert.equal(groupParents[row.groupId], row.userParent);
  assert.equal(row.returnTo, row.userParent);
}

const registry = {
  id: 'CANONICAL_IDENTIFIERS_REGISTRY_V1',
  status: 'paper_canonical_identifiers_registered_runtime_migration_missing',
  purpose: '把用户表面标签、后端节点、首遍帧、作者父层和旧别名放进一份唯一注册表，防止同一节点在不同合同中被当成多个步骤。',
  sources: ['learner-goal-route-canonical.json', 'route-consistency-audit.json', 'unit-canonical-route-bridge.json', 'user-first-complete-route-contract.json', 'first-pass-handoff-ledger.json', 'learner-session-progression-contract.json'],
  outerOrder: expectedOuter,
  backendPostflopOrder: expectedBackend,
  frames: frameMap,
  surfaceToBackend: Object.fromEntries(Object.entries(frameMap).map(([key, value]) => [value.surface, value.backend])),
  aliases,
  groupParents,
  releaseStages: stages,
  unitCount: 35,
  normalizationRules: {
    userSurfaceUsesShortIds: true,
    runtimeUsesBackendIds: true,
    authorMayStoreCanonicalParentState: true,
    legacyL6L7AreAuthorOnly: true,
    aliasesNeverCreateExtraStep: true,
    nextChainDefinesOrder: true,
    childUnitsReturnToSameParent: true,
    unknownIdentifierBlocksRelease: true
  },
  audit: {
    routeSourcesAgree: true,
    frameIdsUnique: true,
    allGroupsHaveCanonicalParent: true,
    all35UnitsReturnToParent: true,
    legacyAliasesQuarantined: true,
    stageOrderAgrees: true
  },
  currentEvidence: {
    registryWritten: true,
    runtimeUsesRegistry: false,
    runtimeReadsCanonicalNext: false,
    parentRestoreObserved: false,
    learnerTrial: false,
    NL50Evidence: false
  },
  guards: {
    identifierRegistryIsNotRuntime: true,
    routeContractIsNotLearnerEvidence: true,
    parentAliasIsNotNewStep: true,
    noFlatHomeMenu: true
  }
};

fs.writeFileSync(path.join(dir, 'canonical-identifiers-registry.json'), JSON.stringify(registry, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: registry.id,
  outerStates: registry.outerOrder.length,
  backendStates: registry.backendPostflopOrder.length,
  frames: Object.keys(registry.frames).length,
  units: registry.unitCount,
  runtimeUsesRegistry: registry.currentEvidence.runtimeUsesRegistry
}));
