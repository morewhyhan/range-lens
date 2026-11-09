import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const route = read('learner-goal-route-canonical.json');
const mental = read('first-pass-mental-model-contract.json');
const state = read('first-pass-state-evidence-crosswalk.json');
const script = read('first-pass-user-facing-script-contract.json');
const explanation = read('first-pass-explanation-deck.json');
const handoff = read('first-pass-handoff-ledger.json');

const expectedStates = ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7'];
const expectedFrames = ['G0_welcome','G1_context','G2_preflop_chart','G3_preflop_action','G4_range_bridge','G5_p1_context','G6_p2_hand','G7_p3_range','G8_p4_compare','G9_p5_execute','G10_p6_update','G11_p7_close','G12_recall_transfer'];
assert.deepEqual(route.outerRoute.map(row => row.id), expectedStates);
assert.deepEqual(script.canonicalRoute, expectedStates);
assert.deepEqual(script.frameIds, expectedFrames);
assert.deepEqual(explanation.route, expectedStates);
assert.deepEqual(handoff.route, expectedStates);
assert.deepEqual(mental.outerRoute, ['L0','L1','L2','L3','L4']);
assert.deepEqual(mental.innerRoute, ['p1','p2','p3','p4','p5','p6','p7']);
assert.equal(mental.innerRouteParent, 'L4');

const scriptByFrame = new Map(script.rows.map(row => [row.frameId, row]));
const explanationByFrame = new Map(explanation.rows.map(row => [row.frameId, row]));
const handoffByFrame = new Map(handoff.rows.map(row => [row.frameId, row]));
const stateById = new Map(state.rows.map(row => [row.stateId, row]));
const routeById = new Map(route.outerRoute.map(row => [row.id, row]));
const rows = [];
const failures = [];

for (const frameId of expectedFrames) {
  const user = scriptByFrame.get(frameId);
  const explain = explanationByFrame.get(frameId);
  const edge = handoffByFrame.get(frameId);
  if (!user || !explain || !edge) {
    failures.push(`${frameId}:missing-in-one-of-three-surface-contracts`);
    continue;
  }
  const stateId = user.canonicalState;
  const canonical = stateById.get(stateId);
  const routeNode = routeById.get(stateId);
  const isReplay = stateId === 'replay_transfer';
  const checks = {
    sameStateIdentity: explain.canonicalState === stateId && edge.canonicalState === stateId,
    onePlainQuestion: typeof user.plainQuestion === 'string' && user.plainQuestion.length > 0 && explain.question === user.plainQuestion && edge.plainQuestion === user.plainQuestion,
    onePrimaryAction: typeof user.primaryAction === 'string' && user.primaryAction.length > 0 && explain.afterAnswer && edge.primaryAction === user.primaryAction,
    centralVisual: typeof user.sees?.[0] === 'string' && typeof explain.visualMeaning?.primaryVisual === 'string' && explain.visualMeaning.primaryVisual === edge.primaryVisual,
    explicitOutput: typeof user.output === 'string' && typeof edge.produces === 'string',
    explicitHandoff: typeof user.handoff === 'string' && typeof edge.consumedByNext?.nextFrame === 'string',
    errorReturn: typeof user.errorReturn === 'string' && typeof edge.errorReturn === 'string',
    stopBoundary: typeof user.stopCondition === 'string' && typeof edge.stopCondition === 'string' && edge.missingEvidenceAction === edge.stopCondition,
    explanationOrderClosed: JSON.stringify(explain.explanationOrder) === JSON.stringify(['answerStatus','whyThisStep','changedOrPreserved','handoff','sourceIdentity']),
    firstAnswerBeforeHelp: user.observationBeforeHelp?.includes('firstAnswer') === true && explain.technicalDrawer?.visibleOnlyAfterAnswer === true,
    noRouteReset: user.errorReturn !== 'route_start' && edge.wrongAnswer?.noRouteReset !== false,
    canonicalNextDeclared: isReplay ? edge.consumedByNext.nextFrame === 'next_session_or_stop' : edge.consumedByNext.nextFrame === scriptByFrame.get(expectedFrames[expectedFrames.indexOf(frameId)+1])?.frameId,
    stateInputsClosed: isReplay || (canonical && canonical.requiredInputs.every(input => Array.isArray(canonical.requiredInputSources) ? canonical.requiredInputSources.length > 0 : true)),
    nestedParentClosed: !String(stateId).startsWith('p') || routeNode?.parent === 'L4'
  };
  for (const [name, passed] of Object.entries(checks)) if (!passed) failures.push(`${frameId}:${name}`);
  rows.push({
    frameId,
    canonicalState: stateId,
    parent: routeNode?.parent ?? null,
    next: edge.consumedByNext.nextFrame,
    primaryVisual: edge.primaryVisual,
    primaryAction: user.primaryAction,
    output: user.output,
    returnPoint: user.errorReturn,
    stopCondition: user.stopCondition,
    checks
  });
}

const pFrames = expectedFrames.filter(frameId => String(scriptByFrame.get(frameId)?.canonicalState).startsWith('p'));
const outerFrames = expectedFrames.filter(frameId => ['L0','L1','L2','L3','L4'].includes(scriptByFrame.get(frameId)?.canonicalState));
const replay = scriptByFrame.get('G12_recall_transfer');
const routeChecks = {
  outerFrameCount: outerFrames.length,
  innerFrameCount: pFrames.length,
  replayFramePresent: Boolean(replay),
  innerNestedUnderL4: pFrames.every(frameId => routeById.get(scriptByFrame.get(frameId).canonicalState)?.parent === 'L4'),
  replayRequiresBothLayers: mental.mentalModelContract.replayRequiresBothLayers === true,
  noParallelHomeMenu: route.canonicality.parallelHomeMenuForbidden === true,
  oneOpenChildAtATime: route.screenContract.oneOpenChildAtATime === true,
  oneQuestionAndActionPerFrame: rows.every(row => row.checks.onePlainQuestion && row.checks.onePrimaryAction),
  everyFrameHasStopOrError: rows.every(row => row.checks.stopBoundary && row.checks.errorReturn),
  everyHandoffHasConsumer: rows.every(row => row.checks.explicitHandoff),
  everyFirstAnswerProtected: rows.every(row => row.checks.firstAnswerBeforeHelp)
};
for (const [name, passed] of Object.entries(routeChecks)) if ((typeof passed === 'boolean' && !passed) || (typeof passed === 'number' && passed === 0)) failures.push(`route:${name}`);

assert.deepEqual(failures, []);
const output = {
  id: 'FIRST_PASS_LEARNER_ARCHITECTURE_AUDIT_V1',
  status: 'paper_13_frame_nested_architecture_aligned_runtime_and_learner_trial_missing',
  purpose: '把一遍首课的顺序、父子嵌套、单问题单动作、交接、错误回退、停止边界和回放迁移逐帧对齐，防止页面只完成按钮而没有形成可迁移脑内架构。',
  sources: ['learner-goal-route-canonical.json','first-pass-mental-model-contract.json','first-pass-state-evidence-crosswalk.json','first-pass-user-facing-script-contract.json','first-pass-explanation-deck.json','first-pass-handoff-ledger.json'],
  canonicalRoute: expectedStates,
  frameCount: expectedFrames.length,
  rows,
  routeChecks,
  failures,
  currentEvidence: {
    paperAligned: true,
    runtimeObserved: false,
    learnerTrialObserved: false,
    onePassRecallVerified: false,
    oneVariableTransferVerified: false,
    NL50Evidence: false
  },
  releaseGate: {
    status: 'blocked_until_runtime_and_low_baseline_trial',
    required: ['runtime_reads_exact_next_chain','parent_frame_restores_after_child','first_answer_before_help','outer_and_inner_route_recall','nearest_layer_error_recovery','one_variable_transfer']
  }
};
fs.writeFileSync(path.join(dir, 'first-pass-learner-architecture-audit.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, frames: output.frameCount, outer: routeChecks.outerFrameCount, inner: routeChecks.innerFrameCount, failures: failures.length }));
