import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');

const frequency = read('frequency-quantization-and-edge-compilation.json');
const calibration = read('course-simplification-calibration.json');
const requestManifest = read('unit-reference-snapshot-request-manifest.json');
const compiler = read('strategy-to-course-compiler-contract.json');
const target = read('target-readiness-and-nl50-benchmark-contract.json');
assert.deepEqual(frequency.policySpace.values, [0, 0.5, 1]);
assert.equal(frequency.releaseGates.missingReferenceBlocksQuantization, true);
assert.equal(calibration.thresholdsMustBeCalibratedPerCourseVersion, true);
assert.equal(requestManifest.rows.length, 35);
assert.equal(compiler.hardGates.changedPolicyRequiresAncestorRecompile, true);
assert.equal(target.holdoutRules.noGlobalAveragePromotion, true);

const policyFields = [
  'courseVersion','unitId','nodeIdentity','inputFingerprint','referenceFingerprint',
  'coursePolicyFingerprint','actionMenu','referenceFrequencyByCombo','courseWeightByCombo',
  'perComboEv','reachWeights','rangeBefore','referenceAfterByAction','courseAfterByAction',
  'differenceLedger','successorGraph','quantizationRule','calibrationStratum','releaseBand',
  'policyIdentity','sourceKind','policyScope','populationModel','courseSourceReference'
];

const policyIdentityLadder = [
  {
    id: 'raw_reference',
    meaning: '匹配输入下的原始参考策略；可以展示参考频率，但不是课程动作。',
    requires: ['matchedInputFingerprint','referenceSnapshot','solverQuality','successorOrStop'],
    grade: 'reference_only'
  },
  {
    id: 'simplified_reference',
    meaning: '从原始参考经过明确量化和边缘校准后的课程版本。',
    requires: ['raw_reference','quantizationRule','differenceLedger','rangeAfterByAction','policyScope'],
    grade: 'course_rule_only'
  },
  {
    id: 'course_rule',
    meaning: '材料明确写出的课程规则；必须标明来源和作用范围。',
    requires: ['courseSourceReference','policyScope','coursePolicyFingerprint'],
    grade: 'course_rule_only'
  },
  {
    id: 'population_exploit',
    meaning: '在明确对手倾向、触发条件和范围内的剥削规则，不能冒充基础GTO。',
    requires: ['courseSourceReference','populationModel','triggerCondition','policyScope','coursePolicyFingerprint'],
    grade: 'conditional_course_rule_only'
  },
  {
    id: 'illustration',
    meaning: '机制示意案例，只用于讲解，不生成未见题唯一答案。',
    requires: ['declaredExample','sourceReference','parentReturn'],
    grade: 'demonstration_only'
  },
  {
    id: 'fact_only',
    meaning: '牌面、牌力、实体移除和金额事实，不推出行动。',
    requires: ['physicalFacts'],
    grade: 'fact_only'
  },
  {
    id: 'unknown_stop',
    meaning: '来源、范围或配置不足，停止开放。',
    requires: ['stopReason','returnToParent','missingField'],
    grade: 'stop'
  }
];

const calibrationStrata = [
  {
    id: 'stable_action',
    selection: 'top1-top2 margin high and one dominant supported action',
    purpose: 'estimate solver/reference noise before interpreting simplification loss',
    mustReport: ['noiseEstimate','actionDistribution','policyLoss','rangeDifference','successorCompleteness']
  },
  {
    id: 'edge_mixed',
    selection: 'small top1-top2 margin, two or more supported actions, or edge/internal boundary',
    purpose: 'protect mixed frequencies and prevent edge cards from being silently rounded',
    mustReport: ['margin','supportCount','localEvGap','quantizationLoss','affectedHands']
  },
  {
    id: 'menu_sensitive',
    selection: 'action menu or size changes the best simplified vector',
    purpose: 'force ancestor recompute after removing or merging an action',
    mustReport: ['beforeMenu','afterMenu','affectedAncestors','successorChanges','evDelta']
  },
  {
    id: 'successor_sensitive',
    selection: 'action changes next range, chance branch, or street continuation',
    purpose: 'ensure range-after and successor closure are part of the simplification decision',
    mustReport: ['rangeAfterDelta','nextStateIdentity','stopReason','ledgerHandoff']
  }
];

const quantization = {
  policySpace: [0, 0.5, 1],
  inputPerCombo: ['referenceFrequency','perComboEv','reachWeight','actionMenu','successorGraph'],
  algorithm: [
    'remove physically impossible combos before action comparison',
    'keep the same action menu and denominator while comparing reference and course',
    'enumerate every allowed course vector whose components sum to one',
    'minimize calibrated policy loss, then frequency loss, then preserve supported actions',
    'if top actions are tied or loss exceeds tolerance, mark edge_review rather than force 50/50',
    'write referenceAfter, courseAfter and differenceLedger for every action',
    'recompute affected ancestors and successors after any menu or policy change'
  ],
  outputLabels: {
    '100': 'course vector contains one action at 1.0; support deletion and loss are reported',
    '50': 'course vector contains two declared actions at 0.5 each; only allowed after calibration',
    '0': 'action absent from course vector; it remains visible in the difference ledger',
    edge_review: 'not automatically graded as 0/50/100 until boundary is reviewed'
  }
};

const releaseBands = [
  { id: 'fact', permits: ['physical_fact'], requires: ['physicalFacts'], blocks: ['actionGrade','rangeAfterGrade'] },
  { id: 'demonstration', permits: ['teacherExample'], requires: ['identity','ledger','source'], blocks: ['exactStrategyGrade'] },
  { id: 'course_safe', permits: ['simplifiedPractice'], requires: ['calibratedThresholds','policyLossWithinTolerance','rangeDifferenceReported','successorComplete','policyIdentity','policyScope'], blocks: ['GTOClaim','NL50Claim'] },
  { id: 'edge_review', permits: ['edgePracticeWithFlag'], requires: ['unstableSupportOrQuantizationBoundary','differenceLedger'], blocks: ['silentExactGrade'] },
  { id: 'not_comparable', permits: ['stopCard'], requires: ['identityMismatchOrMissingReference'], blocks: ['allStrategyPractice'] }
];

const rows = requestManifest.rows.map(request => ({
  unitId: request.unitId,
  groupId: request.groupId,
  parentFrame: request.parentFrame,
  referenceRequestStage: request.referenceRequest.intakeStage,
  currentIdentity: request.currentSourceIdentity,
  policyFields,
  policyIdentityLadder,
  calibrationStrata: calibrationStrata.map(x => x.id),
  referenceRequired: request.referenceRequest.requiredPerComboFields,
  quantization: {
    policySpace: quantization.policySpace,
    exactlyOnePrimaryCourseVector: true,
    edgeMayRemainUnresolved: true,
    thresholdMustBeVersioned: true,
    ancestorRecomputeRequired: true
  },
  releaseBandBeforeReference: request.currentSourceIdentity === 'fact_or_ledger' ? 'fact_or_demonstration' : 'demonstration',
  releaseBandAfterCalibration: 'course_safe_or_edge_review',
  exactStrategyReady: false,
  stopReason: request.currentStopReason
}));

const out = {
  id: 'COURSE_SIMPLIFICATION_AND_EDGE_CALIBRATION_CONTRACT_V1',
  status: 'paper_simplification_algorithm_and_per_unit_calibration_matrix_written_reference_and_thresholds_missing',
  purpose: '把逐组合参考压缩成可教的0/50/100课程动作时，按版本、单元、动作和边缘牌分别校准损失；不把总体频率相近误认为策略等价。',
  sources: ['frequency-quantization-and-edge-compilation.json','course-simplification-calibration.json','strategy-to-course-compiler-contract.json','unit-reference-snapshot-request-manifest.json','target-readiness-and-nl50-benchmark-contract.json','material-policy-classification.json','material-unit-crosswalk.json','course-policy-candidate-ledger.json','course-policy-candidate-ledger-audit.json'],
  policyFields,
  policyIdentityLadder,
  calibrationStrata,
  quantization,
  releaseBands,
  metrics: {
    actionDistribution: calibration.metrics.actionDistribution,
    policyLoss: calibration.metrics.policyLoss,
    rangeDifference: calibration.metrics.rangeDifference,
    successorCompleteness: calibration.metrics.successorCompleteness,
    noiseFloor: 'referenceSnapshotA_vs_referenceSnapshotB on same input',
    releaseRule: 'noiseFloor < courseTolerance < unacceptablePolicyLoss'
  },
  rows,
  rules: {
    thresholdsCalibratedPerCourseVersion: true,
    thresholdsCalibratedPerStratum: true,
    sameInputAndDenominatorForComparison: true,
    physicalRemovalSeparateFromActionFilter: true,
    supportDeletionVisible: true,
    unknownOrMissingReferenceIsNotZero: true,
    edgeSamplingDoesNotChangeEvaluationWeight: true,
    evaluationWeightDoesNotChangeBecauseOfPracticeRatio: true,
    actionMenuChangeTriggersAncestorRecompile: true,
    noGlobalAveragePromotion: true,
    noGTOClaimFromCourseSafe: true,
    noNL50ClaimFromCompilerOnly: true,
    policyIdentityBeforeActionGrade: true,
    rawReferenceRequiresMatchedInput: true,
    simplifiedReferenceRequiresDifferenceLedger: true,
    courseRuleRequiresSourceAndScope: true,
    populationExploitRequiresOpponentModelAndTrigger: true,
    populationExploitCannotBecomeGTO: true,
    illustrationCannotBeIndependentlyGraded: true,
    unknownPolicyIdentityStops: true,
    policyIdentityChangeTriggersAncestorRecompile: true
  },
  currentEvidence: {
    algorithmWritten: true,
    perUnitRowsCompiled: true,
    matchedReference: false,
    independentReferenceAB: false,
    thresholdsCalibrated: false,
    coursePolicyCompiled: false,
    edgeReviewCompleted: false,
    ancestorRecompiled: false,
    learnerTrial: false,
    nl50Evidence: false
  }
};

write('course-simplification-and-edge-calibration-contract.json', out);

const md = `# 211｜课程简化、边缘牌与阈值校准合同

\`\`\`json
{
  "parentDocument": "210_35项单元参考快照请求与发布队列.md",
  "routeNode": "course_simplification_and_edge_calibration_contract",
  "evidenceLevel": "paper_simplification_algorithm_and_per_unit_calibration_matrix_written_reference_and_thresholds_missing",
  "opensChildren": ["course-simplification-and-edge-calibration-contract.json", "frequency-quantization-and-edge-compilation.json", "course-simplification-calibration.json"],
  "returnTo": "翻后教学系统_统一总纲.md",
  "currentStatus": "simplification_contract_written_not_calibrated"
}
\`\`\`

## 为什么不能直接把 GTO 频率改成 0/50/100

同一个动作频率，在稳定牌、边缘牌、动作菜单改变或后继范围改变时，简化风险完全不同。必须先拿同一输入的两个参考快照估计参考噪声，再按单元和四类校准层报告动作差、政策损失、动作后范围差和后继完整度。总体平均接近不能掩盖某一张边缘牌被错误归类。

## 实际编译顺序

\`\`\`text
实体不可能牌先移除
→ 保持同一动作菜单和同一分母
→ 枚举合法的0/50/100课程向量
→ 先控制政策损失，再控制频率差
→ 写动作后范围和差异账本
→ 重算受影响的祖先与后继
→ 稳定牌发布，边缘牌进入edge_review
\`\`\`

如果两个动作都真实支持且量化损失在该课程版本的容忍区间内，才允许编成 50/50；如果支持接近、EV差距很小、菜单变化敏感或后继不完整，就保留 \`edge_review\`，不能为了界面简单强行归成 0/50/100。练习中边缘牌可以多抽，但抽题比例不能改变评估权重。

## 五种发布身份

事实层只能判牌面与合法性；示范层只能讲清楚一个例子；\`course_safe\` 才能进入简化策略练习，但它仍不等于完整 GTO；\`edge_review\` 必须带边界标记；配置不匹配或缺资料则显示停止卡。每次课程政策改动都要重新计算动作后范围、差异、祖先节点和后继。

## 先判定“这条规则是什么”，再决定能不能判分

材料中的句子不能直接当成同一种答案。编译器先给每条规则登记 \`policyIdentity\`，再决定它能出现在什么练习层：

| 身份 | 它真正表示什么 | 可以做什么 | 明确不能做什么 |
|---|---|---|---|
| \`raw_reference\` | 匹配输入的原始参考策略 | 展示逐组合频率、EV、动作后范围 | 直接冒充课程动作 |
| \`simplified_reference\` | 原始参考经过量化和边缘校准后的课程版本 | 作为简化课程规则练习 | 回写成“原始GTO就是这样” |
| \`course_rule\` | 课程材料明确写出的规则 | 在写清来源和范围后作为课程答案 | 没有来源或范围时继续猜 |
| \`population_exploit\` | 针对明确对手倾向的剥削策略 | 在触发条件成立时单独练习 | 当成基础GTO或无条件通用规则 |
| \`illustration\` | 用于解释机制的示意案例 | 示范、对照、讲解 | 作为未见题的唯一判分答案 |
| \`fact_only\` | 牌力、实体移除、金额和合法性事实 | 事实题 | 从事实直接推出行动 |
| \`unknown_stop\` | 来源、范围、配置或后继不足 | 显示停止卡并回父层 | 生成默认动作或0% |

翻后笔记里出现的“对手过度弃牌、很少反击，所以可以更宽地持续下注”等句子，先归入 \`population_exploit\`，除非材料同时给出明确的对手模型、触发条件和适用范围，不能升级为基础 GTO 或 \`simplified_reference\`。这一步是为了让练习真正可迁移：用户学到的是“在什么条件下使用哪条规则”，而不是背下一句脱离条件的口号。

210号的35项请求现在全部接入这套矩阵。原材料中110条课程规则和12条条件剥削候选另见 [course-policy-candidate-ledger.json](course-policy-candidate-ledger.json) 及其审计；它们只保留原文和可核对上下文，数字没有被擅自解释成尺寸或频率，候选也没有被编译成答案。当前还没有匹配参考、双快照噪声估计、阈值校准、课程政策编译或边缘牌复核，因此任何单元都不能仅凭旧模型进入精确策略发布。机器合同见 [course-simplification-and-edge-calibration-contract.json](course-simplification-and-edge-calibration-contract.json)。
`;
fs.writeFileSync(path.join(dir, '211_课程简化、边缘牌与阈值校准合同.md'), md);

console.log(JSON.stringify({
  ok: true,
  status: out.status,
  units: rows.length,
  strata: calibrationStrata.length,
  policySpace: quantization.policySpace,
  matchedReference: out.currentEvidence.matchedReference,
  thresholdsCalibrated: out.currentEvidence.thresholdsCalibrated
}));
