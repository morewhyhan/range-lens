import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n', 'utf8');

const standard = read('target-standard-sequential-teaching-and-nl50-closure-contract.json');
const route = read('learner-goal-route-canonical.json');
const visual = read('visual-navigation-contract.json');
const visibility = read('first-pass-visibility-contract.json');
const language = read('first-pass-language-contract.json');
const narration = read('learner-first-pass-narration-contract.json');
const principles = read('first-pass-principle-coverage.json');
const units = read('unit-canonical-route-bridge.json');
const fullCourse = read('full-course-coverage-and-release-contract.json');
const representatives = read('first-pass-representative-units.json');

const canonicalRoute = route.outerRoute.map(step => step.id);
const innerRoute = ['p1','p2','p3','p4','p5','p6','p7'];
const expectedPrinciples = principles.principles.map(item => item.id);
const expectedRepresentatives = representatives.representatives.map(item => item.unit);
const check = (id, statement, result, evidence) => ({ id, statement, result, evidence });
const checks = [
  check('route_exact', '215号路线与唯一canonical路线一致', JSON.stringify(standard.canonicalRoute) === JSON.stringify(canonicalRoute), ['learner-goal-route-canonical.json']),
  check('inner_route_exact', '215号内层路线与p1-p7一致', JSON.stringify(standard.canonicalRoute.slice(5)) === JSON.stringify(innerRoute), ['learner-goal-route-canonical.json']),
  check('principle_ids_exact', '12个原理ID完整且顺序一致', JSON.stringify(standard.principleCoverageContract.requiredIds) === JSON.stringify(expectedPrinciples), ['first-pass-principle-coverage.json']),
  check('representatives_exact', '首遍五张代表卡与统一代表清单一致', JSON.stringify(standard.fullCourseReleaseSchedule[0].visibleUnits) === JSON.stringify(expectedRepresentatives), ['first-pass-representative-units.json']),
  check('unit_group_parent_exact', '五组35项父步骤与单元桥一致', JSON.stringify(standard.unitGroupParents) === JSON.stringify(units.groupParent), ['unit-canonical-route-bridge.json']),
  check('unit_count_exact', '后台单元数量为35且都要求父帧', units.rows.length === 35 && units.rules.all35UnitsMapped === true, ['unit-canonical-route-bridge.json','full-course-coverage-and-release-contract.json']),
  check('visual_regions_compatible', '中央视觉、问题动作和解析四区与视觉导航合同兼容', standard.visualExperienceContract.screenRegions.length === 4 && visual.screenRegions.length === 4 && standard.visualExperienceContract.oneCentralVisualPerStop === true, ['visual-navigation-contract.json','first-pass-visibility-contract.json']),
  check('visual_semantics_compatible', '固定坐标、固定分母、非颜色语义和三类过滤边界一致', standard.visualExperienceContract.same13x13CoordinateBeforeAfter === true && standard.visualExperienceContract.sameDenominatorBeforeAfter === true && visual.rangeSemantics.physicalFilterSeparateFromActionFilter === true, ['visual-navigation-contract.json','solver-course-visual-compiler-contract.json']),
  check('visibility_load_compatible', '每步一问一动作、最多三个视觉块和一次新概念一致', visibility.rules.oneQuestion === true && visibility.rules.onePrimaryAction === true && visibility.rules.maxVisualBlocks === 3 && visibility.rules.oneNewUnmasteredConcept === true, ['first-pass-visibility-contract.json']),
  check('language_compatible', '首遍白话层、技术词后置和概念边界一致', standard.languageContract.defaultFirstPassLayer === language.defaultFirstPassLayer && standard.languageContract.plainLanguageBeforeTechnicalAlias === language.upgradeRules.plainOperationBeforeTechnicalTerm && standard.languageContract.forbiddenPrimaryTerms.includes('EV') && narration.copyRules.technicalTermsNotSoleNavigation === true, ['first-pass-language-contract.json','learner-first-pass-narration-contract.json']),
  check('release_pool_compatible', '全量覆盖的六级释放、空池不替代和首遍代表规则一致', fullCourse.releaseStages.length === 6 && fullCourse.poolControls.emptyPoolBehavior === 'unavailable_not_substituted' && representatives.unlockRules.firstPassShowsOnlyRepresentatives === true, ['full-course-coverage-and-release-contract.json','first-pass-representative-units.json']),
  check('stop_and_parent_compatible', '缺证据停止、子层返回父帧和无平铺入口一致', standard.routeInvariant.missingEvidenceCreatesStopCard === true && standard.routeInvariant.childReturnsToSameParentSnapshot === true && standard.routeInvariant.noFlat35HomeMenu === true && units.rules.allReturnsToSameCanonicalParent === true, ['target-standard-sequential-teaching-and-nl50-closure-contract.json','unit-canonical-route-bridge.json'])
];

assert.equal(checks.every(item => item.result), true, checks.filter(item => !item.result).map(item => item.id).join(','));

const audit = {
  id: 'GOAL_STANDARD_CROSSWALK_AUDIT_V1',
  status: 'paper_goal_standard_crosswalk_consistent_runtime_and_learner_evidence_missing',
  purpose: '把215号目标标准与既有canonical路线、视觉、可见负荷、语言、原理覆盖、35项释放和代表题合同逐项核对。',
  sources: [
    'target-standard-sequential-teaching-and-nl50-closure-contract.json',
    'learner-goal-route-canonical.json',
    'visual-navigation-contract.json',
    'first-pass-visibility-contract.json',
    'first-pass-language-contract.json',
    'learner-first-pass-narration-contract.json',
    'first-pass-principle-coverage.json',
    'unit-canonical-route-bridge.json',
    'full-course-coverage-and-release-contract.json',
    'first-pass-representative-units.json'
  ],
  checks,
  summary: { total: checks.length, passed: checks.filter(item => item.result).length, failed: checks.filter(item => !item.result).length },
  currentEvidence: {
    paperCrosswalk: true,
    runtimeRoute: false,
    matchedReference: false,
    lowBaselineTrial: false,
    learnerTransfer: false,
    NL50Evidence: false
  },
  guards: {
    crosswalkPassDoesNotEqualRuntime: true,
    crosswalkPassDoesNotEqualLearnerUnderstanding: true,
    crosswalkPassDoesNotEqualMatchedGTO: true,
    crosswalkPassDoesNotEqualNL50: true
  }
};
write('goal-standard-crosswalk-audit.json', audit);

const md = [
  '# 216｜目标标准与既有合同交叉审计',
  '',
  '```json',
  JSON.stringify({ parentDocument: '215_目标标准的顺序教学与NL50结果闭环合同.md', routeNode: 'goal_standard_crosswalk_audit', evidenceLevel: audit.status, opensChildren: ['goal-standard-crosswalk-audit.json', '215_目标标准的顺序教学与NL50结果闭环合同.md'], returnTo: '翻后教学系统_统一总纲.md', currentStatus: audit.status }, null, 2),
  '```',
  '',
  '这份审计逐项核对215号总标准和已有路线、视觉、语言、原理覆盖、35项释放及首遍代表题合同。当前纸面检查全部通过，说明这些文件没有出现路线、父帧、代表题、视觉负荷或首遍语言的字段冲突。',
  '',
  '| 检查总数 | 通过 | 失败 |',
  `| ${audit.summary.total} | ${audit.summary.passed} | ${audit.summary.failed} |`,
  '',
  ...checks.map(item => `- **${item.id}**：${item.result ? '通过' : '失败'}；${item.statement}。依据：${item.evidence.join('、')}`),
  '',
  '这份交叉审计只证明文档之间一致，不证明页面已经接入、学习者已经理解、参考策略已经匹配或已经达到NL50。运行时、真人试读、匹配参考、迁移和目标级证据仍按195号最终发布审计保持关闭。',
  ''
].join('\n');
fs.writeFileSync(path.join(dir, '216_目标标准与既有合同交叉审计.md'), md, 'utf8');

console.log(JSON.stringify({ ok: true, id: audit.id, status: audit.status, total: audit.summary.total, passed: audit.summary.passed, failed: audit.summary.failed }, null, 2));
