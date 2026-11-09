import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');

const ledger = read('reference-course-policy-ledger-contract.json');
const snapshot = read('solver-snapshot-to-lesson-package.json');
const visual = read('solver-course-visual-compiler-contract.json');
const compiler = read('strategy-to-course-compiler-contract.json');
const queue = read('session-question-queue-contract.json');
const coverage = read('full-course-coverage-and-release-contract.json');

const identities = [
  {
    id: 'fact',
    userLabel: '牌面事实',
    requiredBlocks: ['identity','physical'],
    allowedOutputs: ['bestFive','handClass','improvementCards','physicalFilter','potOdds','ledgerFormula'],
    forbiddenOutputs: ['referenceFrequency','courseActionGrade'],
    grade: 'independent_fact_or_formula',
    sourceRule: '牌力评估器、实体组合枚举和明确公式；事实不选择下注动作。'
  },
  {
    id: 'demonstration',
    userLabel: '示范讲解',
    requiredBlocks: ['identity','physical','teaching'],
    allowedOutputs: ['declaredExample','reasoningSkeleton','parentReturn'],
    forbiddenOutputs: ['independent_mastery','targetStrategyClaim'],
    grade: 'demonstration_only',
    sourceRule: '局部课程例子可用于展示结构，但不能作为未见题精确策略答案。'
  },
  {
    id: 'course_rule',
    userLabel: '本课程规则',
    requiredBlocks: ['identity','physical','course','difference','teaching'],
    allowedOutputs: ['courseDecision','courseAmount','courseRangeAfter','courseSuccessorOrStop'],
    forbiddenOutputs: ['rawGTOClaim','unlabeledReferenceFrequency'],
    grade: 'declared_course_policy_only',
    sourceRule: '必须有版本化课程政策和简化差异账本；政策缺失就停止。'
  },
  {
    id: 'reference_frequency',
    userLabel: '参考频率',
    requiredBlocks: ['identity','physical','reference'],
    allowedOutputs: ['referenceActionFrequencyByCombo','referenceActionValueByCombo'],
    forbiddenOutputs: ['courseDecision','learnerMastery'],
    grade: 'reference_frequency_display_only',
    sourceRule: '必须有匹配输入指纹、固定求解快照、动作菜单和质量证据；频率不是课程动作。'
  },
  {
    id: 'reference_policy',
    userLabel: '匹配参考策略',
    requiredBlocks: ['identity','physical','reference','course','difference','range','successor','teaching'],
    allowedOutputs: ['referencePolicy','referenceRangeAfter','differenceLedger','legalSuccessors'],
    forbiddenOutputs: ['unmatchedSolverClaim','equityAsAction'],
    grade: 'matched_reference_and_course_policy',
    sourceRule: '输入配置、范围、行动菜单、求解快照和后继全部匹配后才可开放。'
  },
  {
    id: 'not_open',
    userLabel: '资料不足，暂不开放',
    requiredBlocks: ['identity'],
    allowedOutputs: ['stopReason','returnToParent','missingField'],
    forbiddenOutputs: ['zeroFrequency','defaultFold','inventedRange','inventedSuccessor'],
    grade: 'unknown_is_error_and_stop',
    sourceRule: '缺身份、政策、范围、后继或许可证时，显示停止卡，不生成动作答案。'
  }
];

const lineage = {
  inputIdentity: ['sourceFingerprint','configurationFingerprint','nodeIdentity','actionMenu'],
  physicalFacts: ['equity-calculator','holdem-hand-evaluator','entityEnumeration'],
  referencePolicy: ['matchedSolverSnapshot','perComboStrategy','solverQuality','legalSuccessors'],
  coursePolicy: ['versionedCoursePolicy','simplificationTransform','differenceLedger'],
  rangeAfter: ['rangeBefore','physicalFilter','referenceOrCourseActionFrequency','fixedDenominator'],
  successorOrStop: ['realSuccessorNode','explicitStopReason'],
  teachingFrame: ['plainPrompt','primaryAction','requiredOutput','errorReturn','transferSpec']
};

const formulas = {
  physicalWeight: 'w_before(h)=entityWeight(h)*physicalFilter(h)',
  referenceAfter: 'w_reference_after(h,a)=w_before(h)*P_reference(a|h,node)',
  courseAfter: 'w_course_after(h,a)=w_before(h)*P_course(a|h,node)',
  viewAfter: 'view_after(h,a)=w_after(h,a)/sum_h(w_after(h,a))',
  actionDelta: 'P_course(a|h,node)-P_reference(a|h,node)',
  rangeDelta: 'view_course_after(h,a)-view_reference_after(h,a)'
};

const releaseGates = [
  'input_fingerprint_matches',
  'physical_facts_independently_checked',
  'reference_policy_present_or_explicit_course_rule',
  'difference_ledger_present_when_simplified',
  'range_after_uses_fixed_denominator',
  'successor_or_stop_present',
  'teaching_frame_and_parent_return_present',
  'source_license_and_provenance_clear'
];

assert.deepEqual(identities.map(x => x.id), ledger.releaseIdentities);
assert.deepEqual(Object.keys(formulas), ['physicalWeight','referenceAfter','courseAfter','viewAfter','actionDelta','rangeDelta']);
assert.equal(snapshot.guards.equityDoesNotImplyAction, true);
assert.equal(snapshot.guards.solverDoesNotEqualCoursePolicy, true);
assert.equal(snapshot.guards.missingMatchedReferenceStopsNode, true);
assert.equal(visual.sourceBoundaryRules.missingEvidenceNeverDefaultsToZeroOrFold, true);
assert.equal(compiler.hardGates.unknownCountsAsWrong, true);
assert.equal(queue.stopCards.length, 4);
assert.equal(coverage.rules.noExactGradeWithoutReferenceAndSuccessor, true);

const contract = {
  id: 'ANSWER_PROVENANCE_AND_GRADING_IDENTITY_CONTRACT_V1',
  status: 'paper_answer_identity_and_source_lineage_closed_runtime_package_missing',
  purpose: '为每道题固定答案身份、可见标签、允许判分、字段来源和资料不足停止，防止权益或局部求解结果冒充完整GTO。',
  sources: ['reference-course-policy-ledger-contract.json','solver-snapshot-to-lesson-package.json','solver-course-visual-compiler-contract.json','strategy-to-course-compiler-contract.json','session-question-queue-contract.json','full-course-coverage-and-release-contract.json'],
  identities,
  lineage,
  formulas,
  releaseGates,
  questionPackageRequired: [
    'questionId','routeParent','parentSnapshotHash','unitId','sourceIdentity','configurationFingerprint','questionMode',
    'visibleInputs','plainPrompt','primaryAction','requiredOutput','answerIdentity','gradingRule','explanation','rangeViewOrStop','successorOrStop','transferSpec'
  ],
  visibleBoundary: {
    mustShow: ['answerIdentityLabel','sourceScope','courseOrReferenceBadge','rangeOrStop','returnToParent'],
    mustHide: ['teacherAnswer','hiddenReferenceFrequency','futureOpponentAction','unresolvedPolicy'],
    colorCannotBeOnlyMeaning: true,
    courseAndReferenceMustBeSeparate: true
  },
  rules: {
    unknownIsNotZero: true,
    equityIsNotAction: true,
    solverIsNotCoursePolicy: true,
    referenceFrequencyIsNotCourseDecision: true,
    coursePolicyRequiresVersionAndDifference: true,
    rangeAfterRequiresFixedDenominator: true,
    successorRequiresRealNodeOrExplicitStop: true,
    missingLicenseOrProvenanceStopsPackage: true,
    noExactGradeWithoutReleaseGates: true,
    provenanceDoesNotEqualLearnerMastery: true
  },
  currentEvidence: {
    paperContract: true,
    all35PackagesCompiled: false,
    matchedReference: false,
    runtimeReadsIdentity: false,
    runtimeGradesByIdentity: false,
    learnerTrial: false,
    NL50Evidence: false
  }
};

write('answer-provenance-and-grading-identity-contract.json', contract);

const md = `# 205｜答案身份、来源追溯与判分边界合同

\`\`\`json
{
  "parentDocument": "204_确定性会话出题与错误回退队列合同.md",
  "routeNode": "answer_provenance_and_grading_identity_contract",
  "evidenceLevel": "paper_answer_identity_and_source_lineage_closed_runtime_package_missing",
  "opensChildren": ["answer-provenance-and-grading-identity-contract.json", "reference-course-policy-ledger-contract.json", "solver-snapshot-to-lesson-package.json"],
  "returnTo": "翻后教学系统_统一总纲.md",
  "currentStatus": "six_answer_identities_and_formula_lineage_closed_not_compiled"
}
\`\`\`

## 每道题先确定“这是什么答案”

训练器不能只保存一个“正确/错误”。每个题包必须先标记答案身份：

| 身份 | 用户能得到什么 | 不能冒充什么 |
|---|---|---|
| 牌面事实 | 最佳五张、牌型、改善牌、物理排除、公式结果 | 下注动作 |
| 示范讲解 | 结构和思考骨架 | 独立掌握或目标策略 |
| 本课程规则 | 版本化简化动作、范围和后继 | 原始GTO |
| 参考频率 | 匹配求解器的逐组合频率和价值 | 课程动作 |
| 匹配参考策略 | 完整输入下的参考策略、动作后范围和后继 | 未匹配求解器结果 |
| 资料不足停止 | 缺什么、回到哪里、为什么不能继续 | 默认弃牌、零频率或猜测范围 |

## 计算链

范围变化必须沿同一输入指纹和固定分母计算：

\`\`\`text
实体权重 × 物理合法过滤
→ 参考策略频率或课程政策频率
→ 动作后权重
→ 固定分母下的可视化范围
→ 差异账本、真实后继或停止卡
\`\`\`

权益计算器和牌力评估器只能提供事实；求解器可以提供参考策略；课程政策必须单独保存并说明简化差异。没有匹配输入、来源许可证、动作菜单、动作后范围或后继时，系统只能出事实题或停止卡。

## 对用户怎样呈现

题面必须显示答案身份、资料范围、课程/参考标记、范围图或停止原因和返回父帧。教师答案、隐藏参考频率、未来对手动作和未解决政策不能提前泄露。颜色不能承担唯一语义，课程规则与参考频率必须在文字上分开。

机器合同见 [answer-provenance-and-grading-identity-contract.json](answer-provenance-and-grading-identity-contract.json)。当前身份表和公式已闭合，但35个单元的完整课包、匹配参考、运行时按身份判分和学习者试读仍未完成。
`;
fs.writeFileSync(path.join(dir, '205_答案身份来源追溯与判分边界合同.md'), md);

console.log(JSON.stringify({
  ok: true,
  status: contract.status,
  identities: identities.length,
  formulas: Object.keys(formulas).length,
  releaseGates: releaseGates.length,
  all35PackagesCompiled: contract.currentEvidence.all35PackagesCompiled,
  matchedReference: contract.currentEvidence.matchedReference
}));
