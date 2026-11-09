import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { charts, bbMap, bbSituations, edgeInfo } from '../src/preflop.js';
import { HAND_NAMES, card, draws, evaluate, compare, potOdds } from '../src/poker.js';
import { DEFAULTS, MODULES, generateQuestion, strategyQuestion } from '../src/questions.js';
import { allRules, activeRules } from '../src/rules.js';
import { POSTFLOP_COVERAGE, POSTFLOP_REGISTRY, assertPostflopRegistry } from '../src/postflop-registry.js';
import { scopeKey, incrementScore } from '../src/session.js';
import { makeRiverModel, riverEV, updateRange } from '../src/learning.js';

const cs = text => text.split(' ').map(card);

test('source-backed preflop and reading prerequisites are complete and bounded', () => {
  assert.equal(charts.length, 15);
  assert.equal(charts.reduce((n, chart) => n + Object.keys(chart.hands).length, 0), 2535);
  assert.equal(bbSituations.length, 20);
  assert.deepEqual(bbMap.UTG, { 2: '普通宽', 2.25: '普通中', 2.5: '普通紧', 3: '普通紧' });
  assert.deepEqual(bbMap.SB, { 2: '小盲宽', 2.5: '小盲中', 3: '小盲紧', 3.5: '小盲紧' });

  const ranking = generateQuestion({ ...DEFAULTS, module: 'ranking', orderDirection: 'ascending' });
  assert.deepEqual(ranking.order, HAND_NAMES);
  assert.equal(ranking.options.length, 9);
  assert.equal(draws(cs('Jc 9h'), cs('Ts 8h 2d')).straightOuts.length, 8);
  assert.equal(evaluate(cs('As 2h 3d 4c 5s Kh Qd')).name, '顺子');
  assert.equal(compare(evaluate(cs('As Ah Ks Kd Qs 2h 3d')), evaluate(cs('As Ah Ks Kd Qs 2c 3c'))), 0);
});

test('formula, grading and session modules agree on their contracts', () => {
  assert.equal(potOdds(150, 50), .25);
  const model = makeRiverModel({ profile: 'sticky', pot: 10, bets: { small: 3, large: 8 } });
  assert.equal(Number(riverEV(model, 'check').value.toFixed(8)), 8);
  assert.equal(Number(riverEV(model, 'small').value.toFixed(8)), 9);
  assert.ok(updateRange(model.groups.map(g => ({ ...g, responses: { call: 1, raise: 0 } })), 'call').every(g => g.posterior >= 0));

  const a = scopeKey({ ...DEFAULTS, module: 'flop', unit: 'I01', task: 'action' });
  const b = scopeKey({ ...DEFAULTS, module: 'flop', unit: 'I02', task: 'action' });
  assert.notEqual(a, b);
  const scores = incrementScore(incrementScore({}, a, true), a, false);
  assert.deepEqual(scores[a], { right: 1, wrong: 1 });
  assert.doesNotMatch(fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8'), /localStorage|sessionStorage|indexedDB|fetch\(/);
});

test('all source postflop situations have an explicit answer and successor boundary', () => {
  assert.deepEqual(assertPostflopRegistry(), POSTFLOP_COVERAGE);
  assert.equal(POSTFLOP_REGISTRY.length, allRules.length);
  assert.equal(activeRules.length, POSTFLOP_COVERAGE.available);
  assert.equal(POSTFLOP_COVERAGE.course, 41);
  assert.equal(POSTFLOP_COVERAGE.conditional, 12);
  assert.deepEqual(POSTFLOP_COVERAGE.closedIds, ['O01', 'O02', 'S06', 'P01', 'P07']);
  for (const node of POSTFLOP_REGISTRY) {
    assert.ok(node.source);
    assert.ok(node.range.operation.includes('w_after'));
    assert.ok(node.successor.status);
    assert.ok(node.gto && node.gto.status && node.gto.claim);
    assert.notEqual(node.gto.status, 'matched');
    if (node.available) assert.ok(node.tasks.length);
    else assert.equal(node.authority, 'closed');
  }
  for (const rule of activeRules) {
    const q = strategyQuestion({ ...DEFAULTS, module: rule.street, task: 'all' }, Math.random, rule);
    assert.equal(q.ruleId, rule.id);
    assert.ok(q.source && q.explanation && q.options.some(o => o.id === q.correct));
  }
});

test('the full trainer module surface has a generator or an explicit route', () => {
  for (const module of MODULES) {
    if (module.id === 'sequence') continue;
    const q = generateQuestion({ ...DEFAULTS, module: module.id });
    assert.ok(q && q.title && q.options?.length, module.id);
  }
  for (const chart of charts) {
    const first = Object.keys(chart.hands)[0];
    assert.ok(edgeInfo(chart, first));
  }
});

