import fs from 'node:fs';

const file = 'research/nevir-system/course-package-field-crosswalk.json';
const contract = JSON.parse(fs.readFileSync(file, 'utf8'));
const requiredOutputs = [
  'inputFingerprint',
  'factSnapshot',
  'referenceSnapshot',
  'coursePolicy',
  'differenceLedger',
  'rangeSnapshots',
  'successorGraph',
  'lessonFrames',
  'heldoutTransfer',
  'releaseDecision'
];

if (contract.outputContract.length !== requiredOutputs.length) throw new Error('output contract count mismatch');
const ids = contract.outputContract.map(row => row.courseOutput);
if (new Set(ids).size !== ids.length) throw new Error('duplicate course output');
for (const id of requiredOutputs) {
  const row = contract.outputContract.find(candidate => candidate.courseOutput === id);
  if (!row) throw new Error(`missing course output: ${id}`);
  for (const field of ['stage', 'rawInputs', 'independentChecks', 'visibleAt', 'exactGradeBlockedBy', 'unknownRendering']) {
    if (!row[field] || (Array.isArray(row[field]) && row[field].length === 0)) throw new Error(`${id} missing ${field}`);
  }
}
for (const [key, value] of Object.entries(contract.solverFieldRules)) {
  if (value !== true) throw new Error(`solver field rule is not hard true: ${key}`);
}
for (const [key, value] of Object.entries(contract.formulaContract)) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`formula missing: ${key}`);
}
for (const [gate, fields] of Object.entries(contract.releaseGates)) {
  if (!Array.isArray(fields) || fields.length === 0) throw new Error(`release gate missing fields: ${gate}`);
}
if (contract.currentEvidence.coursePackageCompiled !== false) throw new Error('course package must remain uncompiled');
if (contract.currentEvidence.NL50Evidence !== false) throw new Error('NL50 evidence must remain false');

console.log(JSON.stringify({
  ok: true,
  id: contract.id,
  outputs: contract.outputContract.length,
  hardSolverRules: Object.keys(contract.solverFieldRules).length,
  releaseGates: Object.keys(contract.releaseGates).length,
  coursePackageCompiled: contract.currentEvidence.coursePackageCompiled,
  nl50Evidence: contract.currentEvidence.NL50Evidence
}));
