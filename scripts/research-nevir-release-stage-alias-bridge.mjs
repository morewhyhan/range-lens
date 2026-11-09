import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const nested = read('nested-release-architecture-contract.json');
const target = read('target-standard-sequential-teaching-and-nl50-closure-contract.json');
const unitGates = read('unit-learner-release-gates.json');
const unified = read('unified-learner-evidence-release-gates.json');
const trials = read('goal-trial-and-target-benchmark-protocol.json');

const canonicalUserStages = [
  {id:'U0_guided_route', plain:'跟着走完整路线', purpose:'沿L0—L4、p1—p7完成一次带练，知道当前层、下一步和停止边界。', authorAliases:['P0_first_pass_guided','S0_first_pass','V1_guided_first_pass','P1_low_baseline_first_pass'], unitAliases:['map','guided']},
  {id:'U1_structure_recall', plain:'回想路线结构', purpose:'隐藏步骤标题后复述顺序、定位层、恢复父帧和错误回退。', authorAliases:['P1_structure_replay','V2_hidden_structure_recall'], unitAliases:['map']},
  {id:'U2_same_parent_practice', plain:'在同一父步骤练同类问题', purpose:'从父帧按需打开同组单元，完成事实、比较、执行或更新的带练。', authorAliases:['P2_same_parent_units'], unitAliases:['guided']},
  {id:'U3_slow_single_step', plain:'陌生局面慢慢做一步', purpose:'隐藏步骤标题，在资料充分的陌生节点完成事实、比较、执行、账本和范围更新。', authorAliases:['P5_unseen_slow_single_step','S1_slow_execution','V4_unseen_slow_single_step'], unitAliases:['independent']},
  {id:'U4_adjacent_transfer', plain:'只改一个地方再做', purpose:'只改变一个字段，先指出受影响层，再完成同一父步骤的判断。', authorAliases:['P3_adjacent_transfer','S2_single_field_transfer','V3_single_variable_transfer'], unitAliases:['adjacent']},
  {id:'U5_delayed_recall', plain:'隔几题再回想', purpose:'插入其他题后回到原单元，不依赖标题找回父帧和交接。', authorAliases:['P4_delayed_recall'], unitAliases:['delayed']},
  {id:'U6_continuous_three_street', plain:'连续走完翻牌转牌河牌', purpose:'保持范围、账本、行动权和真实后继连续，缺资料就停。', authorAliases:['P6_continuous_three_street','S3_continuous_target_review','V5_continuous_three_street'], unitAliases:['continuous']},
  {id:'U7_target_review', plain:'目标配置独立复核', purpose:'在冻结配置、未曝光题和外部复核下讨论目标级准备度。', authorAliases:['P7_target_audit','V6_target_external_review'], unitAliases:[]}
];

const unitStageOrder = ['map','guided','independent','adjacent','delayed','continuous'];
const evidenceGateOrder = ['V0_paper_closure','V1_guided_first_pass','V2_hidden_structure_recall','V3_single_variable_transfer','V4_unseen_slow_single_step','V5_continuous_three_street','V6_target_external_review'];
const trialPhaseOrder = trials.releaseOrder;
const sourceUnitStages = unitGates.releaseStages.map(x => x.id);
const sourceEvidenceGates = unified.gates.map(x => x.id);
const sourceNestedStages = nested.releaseLadder.map(x => x.id);
const sourceTargetStages = target.releaseStages.map(x => x.id);

assert.deepEqual(sourceUnitStages, unitStageOrder);
assert.deepEqual(sourceEvidenceGates, evidenceGateOrder);
assert.deepEqual(sourceNestedStages, ['P0_first_pass_guided','P1_structure_replay','P2_same_parent_units','P3_adjacent_transfer','P4_delayed_recall','P5_unseen_slow_single_step','P6_continuous_three_street','P7_target_audit']);
assert.deepEqual(sourceTargetStages, ['S0_first_pass','S1_slow_execution','S2_single_field_transfer','S3_continuous_target_review']);
assert.equal(canonicalUserStages.length, 8);
assert.equal(canonicalUserStages.every(x => x.plain && x.purpose && x.authorAliases.length > 0), true);
assert.equal(canonicalUserStages.every(x => x.authorAliases.every(alias => typeof alias === 'string')), true);
assert.equal(canonicalUserStages.some(x => x.authorAliases.includes('S0_first_pass')), true);
assert.equal(canonicalUserStages.some(x => x.authorAliases.includes('S3_continuous_target_review')), true);
assert.equal(trialPhaseOrder[0], 'P0_instrumentation');
assert.equal(trialPhaseOrder.at(-1), 'P6_target_condition_audit');

const stageMap = {
  userFacingOrder: canonicalUserStages.map(x => x.id),
  unitRelease: {
    map: ['U0_guided_route','U1_structure_recall'],
    guided: ['U0_guided_route','U2_same_parent_practice'],
    independent: ['U3_slow_single_step'],
    adjacent: ['U4_adjacent_transfer'],
    delayed: ['U5_delayed_recall'],
    continuous: ['U6_continuous_three_street']
  },
  coarseBands: {
    S0_first_pass: ['U0_guided_route','U1_structure_recall'],
    S1_slow_execution: ['U2_same_parent_practice','U3_slow_single_step'],
    S2_single_field_transfer: ['U4_adjacent_transfer','U5_delayed_recall'],
    S3_continuous_target_review: ['U6_continuous_three_street','U7_target_review']
  },
  evidenceGates: {
    V0_paper_closure: {userStage:null, authorOnly:true},
    V1_guided_first_pass: {userStage:'U0_guided_route', authorOnly:false},
    V2_hidden_structure_recall: {userStage:'U1_structure_recall', authorOnly:false},
    V3_single_variable_transfer: {userStage:'U4_adjacent_transfer', authorOnly:false},
    V4_unseen_slow_single_step: {userStage:'U3_slow_single_step', authorOnly:false},
    V5_continuous_three_street: {userStage:'U6_continuous_three_street', authorOnly:false},
    V6_target_external_review: {userStage:'U7_target_review', authorOnly:false}
  },
  trialPhases: {
    P0_instrumentation: {userStage:null, authorOnly:true},
    P1_low_baseline_first_pass: {userStage:'U0_guided_route', authorOnly:false},
    P2_slow_single_step: {userStage:'U3_slow_single_step', authorOnly:false},
    P3_single_field_transfer: {userStage:'U4_adjacent_transfer', authorOnly:false},
    P4_continuous_three_street: {userStage:'U6_continuous_three_street', authorOnly:false},
    P5_independent_reconstruction: {userStage:'U7_target_review', authorOnly:true},
    P6_target_condition_audit: {userStage:'U7_target_review', authorOnly:false}
  }
};

const audit = {
  id: 'RELEASE_STAGE_ALIAS_BRIDGE_V1',
  status: 'paper_release_aliases_unified_runtime_must_use_canonical_user_stage',
  purpose: '把P、S、V、单元releaseStage和试验phase映射到一条用户可理解的8段进阶路线，防止实现出现多套训练菜单。',
  sources: [
    'nested-release-architecture-contract.json',
    'target-standard-sequential-teaching-and-nl50-closure-contract.json',
    'unit-learner-release-gates.json',
    'unified-learner-evidence-release-gates.json',
    'goal-trial-and-target-benchmark-protocol.json'
  ],
  canonicalUserStages,
  stageMap,
  rules: {
    runtimeStoresOnlyCanonicalUserStage: true,
    runtimeMayStoreUnitReleaseStageSeparately: true,
    authorAliasesNeverBecomeUserNavigation: true,
    numericAliasOrderDoesNotOverrideUserOrder: true,
    oneVisibleProgression: true,
    firstPassBeforeSlowExecution: true,
    slowExecutionBeforeTransfer: true,
    transferBeforeContinuous: true,
    continuousBeforeTargetReview: true,
    noStageAliasMeansExtraCourse: true
  },
  currentEvidence: {
    paperMapping: true,
    runtimeUsesCanonicalStage: false,
    learnerTrial: false,
    targetEvidence: false
  },
  guards: {
    aliasBridgeDoesNotEqualRuntime: true,
    aliasBridgeDoesNotEqualLearnerMastery: true,
    continuousDoesNotEqualNL50: true
  }
};

fs.writeFileSync(path.join(dir, 'release-stage-alias-bridge.json'), JSON.stringify(audit, null, 2) + '\n');

const stageRows = canonicalUserStages.map(x => `| ${x.id} | ${x.plain} | ${x.purpose} | 按当前阶段证据升级 |`).join('\n');
const md = `# 218｜训练阶段别名与唯一用户进阶桥\n\n\`\`\`json\n{\n  "parentDocument": "187_一遍到目标级的嵌套释放总架构合同.md",\n  "routeNode": "release_stage_alias_bridge",\n  "evidenceLevel": "paper_release_aliases_unified_runtime_must_use_canonical_user_stage",\n  "opensChildren": ["release-stage-alias-bridge.json", "187_一遍到目标级的嵌套释放总架构合同.md", "215_目标标准的顺序教学与NL50结果闭环合同.md"],\n  "returnTo": "翻后教学系统_统一总纲.md",\n  "currentStatus": "paper_release_aliases_unified_runtime_must_use_canonical_user_stage"\n}\n\`\`\`\n\n现有作者文档使用了多套编号：P0—P7是架构释放，S0—S3是粗粒度发布带，V0—V6是证据闸门，map→guided→independent→adjacent→delayed→continuous是单元释放阶段，P0—P6还被试验协议用作实验阶段。这些编号有不同用途，不能直接变成用户菜单。\n\n## 用户只需要看到一条8段路线\n\n| 用户阶段 | 用户看到的白话 | 主要负荷 | 允许进入的下一阶段 |\n|---|---|---|---|\n${stageRows}\n\n实现时只保存一个用户进阶字段：U0—U7。单元还可以另存自己的map/guided/...阶段，但它不能改变主线，也不能生成新的首页入口。P、S、V、C、L编号只留在作者审计和证据记录中。\n\n## 关键映射\n\n- S0覆盖U0—U1；\n- S1覆盖U2—U3；\n- S2覆盖U4—U5；\n- S3覆盖U6—U7；\n- V3和V4的编号顺序不代表用户顺序，真正的用户顺序由U0—U7固定；\n- 试验协议的P0_instrumentation是作者仪表层，不是用户课程阶段。\n\n## 防止页面变复杂的硬规则\n\n1. 页面只显示当前U阶段的白话名称和下一步，不显示阶段编号集合。\n2. 一个用户阶段可以包含多个作者检查，但不能因此出现多个并列按钮。\n3. 单元释放和主线进阶分开：单元能否独立，不改变当前主线父帧。\n4. 错误只回到最近缺失的U阶段或单元父帧，不回到一张总仪表盘。\n5. 别名桥通过只证明文档语义已统一，不能证明运行时已采用U0—U7。\n\n机器可读映射见 [release-stage-alias-bridge.json](release-stage-alias-bridge.json)。\n`;
fs.writeFileSync(path.join(dir, '218_训练阶段别名与唯一用户进阶桥.md'), md);

console.log(JSON.stringify({
  ok: true,
  id: audit.id,
  status: audit.status,
  userStages: canonicalUserStages.length,
  unitStages: sourceUnitStages.length,
  evidenceGates: sourceEvidenceGates.length,
  trialPhases: trialPhaseOrder.length
}, null, 2));
