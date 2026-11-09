import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const dir = path.join(root, 'research', 'nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const candidate = read('unit-identity-normalization-candidate.json');
const derivedStacks = read('derived-stacks-physical-candidates.json');
const authorFrontier = read('author-course-compilation-frontier.json');

assert.equal(candidate.id, 'UNIT_IDENTITY_NORMALIZATION_CANDIDATE_V1');
assert.equal(derivedStacks.id, 'DERIVED_STACKS_PHYSICAL_CANDIDATES_V1');
assert.equal(authorFrontier.id, 'AUTHOR_COURSE_COMPILATION_FRONTIER_V1');
assert.equal(candidate.rows.length, 35);

const complete = candidate.rows.filter(row => row.status === 'identity_candidate_complete');
const partial = candidate.rows.filter(row => row.status !== 'identity_candidate_complete');
assert.equal(complete.length, 19);
assert.equal(partial.length, 16);

const derivedStackUnits = new Set(derivedStacks.candidate.units);
const stackOnly = partial.filter(row => row.missingIdentityFields.length === 1 && row.missingIdentityFields[0] === 'stacksBB');
const roleOnly = partial.filter(row => row.missingIdentityFields.length === 1 && row.missingIdentityFields[0] === 'role');
const sourceContextPartial = partial.filter(row => row.missingIdentityFields.includes('heroSeat') || row.missingIdentityFields.includes('villainSeat') || row.missingIdentityFields.includes('board') || row.missingIdentityFields.includes('history'));
const allMissing = partial.filter(row => row.missingIdentityFields.length >= 6);

assert.equal(stackOnly.length, 5);
assert.equal(stackOnly.every(row => derivedStackUnits.has(row.unitId)), true);
assert.equal(roleOnly.length, 6);
assert.equal(allMissing.length, 4);

function classify(row) {
  if (row.missingIdentityFields.length === 1 && row.missingIdentityFields[0] === 'stacksBB') {
    return {
      blockClass: 'stacks_map_missing_active_stack_is_not_enough',
      nextAction: '取得或确认双方剩余筹码映射；可引用物理候选做交叉核对，但不能直接升级为规范身份。',
      allowedNow: ['identity_audit', 'physical_stack_conservation'],
      forbiddenAssumptions: ['activeStackBB_equals_both_stacksBB', 'derived_candidate_equals_frozen_identity']
    };
  }
  if (row.missingIdentityFields.length === 1 && row.missingIdentityFields[0] === 'role') {
    return {
      blockClass: 'role_missing',
      nextAction: '从同一来源中取得明确行动者/位置角色；不能由题目所属组名或牌面推断。',
      allowedNow: ['source_identity_review'],
      forbiddenAssumptions: ['groupId_equals_role', 'actionState_equals_role']
    };
  }
  if (row.missingIdentityFields.includes('heroSeat') || row.missingIdentityFields.includes('villainSeat') || row.missingIdentityFields.includes('board') || row.missingIdentityFields.includes('history')) {
    return {
      blockClass: 'source_context_partial',
      nextAction: '补齐同一来源的局面、位置和历史；禁止拿邻近示例或同价历史替代。',
      allowedNow: ['identity_audit', 'fact_only_if_explicit'],
      forbiddenAssumptions: ['neighbor_case_substitution', 'same_pot_equals_same_history', 'same_group_equals_same_board']
    };
  }
  return {
    blockClass: 'multiple_identity_fields_missing',
    nextAction: '回到来源文件补一套完整gameFrame；在此之前停留在身份层。',
    allowedNow: ['source_identity_review'],
    forbiddenAssumptions: ['partial_packet_equals_complete_gameframe', 'action_example_equals_target_policy']
  };
}

const rows = candidate.rows.map(row => {
  const classification = classify(row);
  return {
    unitId: row.unitId,
    groupId: row.groupId,
    sourceEvidence: row.sourceEvidence,
    status: row.status,
    missingIdentityFields: row.missingIdentityFields,
    identityCandidate: row.identityCandidate,
    blockClass: row.status === 'identity_candidate_complete' ? 'none' : classification.blockClass,
    nextAction: row.status === 'identity_candidate_complete' ? '允许进入规范字段迁移；不因此开放策略。' : classification.nextAction,
    allowedNow: row.status === 'identity_candidate_complete' ? ['identity_canonicalization'] : classification.allowedNow,
    forbiddenAssumptions: row.status === 'identity_candidate_complete' ? ['identity_complete_equals_strategy_ready'] : classification.forbiddenAssumptions,
    canonicalPromotion: row.status === 'identity_candidate_complete' ? 'candidate_identity_only' : 'blocked_until_missing_fields_are_source_resolved'
  };
});

const summary = {
  totalUnits: rows.length,
  candidateComplete: complete.length,
  candidatePartial: partial.length,
  blockedByClass: Object.fromEntries([...new Set(rows.filter(row => row.blockClass !== 'none').map(row => row.blockClass))].map(blockClass => [blockClass, rows.filter(row => row.blockClass === blockClass).length])),
  stackOnlyUnits: stackOnly.map(row => row.unitId),
  roleOnlyUnits: roleOnly.map(row => row.unitId),
  sourceContextPartialUnits: sourceContextPartial.map(row => row.unitId),
  multipleFieldsMissingUnits: allMissing.map(row => row.unitId)
};

const frontier = {
  id: 'UNIT_IDENTITY_PROMOTION_FRONTIER_V1',
  status: 'paper_identity_promotion_plan_source_gaps_explicit_strategy_blocked',
  purpose: '把35项身份候选分为可迁移和明确阻塞两类；只允许复制同一来源明确字段，不把activeStack、题组、相邻案例或局部动作示例升级成完整局面。',
  sources: ['unit-identity-normalization-candidate.json', 'derived-stacks-physical-candidates.json', 'author-course-compilation-frontier.json'],
  summary,
  rows,
  promotionRules: {
    candidateCompleteAllowsCanonicalIdentityOnly: true,
    candidatePartialNeverPromotes: true,
    activeStackNeverBecomesStacksMap: true,
    groupAndActionStateNeverBecomeRole: true,
    neighborCaseNeverFillsSourceGap: true,
    identityDoesNotOpenStrategy: true,
    sourceHashRequiredBeforePromotion: true
  },
  currentEvidence: {
    paperFrontier: true,
    candidateIdentityComplete: complete.length,
    canonicalStrategyReady: 0,
    coursePolicyReady: 0,
    matchedReference: false,
    runtime: false,
    learnerTrial: false,
    NL50Evidence: false
  }
};

fs.writeFileSync(path.join(dir, 'unit-identity-promotion-frontier.json'), JSON.stringify(frontier, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: frontier.id,
  totalUnits: summary.totalUnits,
  candidateComplete: summary.candidateComplete,
  candidatePartial: summary.candidatePartial,
  blockedByClass: summary.blockedByClass
}));
