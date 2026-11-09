import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');

const manifest = read('unit-course-manifest.json');
const attachment = read('unit-route-attachment.json');
const crosswalk = read('unit-c0-c9-release-crosswalk.json');
const cognitiveBridge = read('route-cognitive-slow-execution-bridge.json');
const canonicalRoute = ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7'];
const groupParent = {
  'compare.unopened': 'p4',
  'compare.bet': 'p4',
  'compare.raise': 'p4',
  'update.response': 'p6',
  'update.card': 'p6'
};
const expectedArchitecture = { p4: { primary: 'A5', next: 'A6' }, p6: { primary: 'A7', next: 'A8' } };

const rows = manifest.rows.map(row => {
  const parentStateId = groupParent[row.route.groupId];
  const expected = expectedArchitecture[parentStateId];
  const sourceCrosswalk = crosswalk.rows.find(x => x.unitId === row.unitId);
  return {
    sequence: row.sequence,
    unitId: row.unitId,
    label: row.label,
    groupId: row.route.groupId,
    canonicalParentState: parentStateId,
    canonicalReturnState: parentStateId,
    legacyRouteStopAlias: row.route.routeStop,
    opensOnlyFromParent: row.route.opensOnlyFromParent,
    flatHomeVisible: row.route.flatHomeVisible,
    primaryArchitectureNode: row.route.primaryArchitectureNode,
    nextArchitectureNode: row.route.nextArchitectureNode,
    expectedPrimaryArchitectureNode: expected.primary,
    expectedNextArchitectureNode: expected.next,
    firstPassRepresentative: row.route.firstPassRepresentative,
    sourceIdentityStatus: row.inputIdentity.sourceScopedStatus,
    requiredOutputs: row.learningContract.requiredOutputs,
    missingEvidenceAction: row.learningContract.missingEvidenceAction,
    currentReleaseStatus: sourceCrosswalk.currentReleaseStatus,
    stopReason: sourceCrosswalk.stopReason,
    legacyAliasExposure: 'author_only_not_user_facing'
  };
});

assert.equal(manifest.rows.length, 35);
assert.equal(attachment.unitCount, 35);
assert.equal(crosswalk.rows.length, 35);
assert.deepEqual([...new Set(rows.map(x => x.canonicalParentState))].sort(), ['p4','p6']);
assert.equal(rows.every(x => x.canonicalReturnState === x.canonicalParentState), true);
assert.equal(rows.every(x => x.opensOnlyFromParent === true), true);
assert.equal(rows.every(x => x.flatHomeVisible === false), true);
assert.equal(rows.every(x => x.primaryArchitectureNode === x.expectedPrimaryArchitectureNode), true);
assert.equal(rows.every(x => x.nextArchitectureNode === x.expectedNextArchitectureNode), true);
assert.equal(rows.every(x => x.requiredOutputs.length > 0), true);
assert.equal(rows.every(x => ['L6','L7'].includes(x.legacyRouteStopAlias)), true);
assert.equal(rows.filter(x => x.canonicalParentState === 'p4').length, 21);
assert.equal(rows.filter(x => x.canonicalParentState === 'p6').length, 14);
assert.equal(cognitiveBridge.rows.some(x => x.stateId === 'p4'), true);
assert.equal(cognitiveBridge.rows.some(x => x.stateId === 'p6'), true);

const bridge = {
  id: 'UNIT_CANONICAL_ROUTE_BRIDGE_V1',
  status: 'paper_35_unit_canonical_parent_bridge_closed_legacy_alias_quarantined',
  purpose: '把35项后台单元从旧L6/L7别名收回唯一用户主线p4/p6父帧，防止作者侧编号成为第二条前台路线。',
  sources: ['unit-course-manifest.json','unit-route-attachment.json','unit-c0-c9-release-crosswalk.json','route-cognitive-slow-execution-bridge.json'],
  canonicalRoute,
  groupParent,
  rows,
  rules: {
    all35UnitsMapped: true,
    allGroupsHaveCanonicalParent: true,
    allReturnsToSameCanonicalParent: true,
    allOpenOnlyFromParent: true,
    flatHomeForbidden: true,
    legacyL6L7AreAuthorOnlyAliases: true,
    architectureNodeMatchesParent: true,
    requiredOutputsPresent: true,
    unitCountMatchesManifestAndCrosswalk: true
  },
  currentEvidence: {
    paperBridge: true,
    legacyAliasQuarantinedInRuntime: false,
    runtimeAttached: false,
    all35ReferenceReady: false,
    all35LearnerTrial: false,
    NL50Evidence: false
  }
};

write('unit-canonical-route-bridge.json', bridge);

const md = `# 202｜35项单元到唯一用户停点的交叉合同

\`\`\`json
{
  "parentDocument": "201_路线脑内架构与慢执行交叉合同.md",
  "routeNode": "unit_canonical_route_bridge",
  "evidenceLevel": "paper_35_unit_canonical_parent_bridge_closed_legacy_alias_quarantined",
  "opensChildren": ["unit-canonical-route-bridge.json", "unit-course-manifest.json", "unit-c0-c9-release-crosswalk.json"],
  "returnTo": "翻后教学系统_统一总纲.md",
  "currentStatus": "35_units_bound_to_p4_p6_legacy_l6_l7_author_only"
}
\`\`\`

## 这份合同解决什么

35项后台单元是作者侧的细分练习，不应该在用户页面上生成第二套导航。检查发现旧清单仍使用 L6 和 L7 作为单元停点别名；它们不是新的用户路线状态，不能直接显示给学习者。

202号把它们统一解释为：

- compare.unopened、compare.bet、compare.raise 的 21 个单元，只能从用户路线的 p4_compare 父帧打开，完成或停止后回到 p4；
- update.response、update.card 的 14 个单元，只能从 p6_update 父帧打开，完成或停止后回到 p6；
- L6/L7 只保留为作者侧兼容别名，运行时不得把它们显示成路线节点、菜单或下一步。

每个单元仍必须保留自己的问题、必需输出、停止原因、释放阶段和错误回退。父帧统一不等于题目被合并；它只规定用户从哪里进入、做完回哪里。35项的细分继续通过父帧内的子层按需打开。

## 为什么这对“跟一遍就知道怎么想”很重要

如果后台单元同时暴露 L6、L7、p4、p6 四种名字，初学者会以为有四条路线；如果把35项平铺，又会失去先建立结构再逐项释放的顺序。现在唯一可见的结构是：

\`\`\`text
p4 比较父帧 → 按需打开 1.x / 2.x / 3.x → 回到 p4
p6 更新父帧 → 按需打开 4.x / 5.x → 回到 p6
\`\`\`

每个单元还必须通过自己的 map → guided → independent → adjacent → delayed → continuous 释放闸门；父帧挂接不等于参考策略完整，也不等于学习者已经掌握。

机器交叉表见 [unit-canonical-route-bridge.json](unit-canonical-route-bridge.json)。当前已完成纸面归一化，但运行时旧别名隔离、35项匹配参考、真人试读和NL50证据仍未完成。
`;
fs.writeFileSync(path.join(dir, '202_35项单元到唯一用户停点的交叉合同.md'), md);

console.log(JSON.stringify({
  ok: true,
  status: bridge.status,
  units: rows.length,
  p4Units: rows.filter(x => x.canonicalParentState === 'p4').length,
  p6Units: rows.filter(x => x.canonicalParentState === 'p6').length,
  legacyAliases: [...new Set(rows.map(x => x.legacyRouteStopAlias))],
  runtimeAttached: bridge.currentEvidence.runtimeAttached
}));
