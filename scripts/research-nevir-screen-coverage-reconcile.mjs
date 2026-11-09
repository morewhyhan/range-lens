import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const source = read('first-pass-screen-coverage-matrix.json');
const golden = read('first-pass-golden-path.json');
const canonical = read('learner-goal-route-canonical.json');

const structuralRoute = ['L0', 'L1', 'L2', 'L3', 'L4', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
const innerRoute = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
const legacyMacroRoute = [...(source.legacyMacroRoute ?? ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8'])];
const legacyMacroRows = [...(source.legacyMacroRows ?? source.rows.filter(row => ['L5', 'L6', 'L7', 'L8'].includes(row.id)))];
const byId = Object.fromEntries(source.rows.map(row => [row.id, row]));
const recallSource = byId.L8 ?? byId.recall ?? legacyMacroRows.find(row => row.id === 'L8');
assert.ok(recallSource, 'screen coverage must retain an L8/recall authoring row');

// Keep the old L5–L8 wording as authoring history, but make the learner-facing
// matrix describe the same 13-frame surface as the canonical golden path.
const rows = [
  ...['L0', 'L1', 'L2', 'L3', 'L4'].map(id => ({ ...byId[id] })),
  ...innerRoute.map(id => {
    const row = { ...byId[id] };
    row.parent = 'L4';
    row.returnPoint = id;
    return row;
  }),
  {
    id: 'recall',
    parent: 'p7',
    prompt: recallSource.prompt,
    primaryAction: recallSource.primaryAction,
    requiredInputs: [...recallSource.requiredInputs],
    output: 'migrationEvidence',
    returnPoint: 'recall',
    stop: recallSource.stop
  }
];

const next = {
  ...source,
  status: 'paper_screen_coverage_matrix_canonical_surface_not_runtime',
  purpose: '逐屏检查13帧学习者主线的必要输入、单一问题、主要动作、交接、父帧返回和停止原因；旧L5–L8只保留为作者宏观合同，不再成为学习者首页路线。',
  canonicalSource: 'first-pass-golden-path.json',
  canonicalStructuralRoute: structuralRoute,
  outerRoute: structuralRoute,
  innerRoute,
  rows,
  legacyMacroRoute,
  legacyMacroRows,
  invariants: {
    ...source.invariants,
    canonicalRouteMatchesGoldenPath: JSON.stringify(golden.canonicalStateRoute) === JSON.stringify(structuralRoute),
    legacyMacroRouteNotLearnerSurface: true,
    recallIsAfterP7: rows.at(-1).parent === 'p7'
  },
  coverageChecks: [
    ...source.coverageChecks,
    'canonicalRouteMatchesGoldenPath',
    'legacyMacroRouteScoped',
    'recallAfterP7'
  ]
};

assert.deepEqual(canonical.outerRoute.map(step => step.id), structuralRoute);
assert.deepEqual(golden.canonicalStateRoute, structuralRoute);
assert.deepEqual(next.outerRoute, structuralRoute);
assert.deepEqual(next.innerRoute, innerRoute);
assert.equal(next.rows.length, 13);
assert.deepEqual(next.rows.map(row => row.id), ['L0', 'L1', 'L2', 'L3', 'L4', ...innerRoute, 'recall']);
assert.equal(next.rows.every(row => row.prompt && row.primaryAction && row.requiredInputs?.length && row.output && row.stop), true);
assert.equal(next.rows.filter(row => row.id.startsWith('p')).every(row => row.parent === 'L4'), true);
assert.equal(next.legacyMacroRows.length, 4);

fs.writeFileSync(path.join(dir, 'first-pass-screen-coverage-matrix.json'), JSON.stringify(next, null, 2) + '\n');

const audit = {
  id: 'FIRST_PASS_SCREEN_COVERAGE_RECONCILE_AUDIT_V1',
  status: 'paper_screen_coverage_reconciled_not_runtime',
  sources: ['first-pass-screen-coverage-matrix.json', 'first-pass-golden-path.json', 'learner-goal-route-canonical.json'],
  checks: {
    canonicalRouteMatchesGoldenPath: true,
    canonicalRouteMatchesLearnerGoal: true,
    canonicalRowCount: next.rows.length,
    canonicalRowIdsMatch: true,
    innerRowsStayUnderL4: true,
    recallAfterP7: true,
    legacyMacroRoutePreservedForAuthoringOnly: true,
    runtimeAttached: false,
    participantObserved: false
  },
  release: {
    learnerSurfaceAligned: true,
    runtimeReady: false,
    learnerTrialReady: false,
    strategyReady: false,
    NL50Evidence: false
  },
  interpretation: 'L5–L8仍可供旧合同和作者审计引用，但不得作为第二条学习者路线；运行时必须读取canonicalStructuralRoute和next链。'
};
fs.writeFileSync(path.join(dir, 'first-pass-screen-coverage-reconcile-audit.json'), JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, id: audit.id, route: structuralRoute, rows: next.rows.length, legacyMacroRows: legacyMacroRows.length }, null, 2));
