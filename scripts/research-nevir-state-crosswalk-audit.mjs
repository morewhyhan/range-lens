import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const crosswalk = read('first-pass-state-evidence-crosswalk.json');
const canonical = read('learner-goal-route-canonical.json');
const expectedRoute = ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7'];
const rows = crosswalk.rows;
const errors = [];

if (JSON.stringify(crosswalk.canonicalRoute) !== JSON.stringify(expectedRoute)) {
  errors.push('crosswalk canonicalRoute differs from the canonical learner route');
}
if (JSON.stringify(canonical.outerRoute.map(row => row.id)) !== JSON.stringify(expectedRoute)) {
  errors.push('learner-goal-route-canonical outerRoute differs from expected route');
}
if (rows.length !== expectedRoute.length) errors.push(`expected ${expectedRoute.length} state rows, got ${rows.length}`);
const ids = rows.map(row => row.stateId);
if (new Set(ids).size !== ids.length) errors.push('state ids are not unique');
for (const id of expectedRoute) if (!ids.includes(id)) errors.push(`missing state row ${id}`);

const rowById = new Map(rows.map(row => [row.stateId, row]));
const initial = new Set(crosswalk.initialFrameInputs ?? []);
const available = new Set(initial);
const terminalOutputFields = {p7: new Set(['stopOrSuccessor'])};
const edgeRows = [];
for (let i = 0; i < rows.length; i += 1) {
  const row = rows[i];
  const expectedNext = i < expectedRoute.length - 1 ? expectedRoute[i + 1] : 'exit_or_review';
  const missingInputs = row.requiredInputs.filter(field => !available.has(field));
  if (missingInputs.length) errors.push(`${row.stateId}: required inputs without declared prior/initial source: ${missingInputs.join(',')}`);
  if (row.nextState !== expectedNext) errors.push(`${row.stateId}: expected next ${expectedNext}, got ${row.nextState}`);
  if (i < rows.length - 1 && !rowById.has(row.nextState)) errors.push(`${row.stateId}: nextState ${row.nextState} has no row`);
  const next = rowById.get(row.nextState);
  const consumed = next ? row.requiredOutput.filter(field => next.requiredInputs.includes(field)) : [];
  const consumedByCurrentEvidence = row.requiredOutput.filter(field => [...(row.memoryRequired ?? []), ...(row.independentEvidence ?? [])].includes(field));
  const terminal = row.requiredOutput.filter(field => terminalOutputFields[row.stateId]?.has(field));
  const unconsumedOutputs = row.requiredOutput.filter(field => !consumed.includes(field) && !consumedByCurrentEvidence.includes(field) && !terminal.includes(field));
  edgeRows.push({
    from: row.stateId,
    to: row.nextState,
    produced: row.requiredOutput,
    nextRequired: next?.requiredInputs ?? [],
    consumedDirectly: consumed,
    consumedByCurrentEvidence,
    terminalOutputs: terminal,
    unconsumedOutputs,
    inheritedOrInitial: next ? next.requiredInputs.filter(field => !row.requiredOutput.includes(field) && available.has(field)) : [],
    missingAtNext: next ? next.requiredInputs.filter(field => !row.requiredOutput.includes(field) && !available.has(field)) : []
  });
  row.requiredOutput.forEach(field => available.add(field));
}

if (edgeRows.some(edge => edge.missingAtNext.length)) errors.push('at least one next-state input has no direct, inherited, or initial source');
if (edgeRows.some(edge => edge.unconsumedOutputs.length)) errors.push('at least one state output is not consumed by the next state, current evidence, or an explicit terminal');
const result = {
  id: 'FIRST_PASS_STATE_CROSSWALK_AUDIT_V1',
  status: errors.length ? 'paper_route_field_closure_gap_found' : 'paper_route_field_closure_consistent_not_runtime',
  canonicalRoute: expectedRoute,
  initialFrameInputs: [...initial],
  rows: edgeRows,
  checks: {
    allStateIdsUnique: new Set(ids).size === ids.length,
    allRequiredInputsDeclared: errors.every(error => !error.includes('required inputs without')),
    nextChainExact: errors.every(error => !error.includes('expected next')),
    everyNextInputSourced: edgeRows.every(edge => edge.missingAtNext.length === 0),
    everyRequiredOutputConsumedOrTerminal: edgeRows.every(edge => edge.unconsumedOutputs.length === 0)
  },
  currentEvidence: {
    runtimeObserved: false,
    learnerTrialObserved: false,
    goalCompletionVerified: false
  }
};
fs.writeFileSync(path.join(dir, 'first-pass-state-crosswalk-audit.json'), JSON.stringify(result, null, 2) + '\n');
if (errors.length) {
  console.error(JSON.stringify({ ok: false, status: result.status, errors }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, status: result.status, states: rows.length, edges: edgeRows.length, initialInputs: initial.size }));
}
