import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');

const manifest = read('unit-course-manifest.json');
const queue = read('unit-field-completion-queue.json');
const intake = read('reference-snapshot-intake-and-match-contract.json');
const representative = read('five-representative-reference-closure-request.json');
const crosswalk = read('unit-c0-c9-release-crosswalk.json');

assert.equal(manifest.counts.units, 35);
assert.equal(queue.queue.length, 35);
assert.equal(intake.perComboRequired.length, 12);
assert.equal(representative.representativeOrder.length, 5);
assert.equal(crosswalk.rows.length, 35);

const byId = new Map(manifest.rows.map(row => [row.unitId, row]));
const queueById = new Map(queue.queue.map(row => [row.unitId, row]));
const crosswalkById = new Map(crosswalk.rows.map(row => [row.unitId, row]));
assert.equal(byId.size, 35);
assert.equal(queueById.size, 35);
assert.equal(crosswalkById.size, 35);

const exactFields = [
  'inputFingerprint','sourceIdentity','nodeIdentity','privateCards','physicalWeight',
  'referenceActionFrequencyByCombo','referenceActionValueByCombo','referenceEquityByCombo',
  'reachWeight','referenceAfterByAction','courseAfterByAction','differenceReasonByAction',
  'successorIdentityByAction','fixedDenominator','quality','releaseDecision',
  'policyIdentity','sourceKind','policyScope','populationModel','courseSourceReference'
];

const groupSpecs = {
  'compare.unopened': {
    stage: 'I2_raw_strategy',
    referenceNode: 'current_player_before_action',
    requiredOutputs: ['legalActionMenu','actionFrequencyByCombo','actionEVByCombo','rangeAfterByAction','successorOrStop'],
    facts: ['bestFive','equityAndRunouts','physicalFilter'],
    stop: '没有与完整局面、范围和动作菜单匹配的参考时，只开放事实或示范身份。'
  },
  'compare.bet': {
    stage: 'I2_raw_strategy',
    referenceNode: 'facing_bet',
    requiredOutputs: ['toCall','potOddsFact','foldCallRaisePolicyByCombo','actionEVByCombo','rangeAfterByAction','successorOrStop'],
    facts: ['bestFive','legalActions','priceLedger','physicalFilter'],
    stop: '价格事实不能代替下注/弃牌/加注策略；缺匹配参考时停止精确判分。'
  },
  'compare.raise': {
    stage: 'I2_raw_strategy',
    referenceNode: 'facing_raise_or_reraise',
    requiredOutputs: ['minRaiseAndAmounts','foldCallRaisePolicyByCombo','actionEVByCombo','rangeAfterByAction','successorOrStop'],
    facts: ['legalActions','priceLedger','stackConstraint','physicalFilter'],
    stop: '合法金额和底池赔率只说明价格，不说明响应比例；缺参考时停在比较层。'
  },
  'update.response': {
    stage: 'I5_successor_closure',
    referenceNode: 'response_transition',
    requiredOutputs: ['historyBeforeAfter','actorTransition','referenceNodeBefore','actionConditionedRange','ledgerHandoff','successorOrStop'],
    facts: ['historyLegality','potAndStackConservation','actionRight'],
    stop: '账本变化本身不能推出策略；没有真实策略节点或后继时只开放事实/账本演示。'
  },
  'update.card': {
    stage: 'I5_successor_closure',
    referenceNode: 'chance_card_successor',
    requiredOutputs: ['legalChanceCards','physicalFilterByCard','actionConditionedRangeByCard','nextNodeByCard','rangeAfterByAction','successorOrStop'],
    facts: ['bestFiveByCard','drawClassification','remainingDeck','physicalRemoval'],
    stop: '新牌改变牌力或实体组合不等于一定改变行动；缺动作后范围和后继时停在新牌层。'
  }
};

const representatives = new Set(representative.representativeOrder);
const rows = queue.queue.map(queueRow => {
  const unit = byId.get(queueRow.unitId);
  const cross = crosswalkById.get(queueRow.unitId);
  assert.ok(unit && cross, queueRow.unitId);
  const spec = groupSpecs[queueRow.groupId];
  assert.ok(spec, queueRow.groupId);
  const currentIdentity = unit.evidence?.referenceIdentity ?? 'unknown';
  const currentRelease = currentIdentity === 'fact_or_ledger' ? 'fact_only_or_demonstration' : 'demonstration_candidate';
  return {
    unitId: queueRow.unitId,
    sequence: unit.sequence,
    priority: representatives.has(queueRow.unitId) ? 'first_pass_representative' : 'full_course_after_structure_gate',
    parentFrame: unit.route.parentFrame,
    returnTo: unit.route.returnTo,
    groupId: queueRow.groupId,
    street: unit.inputIdentity?.identityCandidate?.street ?? null,
    role: unit.inputIdentity?.identityCandidate?.role ?? null,
    actionState: unit.inputIdentity?.identityCandidate?.actionState ?? null,
    currentSource: queueRow.sourceEvidence,
    currentSourceIdentity: currentIdentity,
    currentReleaseIdentity: currentRelease,
    currentStopReason: queueRow.stopReason,
    canonicalMissingFields: queueRow.canonicalMissingFields,
    referenceRequest: {
      intakeStage: spec.stage,
      referenceNode: spec.referenceNode,
      exactIdentityFields: intake.identityFields,
      requiredPerComboFields: intake.perComboRequired,
      requiredCourseFields: exactFields,
      requiredOutputs: spec.requiredOutputs,
      independentFactChecks: spec.facts,
      sourceRoles: {
        strategy: 'b-inary/postflop-solver',
        handFact: 'b-inary/holdem-hand-evaluator',
        equityFact: 'gto-wizard/equity-calculator',
        policyCompiler: 'course-policy compiler',
        policyMaterial: 'source note with explicit source kind and scope'
      },
      contrast: {
        exactlyOneChangedField: true,
        changedFieldCandidates: unit.learningContract?.transfer?.changedFieldCandidates ?? ['board','history','actionMenu'],
        heldFields: ['sourceIdentity','inputFingerprintExceptChangedField','rootRanges','rake','stack','solverIdentity'],
        independentRerunRequired: true
      },
      transfer: {
        hideUnitLabel: true,
        requiresSuccessor: true,
        requiresFirstAnswerBeforeHelp: true
      },
      stopIfMissing: ['matchedInputFingerprint','referenceSnapshot','coursePolicy','policyIdentity','policyScope','rangeAfterOrStop','successorOrStop'],
      groupStop: spec.stop
    },
    release: {
      exactStrategyReady: false,
      currentStatus: cross.currentReleaseStatus ?? 'not_open',
      nextAuthorPhase: queueRow.nextPhase,
      exactGradeRequires: 'matched_reference_and_successor',
      missingEvidenceAction: 'stop_at_current_unit_and_return_to_parent'
    }
  };
});

const groupCounts = rows.reduce((out, row) => { out[row.groupId] = (out[row.groupId] ?? 0) + 1; return out; }, {});
const statusCounts = rows.reduce((out, row) => { out[row.currentSourceIdentity] = (out[row.currentSourceIdentity] ?? 0) + 1; return out; }, {});

const out = {
  id: 'UNIT_REFERENCE_SNAPSHOT_REQUEST_MANIFEST_V1',
  status: '35_unit_reference_requests_compiled_all_exact_strategy_and_successor_release_blocked',
  purpose: '把每个后台单元接到同一套参考快照接入合同；当前有限模型、事实候选和账本候选保留原身份，不被静默升级为GTO策略。',
  sources: ['unit-course-manifest.json','unit-field-completion-queue.json','unit-c0-c9-release-crosswalk.json','reference-snapshot-intake-and-match-contract.json','five-representative-reference-closure-request.json','material-policy-classification.json','material-unit-crosswalk.json'],
  sharedRules: {
    all35Listed: true,
    oneRequestPerUnit: true,
    exactIdentityBeforeStrategy: true,
    strategySourceSeparatedFromFactSources: true,
    exactlyOneChangedFieldForContrast: true,
    missingReferenceStopsAtParent: true,
    missingSuccessorBlocksContinuous: true,
    noNeighborSubstitution: true,
    noLocalFiniteModelPromotion: true,
    firstPassUsesFiveRepresentatives: true,
    policyIdentityBeforeActionGrade: true,
    rawReferenceRequiresMatchedInput: true,
    simplifiedReferenceRequiresDifferenceLedger: true,
    courseRuleRequiresSourceAndScope: true,
    populationExploitRequiresOpponentModelAndTrigger: true,
    populationExploitCannotBecomeGTO: true,
    illustrationCannotBeIndependentlyGraded: true,
    unknownPolicyIdentityStops: true
  },
  groupSpecs,
  requiredPerComboFields: intake.perComboRequired,
  requiredCourseFields: exactFields,
  rows,
  counts: {
    units: rows.length,
    groups: Object.keys(groupCounts).length,
    groupCounts,
    currentSourceIdentity: statusCounts,
    firstPassRepresentatives: representatives.size,
    matchedReferenceRows: 0,
    successorClosedRows: 0,
    exactStrategyReadyRows: 0,
    releasedRows: 0
  },
  currentEvidence: {
    requestManifestWritten: true,
    all35RequestsCompiled: true,
    matchedReferenceRows: 0,
    coursePolicyRows: 0,
    rangeAfterRows: 0,
    successorClosedRows: 0,
    learnerTrialRows: 0,
    exactStrategyReleased: false,
    nl50Evidence: false
  }
};

write('unit-reference-snapshot-request-manifest.json', out);

const md = `# 210｜35项单元参考快照请求与发布队列

\`\`\`json
{
  "parentDocument": "208_参考快照接入、配置匹配与发布合同.md",
  "routeNode": "unit_reference_snapshot_request_manifest",
  "evidenceLevel": "35_unit_reference_requests_compiled_all_exact_strategy_and_successor_release_blocked",
  "opensChildren": ["unit-reference-snapshot-request-manifest.json", "unit-course-manifest.json", "unit-field-completion-queue.json"],
  "returnTo": "翻后教学系统_统一总纲.md",
  "currentStatus": "all35_requests_written_no_matched_reference_rows"
}
\`\`\`

## 这份清单解决什么问题

原来的35项清单已经知道每项缺什么，但缺口没有统一接到外部参考的获取格式。210号把每个单元变成一张请求卡：它从哪一个父步骤打开、现在是什么资料身份、要向哪个参考节点要什么逐组合字段、哪些事实需要独立复算、只改哪个字段做对照、缺什么时回到哪里。

五个首遍代表仍然是 \`1.5、2.1、3.1、4.5、5.7\`。它们先建立五组父层位置；其余30项只有在结构回放和单变量迁移通过后才按组开放。这个顺序改变的是学习者看到的队列，不改变后台必须补齐的35项请求。

## 五组请求的本质差异

- **比较未下注**：请求当前行动节点的完整动作菜单、逐组合频率、EV、动作后范围和后继。
- **面对下注**：先独立核对跟注价格、合法动作和账本，再取得弃牌/跟注/加注策略；价格不能代替策略。
- **面对加注**：必须把最小加注、实际金额、筹码约束和响应后范围一起冻结。
- **回应更新**：把动作前后历史、行动权、账本和策略节点连接起来；账本正确不等于策略正确。
- **新牌更新**：先分实体移除、牌力和合法跑牌，再取得每张新牌对应的行动后范围和真实后继。

## 每项请求都必须先登记规则身份

请求卡除了要匹配局面、范围和动作菜单，还必须填写 \`policyIdentity\`、\`sourceKind\`、\`policyScope\`、\`populationModel\` 和 \`courseSourceReference\`。身份不明确时不能进入精确判分：原始参考只能作为参考层，简化参考必须有量化和差异账本，课程规则必须有来源与范围，剥削规则必须有明确对手模型和触发条件，示意案例只能讲解，资料不足直接回到父层。

## 每项的发布顺序

\`\`\`text
配置指纹
→ 逐组合原始参考
→ 独立事实/分母/结算复算
→ 课程政策与差异账本
→ 动作后范围
→ 真实后继或明确停止
→ 基准、对照、迁移三张卡
→ 对应释放阶段
\`\`\`

当前35项全部仍为未发布；27项来源身份是有限模型，8项是事实或账本候选。它们可以继续用于事实或示范层，但不能被自动升级为精确策略答案。机器清单见 [unit-reference-snapshot-request-manifest.json](unit-reference-snapshot-request-manifest.json)。
`;
fs.writeFileSync(path.join(dir, '210_35项单元参考快照请求与发布队列.md'), md);

console.log(JSON.stringify({
  ok: true,
  status: out.status,
  units: out.counts.units,
  groups: out.counts.groups,
  firstPassRepresentatives: out.counts.firstPassRepresentatives,
  currentSourceIdentity: out.counts.currentSourceIdentity,
  matchedReferenceRows: out.counts.matchedReferenceRows,
  exactStrategyReadyRows: out.counts.exactStrategyReadyRows
}));
