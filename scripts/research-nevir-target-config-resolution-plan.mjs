import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const ledger = JSON.parse(fs.readFileSync(path.join(dir, 'target-config-source-ledger.json'), 'utf8'));

const fieldPlans = [
  {
    field: 'targetLabel',
    resolver: 'user_goal',
    action: '保留NL50作为目标标签，不把标签当作配置值。',
    opens: [],
    blocks: ['R8']
  },
  {
    field: 'tableSize',
    resolver: 'user_constraint',
    action: '冻结为6人现金桌，并在每个参考输入中写入。',
    opens: ['product_scope'],
    blocks: []
  },
  {
    field: 'gameType',
    resolver: 'user_constraint',
    action: '冻结为cash_holdem，排除锦标赛、短牌和奥马哈。',
    opens: ['product_scope'],
    blocks: []
  },
  {
    field: 'effectiveStackBB',
    resolver: 'user_constraint_and_source_label',
    action: '冻结为100BB，并作为每个课程课包的输入身份。',
    opens: ['product_scope'],
    blocks: []
  },
  {
    field: 'rakeModel',
    resolver: 'explicit_target_configuration_or_external_room_rule',
    action: '取得目标平台/房间的抽水表；没有就保持未知，研究用零抽水不得升级。',
    opens: ['target_reference_match'],
    blocks: ['R3', 'R8']
  },
  {
    field: 'seatMap',
    resolver: 'standard_six_max_mapping_then_explicit_freeze',
    action: '先按UTG/HJ/CO/BTN/SB/BB建立候选座位图，再把按钮移动和行动顺序写入冻结版本。',
    opens: ['position_input'],
    blocks: ['R3', 'R8']
  },
  {
    field: 'positionModel',
    resolver: 'source_chart_and_route_manifest',
    action: '按翻前图和翻后资料逐项登记英雄位置、对手位置、IP/OOP和行动者；缺位置的单元停在身份层。',
    opens: ['unit_identity'],
    blocks: ['R2', 'R3']
  },
  {
    field: 'preflopActionMenu',
    resolver: 'user_declared_preflop_scope',
    action: '只保留开池、3bet防守和BB防守中资料明确的动作；不扩展跟注、挤压和4bet。',
    opens: ['preflop_course_package'],
    blocks: ['R2']
  },
  {
    field: 'postflopActionMenu',
    resolver: 'course_notes_then_matched_solver_tree',
    action: '先从资料确定课程允许的动作，再与固定求解行动树对齐；缺菜单时不得精确判分。',
    opens: ['postflop_course_policy'],
    blocks: ['R3', 'R4']
  },
  {
    field: 'openSizes',
    resolver: 'source_snapshot',
    action: '保留资料已经明确的各位置简化开池尺寸，并记录截图/哈希，不扩展到未给尺寸。',
    opens: ['preflop_course_package'],
    blocks: ['R2', 'R3']
  },
  {
    field: 'threeBetSizes',
    resolver: 'solver_action_tree_and_course_scope',
    action: '用户练习只练范围时不增加前台设置；作者侧参考仍需固定求解器3bet尺寸。',
    opens: ['reference_input'],
    blocks: ['R3']
  },
  {
    field: 'betSizeMenu',
    resolver: 'postflop_material_and_solver_action_tree',
    action: '把资料中的小注/大注/超池例子与完整行动树分开；只有两者匹配才开放动作题。',
    opens: ['postflop_course_policy'],
    blocks: ['R3', 'R4']
  },
  {
    field: 'anteOrBlindStructure',
    resolver: 'explicit_cash_game_rule',
    action: '确认0.5/1BB及是否有前注；示例中的记账值只能作为候选。',
    opens: ['ledger_validation'],
    blocks: ['R3', 'R8']
  },
  {
    field: 'sourceVersion',
    resolver: 'frozen_source_bundle_and_solver_commit',
    action: '给课程资料、图表、求解器提交和编译器规则各自记录版本与哈希。',
    opens: ['provenance'],
    blocks: ['R3', 'R4', 'R8']
  },
  {
    field: 'configurationFingerprint',
    resolver: 'derived_after_all_required_fields',
    action: '所有字段冻结后再生成，不提前填默认值。',
    opens: ['target_review'],
    blocks: ['R8']
  }
];

const byField = new Map(Object.entries(ledger.fields));
const rows = fieldPlans.map((plan) => ({
  ...plan,
  currentStatus: byField.get(plan.field)?.status ?? 'unregistered',
  currentValue: byField.get(plan.field)?.value ?? null,
  evidence: byField.get(plan.field)?.evidence ?? []
}));

const result = {
  id: 'TARGET_CONFIG_RESOLUTION_PLAN_V1',
  status: 'paper_target_config_resolution_order_written_target_still_unfrozen',
  purpose: '规定目标配置每个字段的来源、补齐动作、打开的能力和阻塞的发布闸门，防止用户约束、课程候选与NL50参考混为一谈。',
  source: 'target-config-source-ledger.json',
  resolutionOrder: [
    'user_constraints',
    'seat_and_position_identity',
    'preflop_course_scope',
    'blind_and_rake_rule',
    'postflop_course_action_menu',
    'matched_solver_action_tree',
    'source_and_configuration_fingerprint',
    'target_review'
  ],
  rows,
  rules: {
    noGuessing: true,
    candidateDoesNotEqualFrozen: true,
    productScopeDoesNotEqualSolverInput: true,
    solverInputDoesNotEqualCoursePolicy: true,
    missingRequiredFieldBlocksTargetReview: true,
    missingRakeBlocksNL50Claim: true,
    configurationFingerprintDerivedLast: true
  },
  currentEvidence: {
    allRequiredFieldsPlanned: rows.length === ledger.requiredFields.length,
    userConstraintsResolved: rows.filter((row) => row.currentStatus.startsWith('frozen_by_user')).length === 3,
    allRowsHaveResolver: rows.every((row) => row.resolver && row.action),
    targetConfigurationFrozen: false,
    targetReviewReady: false
  },
  nextSafeWork: [
    '把已有材料中的位置、行动者和课程尺寸逐单元迁移到canonical身份字段。',
    '对每个翻后单元先锁课程动作菜单，再请求匹配参考策略。',
    '在没有抽水和完整行动树之前，保持目标级审计关闭。'
  ]
};

fs.writeFileSync(path.join(dir, 'target-config-resolution-plan.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: result.id,
  status: result.status,
  rows: result.rows.length,
  allRequiredFieldsPlanned: result.currentEvidence.allRequiredFieldsPlanned,
  targetConfigurationFrozen: result.currentEvidence.targetConfigurationFrozen
}, null, 2));
