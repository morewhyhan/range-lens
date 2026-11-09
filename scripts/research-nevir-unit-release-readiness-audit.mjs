import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const ledger = JSON.parse(fs.readFileSync(path.join(dir, 'unit-release-readiness-ledger.json'), 'utf8'));
assert.equal(ledger.id, 'UNIT_RELEASE_READINESS_LEDGER_V1');
assert.equal(ledger.rows.length, 35);
assert.equal(ledger.counts.units, 35);
assert.equal(ledger.counts.failures, 0);
assert.equal(ledger.currentEvidence.allUnitsJoined, true);
assert.equal(ledger.currentEvidence.allCardsRegistered, true);
assert.equal(ledger.currentEvidence.allCardsParentSafe, true);
assert.equal(ledger.currentEvidence.exactStrategyReady, false);
assert.equal(ledger.currentEvidence.runtimeObserved, false);
assert.equal(ledger.currentEvidence.learnerTrialObserved, false);

const failures = [];
for (const row of ledger.rows) {
  if (row.cards.length !== 3) failures.push(`${row.unitId}:cards`);
  if (!['base', 'contrast', 'transfer'].every(mode => row.cards.some(card => card.mode === mode))) failures.push(`${row.unitId}:modes`);
  if (!row.readiness.allCardsSameParent) failures.push(`${row.unitId}:parent`);
  if (row.readiness.exactStrategyReady) failures.push(`${row.unitId}:exact-ready`);
  if (row.readiness.currentLevel === 'learner_released') failures.push(`${row.unitId}:released`);
  if (!Array.isArray(row.requiredOutputs) || row.requiredOutputs.length === 0) failures.push(`${row.unitId}:required-outputs`);
}
assert.deepEqual(failures, []);
const output = {
  id: 'UNIT_RELEASE_READINESS_AUDIT_V1',
  status: 'paper_35_unit_readiness_joined_not_released',
  sourceLedger: 'unit-release-readiness-ledger.json',
  checks: {
    units: ledger.rows.length,
    allThreeModesRegistered: true,
    allParentsSafe: ledger.currentEvidence.allCardsParentSafe,
    canonicalFieldsComplete: ledger.counts.canonicalFieldsComplete,
    unitsWithCompiledCards: ledger.counts.unitsWithCompiledCards,
    unitsWithMatchedReference: ledger.counts.unitsWithMatchedReference,
    unitsWithRangeAfter: ledger.counts.unitsWithRangeAfter,
    unitsWithSuccessor: ledger.counts.unitsWithSuccessor,
    exactStrategyReady: ledger.counts.exactStrategyReady,
    runtimeAttached: ledger.counts.runtimeAttached,
    learnerTrial: ledger.counts.learnerTrial,
    failures: failures.length
  },
  releaseGate: {
    passed: false,
    reason: '35项的结构卡位和父层已经合并，但策略、课程政策、动作后范围、后继、运行时和学习者试读仍未闭合；不能把清单完整误写成题库完整。'
  }
};
fs.writeFileSync(path.join(dir, 'unit-release-readiness-audit.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, checks: output.checks }));
