import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const dir = path.join(root, 'research', 'nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const skeleton = read('unit-three-card-skeleton.json');
const unitQueue = read('unit-field-completion-queue.json');
const authorFrontier = read('author-course-compilation-frontier.json');

assert.equal(skeleton.id, 'UNIT_THREE_CARD_SKELETON_V1');
assert.equal(unitQueue.id, 'UNIT_FIELD_COMPLETION_QUEUE_V1');
assert.equal(authorFrontier.id, 'AUTHOR_COURSE_COMPILATION_FRONTIER_V1');
assert.equal(skeleton.cards.length, 105);
assert.equal(unitQueue.queue.length, 35);

const unitById = new Map(unitQueue.queue.map(row => [row.unitId, row]));
const frontierById = new Map(authorFrontier.rows.map(row => [row.unitId, row]));
const phaseOrder = authorFrontier.phaseOrder;
const cardPhaseRequirements = {
  base: {
    minimum: ['identity_source', 'identity_canonical', 'fact_frame'],
    exactGrade: ['reference_policy', 'successors'],
    authorFields: ['basePrompt', 'baseVisibleInputs', 'baseRequiredOutput', 'baseExplanation']
  },
  contrast: {
    minimum: ['identity_source', 'identity_canonical', 'fact_frame'],
    exactGrade: ['course_policy', 'reference_policy', 'range_snapshots', 'successors'],
    authorFields: ['contrastCase', 'changedField', 'preservedFields', 'contrastDifference', 'contrastExplanation']
  },
  transfer: {
    minimum: ['identity_source', 'identity_canonical', 'fact_frame'],
    exactGrade: ['course_policy', 'reference_policy', 'range_snapshots', 'successors', 'teaching_transfer'],
    authorFields: ['heldoutCase', 'changedField', 'preservedFields', 'transferPrompt', 'transferGrading', 'holdoutIdentity']
  }
};

const rows = skeleton.cards.map(card => {
  const unit = unitById.get(card.unitId);
  const frontier = frontierById.get(card.unitId);
  assert.ok(unit, `missing unit queue row ${card.unitId}`);
  assert.ok(frontier, `missing author frontier row ${card.unitId}`);
  const cardPlan = cardPhaseRequirements[card.mode];
  assert.ok(cardPlan, `missing card plan ${card.mode}`);
  const currentIndex = phaseOrder.indexOf(frontier.currentPhase);
  assert.ok(currentIndex >= 0, `unknown unit phase ${frontier.currentPhase}`);
  const firstMissingPhase = cardPlan.minimum.find(phase => phaseOrder.indexOf(phase) > currentIndex) ?? null;
  const exactBlockedBy = cardPlan.exactGrade.filter(phase => phaseOrder.indexOf(phase) > currentIndex);
  return {
    cardId: card.cardId,
    unitId: card.unitId,
    mode: card.mode,
    label: card.label,
    groupId: card.groupId,
    parentFrame: card.parentFrame,
    returnTo: card.returnTo,
    unitCurrentPhase: frontier.currentPhase,
    unitNextPhase: frontier.nextPhase,
    unitCurrentLevel: frontier.currentLevel,
    unitIdentityStatus: frontier.identityStatus,
    unitCanonicalMissingFields: frontier.canonicalMissingFields,
    cardRequiredAuthorFields: cardPlan.authorFields,
    minimumPhases: cardPlan.minimum,
    exactGradePhases: cardPlan.exactGrade,
    firstMissingMinimumPhase: firstMissingPhase,
    exactGradeBlockedBy: exactBlockedBy,
    nextAuthorAction: frontier.nextAction,
    unitStopReason: frontier.stopReason,
    cardStopReason: card.missingEvidenceAction,
    releaseIdentity: card.releaseIdentity,
    exactGradeRequires: card.exactGradeRequires,
    answerContentPresent: card.answerContentPresent,
    cardStatus: 'queued_not_compiled',
    learnerExposure: frontier.learnerExposure,
    currentEvidence: {
      structureRegistered: true,
      answerCompiled: false,
      matchedReference: false,
      coursePolicy: false,
      rangeAfter: false,
      successor: false,
      runtime: false,
      learnerTrial: false
    }
  };
});

assert.equal(rows.length, 105);
assert.equal(new Set(rows.map(row => row.cardId)).size, 105);
assert.equal(rows.every(row => row.answerContentPresent === false), true);
assert.equal(rows.every(row => row.exactGradeRequires === 'matched_reference_and_successor'), true);
for (const unitId of unitById.keys()) {
  const unitRows = rows.filter(row => row.unitId === unitId);
  assert.deepEqual(unitRows.map(row => row.mode), ['base', 'contrast', 'transfer']);
  assert.equal(unitRows.every(row => row.parentFrame === unitRows[0].parentFrame), true);
  assert.equal(unitRows.every(row => row.returnTo === unitRows[0].returnTo), true);
}

const phaseCounts = Object.fromEntries(phaseOrder.map(phase => [phase, rows.filter(row => row.unitCurrentPhase === phase).length]));
const modeCounts = Object.fromEntries(['base', 'contrast', 'transfer'].map(mode => [mode, rows.filter(row => row.mode === mode).length]));
const blockedCounts = Object.fromEntries(['base', 'contrast', 'transfer'].map(mode => [mode, rows.filter(row => row.mode === mode && row.exactGradeBlockedBy.length > 0).length]));

const frontier = {
  id: 'UNIT_THREE_CARD_COMPILATION_FRONTIER_V1',
  status: 'paper_105_card_author_queue_ordered_answers_and_reference_missing',
  purpose: '把105个三卡位接到作者侧唯一编译阶段，逐卡显示当前阶段、缺失字段、下一动作和停止边界；禁止单张卡完成后越级释放整个单元。',
  sources: ['unit-three-card-skeleton.json', 'unit-field-completion-queue.json', 'author-course-compilation-frontier.json'],
  phaseOrder,
  modeOrder: ['base', 'contrast', 'transfer'],
  rows,
  summary: {
    units: 35,
    cards: 105,
    modeCounts,
    phaseCounts,
    exactGradeBlockedCounts: blockedCounts,
    answerCompiled: 0,
    matchedReference: 0,
    coursePolicy: 0,
    rangeAfter: 0,
    successors: 0,
    learnerTrial: false
  },
  releaseRules: {
    cardStructureBeforeAnswer: true,
    identityBeforeFact: true,
    factOrExplicitBoundaryBeforeContrast: true,
    referenceAndCoursePolicyBeforeExactGrade: true,
    rangeBeforeSuccessor: true,
    transferAfterHeldoutIdentity: true,
    oneCardDoesNotReleaseUnit: true,
    missingEvidenceStopsAtParent: true,
    noNeighborSubstitution: true
  },
  currentEvidence: {
    paperFrontier: true,
    all105RowsQueued: true,
    answersCompiled: false,
    matchedReference: false,
    runtime: false,
    learnerTrial: false,
    NL50Evidence: false
  }
};

fs.writeFileSync(path.join(dir, 'unit-three-card-compilation-frontier.json'), JSON.stringify(frontier, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: frontier.id,
  units: frontier.summary.units,
  cards: frontier.summary.cards,
  phaseCounts: frontier.summary.phaseCounts,
  answerCompiled: frontier.summary.answerCompiled
}));
