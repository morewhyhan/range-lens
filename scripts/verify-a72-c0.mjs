import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const research = path.join(root, 'research', 'nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(research, name), 'utf8'));
const spec = read('a72-reference-acquisition-spec.json');
const audit = read('a72-c0-source-build-audit.json');
const calibration = read('engine-runtime-calibration.json');
const history = read('a72-c0-history-runtime-probe.json');
const license = read('solver-license-distribution-decision.json');

assert.equal(spec.candidateId, audit.candidateId);
assert.equal(spec.inputFingerprint, audit.frozenInput.inputFingerprint);
assert.equal(audit.source.revision, calibration.sourceRevision);
assert.equal(spec.requestedActionTree.automaticActionMerge, false);
assert.equal(audit.buildVerification.probeStatus, 'passed');
assert.equal(audit.runtimeProbe.rootMenuMatchesPreflight, true);
assert.equal(history.sourceRevision, audit.source.revision);
assert.equal(history.inputFingerprint, spec.inputFingerprint);
assert.equal(history.exampleSha256, '37BB24F0ADA554712623E5100AD29A38E120B75ABA4C2C576421C13681804074');
assert.deepEqual(history.historyMenus.root, ['Check', 'Bet(182)', 'AllIn(9750)']);
assert.deepEqual(history.historyMenus.afterCheckBet182, ['Fold', 'Call', 'Raise(455)', 'AllIn(9750)']);
assert.deepEqual(history.historyMenus.afterRaise455, ['Fold', 'Call', 'Raise(1138)', 'AllIn(9750)']);
assert.equal(history.solverMemoryAllocated, false);
assert.equal(license.license, 'AGPL-3.0-or-later');
assert.equal(license.status, 'distribution_boundary_fixed_solver_runtime_not_in_current_exe');
assert.deepEqual(audit.runtimeProbe.rootAvailableActions, ['Check', 'Bet(182)', 'AllIn(9750)']);
assert.equal(audit.frozenInput.mergingThreshold, 0);
assert.equal(audit.frozenInput.addAllinThreshold, 0);
assert.equal(audit.frozenInput.forceAllinThreshold, 0);
assert.equal(calibration.cardChecks, 52);
assert.equal(calibration.parsedRanges.length, 2);
for (const role of calibration.parsedRanges) assert.equal(role.physicalWeightChecks, 1326);
assert.equal(calibration.amountProbe.rootActions, '[Check, Bet(182)]');
assert.equal(calibration.amountProbe.afterCheckBet182, '[Fold, Call, Raise(455), AllIn(9750)]');
assert.equal(calibration.amountProbe.afterRaise455, '[Fold, Call, Raise(1138), AllIn(9750)]');
assert.equal(calibration.evCalibrations.length, 3);
for (const row of calibration.evCalibrations) {
  assert.ok(Math.abs(row.runtimeCurrentCallEV - row.expectedCurrentCallEV) < 0.02);
  assert.ok(Math.abs(row.runtimeFoldEV) < 0.02);
}

const summary = {
  candidateId: spec.candidateId,
  inputFingerprint: spec.inputFingerprint,
  engineRevision: audit.source.revision,
  status: 'c0_root_and_representative_history_adapter_verified_reload_and_serialization_pending',
  targetRoot: {
    actions: audit.runtimeProbe.rootAvailableActions,
    actualAmountUnits: audit.runtimeProbe.actualAmountUnits,
    automaticMergeDisabled: audit.frozenInput.mergingThreshold === 0,
  },
  representativeHistory: {
    rootActions: `[${history.historyMenus.root.join(', ')}]`,
    afterCheckBet: `[${history.historyMenus.afterCheckBet182.join(', ')}]`,
    afterRaise: `[${history.historyMenus.afterRaise455.join(', ')}]`,
    evOracles: calibration.evCalibrations.map(row => row.id),
  },
  historyProbe: {
    exampleSha256: history.exampleSha256,
    solverMemoryAllocated: history.solverMemoryAllocated,
    memoryUsageBytes: history.memoryUsageBytes,
  },
  releaseBlockers: [
    '目标求解器输入尚未完成同输入重载哈希证明',
    'C2逐组合策略尚未取得',
  ],
  licenseDecision: license.status,
};
const outputPath = path.join(research, 'a72-c0-adapter-verification-current.json');
fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
