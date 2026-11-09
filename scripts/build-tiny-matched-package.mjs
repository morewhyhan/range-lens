import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { card, evaluate, compare } from '../src/poker.js';
import { assertLessonPackage } from '../src/lesson-package.js';
import { GTO_VIEW_LAYERS } from '../src/gto-reference.js';

const rootDir = new URL('../research/nevir-system/', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, rootDir), 'utf8'));
const hash = name => crypto.createHash('sha256').update(fs.readFileSync(new URL(name, rootDir))).digest('hex');
const metadata = read('policy-rollout-calibration-metadata.json');
const verification = read('policy-rollout-calibration-verification.json');
const nodes = new Map(metadata.calibrationNodes.map(node => [JSON.stringify(node.historyIndices), node]));
const root = nodes.get('[]');
const afterCheck = nodes.get(JSON.stringify([0]));
const afterBet = nodes.get(JSON.stringify([1]));
const afterCheckBet = nodes.get(JSON.stringify([0, 1]));
assert(root && afterCheck && afterBet && afterCheckBet);

const board = metadata.initialBoard.map(card);
const holdings = metadata.orderedHands.map(side => side.map(text => text.match(/.{2}/g).map(card)));
const weights = metadata.rootWeightHalfUnits.map(side => side.map(value => value / 2));
const startingPot = metadata.startingPotUnits;
const effectiveStack = metadata.effectiveStackUnits;
const actionIndex = (node, action) => node.actions.indexOf(action);
const policy = (node, handIndex) => {
  const count = node.actions.length;
  const length = node.strategy.length / count;
  return Object.fromEntries(node.actions.map((action, index) => [action, node.strategy[index * length + handIndex]]));
};
const compatible = (a, b) => ![...holdings[0][a], ...holdings[1][b], ...board]
  .some((cardA, index, all) => all.findIndex(cardB => cardA.id === cardB.id) !== index);
const payoff = (seat, i, j, paid, folded = null) => {
  if (folded !== null) {
    if (seat === folded) return -paid[seat];
    return startingPot + paid[folded];
  }
  const result = compare(evaluate([...board, ...holdings[0][i]]), evaluate([...board, ...holdings[1][j]]));
  const total = startingPot + paid[0] + paid[1];
  const gross = result === 0 ? total / 2 : (result > 0 ? 0 : 1) === seat ? total : 0;
  return gross - paid[seat];
};
const averageOver = (seat, fixedIndex, fn) => {
  const other = seat ^ 1;
  const candidates = holdings[other].map((_, index) => index).filter(index => compatible(seat === 0 ? fixedIndex : index, seat === 0 ? index : fixedIndex));
  const denominator = candidates.reduce((sum, index) => sum + weights[other][index], 0);
  return candidates.reduce((sum, index) => sum + weights[other][index] * fn(index), 0) / denominator;
};

function rootActionEV(handIndex, action) {
  return averageOver(0, handIndex, opponentIndex => {
    if (action === 'Bet(500)') {
      const response = policy(afterBet, opponentIndex);
      return response.Fold * payoff(0, handIndex, opponentIndex, [500, 0], 1)
        + response.Call * payoff(0, handIndex, opponentIndex, [500, 500]);
    }
    const response = policy(afterCheck, opponentIndex);
    const checked = payoff(0, handIndex, opponentIndex, [0, 0]);
    // The response after a check-bet depends on the OOP hand, so evaluate it directly.
    const oopResponse = policy(afterCheckBet, handIndex);
    const againstBet = oopResponse.Fold * payoff(0, handIndex, opponentIndex, [0, 500], 0)
      + oopResponse.Call * payoff(0, handIndex, opponentIndex, [500, 500]);
    return response.Check * checked + response['Bet(500)'] * againstBet;
  });
}

function ipAfterBetEV(handIndex, action) {
  return averageOver(1, handIndex, oopIndex => action === 'Fold'
    ? payoff(1, oopIndex, handIndex, [500, 0], 1)
    : payoff(1, oopIndex, handIndex, [500, 500]));
}

function ipAfterCheckEV(handIndex, action) {
  return averageOver(1, handIndex, oopIndex => {
    if (action === 'Check') return payoff(1, oopIndex, handIndex, [0, 0]);
    const response = policy(afterCheckBet, oopIndex);
    return response.Fold * payoff(1, oopIndex, handIndex, [0, 500], 0)
      + response.Call * payoff(1, oopIndex, handIndex, [500, 500]);
  });
}

function oopAfterCheckBetEV(handIndex, action) {
  return averageOver(0, handIndex, ipIndex => action === 'Fold'
    ? payoff(0, handIndex, ipIndex, [0, 500], 0)
    : payoff(0, handIndex, ipIndex, [500, 500]));
}

const rootEV = holdings[0].map((_, index) => Object.fromEntries(root.actions.map(action => [action, rootActionEV(index, action)])));
const afterBetEV = holdings[1].map((_, index) => ({ Fold: ipAfterBetEV(index, 'Fold'), Call: ipAfterBetEV(index, 'Call') }));
const afterCheckEV = holdings[1].map((_, index) => ({ Check: ipAfterCheckEV(index, 'Check'), 'Bet(500)': ipAfterCheckEV(index, 'Bet(500)') }));
const afterCheckBetEV = holdings[0].map((_, index) => ({ Fold: oopAfterCheckBetEV(index, 'Fold'), Call: oopAfterCheckBetEV(index, 'Call') }));

function assertBestResponse(node, values, label) {
  values.forEach((ev, index) => {
    const mix = policy(node, index);
    const best = Math.max(...Object.values(ev));
    Object.entries(mix).forEach(([action, frequency]) => {
      if (frequency > 1e-6) assert.ok(Math.abs(ev[action] - best) < 1e-4, `${label} ${index} ${action} is not a best response`);
    });
  });
}
assertBestResponse(root, rootEV, 'root');
assertBestResponse(afterBet, afterBetEV, 'after bet');
assertBestResponse(afterCheck, afterCheckEV, 'after check');
assertBestResponse(afterCheckBet, afterCheckBetEV, 'after check-bet');

const range = seat => holdings[seat].map((hole, index) => ({ hole: hole.map(c => c.id), weight: weights[seat][index] }));
const rangeAfterRootAction = action => ({
  owners: [
    holdings[0].map((hole, index) => ({ hole: hole.map(c => c.id), weight: weights[0][index] * policy(root, index)[action] })),
    range(1),
  ],
  denominator: '同一物理组合分母；动作后按逐组合策略乘到达权重',
});
const config = {
  tableSize: 2,
  activePlayers: 2,
  stackBb: effectiveStack / metadata.unitsPerBB,
  potBb: startingPot / metadata.unitsPerBB,
  board: metadata.initialBoard,
  rake: 0,
  actionTree: { flop: [], turn: [], river: ['Check', 'Bet(500)'], facingBet: ['Fold', 'Call'] },
  scope: '作者侧精确河牌校准，不是用户100BB课程配置',
};
const configFingerprint = crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex');
const outputHash = hash('storage-roundtrip-calibration.bin');
const packageId = 'gto-tiny-river-calibration-v1';
const nodeId = 'calibration-river-K7329-root';
const node = {
  nodeId,
  evidenceKind: 'matched',
  sourceRefs: [
    'research/nevir-system/policy-rollout-calibration-metadata.json',
    'research/nevir-system/policy-rollout-calibration-verification.json',
    'research/solver-probe/src/bin/policy_rollout_probe.rs',
  ],
  gtoBinding: {
    status: 'matched', claim: 'fixed_tree_exact_reference', matched: true,
    configFingerprint,
    solver: { name: 'b-inary/postflop-solver', commit: '9d1509fe5077d019825f833eed04b16d342dfda1', outputHash },
    views: GTO_VIEW_LAYERS,
    independentValidation: {
      method: 'independent exhaustive best-response inequalities plus exact terminal settlement',
      source: 'scripts/build-tiny-matched-package.mjs',
      verificationStatus: verification.status,
      allActiveStrategiesBestResponse: true,
    },
  },
  chartEvidence: { available: GTO_VIEW_LAYERS, note: '固定河牌校准树；可显示逐组合策略、动作后范围、EV和后继。' },
  successor: {
    status: 'solver_tree',
    edges: [
      { action: 'Check', nextNodeId: 'calibration-river-K7329-after-check' },
      { action: 'Bet(500)', nextNodeId: 'calibration-river-K7329-after-bet' },
    ],
  },
  policy: { actor: 'OOP', actions: root.actions, hands: holdings[0].map((hole, index) => ({ hole: hole.map(c => c.id), mix: policy(root, index), ev: rootEV[index] })) },
  rangeBefore: { owners: [range(0), range(1)], denominator: '根节点正权重物理组合' },
  rangeAfter: { byAction: Object.fromEntries(root.actions.map(action => [action, rangeAfterRootAction(action)])) },
  differences: [],
  independentChecks: {
    rootEV, afterBetEV, afterCheckEV, afterCheckBetEV,
    policyBestResponse: true,
    exactTerminalSettlement: true,
  },
};
const pkg = {
  packageId,
  version: '1.0.0',
  config: { ...config, configFingerprint },
  nodes: { [nodeId]: node },
  questions: [{
    instanceKey: `${nodeId}:oop-qq`, nodeId, evidenceKind: 'matched',
    prompt: '河牌 K♠7♥2♦3♣9♥，你拿 Q♠Q♥，在这个固定参考树中选择动作。',
    options: [{ id: 'Bet(500)', label: '下注 5 BB' }, { id: 'Check', label: '过牌' }],
    interaction: 'single', available: true,
  }],
  answerKeys: [{
    questionKey: `${nodeId}:oop-qq`, accepted: 'Bet(500)',
    sourceRefs: node.sourceRefs,
    precision: { kind: 'exact_reference_policy', expectedMix: { 'Bet(500)': 1, Check: 0 } },
    explanation: { text: '在固定两手范围、固定河牌和固定行动树下，Q♠Q♥的参考策略为100%下注5BB。' },
    nextNodeOrStop: 'calibration-river-K7329-after-bet',
  }],
};
assertLessonPackage(pkg);
fs.writeFileSync(new URL('tiny-river-matched-package-v1.json', rootDir), `${JSON.stringify(pkg, null, 2)}\n`);
console.log(JSON.stringify({ packageId, nodeId, configFingerprint, outputHash, independentBestResponseVerified: true }, null, 2));
