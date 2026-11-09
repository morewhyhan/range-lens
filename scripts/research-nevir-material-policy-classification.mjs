import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const sourcesPath = path.join(root, 'src/data/sources.json');
const claimsPath = path.join(dir, 'source-claims.json');
const outPath = path.join(dir, 'material-policy-classification.json');
const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
const claims = JSON.parse(fs.readFileSync(claimsPath, 'utf8'));

assert.ok(Array.isArray(sources.postflop));
assert.equal(claims.summary.fragments, 275);
assert.equal(claims.reviews.length, 45);

const identityRules = {
  raw_reference: {
    sourceKind: 'matched_solver_reference',
    releaseBand: 'reference_only',
    requires: ['matchedInputFingerprint', 'referenceSnapshot', 'solverQuality', 'successorOrStop'],
    forbiddenPromotion: ['course_rule', 'population_exploit']
  },
  simplified_reference: {
    sourceKind: 'compiled_reference_simplification',
    releaseBand: 'course_safe_candidate',
    requires: ['raw_reference', 'quantizationRule', 'differenceLedger', 'rangeAfterByAction', 'policyScope'],
    forbiddenPromotion: ['raw_reference']
  },
  course_rule: {
    sourceKind: 'explicit_course_material_or_teaching_synthesis',
    releaseBand: 'course_rule_candidate',
    requires: ['courseSourceReference', 'policyScope', 'coursePolicyFingerprint'],
    forbiddenPromotion: ['raw_reference']
  },
  population_exploit: {
    sourceKind: 'conditional_population_or_opponent_model',
    releaseBand: 'population_exploit_candidate',
    requires: ['courseSourceReference', 'populationModel', 'triggerCondition', 'policyScope', 'coursePolicyFingerprint'],
    forbiddenPromotion: ['raw_reference', 'simplified_reference']
  },
  illustration: {
    sourceKind: 'mechanism_or_declared_example',
    releaseBand: 'demonstration_only',
    requires: ['sourceReference', 'declaredExample', 'parentReturn'],
    forbiddenPromotion: ['raw_reference', 'course_rule']
  },
  fact_only: {
    sourceKind: 'physical_or_navigation_fact',
    releaseBand: 'fact_only',
    requires: ['physicalFacts'],
    forbiddenPromotion: ['raw_reference', 'course_rule']
  },
  unknown_stop: {
    sourceKind: 'missing_or_unresolved_material',
    releaseBand: 'not_open',
    requires: ['stopReason', 'returnToParent', 'missingField'],
    forbiddenPromotion: ['raw_reference', 'simplified_reference', 'course_rule', 'population_exploit']
  }
};

const textOf = row => Object.entries(row.values ?? {})
  .filter(([, value]) => typeof value === 'string')
  .map(([column, value]) => `${column}:${value}`)
  .join(' | ');

function principleIdsFor(sheet, row, text, policyIdentity) {
  if (sheet.name.startsWith('08 ')) return [];
  const ids = new Set();
  if (sheet.name.startsWith('05 ')) {
    ids.add('P09');
    ids.add('P10');
    ids.add('P11');
  } else if (sheet.name.startsWith('06 ')) {
    ids.add('P07');
    ids.add('P08');
    ids.add('P11');
  } else if (/^(01|02|03|04) /.test(sheet.name)) {
    ids.add('P07');
    ids.add('P08');
  } else {
    ids.add('P03');
    ids.add('P04');
  }
  if (/范围|组合|实体|移除|过滤|跟注范围|加注范围/.test(text)) {
    ids.add('P05');
    ids.add('P06');
  }
  if (/最佳五张|牌力|成牌|听牌|改善|底牌|手牌/.test(text)) ids.add('P04');
  if (/下注|过牌|加注|跟注|弃牌|频率|尺寸|B\d+|X\/R|X\/C/.test(text)) {
    ids.add('P07');
    ids.add('P08');
  }
  if (/行动后|后继|下一|转牌|河牌|新牌|线路|三枪/.test(text)) {
    ids.add('P09');
    ids.add('P10');
    ids.add('P11');
  }
  if (policyIdentity === 'unknown_stop') ids.add(sheet.name.startsWith('05 ') || sheet.name.startsWith('06 ') ? 'P11' : 'P07');
  return [...ids].sort();
}

function classify(sheet, row) {
  const text = textOf(row);
  const tags = [...text.matchAll(/【([^】]+)】/g)].map(match => match[1]);
  let policyIdentity = 'unknown_stop';
  let sourceKind = 'unclassified_material';
  let classificationReason = '没有明确的资料身份标签，不能进入动作判分。';
  let releaseBand = 'not_open';
  if (tags.includes('资料待补')) {
    policyIdentity = 'unknown_stop';
    sourceKind = 'missing_material';
    classificationReason = '材料明确标为资料待补；保留牌面入口但停止精确策略。';
  } else if (tags.includes('条件剥削')) {
    policyIdentity = 'population_exploit';
    sourceKind = 'conditional_population_or_opponent_model';
    classificationReason = '材料带有对手倾向或人群条件，只能在模型和触发条件齐全时练习。';
  } else if (tags.includes('课程')) {
    policyIdentity = 'course_rule';
    sourceKind = 'explicit_course_material';
    classificationReason = '材料明确作为课程例或课程取值，但仍需声明适用范围和简化身份。';
  } else if (tags.includes('教学归纳')) {
    policyIdentity = 'course_rule';
    sourceKind = 'teaching_synthesis';
    classificationReason = '由前序例子归纳，须保留推导链，并在精确判分前完成参考对照或显式停止。';
  } else if (tags.includes('原理补充') || tags.includes('原理展开；配牌为示意')) {
    policyIdentity = 'illustration';
    sourceKind = 'mechanism_or_declared_example';
    classificationReason = '只用于解释机制、牌面变化或思考顺序，不产生未见题唯一动作。';
  } else if (sheet.name.startsWith('00 ') || sheet.name.startsWith('07 ')) {
    policyIdentity = 'illustration';
    sourceKind = 'navigation_or_vocabulary';
    releaseBand = 'navigation_only';
    classificationReason = '导航或术语层，不是行动策略来源。';
  } else if (sheet.name.startsWith('08 ') && text.includes('来源文件')) {
    policyIdentity = 'illustration';
    sourceKind = 'source_register';
    releaseBand = 'author_only';
    classificationReason = '来源登记表，只决定材料血缘，不产生策略答案。';
  } else if (sheet.name.startsWith('08 ') && (text.includes('补充核对') || text.includes('新增对照图'))) {
    policyIdentity = 'illustration';
    sourceKind = 'external_or_generated_mechanism';
    releaseBand = 'demonstration_only';
    classificationReason = '机制核对或教学补图，不替代课程节点或匹配求解结果。';
  } else if (sheet.name.startsWith('08 ')) {
    policyIdentity = 'illustration';
    sourceKind = 'source_boundary_or_editorial_note';
    releaseBand = 'author_only';
    classificationReason = '覆盖边界、勘误或编辑说明，只能形成停止和来源约束。';
  } else if (sheet.name.startsWith('牌面分支与原因')) {
    policyIdentity = 'illustration';
    sourceKind = 'mechanism_or_declared_example';
    releaseBand = 'demonstration_only';
    classificationReason = '牌面差异和因果解释层；它告诉学习者先看什么，但不单独产生精确行动。';
  } else if (/^(01|02|03|04|05|06) /.test(sheet.name)) {
    const navigationRow = row.row <= 4 || /HYPERLINK|返回|查转牌|查河牌|图解术语|具体分支|对应牌面图片|现在怎么做/.test(text);
    if (navigationRow) {
      policyIdentity = 'illustration';
      sourceKind = 'navigation_or_vocabulary';
      releaseBand = 'navigation_only';
      classificationReason = '页面导航或字段说明，不是独立策略答案。';
    } else if (/资料未给|未覆盖|待补|不能从|不能据此/.test(text)) {
      policyIdentity = 'unknown_stop';
      sourceKind = 'explicit_scope_stop';
      classificationReason = '正文明确写出范围或资料缺口，保留为停止边界。';
    } else {
      policyIdentity = 'course_rule';
      sourceKind = 'teaching_synthesis';
      releaseBand = 'course_rule_candidate';
      classificationReason = '课程页的概括规则或教学归纳；可以作为父层理解和候选题，但必须继续绑定来源、范围和差异账本。';
    }
  } else {
    policyIdentity = 'unknown_stop';
    sourceKind = 'unclassified_material';
    classificationReason = '没有显式身份，默认停止而不是猜测。';
  }
  const rule = identityRules[policyIdentity];
  let route;
  if (sheet.name.startsWith('08 ')) {
    route = {
      parentFrame: 'author_only',
      nestedTask: 'source_boundary_and_stop',
      primaryQuestion: '这条材料的来源身份、作用范围和缺口是什么？',
      returnTo: 'p4_compare',
      nextFrame: 'stop_or_policy_compile',
      stopBoundary: '不直接进入用户动作判分'
    };
  } else if (sheet.name.startsWith('05 ') || sheet.name.startsWith('06 ')) {
    route = {
      parentFrame: 'p6_update',
      nestedTask: sheet.name.startsWith('05 ') ? 'turn_inheritance' : 'river_task_and_stop',
      primaryQuestion: sheet.name.startsWith('05 ') ? '翻牌前序和转牌新牌让范围与计划怎样变化？' : '河牌当前的价值、诈唬、跟弃或停止任务是什么？',
      returnTo: 'p4_compare',
      nextFrame: 'p7_close',
      stopBoundary: '没有真实后继或匹配策略时停在当前街'
    };
  } else if (/^(01|02|03|04) /.test(sheet.name)) {
    route = {
      parentFrame: 'p4_compare',
      nestedTask: 'flop_policy_identity_and_action',
      primaryQuestion: '在固定位置、前序、牌面和规则身份下，当前能比较哪些动作？',
      returnTo: 'p2_board',
      nextFrame: 'p5_execute',
      stopBoundary: '来源身份或匹配参考不足时只保留事实、示范或停止'
    };
  } else if (sheet.name.startsWith('牌面分支与原因')) {
    route = {
      parentFrame: 'p2_board',
      nestedTask: 'board_mechanism',
      primaryQuestion: '公共牌具体改变了哪些成牌、听牌、范围上限和继续对象？',
      returnTo: 'p2_board',
      nextFrame: 'p3_range',
      stopBoundary: '牌面结构解释不能单独推出下注频率'
    };
  } else {
    route = {
      parentFrame: 'p2_board',
      nestedTask: 'board_navigation_or_terms',
      primaryQuestion: '这条材料帮助我定位哪个牌面类别或术语？',
      returnTo: 'p1_context',
      nextFrame: 'p2_board',
      stopBoundary: '导航与术语不产生动作答案'
    };
  }
  if (policyIdentity === 'unknown_stop') route.nextFrame = 'stop_at_parent';
  return {
    id: `${sheet.name}#${row.row}`,
    sheet: sheet.name,
    row: row.row,
    policyIdentity,
    sourceKind,
    releaseBand: releaseBand === 'not_open' ? rule.releaseBand : releaseBand,
    classificationReason,
    principleIds: principleIdsFor(sheet, row, text, policyIdentity),
    route,
    requires: rule.requires,
    forbiddenPromotion: rule.forbiddenPromotion,
    hasExplicitTag: tags.length > 0,
    sourceTags: tags,
    sourceTextHash: crypto.createHash('sha256').update(text).digest('hex'),
    textPreview: text.replace(/\s+/g, ' ').slice(0, 220)
  };
}

const rows = [];
for (const sheet of sources.postflop) {
  for (const row of sheet.rows ?? []) rows.push(classify(sheet, row));
}

const reviewIdentity = review => {
  const precision = review.claim?.precision ?? 'unknown';
  if (precision === 'unresolved_scope') return 'unknown_stop';
  if (precision.includes('conditional_population') || precision.includes('conditional_model') || precision.includes('conditional_course')) return 'population_exploit';
  if (precision.includes('explicit_course')) return 'course_rule';
  return 'illustration';
};

const reviewedClaims = claims.reviews.map(review => ({
  reviewId: review.id,
  fragment: review.fragment,
  title: review.title,
  policyIdentity: reviewIdentity(review),
  precision: review.claim?.precision ?? 'unknown',
  status: review.status,
  gradeable: false,
  stopIfUnresolved: review.status === 'requires_source_resolution',
  limit: review.limit
}));

const counts = rows.reduce((acc, row) => {
  acc[row.policyIdentity] = (acc[row.policyIdentity] ?? 0) + 1;
  return acc;
}, {});
const sourceKindCounts = rows.reduce((acc, row) => {
  acc[row.sourceKind] = (acc[row.sourceKind] ?? 0) + 1;
  return acc;
}, {});
const routeCounts = rows.reduce((acc, row) => {
  acc[row.route.parentFrame] = (acc[row.route.parentFrame] ?? 0) + 1;
  return acc;
}, {});

const sourceRegister = sources.postflop.find(sheet => sheet.name.startsWith('08 '));
const noteSources = [...new Set((sourceRegister?.rows ?? [])
  .map(row => row.values?.C)
  .filter(value => typeof value === 'string' && value.endsWith('.md')))].sort();

const output = {
  id: 'MATERIAL_POLICY_CLASSIFICATION_V1',
  status: 'paper_postflop_material_policy_classified_runtime_compiler_and_learner_evidence_missing',
  purpose: '把翻后工作簿每个材料行和已复核原文命题先归类为参考策略、简化课程、条件剥削、示意、事实或停止，防止案例平铺后被误当成完整GTO答案。',
  sourceFiles: ['src/data/sources.json', 'research/nevir-system/source-claims.json'],
  noteSources,
  policyIdentityRules: identityRules,
  hardRules: {
    policyIdentityBeforeActionGrade: true,
    explicitCourseRuleIsNotRawReference: true,
    teachingSynthesisNeedsDerivationLedger: true,
    populationExploitNeedsOpponentModelAndTrigger: true,
    illustrationCannotBeIndependentlyGraded: true,
    unknownStopsAtParent: true,
    sourceTextHashRequired: true,
    materialClassificationDoesNotProveStrategyOrNL50: true,
    everyMaterialRowHasOneParentFrame: true,
    everyMaterialRowHasOnePrimaryQuestion: true,
    childReturnsToDeclaredParent: true,
    unknownIdentityStopsAtParent: true
    ,everyUserMaterialRowHasPrincipleLink: true
  },
  routeContract: {
    canonicalOrder: ['p1_context', 'p2_board', 'p3_range', 'p4_compare', 'p5_execute', 'p6_update', 'p7_close'],
    parentFrames: ['p1_context', 'p2_board', 'p4_compare', 'p6_update', 'author_only'],
    childRule: '每条材料只打开一个嵌套任务；用户回答一个问题后回到父帧；缺来源就停在当前父帧。',
    progression: 'context→board→range→compare→execute→update→close'
  },
  rows,
  reviewedClaims,
  counts: {
    materialRows: rows.length,
    reviewedClaims: reviewedClaims.length,
    byPolicyIdentity: counts,
    bySourceKind: sourceKindCounts,
    byParentFrame: routeCounts,
    byPrinciple: rows.reduce((acc, row) => {
      for (const principleId of row.principleIds) acc[principleId] = (acc[principleId] ?? 0) + 1;
      return acc;
    }, {}),
    explicitTaggedRows: rows.filter(row => row.hasExplicitTag).length,
    unclassifiedRows: rows.filter(row => row.sourceKind === 'unclassified_material').length,
    exactStrategyReadyRows: 0,
    runtimeAttachedRows: 0,
    learnerVerifiedRows: 0
  },
  releaseBoundary: {
    openForFactOrNavigation: ['fact_only', 'illustration'],
    openForCourseCandidate: ['course_rule', 'population_exploit'],
    openForReferenceOnly: ['raw_reference', 'simplified_reference'],
    stop: ['unknown_stop'],
    nextRequired: ['matchedReferenceOrExplicitCoursePolicy', 'policyScope', 'differenceLedger', 'successorOrStop', 'learnerTransferEvidence']
  }
};

fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, counts: output.counts, noteSources: output.noteSources.length }));
