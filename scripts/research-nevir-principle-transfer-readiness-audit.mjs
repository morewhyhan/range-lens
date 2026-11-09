import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const crosswalk = read('principle-loop-unit-crosswalk.json');
const closure = read('principle-unit-closure.json');
const skeleton = read('unit-three-card-skeleton.json');
const outcome = read('unit-outcome-matrix.json');
const unitReadiness = read('unit-release-readiness-ledger.json');

assert.equal(crosswalk.rows.length, 35);
assert.equal(skeleton.cards.length, 105);
assert.equal(outcome.rows.length, 35);
const cardsByUnit = new Map();
for (const card of skeleton.cards) {
  if (!cardsByUnit.has(card.unitId)) cardsByUnit.set(card.unitId, []);
  cardsByUnit.get(card.unitId).push(card);
}
const outcomeByUnit = new Map(outcome.rows.map(row => [row.unitId, row]));
const readinessByUnit = new Map(unitReadiness.rows.map(row => [row.unitId, row]));
const rows = [];
const failures = [];

for (const unit of crosswalk.rows) {
  const cards = cardsByUnit.get(unit.unitId) ?? [];
  const base = cards.find(card => card.mode === 'base');
  const contrast = cards.find(card => card.mode === 'contrast');
  const transfer = cards.find(card => card.mode === 'transfer');
  const outcomeRow = outcomeByUnit.get(unit.unitId);
  const readiness = readinessByUnit.get(unit.unitId);
  if (!base || !contrast || !transfer) failures.push(`${unit.unitId}:missing-three-card-mode`);
  const checks = {
    primaryPrincipleDeclared: Array.isArray(unit.principles) && unit.principles.length > 0 && typeof unit.primaryPrinciple === 'string',
    parentFrameDeclared: typeof unit.parentFrame === 'string',
    requiredOutputsDeclared: Array.isArray(outcomeRow?.requiredOutputs) && outcomeRow.requiredOutputs.length > 0,
    baseRegistered: Boolean(base),
    contrastRegistered: Boolean(contrast),
    transferRegistered: Boolean(transfer),
    contrastHasCandidates: Array.isArray(unit.contrastCase?.candidateChangedFields) && unit.contrastCase.candidateChangedFields.length > 0,
    transferHasCandidates: Array.isArray(unit.contrastCase?.candidateChangedFields) && unit.contrastCase.candidateChangedFields.length > 0,
    contrastHasExactChangedField: Boolean(contrast?.changedField && contrast.changedField !== 'choose_exactly_one_from_candidates'),
    transferHasExactChangedField: Boolean(transfer?.changedField && transfer.changedField !== 'choose_exactly_one_from_candidates'),
    sourceIdentityPreserved: typeof base?.sourceIdentity === 'string' && base.sourceIdentity === contrast?.sourceIdentity && base.sourceIdentity === transfer?.sourceIdentity,
    successorOrStopDeclared: typeof outcomeRow?.missingEvidenceAction === 'string' && typeof outcomeRow?.stopReasonWhenMissing === 'string',
    learnerTransferObserved: readiness?.readiness?.learnerTrial === true
  };
  for (const [key, value] of Object.entries(checks)) {
    const soft = ['contrastHasExactChangedField','transferHasExactChangedField','learnerTransferObserved'].includes(key);
    if (!value && !soft) failures.push(`${unit.unitId}:${key}`);
  }
  rows.push({
    unitId: unit.unitId,
    label: unit.label,
    parentFrame: unit.parentFrame,
    principleIds: unit.principles,
    transferField: closure.principles.find(principle => unit.principles?.includes(principle.principleId))?.transferField ?? null,
    candidateChangedFields: [...new Set([...(unit.contrastCase?.candidateChangedFields ?? []), ...(unit.transferCase?.candidateChangedFields ?? [])])],
    checks,
    status: checks.contrastHasExactChangedField && checks.transferHasExactChangedField ? 'transfer_field_declared_not_observed' : 'candidate_field_pending_exact_selection'
  });
}

assert.deepEqual(failures, []);
const counts = {
  units: rows.length,
  baseCards: rows.filter(row => row.checks.baseRegistered).length,
  contrastCards: rows.filter(row => row.checks.contrastRegistered).length,
  transferCards: rows.filter(row => row.checks.transferRegistered).length,
  unitsWithPrinciple: rows.filter(row => row.checks.primaryPrincipleDeclared).length,
  unitsWithRequiredOutputs: rows.filter(row => row.checks.requiredOutputsDeclared).length,
  unitsWithExactContrastField: rows.filter(row => row.checks.contrastHasExactChangedField).length,
  unitsWithExactTransferField: rows.filter(row => row.checks.transferHasExactChangedField).length,
  unitsWithObservedTransfer: rows.filter(row => row.checks.learnerTransferObserved).length,
  unitsWithSuccessorOrStop: rows.filter(row => row.checks.successorOrStopDeclared).length,
  failures: failures.length
};
const output = {
  id: 'PRINCIPLE_TRANSFER_READINESS_AUDIT_V1',
  status: 'paper_principle_loop_and_three_cards_registered_exact_transfer_field_and_trial_missing',
  purpose: '检查每个单元是否从具体案例交付到原理、单变量对照和未见迁移；明确候选字段不等于已经声明的唯一变化，也不等于学习者已经迁移。',
  sources: ['principle-loop-unit-crosswalk.json','principle-unit-closure.json','unit-three-card-skeleton.json','unit-outcome-matrix.json','unit-release-readiness-ledger.json'],
  rules: {
    everyUnitHasPrinciple: true,
    everyUnitHasBaseContrastTransfer: true,
    contrastMustNameExactlyOneChangedField: true,
    transferMustNameExactlyOneChangedField: true,
    unchangedFieldsMustBeHeld: true,
    sourceIdentityHeld: true,
    observedTransferSeparateFromCardSkeleton: true,
    caseAccuracyDoesNotEqualTransfer: true
  },
  counts,
  rows,
  currentEvidence: {
    paperLoopRegistered: true,
    all35PrincipleBindings: counts.unitsWithPrinciple === 35,
    all105CardSlots: counts.baseCards === 35 && counts.contrastCards === 35 && counts.transferCards === 35,
    exactChangedFieldsCompiled: false,
    learnerTransferObserved: false,
    NL50Evidence: false
  },
  releaseGate: {
    passed: false,
    reason: '35项已有三卡骨架和候选变化字段，但尚未为每项选定并验证唯一变化字段，也没有学习者首答迁移证据。'
  }
};
fs.writeFileSync(path.join(dir, 'principle-transfer-readiness-audit.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, counts }));
