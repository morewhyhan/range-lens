import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const sourcesPath = path.join(root, 'src/data/sources.json');
const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const rowValue = (sheet, index, rowNumber, column = 'A') => sources[sheet]?.[index]?.rows?.find((row) => row.row === rowNumber)?.values?.[column] ?? null;
const frequencyRows = sources.preflop?.[1]?.rows ?? [];
const openSizeRows = frequencyRows.filter((row) => row.row >= 5 && row.row <= 9).map((row) => ({
  position: row.values.A,
  sizeBB: row.values.C,
  sourceImage: row.values.H
}));

const fields = {
  targetLabel: {
    value: 'NL50',
    status: 'user_goal_label_only',
    evidence: ['user_goal'],
    note: '标签本身不能冻结牌局配置。'
  },
  tableSize: {
    value: 6,
    status: 'frozen_by_user',
    evidence: ['user_constraint_six_max_cash'],
    note: '用户明确要求统一六人现金桌。'
  },
  gameType: {
    value: 'cash_holdem',
    status: 'frozen_by_user',
    evidence: ['user_constraint_cash_holdem'],
    note: '用户明确要求现金桌；训练资料和代码均按德州扑克处理。'
  },
  effectiveStackBB: {
    value: 100,
    status: 'frozen_by_user_and_source_label',
    evidence: ['user_constraint_100BB', 'src/data/sources.json:preflop[1].rows[22]'],
    note: '用户明确要求100BB；现有翻前图资料也标注100bb。'
  },
  rakeModel: {
    value: null,
    status: 'required_unknown',
    evidence: [],
    note: '现有课程模型多处明确为无抽水或未声明，不能把研究用零抽水直接当NL50目标抽水。'
  },
  seatMap: {
    value: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
    status: 'standard_candidate_not_frozen',
    evidence: ['src/data/sources.json:preflop[1].rows[5:9]', 'user_constraint_six_max_cash'],
    note: '这是六人桌常用位置候选；资料没有把座位图、按钮移动和全部行动顺序作为冻结配置发布。'
  },
  positionModel: {
    value: {
      openingPositionsPresent: openSizeRows.map((row) => row.position),
      defensePositionsPresent: ['HJ', 'CO', 'BB'],
      postflopExamples: ['IP_3bet', 'OOP_3bet', 'IP_SRP', 'OOP_SRP']
    },
    status: 'source_candidate_not_frozen',
    evidence: ['src/data/sources.json:preflop sheets', 'src/data/sources.json:postflop sheets'],
    note: '资料覆盖若干位置和底池类型，但目标级配置仍需明确英雄/对手位置、行动权和允许路线的完整集合。'
  },
  preflopActionMenu: {
    value: ['fold', 'open_raise', 'three_bet', 'big_blind_call', 'big_blind_three_bet'],
    status: 'product_scope_candidate_not_frozen',
    evidence: ['user_preflop_scope', 'src/data/sources.json:preflop sheets'],
    note: '这是按用户指定三类翻前图整理出的产品动作集合，不等于目标求解器行动树。'
  },
  postflopActionMenu: {
    value: ['check', 'bet', 'call', 'fold', 'raise', 'check_raise', 'all_in'],
    status: 'source_candidate_not_frozen',
    evidence: ['src/data/sources.json:postflop sheets contain route examples only'],
    note: '这是资料中出现过的动作候选，不是所有节点的完整合法行动树。'
  },
  openSizes: {
    value: Object.fromEntries(openSizeRows.map((row) => [row.position, row.sizeBB])),
    status: 'source_candidate_not_frozen',
    evidence: ['src/data/sources.json:preflop[1].rows[5:9]'],
    note: '这些是简化开池图的来源尺寸；需确认是否作为目标参考输入，不能自动扩展为其它动作尺寸。'
  },
  threeBetSizes: {
    value: null,
    status: 'required_unknown',
    evidence: ['user_scope_three_bet_defense_is_range_focused'],
    note: '用户要求练3bet防守范围，但没有冻结目标求解器的3bet尺寸菜单。'
  },
  betSizeMenu: {
    value: ['25%', '33%', '40%', '50%', '67%', '70%–100%', '75%', '100%', '>100%'],
    status: 'source_candidate_not_frozen',
    evidence: ['src/data/sources.json:postflop sheets partial size examples'],
    note: '这是资料出现过的课程尺寸候选，不是完整目标行动树；每个尺寸的可用节点和频率仍需匹配参考。'
  },
  anteOrBlindStructure: {
    value: {ante: null, smallBlindBB: 0.5, bigBlindBB: 1},
    status: 'candidate_not_frozen',
    evidence: ['research_examples_use_0_5_1_blinds'],
    note: '现有示例多按0.5/1BB记账，但用户没有明确指定盲注/前注规则，仍需冻结。'
  },
  sourceVersion: {
    value: null,
    status: 'required_unknown',
    evidence: ['source_bundle_hashes_available_but_release_version_not_declared'],
    note: '文件哈希可以记录当前材料快照，但还没有正式课程版本号和参考提交身份。'
  },
  configurationFingerprint: {
    value: null,
    status: 'derived_only_after_all_required_fields',
    evidence: [],
    note: '所有必需字段和来源版本冻结后才生成，当前不能提前伪造。'
  }
};

const result = {
  id: 'TARGET_CONFIG_SOURCE_LEDGER_V1',
  status: 'partial_target_config_known_fields_separated_from_unfrozen_benchmark_fields',
  purpose: '把用户已明确的产品约束、材料可证明的候选配置和NL50目标仍需冻结的字段分开。',
  sourceBundle: [
    {file: 'src/data/sources.json', sha256: sha256('src/data/sources.json')},
    {file: 'src/data/ranges.json', sha256: sha256('src/data/ranges.json')},
    {file: 'src/preflop.js', sha256: sha256('src/preflop.js')},
    {file: 'src/context.js', sha256: sha256('src/context.js')}
  ],
  extractedFacts: {
    visibleTableLabel: rowValue('preflop', 1, 22, 'A'),
    visibleGameLabel: rowValue('preflop', 1, 22, 'A'),
    openingSizeRows: openSizeRows,
    postflopSheetNames: sources.postflop.map((sheet) => sheet.name)
  },
  requiredFields: Object.keys(fields),
  fields,
  configurationGaps: Object.entries(fields).filter(([, field]) => ['required_unknown', 'derived_only_after_all_required_fields', 'standard_candidate_not_frozen', 'source_candidate_not_frozen', 'product_scope_candidate_not_frozen', 'candidate_not_frozen'].includes(field.status)).map(([field]) => field),
  decisionRules: {
    userConstraintCanFreezeProductBoundary: true,
    sourceCandidateCannotFreezeTargetBenchmark: true,
    zeroRakeResearchCannotFreezeNL50: true,
    incompleteActionMenuBlocksSolverMatch: true,
    missingConfigurationFingerprintBlocksTargetReview: true,
    noGuessedDefaults: true
  },
  currentEvidence: {
    knownUserConstraints: ['tableSize', 'gameType', 'effectiveStackBB'],
    candidateFields: ['seatMap', 'positionModel', 'preflopActionMenu', 'postflopActionMenu', 'openSizes', 'betSizeMenu', 'anteOrBlindStructure'],
    requiredUnknownFields: ['rakeModel', 'threeBetSizes', 'sourceVersion', 'configurationFingerprint'],
    targetConfigurationFrozen: false,
    matchedReference: false,
    targetBenchmarkReady: false
  }
};

fs.writeFileSync(path.join(dir, 'target-config-source-ledger.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: result.id,
  status: result.status,
  known: result.currentEvidence.knownUserConstraints.length,
  candidates: result.currentEvidence.candidateFields.length,
  requiredUnknown: result.currentEvidence.requiredUnknownFields.length,
  targetConfigurationFrozen: result.currentEvidence.targetConfigurationFrozen
}, null, 2));
