import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const dir = path.join(root, 'research', 'nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const coverage = read('full-course-coverage-and-release-contract.json');
const release = read('unit-learner-release-gates.json');
const route = read('user-first-complete-route-contract.json');

assert.equal(coverage.id, 'FULL_COURSE_COVERAGE_AND_RELEASE_CONTRACT_V1');
assert.equal(release.id, 'UNIT_LEARNER_RELEASE_GATES_V1');
assert.equal(route.id, 'USER_FIRST_COMPLETE_ROUTE_CONTRACT_V1');
assert.equal(coverage.rows.length, 35);
assert.equal(release.unitRows.length, 35);

const releaseByUnit = new Map(release.unitRows.map(row => [row.unitId, row]));
const routeByUnit = new Map(route.units.map(row => [row.unitId, row]));
const cards = [];

for (const row of coverage.rows) {
  const releaseRow = releaseByUnit.get(row.unitId);
  const routeRow = routeByUnit.get(row.unitId);
  assert.ok(releaseRow, `missing release row ${row.unitId}`);
  assert.ok(routeRow, `missing route row ${row.unitId}`);
  assert.equal(releaseRow.groupId, row.groupId);
  const canonicalParentFrame = row.canonicalParentState === 'p4' ? 'p4_compare' : row.canonicalParentState === 'p6' ? 'p6_update' : row.canonicalParentState;
  assert.equal(releaseRow.parentFrame, canonicalParentFrame);
  assert.equal(releaseRow.returnTo, canonicalParentFrame);
  assert.equal(routeRow.returnTo, row.canonicalParentState);

  const common = {
    unitId: row.unitId,
    label: row.label,
    groupId: row.groupId,
    parentFrame: releaseRow.parentFrame,
    returnTo: releaseRow.returnTo,
    requiredOutputs: releaseRow.requiredOutputs,
    requiredPools: row.requiredPools,
    groupDimensions: row.groupDimensions,
    sourceIdentity: row.sourceIdentity,
    exactGradeRequires: row.exactGradeRequires,
    releaseStages: releaseRow.releaseStages.map(stage => stage.id),
    blockingEvidence: releaseRow.blockingEvidence,
    missingEvidenceAction: row.missingEvidenceAction,
    answerContentPresent: false,
    currentEvidence: { paperSkeleton: true, compiled: false, runtime: false, learnerTrial: false }
  };

  cards.push({
    cardId: `${row.unitId}:base`,
    mode: 'base',
    ...common,
    purpose: '在当前父帧让用户第一次看见本单元关系。',
    changedField: null,
    changedFieldCandidates: [],
    preservedFieldRule: '冻结本题全部输入，先回答事实或课程问题。',
    releaseIdentity: row.sourceIdentity === 'fact_or_ledger' ? 'fact_or_ledger_candidate' : 'demonstration_candidate',
    status: 'skeleton_not_compiled'
  });

  cards.push({
    cardId: `${row.unitId}:contrast`,
    mode: 'contrast',
    ...common,
    purpose: '在同一父帧只改变一个字段，让用户看见关系而不是背住牌面。',
    changedField: 'choose_exactly_one_from_candidates',
    changedFieldCandidates: row.contrastChangedFieldCandidates,
    preservedFieldRule: '除唯一变化字段外，保持父帧、资料身份、分母、动作菜单和未声明输入不变。',
    releaseIdentity: 'contrast_candidate',
    status: 'skeleton_not_compiled'
  });

  cards.push({
    cardId: `${row.unitId}:transfer`,
    mode: 'transfer',
    ...common,
    purpose: '隐藏单元标题，在未见条件中先定位受影响层，再完成同类输出。',
    changedField: 'choose_exactly_one_from_candidates',
    changedFieldCandidates: row.contrastChangedFieldCandidates,
    preservedFieldRule: '迁移题必须声明保持字段，并与训练题、来源指纹和题目身份去重。',
    releaseIdentity: 'heldout_transfer_candidate',
    status: 'skeleton_not_compiled'
  });
}

assert.equal(cards.length, 105);
assert.equal(new Set(cards.map(card => card.cardId)).size, 105);
assert.equal(new Set(cards.map(card => card.unitId)).size, 35);
for (const unitId of releaseByUnit.keys()) {
  const unitCards = cards.filter(card => card.unitId === unitId);
  assert.deepEqual(unitCards.map(card => card.mode), ['base', 'contrast', 'transfer']);
  assert.equal(new Set(unitCards.map(card => card.parentFrame)).size, 1);
  assert.equal(unitCards.every(card => card.returnTo === unitCards[0].returnTo), true);
  assert.equal(unitCards.every(card => card.answerContentPresent === false), true);
  assert.equal(unitCards.every(card => card.exactGradeRequires === 'matched_reference_and_successor'), true);
}
assert.equal(cards.filter(card => card.mode === 'contrast').every(card => card.changedField === 'choose_exactly_one_from_candidates'), true);
assert.equal(cards.filter(card => card.mode === 'transfer').every(card => card.changedFieldCandidates.length > 0), true);

const skeleton = {
  id: 'UNIT_THREE_CARD_SKELETON_V1',
  status: 'paper_105_card_skeleton_compiled_answers_reference_and_trial_missing',
  purpose: '把35项单元展开为105个明确卡位：基准、单变量对照、未见迁移；只补齐结构身份和停止边界，不凭邻近题填策略答案。',
  sources: ['full-course-coverage-and-release-contract.json', 'unit-learner-release-gates.json', 'user-first-complete-route-contract.json'],
  unitCount: 35,
  cardCount: 105,
  modes: ['base', 'contrast', 'transfer'],
  cards,
  invariants: {
    exactlyThreeCardsPerUnit: true,
    baseContrastTransferOrder: true,
    sameParentForAllThree: true,
    contrastExactlyOneField: true,
    transferRequiresOneFieldAndHoldouts: true,
    answerContentNotInvented: true,
    exactGradeBlockedWithoutReferenceAndSuccessor: true,
    missingPoolStopsAtParent: true
  },
  currentEvidence: {
    skeletonCompiled: true,
    all105AnswersCompiled: false,
    matchedReference: false,
    coursePolicy: false,
    successors: false,
    runtime: false,
    learnerTrial: false,
    NL50Evidence: false
  },
  guards: {
    skeletonIsNotQuestionPool: true,
    skeletonIsNotStrategyAnswer: true,
    coverageIsNotMastery: true,
    noNeighborSubstitution: true
  }
};

fs.writeFileSync(path.join(dir, 'unit-three-card-skeleton.json'), JSON.stringify(skeleton, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: skeleton.id,
  units: skeleton.unitCount,
  cards: skeleton.cardCount,
  modes: skeleton.modes,
  answersCompiled: skeleton.currentEvidence.all105AnswersCompiled
}));
