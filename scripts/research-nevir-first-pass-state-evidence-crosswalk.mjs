import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const stateMachine = read('first-lesson-visible-state-machine.json');
const golden = read('first-pass-golden-path.json');
const mental = read('first-pass-mental-model-contract.json');

const stateToFrame = {
  L0: 'G0_welcome',
  L1: 'G1_context',
  L2: 'G2_preflop_chart',
  L3: 'G3_preflop_action',
  L4: 'G4_range_bridge',
  p1: 'G5_p1_context',
  p2: 'G6_p2_hand',
  p3: 'G7_p3_range',
  p4: 'G8_p4_compare',
  p5: 'G9_p5_execute',
  p6: 'G10_p6_update',
  p7: 'G11_p7_close'
};
const stateToMemory = {
  L0: 'tableFrame', L1: 'contextFrame', L2: 'preflopCell', L3: 'preflopAction', L4: 'startingRangeFrame',
  p1: 'contextCard', p2: 'handCard', p3: 'rangeDeltaCard', p4: 'choiceCard', p5: 'ledgerCard', p6: 'changeCard', p7: 'reviewCard'
};
const requiredIndependentEvidence = {
  L0: ['primaryActionCompleted'],
  L1: ['primaryActionCompleted', 'currentLayerSelfLocated'],
  L2: ['primaryActionCompleted', 'currentLayerSelfLocated'],
  L3: ['primaryActionCompleted', 'handoffPayloadComplete'],
  L4: ['primaryActionCompleted', 'handoffPayloadComplete', 'parentBoundaryUnderstood'],
  p1: ['primaryActionCompleted', 'currentLayerSelfLocated', 'handoffPayloadComplete'],
  p2: ['primaryActionCompleted', 'handoffPayloadComplete'],
  p3: ['primaryActionCompleted', 'handoffPayloadComplete'],
  p4: ['primaryActionCompleted', 'handoffPayloadComplete'],
  p5: ['primaryActionCompleted', 'handoffPayloadComplete'],
  p6: ['primaryActionCompleted', 'handoffPayloadComplete', 'successorOrStopSelfLocated'],
  p7: ['oneSentenceReason', 'errorLayer', 'singleTransferField']
};

const stateById = Object.fromEntries(stateMachine.states.map(x => [x.id, x]));
const frameById = Object.fromEntries(golden.frames.map(x => [x.id, x]));
const memoryById = Object.fromEntries([...mental.outerMemoryTokens, ...mental.memoryTokens].map(x => [x.id, x]));
const rows = Object.entries(stateToFrame).map(([stateId, frameId]) => {
  const state = stateById[stateId];
  const frame = frameById[frameId];
  const memoryId = stateToMemory[stateId];
  const memory = memoryById[memoryId];
  const missing = [];
  if (!state) missing.push('state');
  if (!frame) missing.push('goldenFrame');
  if (!memory) missing.push('memoryToken');
  if (state && frame && state.plainQuestion !== frame.ask) missing.push('questionMismatch');
  if (state && frame && state.primaryAction !== frame.primaryAction) missing.push('primaryActionMismatch');
  if (state && memory && !state.output.some(x => memory.required.includes(x))) missing.push('memoryOutputNotProduced');
  return {
    stateId,
    frameId,
    memoryToken: memoryId,
    parentStateId: state?.parentStateId ?? null,
    plainQuestion: state?.plainQuestion,
    centerVisual: state?.centerVisual,
    primaryAction: state?.primaryAction,
    requiredInputs: state?.requiredInputs ?? [],
    requiredOutput: state?.requiredOutput ?? [],
    nextState: state?.nextState,
    errorReturn: state?.errorReturn,
    stopReasons: state?.stopReasons ?? [],
    stopCondition: state?.stopCondition,
    memoryRequired: memory?.required ?? [],
    independentEvidence: requiredIndependentEvidence[stateId],
    missing
  };
});

const expectedStates = [...mental.outerRoute, ...mental.innerRoute];
const routeExact = JSON.stringify(expectedStates) === JSON.stringify(stateMachine.route);
const allMapped = rows.length === expectedStates.length && rows.every(row => row.missing.length === 0);
const oneFramePerState = new Set(rows.map(row => row.frameId)).size === rows.length;
const output = {
  id: 'FIRST_PASS_STATE_EVIDENCE_CROSSWALK_V1',
  status: routeExact && allMapped && oneFramePerState ? 'paper_state_frame_memory_evidence_crosswalk_closed' : 'paper_state_frame_memory_evidence_crosswalk_incomplete',
  sources: ['first-lesson-visible-state-machine.json', 'first-pass-golden-path.json', 'first-pass-mental-model-contract.json'],
  canonicalRoute: expectedStates,
  rows,
  checks: {
    routeExact,
    stateCount: rows.length,
    allStatesMapped: allMapped,
    oneFramePerState,
    everyStateHasMemoryToken: rows.every(row => Boolean(row.memoryToken)),
    everyStateHasIndependentEvidence: rows.every(row => row.independentEvidence?.length > 0),
    everyStateHasStopCondition: rows.every(row => Boolean(row.stopCondition))
  },
  currentEvidence: {
    paperCrosswalk: true,
    runtimeAttached: false,
    learnerTrialObserved: false,
    matchedReference: false,
    NL50Evidence: false
  }
};

fs.writeFileSync(path.join(dir, 'first-pass-state-evidence-crosswalk.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: output.status === 'paper_state_frame_memory_evidence_crosswalk_closed', id: output.id, stateCount: rows.length, allStatesMapped: output.checks.allStatesMapped, routeExact: output.checks.routeExact }));
if (output.status !== 'paper_state_frame_memory_evidence_crosswalk_closed') process.exitCode = 1;

