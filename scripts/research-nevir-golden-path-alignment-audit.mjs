import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const golden = read('first-pass-golden-path.json');
const stateMachine = read('first-lesson-visible-state-machine.json');
const administration = read('first-pass-full-guided-administration.json');

const expectedGoldenRoute = [
  'G0_welcome','G1_context','G2_preflop_chart','G3_preflop_action','G4_range_bridge',
  'G5_p1_context','G6_p2_hand','G7_p3_range','G8_p4_compare','G9_p5_execute',
  'G10_p6_update','G11_p7_close','G12_recall_transfer'
];
const expectedStateRoute = ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7'];
const expectedAdministrationOrder = ['OL01','OL02','OL03','OL04','OL05','C01','R01','C03','C05','C08','C10','C12'];

assert.deepEqual(golden.route, expectedGoldenRoute);
assert.deepEqual(golden.canonicalStateRoute, expectedStateRoute);
assert.deepEqual(stateMachine.route, expectedStateRoute);
assert.equal(golden.frames.length, expectedGoldenRoute.length);
assert.deepEqual(golden.frames.map(frame => frame.id), expectedGoldenRoute);
assert.equal(golden.frames.find(frame => frame.id === 'G3_preflop_action').outer, 'L3');
assert.equal(golden.frames.find(frame => frame.id === 'G4_range_bridge').outer, 'L4');
assert.equal(golden.frames.find(frame => frame.id === 'G5_p1_context').inner, 'p1_context');
for (const id of ['G5_p1_context','G6_p2_hand','G7_p3_range','G8_p4_compare','G9_p5_execute','G10_p6_update','G11_p7_close']) {
  assert.equal(golden.frames.find(frame => frame.id === id).outer, 'L4');
}
assert.equal(golden.frames.find(frame => frame.id === 'G12_recall_transfer').output, 'nestedStructureEvidence');
const requiredFrameFields = ['ask','primaryAction','output','handoff','errorReturn','stopCondition','after'];
const frameFieldAudit = golden.frames.map(frame => ({
  id: frame.id,
  missing: requiredFrameFields.filter(field => typeof frame[field] !== 'string' || frame[field].trim() === '')
}));
assert.equal(frameFieldAudit.every(frame => frame.missing.length === 0), true);
assert.equal(golden.frames.every(frame => typeof frame.stopCondition === 'string' && frame.stopCondition.length > 0), true);
assert.deepEqual(administration.canonicalOrder, expectedAdministrationOrder);
assert.deepEqual(administration.routeOrder, expectedStateRoute);

const result = {
  id: 'FIRST_PASS_GOLDEN_PATH_ALIGNMENT_AUDIT_V1',
  status: 'paper_golden_path_aligned_state_machine_not_runtime',
  purpose: '确认学习者可见黄金路径、可见状态机和完整带练顺序使用同一条外层到内层交接链；动作确认不再被范围桥接吞掉。',
  sources: ['first-pass-golden-path.json','first-lesson-visible-state-machine.json','first-pass-full-guided-administration.json'],
  canonicalGoldenRoute: expectedGoldenRoute,
  canonicalStateRoute: expectedStateRoute,
  checks: {
    goldenFrameCount: golden.frames.length,
    goldenRouteMatchesFrameIds: JSON.stringify(golden.route) === JSON.stringify(golden.frames.map(frame => frame.id)),
    stateMachineRouteMatches: JSON.stringify(stateMachine.route) === JSON.stringify(expectedStateRoute),
    explicitPreflopActionFrame: golden.frames.find(frame => frame.id === 'G3_preflop_action').outer === 'L3',
    explicitRangeBridgeFrame: golden.frames.find(frame => frame.id === 'G4_range_bridge').outer === 'L4',
    innerStartsAfterOuterL4: golden.frames.find(frame => frame.id === 'G5_p1_context').inner === 'p1_context',
    allInnerFramesRemainUnderL4: ['G5_p1_context','G6_p2_hand','G7_p3_range','G8_p4_compare','G9_p5_execute','G10_p6_update','G11_p7_close'].every(id => golden.frames.find(frame => frame.id === id).outer === 'L4'),
    administrationRouteMatches: JSON.stringify(administration.routeOrder) === JSON.stringify(expectedStateRoute),
    administrationOuterCasesBeforeInner: JSON.stringify(administration.canonicalOrder.slice(0, 5)) === JSON.stringify(expectedAdministrationOrder.slice(0, 5)),
    requiredFrameFields,
    allFrameFieldsComplete: frameFieldAudit.every(frame => frame.missing.length === 0),
    frameFieldAudit,
    everyFrameHasStopCondition: golden.frames.every(frame => typeof frame.stopCondition === 'string' && frame.stopCondition.length > 0)
  },
  currentEvidence: {
    paperAudit: true,
    runtimeImplemented: false,
    participantObserved: false,
    matchedReference: false,
    NL50Evidence: false
  }
};

fs.writeFileSync(path.join(dir, 'first-pass-golden-path-alignment-audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: result.id,
  goldenFrames: result.checks.goldenFrameCount,
  explicitPreflopActionFrame: result.checks.explicitPreflopActionFrame,
  explicitRangeBridgeFrame: result.checks.explicitRangeBridgeFrame,
  participantObserved: result.currentEvidence.participantObserved
}, null, 2));
