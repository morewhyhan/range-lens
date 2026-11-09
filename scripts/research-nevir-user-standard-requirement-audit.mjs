import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const target = read('target-standard-sequential-teaching-and-nl50-closure-contract.json');
const finalAudit = read('final-goal-release-audit.json');
const crosswalk = read('goal-standard-crosswalk-audit.json');
const cognitiveBridge = read('route-cognitive-slow-execution-bridge.json');
const packageContract = read('solver-snapshot-to-lesson-package.json');

const requirements = [
  {
    id: 'U1_nested_single_route',
    userStandard: '低基础学习者第一次只跟一条层层嵌套、顺序推进的路线，不面对平铺专题菜单。',
    paperProof: target.routeInvariant.oneVisibleParentAtATime && target.routeInvariant.childOpensOnlyInsideParent && target.routeInvariant.noFlat35HomeMenu,
    runtimeGate: 'R1',
    learnerGate: 'R5',
    targetGate: 'R8',
    passCondition: '运行时读取同一条canonical next链，子层关闭后恢复父帧，并在真实首遍中观察到。'
  },
  {
    id: 'U2_first_pass_builds_map',
    userStandard: '跟完一次后，脑中知道大概有哪些步骤、每一步先看什么、做什么、交给下一步什么。',
    paperProof: target.routeInvariant.firstPassMustExposeEveryCanonicalState && target.canonicalUserExperience.length === target.canonicalRoute.length && cognitiveBridge.rules.all12StopsHaveCognitiveJob,
    runtimeGate: 'R5',
    learnerGate: 'R5',
    targetGate: 'R8',
    passCondition: '隐藏步骤标题后，学习者能复述外层和内层顺序、至少三个未见层位置及交接。'
  },
  {
    id: 'U3_no_necessary_step_omitted',
    userStandard: '桌面、翻前、翻后定位、读牌、范围、比较、执行、更新、收口和迁移都不能跳过。',
    paperProof: target.canonicalRoute.length === 12 && target.visibleStopContract.length === 10 && target.routeInvariant.missingEvidenceCreatesStopCard,
    runtimeGate: 'R1',
    learnerGate: 'R5',
    targetGate: 'R8',
    passCondition: '首遍运行轨迹覆盖12个canonical状态，每个停点有唯一主要问题、动作、交接和错误回退。'
  },
  {
    id: 'U4_slow_executable_decision',
    userStandard: '即使还没有完全内化，用户也能放慢速度，按步骤算出当前最正确的动作。',
    paperProof: target.fullCourseReleaseSchedule.some(x => x.stage === 'independent_single_step') && target.evidenceRubric.dimensions.includes('slowSingleStep'),
    runtimeGate: 'R3',
    learnerGate: 'R6',
    targetGate: 'R8',
    passCondition: '在匹配参考和完整金额/范围资料的未见题上，用户先独立作答，再完成动作、账本和范围交接。'
  },
  {
    id: 'U5_systematic_full_coverage',
    userStandard: '不是几个示例，而是所有必要牌面、位置、动作关系和后续都能按同一结构覆盖。',
    paperProof: target.fullCourseReleaseSchedule.some(x => x.visibleUnits === 'all35') && target.schedulerRules.emptyPoolIsUnavailable && target.schedulerRules.neighborCannotFillMissingPool,
    runtimeGate: 'R2',
    learnerGate: 'R6',
    targetGate: 'R8',
    passCondition: '35项后台单元按五个父组逐项开放，题池按身份覆盖，不以邻近示例填缺口。'
  },
  {
    id: 'U6_visual_reasoning_and_range_delta',
    userStandard: '范围、牌面、动作和动作后变化必须直观看见，且能分辨物理不可能、行动筛选和资料未知。',
    paperProof: target.visualExperienceContract.oneCentralVisualPerStop && target.visualExperienceContract.same13x13CoordinateBeforeAfter && target.visualExperienceContract.physicalImpossibleDistinctFromActionFiltered && target.visualExperienceContract.unknownDistinctFromZero,
    runtimeGate: 'R4',
    learnerGate: 'R6',
    targetGate: 'R8',
    passCondition: '页面保持同坐标、同尺度、同分母，动作前后范围与差异原因来自同一已验证课包。'
  },
  {
    id: 'U7_reference_to_course_correctness',
    userStandard: '练习答案要有数学和代码依据；课程简化必须能对照参考策略说明省略了什么。',
    paperProof: packageContract.guards.equityDoesNotImplyAction && packageContract.guards.solverDoesNotEqualCoursePolicy && packageContract.runtimeIntegrationContract.staticPackageMinimum.includes('differenceLedger'),
    runtimeGate: 'R3',
    learnerGate: 'R6',
    targetGate: 'R8',
    passCondition: '固定输入指纹下取得参考动作、EV、动作后范围、后继和课程差异账本，并通过独立复算。'
  },
  {
    id: 'U8_target_level_not_overclaimed',
    userStandard: '最终目标是接近NL50的可执行水平，但只有完整证据链成立后才能这样判断。',
    paperProof: target.evidenceRubric.missingExternalBenchmarkBlocks === 'NL50Discussion' && target.evidenceRubric.noCompositeScorePromotion && target.evidenceRules.paperContractDoesNotEqualNL50,
    runtimeGate: 'R8',
    learnerGate: 'R8',
    targetGate: 'R8',
    passCondition: '冻结目标配置，完成未曝光题、连续路线、独立复核和真实决策审计；短期输赢和一次首遍不作替代。'
  }
];

const gateById = new Map(finalAudit.gates.map(g => [g.id, g]));
const rows = requirements.map(r => ({
  ...r,
  paperStatus: r.paperProof ? 'paper_contract_present' : 'paper_contract_missing',
  runtimeStatus: gateById.get(r.runtimeGate)?.status ?? 'unknown_gate',
  learnerStatus: gateById.get(r.learnerGate)?.status ?? 'unknown_gate',
  targetStatus: gateById.get(r.targetGate)?.status ?? 'unknown_gate'
}));

assert.equal(requirements.length, 8);
assert.equal(rows.every(r => r.paperProof), true);
assert.equal(rows.every(r => gateById.has(r.runtimeGate) && gateById.has(r.learnerGate) && gateById.has(r.targetGate)), true);
assert.equal(crosswalk.summary.failed, 0);
assert.equal(crosswalk.currentEvidence.paperCrosswalk, true);
assert.equal(crosswalk.currentEvidence.runtimeRoute, false);
assert.equal(crosswalk.currentEvidence.lowBaselineTrial, false);
assert.equal(crosswalk.currentEvidence.NL50Evidence, false);

const audit = {
  id: 'USER_STANDARD_REQUIREMENT_AUDIT_V1',
  status: 'paper_user_standard_mapped_runtime_learner_and_target_evidence_missing',
  purpose: '把用户对低基础顺序教学、结构形成、慢速执行、完整覆盖、视觉可理解和NL50边界的最终标准逐条绑定到现有证据闸门。',
  sourceDocuments: [
    'target-standard-sequential-teaching-and-nl50-closure-contract.json',
    'final-goal-release-audit.json',
    'goal-standard-crosswalk-audit.json',
    'route-cognitive-slow-execution-bridge.json',
    'solver-snapshot-to-lesson-package.json',
    'first-hand-principle-frame-audit.json',
    'first-hand-gap-frame-cards.json'
  ],
  requirements: rows,
  summary: {
    total: rows.length,
    paperComplete: rows.filter(r => r.paperStatus === 'paper_contract_present').length,
    runtimeComplete: rows.filter(r => r.runtimeStatus === 'pass').length,
    learnerComplete: rows.filter(r => r.learnerStatus === 'pass').length,
    targetComplete: rows.filter(r => r.targetStatus === 'pass').length
  },
  guards: {
    paperMappingDoesNotEqualRuntime: true,
    firstPassDoesNotEqualSlowExecution: true,
    slowExecutionDoesNotEqualContinuousThreeStreet: true,
    continuousThreeStreetDoesNotEqualNL50: true,
    ageLabelDoesNotEqualEvidence: true
  },
  currentEvidence: {
    paperUserStandardMapped: true,
    paperCrosswalk: crosswalk.currentEvidence.paperCrosswalk,
    runtimeRoute: crosswalk.currentEvidence.runtimeRoute,
    learnerTrial: crosswalk.currentEvidence.lowBaselineTrial,
    matchedReference: crosswalk.currentEvidence.matchedReference,
    targetBenchmark: crosswalk.currentEvidence.NL50Evidence
  },
  firstPassProtocol: {
    canonicalStates: ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7'],
    requiredPerState: ['plainQuestion','onePrimaryAction','handoffPayload','errorReturn','stopBoundary'],
    observableChecks: [
      {id:'P1_order_followed', evidence:'routeOrder'},
      {id:'P2_hidden_structure_recall', evidence:'orderRecall'},
      {id:'P3_parent_restore', evidence:'parentRestore'},
      {id:'P4_error_return', evidence:'errorReturn'},
      {id:'P5_unseen_slow_execution', evidence:'slowStep'},
      {id:'P6_continuous_handoff', evidence:'successorOrStop'}
    ]
  },
  claimLevels: [
    {id:'paper_contract', current:true},
    {id:'runtime_closed', current:false},
    {id:'learner_evidence', current:false},
    {id:'target_level', current:false}
  ]
};

fs.writeFileSync(path.join(dir, 'user-standard-requirement-audit.json'), JSON.stringify(audit, null, 2) + '\n');

const markdownRows = rows.map(r => `| ${r.id} | ${r.paperStatus} | **${r.runtimeStatus}** | **${r.learnerStatus}** | **${r.targetStatus}** | ${r.passCondition} |`).join('\n');
const md = `# 217｜用户最终标准逐条验收审计\n\n\`\`\`json\n{\n  "parentDocument": "215_目标标准的顺序教学与NL50结果闭环合同.md",\n  "routeNode": "user_standard_requirement_audit",\n  "evidenceLevel": "paper_user_standard_mapped_runtime_learner_and_target_evidence_missing",\n  "opensChildren": ["user-standard-requirement-audit.json", "215_目标标准的顺序教学与NL50结果闭环合同.md", "final-goal-release-audit.json", "first-hand-gap-frame-cards.json"],\n  "returnTo": "翻后教学系统_统一总纲.md",\n  "currentStatus": "paper_user_standard_mapped_runtime_learner_and_target_evidence_missing"\n}\n\`\`\`\n\n这份审计把用户的最终标准翻译成八条可以逐项验收的要求。它先确认纸面合同已经覆盖，再把每条要求绑定到运行时、真人学习和目标级闸门；纸面完整不自动升级为“用户已经学会”或“可以进NL50”。\n\n| 要求 | 纸面合同 | 运行时 | 学习者证据 | 目标级证据 | 只有什么证据才算通过 |\n|---|---|---|---|---|---|\n${markdownRows}\n\n当前纸面映射 ${audit.summary.paperComplete}/${audit.summary.total} 条完整；运行时 ${audit.summary.runtimeComplete}/${audit.summary.total}，真人学习 ${audit.summary.learnerComplete}/${audit.summary.total}，目标级 ${audit.summary.targetComplete}/${audit.summary.total}。这不是平均分：任意一条关键链断开，都只能停在相应层级。\n\n## 这张表解决的混乱\n\n- “跟着走一遍”只证明路线理解候选，不证明陌生题慢速执行。\n- “会做几个案例”只证明局部示例，不证明35项系统覆盖。\n- “看到了范围图”只证明视觉呈现，不证明动作后范围和后继正确。\n- “求解器输出了策略”只证明参考数据候选，不证明课程简化正确。\n- “短期结果不错”不能替代冻结配置、未曝光题、连续路线和独立审计。\n\n首遍协议还要求 12 个规范状态每个都具备白话问题、唯一主要动作、交接、错误回退和停止边界；其中 P10 的动作后范围在没有匹配参考时必须显示停止卡，不能猜范围。机器可读结果见 [user-standard-requirement-audit.json](user-standard-requirement-audit.json) 和 [first-hand-gap-frame-cards.json](first-hand-gap-frame-cards.json)。\n`;
fs.writeFileSync(path.join(dir, '217_用户最终标准逐条验收审计.md'), md);

console.log(JSON.stringify({
  ok: true,
  id: audit.id,
  status: audit.status,
  total: audit.summary.total,
  paperComplete: audit.summary.paperComplete,
  runtimeComplete: audit.summary.runtimeComplete,
  learnerComplete: audit.summary.learnerComplete,
  targetComplete: audit.summary.targetComplete
}, null, 2));
