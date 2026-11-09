import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const material = JSON.parse(fs.readFileSync(path.join(dir, 'material-policy-classification.json'), 'utf8'));
const requests = JSON.parse(fs.readFileSync(path.join(dir, 'unit-reference-snapshot-request-manifest.json'), 'utf8'));
assert.equal(material.rows.length, 374);
assert.equal(requests.rows.length, 35);

const unitsByGroup = new Map();
for (const row of requests.rows) {
  const list = unitsByGroup.get(row.groupId) ?? [];
  list.push(row.unitId);
  unitsByGroup.set(row.groupId, list);
}

function contextFor(row) {
  const sheet = row.sheet;
  const text = row.textPreview;
  if (sheet.startsWith('01 ')) return { domain: 'flop_ip_3bet', groups: ['compare.unopened'], reason: 'IP 3bet翻牌持续下注材料；具体题仍需匹配位置、前序和行动菜单。' };
  if (sheet.startsWith('02 ')) return { domain: 'flop_oop_3bet', groups: ['compare.unopened', 'compare.bet'], reason: 'OOP 3bet翻牌材料；过牌后与面对下注是两个不同节点。' };
  if (sheet.startsWith('03 ')) return { domain: 'flop_ip_srp', groups: ['compare.unopened'], reason: 'IP单次加注底池材料；只绑定到未下注比较候选。' };
  if (sheet.startsWith('04 ')) return { domain: 'flop_oop_srp', groups: ['compare.unopened', 'compare.bet'], reason: 'OOP单次加注底池材料；面对下注的回应不能从持续下注表继承。' };
  if (sheet.startsWith('05 ')) {
    const group = /新牌|转牌|河牌|后继/.test(text) ? 'update.card' : 'update.response';
    return { domain: 'turn_route', groups: [group], reason: '转牌材料必须从翻牌前序、行动后范围和真实后继进入。' };
  }
  if (sheet.startsWith('06 ')) {
    const groups = /跟注|加注|弃牌|面对|下注/.test(text) ? ['compare.bet', 'compare.raise', 'update.response'] : ['update.card', 'update.response'];
    return { domain: 'river_route', groups, reason: '河牌材料先确定当前任务和响应节点，再请求匹配策略或停止。' };
  }
  if (sheet.startsWith('牌面分支与原因')) return { domain: 'board_mechanism', groups: [], reason: '只进入p2_board的机制子卡，不生成行动单元。' };
  if (sheet.startsWith('00 ')) return { domain: 'navigation', groups: [], reason: '导航层只帮助定位，不生成行动单元。' };
  if (sheet.startsWith('07 ')) return { domain: 'vocabulary', groups: [], reason: '术语层只帮助读图，不生成行动单元。' };
  if (sheet.startsWith('08 ')) return { domain: 'source_boundary', groups: [], reason: '作者侧来源登记、勘误和停止边界，不进入用户题目。' };
  return { domain: 'unknown', groups: [], reason: '没有可靠的单元归属，停在当前父层。' };
}

const rows = material.rows.map(row => {
  const context = contextFor(row);
  let mappingStatus = 'candidate_unit_pending_identity_match';
  if (row.route.parentFrame === 'author_only') mappingStatus = 'author_only';
  else if (row.policyIdentity === 'unknown_stop') mappingStatus = 'stop_at_parent';
  else if (context.groups.length === 0) mappingStatus = 'mechanism_parent_only';
  const candidateGroups = mappingStatus === 'stop_at_parent' || mappingStatus === 'mechanism_parent_only' || mappingStatus === 'author_only' ? [] : context.groups;
  const candidateUnitIds = candidateGroups.flatMap(group => unitsByGroup.get(group) ?? []);
  return {
    materialId: row.id,
    sheet: row.sheet,
    row: row.row,
    domain: context.domain,
    candidateGroups,
    candidateUnitIds,
    mappingStatus,
    policyIdentity: row.policyIdentity,
    parentFrame: row.route.parentFrame,
    principleIds: row.principleIds,
    mappingReason: context.reason,
    requiredMatchFields: candidateGroups.length > 0 ? ['street', 'role', 'actionState', 'board', 'rootRanges', 'sourceIdentity', 'policyScope'] : [],
    nextGate: candidateGroups.length > 0 ? ['canonicalIdentityMatch', 'matchedReferenceOrExplicitCoursePolicy', 'rangeAfterOrStop', 'successorOrStop'] : ['parentFrameReturn']
  };
});

const byStatus = rows.reduce((acc, row) => {
  acc[row.mappingStatus] = (acc[row.mappingStatus] ?? 0) + 1;
  return acc;
}, {});
const byDomain = rows.reduce((acc, row) => {
  acc[row.domain] = (acc[row.domain] ?? 0) + 1;
  return acc;
}, {});

const output = {
  id: 'MATERIAL_UNIT_CROSSWALK_V1',
  status: 'paper_material_to_unit_crosswalk_complete_exact_unit_binding_blocked_by_identity_and_reference',
  purpose: '把每一行翻后材料接到可进入的练习组或明确的作者侧/父层停止位置；候选组不是精确题目，不允许相邻材料替代匹配节点。',
  sources: ['material-policy-classification.json', 'unit-reference-snapshot-request-manifest.json'],
  canonicalGroups: [...unitsByGroup.keys()],
  hardRules: {
    everyMaterialRowHasOneDisposition: true,
    candidateGroupDoesNotEqualExactUnit: true,
    identityMatchRequiredBeforeExactUnit: true,
    noNeighborSubstitution: true,
    unknownStopsAtParent: true,
    authorOnlyNeverEntersLearnerQueue: true,
    missingReferenceStopsAtCurrentCandidate: true
  },
  rows,
  counts: {
    materialRows: rows.length,
    byStatus,
    byDomain,
    candidateRows: rows.filter(row => row.mappingStatus === 'candidate_unit_pending_identity_match').length,
    exactUnitRows: rows.filter(row => row.mappingStatus === 'exact_unit').length,
    authorOnlyRows: rows.filter(row => row.mappingStatus === 'author_only').length,
    stopRows: rows.filter(row => row.mappingStatus === 'stop_at_parent').length,
    mechanismRows: rows.filter(row => row.mappingStatus === 'mechanism_parent_only').length
  },
  currentEvidence: {
    everyMaterialRowAccountedFor: rows.length === material.rows.length,
    exactUnitBinding: false,
    matchedReference: false,
    coursePolicyCompiled: false,
    runtimeAttached: false,
    learnerTrial: false,
    NL50Evidence: false
  }
};
fs.writeFileSync(path.join(dir, 'material-unit-crosswalk.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, counts: output.counts }));
