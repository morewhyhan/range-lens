import fs from 'node:fs';
import path from 'node:path';

const dir = 'research/nevir-system';
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const readText = (name) => fs.readFileSync(name === '翻后教学系统_统一总纲.md' ? name : path.join(dir, name), 'utf8');

const expectedLearnerRoute = ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7'];
const expectedExpandedLearnerRoute = ['L0','L1','L2','L3','L4','p1_context','p2_board','p3_range','p4_compare','p5_execute','p6_update','p7_close','replay_transfer'];
const expectedMacroRoute = ['L0','L1','L2','L3','L4','L5','L6','L7','L8'];

const proseSources = [
  '翻后教学系统_统一总纲.md',
  '90_研究文档阅读路线与层级索引.md',
  '119_目标级单一路径运行蓝图.md',
  '164_低基础一遍架构建立与目标级倒推验收合同.md',
  '169_最终标准可观察验收与NL50边界合同.md',
  '170_低基础首课黄金路径与逐屏交接脚本.md',
  '177_学习者可见七步路线与35项释放交叉合同.md',
  '178_全量文档归档与遗留材料处置合同.md',
  '187_一遍到目标级的嵌套释放总架构合同.md',
  '195_最终目标发布合同.md'
];

const machineChecks = [];
const route = readJson('learner-goal-route-canonical.json');
machineChecks.push({
  source: 'learner-goal-route-canonical.json',
  learnerRoute: route.outerRoute.map(x => x.id),
  expectedLearnerRoute,
  exact: JSON.stringify(route.outerRoute.map(x => x.id)) === JSON.stringify(expectedLearnerRoute),
  allInnerParentsL4: route.outerRoute.filter(x => x.id.startsWith('p')).every(x => x.parent === 'L4'),
  shortBackendAliasesOneToOne: route.routeAliases?.oneToOne === true && route.routeAliases?.doesNotCreateExtraStep === true &&
    Object.keys(route.routeAliases?.surfaceToBackend ?? {}).length === 7
});

const screen = readJson('first-pass-screen-coverage-matrix.json');
machineChecks.push({
  source: 'first-pass-screen-coverage-matrix.json',
  learnerRoute: screen.outerRoute,
  expectedLearnerRoute,
  exact: JSON.stringify(screen.outerRoute) === JSON.stringify(expectedLearnerRoute),
  legacyMacroRoute: screen.legacyMacroRoute,
  legacyPreserved: JSON.stringify(screen.legacyMacroRoute) === JSON.stringify(expectedMacroRoute)
});

const architecture = readJson('first-pass-architecture-goal-contract.json');
machineChecks.push({
  source: 'first-pass-architecture-goal-contract.json',
  learnerRoute: architecture.canonicalRoute.outer,
  expectedLearnerRoute,
  exact: JSON.stringify(architecture.canonicalRoute.outer) === JSON.stringify(expectedLearnerRoute),
  legacyMacroRoute: architecture.canonicalRoute.legacyMacroOuter,
  legacyPreserved: JSON.stringify(architecture.canonicalRoute.legacyMacroOuter) === JSON.stringify(expectedMacroRoute),
  innerParent: architecture.canonicalRoute.innerParent,
  innerParentExact: architecture.canonicalRoute.innerParent === 'L4'
});

const curriculum = readJson('full-curriculum-route-manifest.json');
machineChecks.push({
  source: 'full-curriculum-route-manifest.json',
  learnerRoute: curriculum.canonicalLearnerRoute.slice(0, -1),
  expectedLearnerRoute,
  exact: JSON.stringify(curriculum.canonicalLearnerRoute.slice(0, -1)) === JSON.stringify(expectedLearnerRoute),
  legacyInventoryDeclared: curriculum.outerStopsRole === 'legacy_author_macro_inventory_only'
});

const legacyRouteContracts = [
  ['single-path-course-contract.json', 'route'],
  ['progression-unlock-contract.json', null],
  ['route-release-gates.json', null],
  ['a72-c6-c9-release-contract.json', 'gates[1]']
];
for (const [source, selector] of legacyRouteContracts) {
  const contract = readJson(source);
  const surface = selector === 'route' ? contract.route
    : selector === 'gates[1]' ? contract.gates[1]
    : contract;
  const legacy = selector === 'route' ? contract.route.primaryPath : selector === 'gates[1]' ? surface.route : source === 'progression-unlock-contract.json' ? contract.routeOrder : contract.route;
  const legacyRole = selector === 'route' ? contract.route.primaryPathRole : selector === 'gates[1]' ? surface.routeRole : source === 'progression-unlock-contract.json' ? contract.routeOrderRole : contract.routeRole;
  const canonical = selector === 'route' ? contract.route.canonicalLearnerRoute : surface.canonicalLearnerRoute ?? contract.canonicalLearnerRoute;
  const canonicalRole = selector === 'route' ? contract.route.canonicalLearnerRouteRole : surface.canonicalLearnerRouteRole ?? contract.canonicalLearnerRouteRole;
  machineChecks.push({
    source,
    learnerRoute: canonical,
    expectedLearnerRoute,
    exact: JSON.stringify(canonical) === JSON.stringify(expectedLearnerRoute),
    canonicalRole,
    canonicalRoleExact: canonicalRole === (source === 'progression-unlock-contract.json' ? 'runtime_unlock_surface' : source === 'route-release-gates.json' ? 'runtime_release_surface' : 'runtime_surface'),
    legacyRoute: legacy,
    legacyPreserved: JSON.stringify(legacy) === JSON.stringify(expectedMacroRoute),
    legacyRole,
    legacyRoleDeclared: /legacy_author_macro/.test(legacyRole)
  });
}

for (const source of ['first-run-route-contract.json', 'first-pass-completeness-contract.json']) {
  const contract = readJson(source);
  const canonical = contract.canonicalLearnerRoute;
  machineChecks.push({
    source,
    learnerRoute: canonical,
    expectedLearnerRoute: expectedExpandedLearnerRoute,
    exact: JSON.stringify(canonical) === JSON.stringify(expectedExpandedLearnerRoute),
    canonicalRole: contract.canonicalLearnerRouteRole,
    canonicalRoleExact: contract.canonicalLearnerRouteRole === 'runtime_surface',
    legacyRole: contract.outerRouteRole,
    legacyRoleDeclared: contract.outerRouteRole === 'legacy_author_macro_inventory_only'
  });
}

const legacyMarkers = /(作者侧|作者宏观|旧合同|旧材料|宏观别名|legacy|author macro|审计别名)/i;
const proseAudits = proseSources.map(source => {
  const text = readText(source);
  const lines = text.split(/\r?\n/);
  const suspicious = [];
  lines.forEach((line, index) => {
    if (/L0\s*[—-]\s*L8|L5\s*[—-]\s*L8/.test(line) && !legacyMarkers.test(line)) {
      suspicious.push({ line: index + 1, text: line.trim() });
    }
  });
  return { source, suspicious, clean: suspicious.length === 0 };
});

const ok = machineChecks.every(x => x.exact && (x.allInnerParentsL4 ?? true) && (x.shortBackendAliasesOneToOne ?? true) && (x.legacyPreserved ?? true) && (x.innerParentExact ?? true) && (x.legacyInventoryDeclared ?? true) && (x.canonicalRoleExact ?? true) && (x.legacyRoleDeclared ?? true))
  && proseAudits.every(x => x.clean);

const output = {
  id: 'CANONICAL_PROSE_ROUTE_AUDIT_V1',
  status: ok ? 'paper_canonical_route_and_legacy_boundaries_consistent' : 'paper_canonical_route_boundary_conflict_found',
  canonicalLearnerRoute: expectedLearnerRoute,
  legacyMacroRoute: expectedMacroRoute,
  machineChecks,
  proseAudits,
  runtimeAttached: false,
  participantObserved: false,
  goalCompletionVerified: false
};

fs.writeFileSync(path.join(dir, 'canonical-prose-route-audit.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok, id: output.id, status: output.status, machineSources: machineChecks.length, proseSources: proseSources.length, suspiciousLines: proseAudits.reduce((n, x) => n + x.suspicious.length, 0) }));

