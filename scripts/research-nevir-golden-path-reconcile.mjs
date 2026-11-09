import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const file = path.join(dir, 'first-pass-golden-path.json');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const golden = JSON.parse(fs.readFileSync(file, 'utf8'));
const stateMachine = read('first-lesson-visible-state-machine.json');

const canonicalStateRoute = ['L0', 'L1', 'L2', 'L3', 'L4', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
const oldRoute = ['G0_welcome', 'G1_context', 'G2_preflop_chart', 'G3_range_bridge', 'G4_p1_context', 'G5_p2_hand', 'G6_p3_range', 'G7_p4_compare', 'G8_p5_execute', 'G9_p6_update', 'G10_p7_close', 'G11_recall_transfer'];
const newRoute = ['G0_welcome', 'G1_context', 'G2_preflop_chart', 'G3_preflop_action', 'G4_range_bridge', 'G5_p1_context', 'G6_p2_hand', 'G7_p3_range', 'G8_p4_compare', 'G9_p5_execute', 'G10_p6_update', 'G11_p7_close', 'G12_recall_transfer'];

if (JSON.stringify(golden.route) === JSON.stringify(oldRoute)) {
  const old = Object.fromEntries(golden.frames.map(frame => [frame.id, frame]));
  const rename = (sourceId, id, overrides = {}) => ({ ...old[sourceId], id, ...overrides });
  const frames = [
    rename('G0_welcome', 'G0_welcome', { handoff: 'tableFrame→G1_context' }),
    rename('G1_context', 'G1_context', { handoff: 'contextFrame→G2_preflop_chart' }),
    rename('G2_preflop_chart', 'G2_preflop_chart', {
      ask: '我的牌在这张图的哪一格？先只找到坐标。',
      primaryAction: '点击固定坐标格',
      output: 'preflopCell',
      handoff: 'preflopCell→G3_preflop_action',
      after: '先只显示图表名称、范围归属和坐标，不在这一屏解释翻后。'
    }),
    {
      id: 'G3_preflop_action',
      outer: 'L3',
      inner: null,
      see: ['selected_grid_cell', 'action_legend', 'action_weight'],
      ask: '这个格子代表什么翻前课程动作？权重是多少？',
      primaryAction: '确认格子动作和权重',
      output: 'preflopAction',
      handoff: 'preflopAction→G4_range_bridge',
      errorReturn: 'G3_preflop_action',
      after: '只确认动作身份和权重，不把它解释成翻后下注策略。'
    },
    rename('G3_range_bridge', 'G4_range_bridge', {
      outer: 'L4',
      handoff: 'startingRangeFrame→G5_p1_context',
      errorReturn: 'G4_range_bridge'
    }),
    rename('G4_p1_context', 'G5_p1_context', {
      outer: 'L4',
      handoff: 'contextCard→G6_p2_hand',
      errorReturn: 'G5_p1_context'
    }),
    rename('G5_p2_hand', 'G6_p2_hand', {
      outer: 'L4',
      handoff: 'handCard→G7_p3_range',
      errorReturn: 'G6_p2_hand',
      childReturn: 'G6_p2_hand'
    }),
    rename('G6_p3_range', 'G7_p3_range', {
      outer: 'L4',
      handoff: 'rangeDeltaCard→G8_p4_compare',
      errorReturn: 'G7_p3_range'
    }),
    rename('G7_p4_compare', 'G8_p4_compare', {
      outer: 'L4',
      handoff: 'choiceCard→G9_p5_execute',
      errorReturn: 'G8_p4_compare'
    }),
    rename('G8_p5_execute', 'G9_p5_execute', {
      outer: 'L4',
      handoff: 'ledgerCard→G10_p6_update',
      errorReturn: 'G9_p5_execute'
    }),
    rename('G9_p6_update', 'G10_p6_update', {
      outer: 'L4',
      handoff: 'changeCard→G11_p7_close',
      errorReturn: 'G10_p6_update'
    }),
    rename('G10_p7_close', 'G11_p7_close', {
      outer: 'L4',
      handoff: 'reviewCard→G12_recall_transfer',
      errorReturn: '最近缺失层'
    }),
    rename('G11_recall_transfer', 'G12_recall_transfer', {
      outer: null,
      handoff: 'nestedStructureEvidence→next_session_or_stop'
    })
  ];
  const next = {
    ...golden,
    purpose: '把首课L0-L4外层定位、p1-p7翻后内层和一次结构回放压成一条低基础用户可跟随、可复述、可原位返回的黄金路径。',
    scope: 'first_lesson_visible_state_machine',
    route: newRoute,
    canonicalStateRoute,
    recallFrame: 'G12_recall_transfer',
    frames,
    firstPassChecks: ['outer_route_recall_5_states', 'inner_route_recall_7_steps_6_edges', 'parent_child_relation_recall', 'three_unseen_layer_locations', 'two_error_recoveries', 'one_variable_transfer']
  };
  fs.writeFileSync(file, JSON.stringify(next, null, 2));
}

const current = JSON.parse(fs.readFileSync(file, 'utf8'));
assert.deepEqual(current.route, newRoute);
assert.deepEqual(current.canonicalStateRoute, canonicalStateRoute);
assert.equal(current.frames.length, 13);
assert.deepEqual(current.frames.map(frame => frame.id), newRoute);
assert.equal(current.frames.find(frame => frame.id === 'G3_preflop_action').outer, 'L3');
assert.equal(current.frames.find(frame => frame.id === 'G4_range_bridge').outer, 'L4');
assert.equal(current.frames.find(frame => frame.id === 'G5_p1_context').inner, 'p1_context');
assert.equal(current.frames.find(frame => frame.id === 'G6_p2_hand').childExercise, 'hand-rank-ladder-exercise.json');
assert.equal(current.frames.find(frame => frame.id === 'G12_recall_transfer').output, 'nestedStructureEvidence');
assert.equal(stateMachine.route.join(','), canonicalStateRoute.join(','));
console.log(JSON.stringify({
  ok: true,
  id: 'FIRST_PASS_GOLDEN_PATH_RECONCILIATION_V1',
  routeFrames: current.frames.length,
  canonicalStateRoute: current.canonicalStateRoute,
  preflopActionFrame: 'G3_preflop_action',
  rangeBridgeFrame: 'G4_range_bridge',
  participantObserved: current.currentEvidence.lowBaselineTrial
}, null, 2));
