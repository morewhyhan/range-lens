import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GOLDEN_FRAMES,
  GOLDEN_HANDOFFS,
  GOLDEN_OUTPUT_FIELDS,
  GOLDEN_SUCCESSOR,
  GOLDEN_ROUTE,
  T01_FRAMES,
  T01_ROUTE,
  HAND_RANK_ORDER,
  answerGolden,
  advanceGoldenAfterError,
  closeGoldenChild,
  createGoldenSession,
  currentGoldenFrame,
  goldenRouteAudit,
  routeAudit,
  openGoldenChild,
  selectGoldenChild,
} from '../src/golden-path.js';

test('golden route is ordered, unique, and each frame has a valid answer', () => {
  const audit = goldenRouteAudit();
  assert.equal(audit.ok, true, JSON.stringify(audit));
  assert.deepEqual(GOLDEN_FRAMES.map(frame => frame.id), GOLDEN_ROUTE);
  assert.equal(new Set(GOLDEN_ROUTE).size, GOLDEN_ROUTE.length);
});

test('runtime route mirrors the paper golden path order', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const paper = JSON.parse(fs.readFileSync(path.join(here, '..', 'research', 'nevir-system', 'first-pass-golden-path.json'), 'utf8'));
  assert.deepEqual(GOLDEN_ROUTE, paper.route);
  assert.equal(paper.currentEvidence.runtime, false, 'paper evidence must not be edited to claim runtime before this test exists');
});

test('the teaching handoff uses the registered source successor', () => {
  assert.equal(GOLDEN_SUCCESSOR.nodeId, 'T01-前序');
  assert.equal(GOLDEN_SUCCESSOR.sourceNodeId, 'T01');
  assert.equal(GOLDEN_SUCCESSOR.status, 'teaching_route');
  assert.equal(GOLDEN_SUCCESSOR.routeId, 'line1');
  assert.equal(GOLDEN_SUCCESSOR.nextNodeId, 'T01');
});

test('correct answers advance one frame and increment only the current session', () => {
  let session = createGoldenSession();
  session = answerGolden(session, 'start');
  assert.equal(session.frameIndex, 1);
  assert.deepEqual(session.score, { right: 1, wrong: 0 });
  assert.equal(currentGoldenFrame(session).id, 'G1_context');
  assert.equal(session.answers.length, 1);
});

test('wrong and unknown answers are visible errors and do not silently advance', () => {
  const session = createGoldenSession();
  const wrong = answerGolden(session, 'nope');
  assert.equal(wrong.frameIndex, 0);
  assert.deepEqual(wrong.score, { right: 0, wrong: 1 });
  assert.equal(wrong.lastResult.correct, false);
  assert.deepEqual(answerGolden(wrong, 'start').score, wrong.score, 'a second click cannot count twice before feedback is acknowledged');
  const unknown = answerGolden(session, '__unknown__');
  assert.equal(unknown.frameIndex, 0);
  assert.equal(unknown.score.wrong, 1);
  const continued = advanceGoldenAfterError(wrong);
  assert.equal(continued.frameIndex, 1);
  assert.equal(continued.lastResult, null);
});

test('parent frame is restored after optional hand-rank child exercise', () => {
  let session = createGoldenSession();
  for (const answer of ['start', 'BTN', 'cell', 'raise', 'physical', 'BTN']) session = answerGolden(session, answer);
  assert.equal(currentGoldenFrame(session).id, 'G6_p2_hand');
  const child = openGoldenChild(session);
  assert.equal(child.child.parentFrameId, 'G6_p2_hand');
  let selected = child;
  for (const rank of HAND_RANK_ORDER.slice(0, 3)) selected = selectGoldenChild(selected, rank);
  assert.deepEqual(selected.child.selected, HAND_RANK_ORDER.slice(0, 3));
  const restored = closeGoldenChild(selected);
  assert.equal(restored.child, null);
  assert.equal(currentGoldenFrame(restored).id, 'G6_p2_hand');
});

test('all first-pass frames declare evidence identity and a source', () => {
  for (const frame of GOLDEN_FRAMES) {
    assert.ok(frame.source, `${frame.id} missing source`);
    assert.ok(['fact_only', 'course_only', 'closed'].includes(frame.evidenceKind), `${frame.id} has unknown evidence identity`);
    assert.ok(frame.options.some(option => option.id === frame.answer), `${frame.id} answer is not selectable`);
    assert.ok(GOLDEN_OUTPUT_FIELDS[frame.id]?.length, `${frame.id} has no output contract`);
  }
  assert.equal(GOLDEN_HANDOFFS.length, GOLDEN_ROUTE.length);
  assert.equal(GOLDEN_HANDOFFS.at(-1).to, 'next_session_or_stop');
});

test('the registered T01 successor has its own canonical continuation route', () => {
  const audit = routeAudit('t01');
  assert.equal(audit.ok, true, JSON.stringify(audit));
  assert.deepEqual(T01_FRAMES.map(frame => frame.id), T01_ROUTE);
  let session = createGoldenSession('t01');
  for (const answer of ['BTN', '75', 'AA', 'closed']) session = answerGolden(session, answer);
  assert.equal(session.status, 'complete');
  assert.equal(session.route, 't01');
  assert.deepEqual(session.score, { right: 4, wrong: 0 });
});

test('T01 wrong answers stop on the same frame before continuation', () => {
  const session = createGoldenSession('t01');
  const wrong = answerGolden(session, '33');
  assert.equal(wrong.frameIndex, 0);
  assert.equal(wrong.lastResult.correct, false);
  const continued = advanceGoldenAfterError(wrong);
  assert.equal(currentGoldenFrame(continued).id, 'T01_1_size');
});

