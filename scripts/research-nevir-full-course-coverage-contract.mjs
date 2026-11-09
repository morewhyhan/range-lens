import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');

const manifest = read('unit-course-manifest.json');
const principle = read('principle-loop-unit-crosswalk.json');
const release = read('unit-learner-release-matrix.json');
const generator = read('automatic-question-generation-contract.json');
const canonical = read('unit-canonical-route-bridge.json');

const requiredModes = ['base', 'contrast', 'transfer'];
const requiredPools = ['locator', 'pure_or_fact', 'mixed_when_applicable', 'edge', 'internal', 'action_preserving_contrast', 'single_field_transfer'];
const releaseStages = ['map', 'guided', 'independent', 'adjacent', 'delayed', 'continuous'];
const groupPolicies = {
  'compare.unopened': { parent: 'p4', dimensions: ['street','role','actionState','boardClass','handClass','price','actionPurpose','size'], edgeMeaning: '贴近课程动作边界的比较牌', internalMeaning: '同一比较原理的非边界牌' },
  'compare.bet': { parent: 'p4', dimensions: ['street','role','actionState','boardClass','handClass','price','actionHistory','rangeBefore'], edgeMeaning: '贴近面对下注价格边界的牌', internalMeaning: '同一价格机制的内部牌' },
  'compare.raise': { parent: 'p4', dimensions: ['street','role','actionState','boardClass','handClass','raisePrice','actionHistory','rangeBefore'], edgeMeaning: '贴近面对加注边界的牌', internalMeaning: '同一加注比较机制的内部牌' },
  'update.response': { parent: 'p6', dimensions: ['street','role','opponentResponse','selectedAction','price','actionHistory'], edgeMeaning: '回应后范围/账本明显变化的边界牌', internalMeaning: '回应不改变主导结构的内部牌' },
  'update.card': { parent: 'p6', dimensions: ['street','role','boardClass','newCardClass','heroHole','handClass'], edgeMeaning: '新牌改变策略分支的边界牌', internalMeaning: '新牌不改变主导结构的内部牌' }
};

const representatives = new Set(principle.representativeManifest.units);
const rows = manifest.rows.map(row => {
  const group = groupPolicies[row.route.groupId];
  const principleRow = principle.rows.find(x => x.unitId === row.unitId);
  const releaseRow = release.rows.find(x => x.unitId === row.unitId);
  const canonicalRow = canonical.rows.find(x => x.unitId === row.unitId);
  return {
    sequence: row.sequence,
    unitId: row.unitId,
    label: row.label,
    groupId: row.route.groupId,
    canonicalParentState: canonicalRow.canonicalParentState,
    firstPassRepresentative: representatives.has(row.unitId),
    requiredModes,
    requiredPools,
    groupDimensions: group.dimensions,
    edgeDefinition: group.edgeMeaning,
    internalDefinition: group.internalMeaning,
    contrastChangedFieldCandidates: principleRow.contrastCase.candidateChangedFields,
    transferRequiredOutputs: principleRow.transferCase.requiredOutputs,
    releaseStages,
    missingEvidenceAction: row.learningContract.missingEvidenceAction,
    currentReleaseStatus: releaseRow.currentReleaseStatus,
    exactGradeRequires: principleRow.exactGradeRequires,
    cardCompletion: principleRow.cardCompletion,
    sourceIdentity: principleRow.source.evidenceIdentity,
    status: 'coverage_specified_not_pool_compiled'
  };
});

assert.equal(manifest.rows.length, 35);
assert.equal(principle.rows.length, 35);
assert.equal(release.rows.length, 35);
assert.equal(canonical.rows.length, 35);
assert.equal(representatives.size, 5);
assert.equal(rows.every(x => requiredModes.every(mode => x.requiredModes.includes(mode))), true);
assert.equal(rows.every(x => requiredPools.every(pool => x.requiredPools.includes(pool))), true);
assert.equal(rows.every(x => x.releaseStages.length === 6), true);
assert.equal(rows.every(x => x.contrastChangedFieldCandidates.length > 0), true);
assert.equal(rows.every(x => x.transferRequiredOutputs.length > 0), true);
assert.equal(rows.every(x => x.cardCompletion.base === false && x.cardCompletion.contrast === false && x.cardCompletion.transfer === false), true);
assert.equal(generator.ratioRules.sumMustEqualOne, true);
assert.equal(generator.coverageClose.requiresEdgeAndInternalIndependentAttempts, true);
assert.equal(generator.coverageClose.requiresSingleFieldTransfer, true);
assert.equal(canonical.rules.all35UnitsMapped, true);

const coverage = {
  id: 'FULL_COURSE_COVERAGE_AND_RELEASE_CONTRACT_V1',
  status: 'paper_35_unit_coverage_plan_compiled_pools_and_reference_missing',
  purpose: '把35项从首遍代表题到全量练习的覆盖维度、三卡结构、用户可调抽题参数和六级释放绑定起来，防止题量增长替代系统覆盖。',
  sources: ['unit-course-manifest.json','principle-loop-unit-crosswalk.json','unit-learner-release-matrix.json','automatic-question-generation-contract.json','unit-canonical-route-bridge.json'],
  releasePlan: [
    { stage: 'first_pass', visibleUnits: [...representatives], rule: '只用五个代表单元建立路线，不打开35项平铺入口。' },
    { stage: 'map_to_guided', visibleUnits: 'all35', rule: '每个单元先确认父帧、白话问题、首答、必需输出和返回点。' },
    { stage: 'independent_to_adjacent', visibleUnits: 'all35', rule: '每单元必须有基准卡、单变量对照卡和未见迁移卡。' },
    { stage: 'delayed_to_continuous', visibleUnits: 'all35', rule: '只有范围后继、账本和停止身份闭合后才能进入连续路线。' }
  ],
  poolControls: {
    userAdjustable: ['edgeRatio','internalRatio','pureRatio','mixedRatio','transferRatio'],
    invariants: ['sumMustEqualOne','edgeAndInternalBothRequired','missingPoolCannotBeInvented','samplingDoesNotChangePolicy','samplingDoesNotChangeRange','samplingDoesNotChangeEV'],
    defaultRatios: null,
    calibrationRequiredBeforeDefault: true,
    emptyPoolBehavior: 'unavailable_not_substituted'
  },
  requiredPools,
  requiredModes,
  releaseStages,
  groupPolicies,
  rows,
  rules: {
    all35UnitsListed: true,
    all35HaveBaseContrastTransfer: true,
    contrastExactlyOneField: true,
    edgeAndInternalAreSeparateAttempts: true,
    everyUnitHasParentAndReturn: true,
    everyUnitHasStopOnMissingEvidence: true,
    firstPassUsesOnlyFiveRepresentatives: true,
    noFlat35HomeMenu: true,
    missingPoolIsNotFilledByNeighbor: true,
    noExactGradeWithoutReferenceAndSuccessor: true,
    coverageStateIsNotSkillScore: true
  },
  currentEvidence: {
    paperPlan: true,
    all35RowsCompiled: true,
    all105CardsCompiled: false,
    poolsCompiled: false,
    ratiosCalibrated: false,
    runtimeQuestionGenerator: false,
    learnerTrial: false,
    matchedReference: false,
    NL50Evidence: false
  }
};

write('full-course-coverage-and-release-contract.json', coverage);

const md = `# 203｜35项全量练习覆盖与嵌套释放计量合同

\`\`\`json
{
  "parentDocument": "202_35项单元到唯一用户停点的交叉合同.md",
  "routeNode": "full_course_coverage_and_release_contract",
  "evidenceLevel": "paper_35_unit_coverage_plan_compiled_pools_and_reference_missing",
  "opensChildren": ["full-course-coverage-and-release-contract.json", "principle-loop-unit-crosswalk.json", "automatic-question-generation-contract.json"],
  "returnTo": "翻后教学系统_统一总纲.md",
  "currentStatus": "35_unit_three_card_coverage_specified_not_compiled"
}
\`\`\`

## 这份合同解决什么

“系统全面”不能只等于有35个单元，也不能用题目数量证明。每个单元都要有三种不同作用的题：

1. **基准卡**：看懂这个单元到底在观察什么；
2. **单变量对照卡**：只改一个字段，看见为什么层级或答案变化；
3. **迁移卡**：隐藏单元名称，先指出受影响层，再完成陌生题。

每一类题还要分别覆盖定位、纯事实/纯规则、适用的混合题、边缘牌、内部牌、保持动作的对照和单字段迁移。缺少某个池时显示“资料不可用/暂不开放”，不能从邻近单元复制题目填空。

## 用户实际看到的释放顺序

\`\`\`text
首遍：只见 1.5、2.1、3.1、4.5、5.7 五个代表
→ 先建立 p4/p6 父帧和完整路线
→ 35项逐个进入 map → guided
→ 每项完成基准、对照、迁移三卡
→ 通过延迟回忆后，才进入连续后继
\`\`\`

用户可以调整边缘牌、内部牌、纯事实、混合题和迁移题的比例，但这些参数只改变抽样，不改变课程政策、范围、EV或后继。默认比例在真实试读和题池校准前保持为空，避免拍脑袋设置一个看似科学的数字。

## 当前真实状态

35个单元、父帧和三卡身份已经列出，但105张具体卡、题池、比例校准、匹配参考和真人试读尚未完成。当前合同只能证明“系统应该怎样全面覆盖和逐级释放”，不能证明题目已经足够多、策略已经正确或学习者已经达到NL50。

机器计划见 [full-course-coverage-and-release-contract.json](full-course-coverage-and-release-contract.json)。
`;
fs.writeFileSync(path.join(dir, '203_35项全量练习覆盖与嵌套释放计量合同.md'), md);

console.log(JSON.stringify({
  ok: true,
  status: coverage.status,
  units: rows.length,
  representatives: [...representatives],
  requiredModes: requiredModes.length,
  requiredPools: requiredPools.length,
  all105CardsCompiled: coverage.currentEvidence.all105CardsCompiled,
  ratiosCalibrated: coverage.currentEvidence.ratiosCalibrated
}));
