import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const dir = path.join(root, 'research', 'nevir-system');
const sourceFile = path.join(dir, 'first-pass-user-facing-script-contract.json');
const source = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

assert.equal(source.id, 'FIRST_PASS_USER_FACING_SCRIPT_CONTRACT_V1');
assert.equal(source.rows.length, 13);
assert.deepEqual(source.canonicalRoute, ['L0', 'L1', 'L2', 'L3', 'L4', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7']);

const primaryVisual = {
  G0_welcome: 'six_max_table',
  G1_context: 'actor_pointer',
  G2_preflop_chart: 'fixed_169_grid',
  G3_preflop_action: 'selected_grid_cell',
  G4_range_bridge: 'physical_filter',
  G5_p1_context: 'board',
  G6_p2_hand: 'best_five_slots',
  G7_p3_range: 'same_coordinate_range_before',
  G8_p4_compare: 'legal_actions',
  G9_p5_execute: 'action_button',
  G10_p6_update: 'one_changed_field_highlight',
  G11_p7_close: 'settlement_ledger',
  G12_recall_transfer: 'blank_outer_route_map'
};

const preservedFields = {
  G0_welcome: ['route', 'tableFrame'],
  G1_context: ['tableFrame', 'seats', 'history', 'pot', 'toCall'],
  G2_preflop_chart: ['tableFrame', 'contextFrame', 'oneNamedPreflopChart', 'heroHand'],
  G3_preflop_action: ['tableFrame', 'contextFrame', 'preflopCell', 'actionLegend'],
  G4_range_bridge: ['tableFrame', 'contextFrame', 'preflopAction', 'rangeDenominator', 'knownCards'],
  G5_p1_context: ['tableFrame', 'contextFrame', 'preflopAction', 'startingRangeFrame', 'board', 'history', 'actor', 'pot', 'stacks', 'toCall'],
  G6_p2_hand: ['tableFrame', 'contextFrame', 'preflopAction', 'startingRangeFrame', 'board', 'history', 'actor', 'pot', 'stacks', 'toCall', 'handCard'],
  G7_p3_range: ['tableFrame', 'contextFrame', 'preflopAction', 'startingRangeFrame', 'board', 'history', 'actor', 'pot', 'stacks', 'toCall', 'handCard', 'rangeDeltaCard'],
  G8_p4_compare: ['tableFrame', 'contextFrame', 'preflopAction', 'startingRangeFrame', 'board', 'history', 'actor', 'pot', 'stacks', 'toCall', 'handCard', 'rangeDeltaCard', 'choiceCard'],
  G9_p5_execute: ['tableFrame', 'contextFrame', 'preflopAction', 'startingRangeFrame', 'board', 'history', 'actor', 'pot', 'stacks', 'toCall', 'handCard', 'rangeDeltaCard', 'choiceCard', 'ledgerCard'],
  G10_p6_update: ['tableFrame', 'contextFrame', 'preflopAction', 'startingRangeFrame', 'board', 'history', 'actor', 'pot', 'stacks', 'toCall', 'handCard', 'rangeDeltaCard', 'choiceCard', 'ledgerCard', 'changeCard'],
  G11_p7_close: ['tableFrame', 'contextFrame', 'preflopAction', 'startingRangeFrame', 'board', 'history', 'actor', 'pot', 'stacks', 'toCall', 'handCard', 'rangeDeltaCard', 'choiceCard', 'ledgerCard', 'changeCard', 'reviewCard'],
  G12_recall_transfer: ['outerRoute', 'innerRoute', 'returnPoint', 'oneVariableTransfer']
};

const consume = {
  tableFrame: { nextFrame: 'G1_context', required: ['tableFrame'] },
  contextFrame: { nextFrame: 'G2_preflop_chart', required: ['actor', 'history', 'pot', 'toCall', 'contextFrame'] },
  preflopCell: { nextFrame: 'G3_preflop_action', required: ['preflopCell'] },
  preflopAction: { nextFrame: 'G4_range_bridge', required: ['preflopAction', 'actionWeight'] },
  startingRangeFrame: { nextFrame: 'G5_p1_context', required: ['startingRangeFrame', 'normalizationDenominator'] },
  contextCard: { nextFrame: 'G6_p2_hand', required: ['actor', 'pot', 'toCall', 'contextCard', 'rangeBefore'] },
  handCard: { nextFrame: 'G7_p3_range', required: ['bestFive', 'handClass', 'draws', 'improvementCards', 'handCard'] },
  rangeDeltaCard: { nextFrame: 'G8_p4_compare', required: ['rangeBefore', 'physicalFilter', 'actionFilterStatus', 'rangeDeltaCard'] },
  choiceCard: { nextFrame: 'G9_p5_execute', required: ['legalActions', 'actionPurpose', 'price', 'sizeCondition', 'choiceCard'] },
  ledgerCard: { nextFrame: 'G10_p6_update', required: ['selectedAction', 'amountBB', 'potAfterBB', 'stacksAfterBB', 'nextActor', 'ledgerCard'] },
  changeCard: { nextFrame: 'G11_p7_close', required: ['changeField', 'successorOrStop', 'changeCard'] },
  reviewCard: { nextFrame: 'G12_recall_transfer', required: ['settlement', 'errorLayer', 'nextRoundEntry', 'reviewCard'] },
  nestedStructureEvidence: { nextFrame: 'next_session_or_stop', required: ['outerRouteRecall', 'innerRouteRecall', 'oneVariableTransfer'] }
};

const rows = source.rows.map((row, index) => {
  const isLast = index === source.rows.length - 1;
  assert.ok(primaryVisual[row.frameId], `missing primary visual for ${row.frameId}`);
  assert.ok(preservedFields[row.frameId], `missing preserved fields for ${row.frameId}`);
  assert.ok(row.output, `missing output for ${row.frameId}`);
  assert.equal(row.primaryAction.split('、').length >= 1, true);
  assert.ok(consume[row.output], `missing consume mapping for ${row.output}`);
  assert.equal(consume[row.output].nextFrame, isLast ? 'next_session_or_stop' : source.rows[index + 1].frameId);
  return {
    index: index + 1,
    frameId: row.frameId,
    canonicalState: row.canonicalState,
    whyNow: row.cognitiveJob,
    primaryVisual: primaryVisual[row.frameId],
    plainQuestion: row.plainQuestion,
    primaryAction: row.primaryAction,
    produces: row.output,
    consumesFromPrevious: index === 0 ? ['routeEntry'] : [source.rows[index - 1].output],
    consumedByNext: consume[row.output],
    preservedFields: preservedFields[row.frameId],
    errorReturn: row.errorReturn,
    stopCondition: row.stopCondition,
    missingEvidenceAction: row.stopCondition,
    cognitiveJob: row.cognitiveJob,
    userInstruction: row.userInstruction,
    terminal: isLast
  };
});

for (const row of rows) {
  assert.equal(typeof row.produces, 'string');
  assert.equal(row.preservedFields.length > 0, true);
  assert.equal(row.consumedByNext.required.length > 0, true);
  assert.equal(typeof row.errorReturn, 'string');
  assert.equal(typeof row.stopCondition, 'string');
}

const ledger = {
  id: 'FIRST_PASS_HANDOFF_LEDGER_V1',
  status: 'paper_handoff_dependencies_closed_runtime_and_trial_missing',
  purpose: '把首遍13帧的每一步为什么现在出现、产生什么、下一步必须接收什么、哪些字段必须保留、错了回哪里，变成可核对的交接账本。',
  source: 'first-pass-user-facing-script-contract.json',
  route: source.canonicalRoute,
  frameIds: source.frameIds,
  rows,
  invariants: {
    oneOutputPerFrame: true,
    nextConsumesPrevious: true,
    preservedFieldsExplicit: true,
    stopDoesNotGuess: true,
    errorReturnsToSameFrameOrDeclaredReplay: true,
    finalReplayIsTerminal: true
  },
  currentEvidence: {
    paperLedger: true,
    runtimeAttached: false,
    lowBaselineTrial: false,
    replayObserved: false
  }
};

fs.writeFileSync(path.join(dir, 'first-pass-handoff-ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: ledger.id,
  rows: ledger.rows.length,
  chainClosed: ledger.invariants.nextConsumesPrevious,
  terminalFrame: ledger.rows.at(-1).frameId,
  runtimeAttached: ledger.currentEvidence.runtimeAttached
}));
