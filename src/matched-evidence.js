import { card } from './poker.js';
import { assertLessonPackage } from './lesson-package.js';

const OBJECT = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export const MATCHED_LAYERS = Object.freeze([
  ['policy', '策略'],
  ['reach_before', '动作前范围'],
  ['reach_after', '动作后范围'],
  ['delta', '具体组合'],
  ['successor', '后继'],
]);

export function matchedActionLabel(action) {
  if (action === 'Check') return '过牌';
  const bet = /^Bet\((\d+)\)$/.exec(action);
  return bet ? `下注 ${Number(bet[1]) / 100} BB` : action;
}

function holeKey(hole = []) {
  return hole.map(cardItem => typeof cardItem === 'string' ? cardItem : cardItem.id).join(',');
}

function toCards(hole = []) {
  return hole.map(cardItem => card(typeof cardItem === 'string' ? cardItem : cardItem.id));
}

function requireMatchedNode(pkg, nodeId) {
  if (!OBJECT(pkg) || !OBJECT(pkg.nodes)) throw new Error('匹配课包缺少 nodes');
  assertLessonPackage(pkg);
  const node = pkg.nodes[nodeId];
  if (!OBJECT(node)) throw new Error(`找不到匹配节点：${nodeId}`);
  if (node.evidenceKind !== 'matched' || node.gtoBinding?.status !== 'matched') {
    throw new Error(`节点 ${nodeId} 不是 matched 证据，不能进入GTO图表`);
  }
  if (!MATCHED_LAYERS.every(([id]) => node.chartEvidence?.available?.includes(id))) {
    throw new Error(`节点 ${nodeId} 的五层图表证据不完整`);
  }
  return node;
}

function weightFor(range, ownerIndex, hole) {
  const owner = range?.owners?.[ownerIndex] || [];
  return owner.find(entry => holeKey(entry.hole) === holeKey(hole))?.weight ?? 0;
}

function pct(value) {
  return Math.round(value * 1000) / 10;
}

/**
 * Convert one validated matched LessonPackage node into the smallest view
 * model the UI needs. It does not infer missing strategy data.
 */
export function createMatchedEvidenceView(pkg, nodeId, selectedAction = null) {
  const node = requireMatchedNode(pkg, nodeId);
  const policy = node.policy;
  const actions = Array.isArray(policy.actions) ? policy.actions : [];
  if (!actions.length || !Array.isArray(policy.hands)) throw new Error('匹配节点缺少逐组合策略');
  const action = selectedAction && actions.includes(selectedAction) ? selectedAction : actions[0];
  const rows = policy.hands.map((hand, index) => {
    const weight = weightFor(node.rangeBefore, 0, hand.hole);
    const mix = Object.fromEntries(actions.map(id => [id, Number(hand.mix?.[id] ?? 0)]));
    const ev = Object.fromEntries(actions.map(id => [id, Number(hand.ev?.[id] ?? 0)]));
    return { id: holeKey(hand.hole), hole: hand.hole, cards: toCards(hand.hole), weight, mix, ev };
  });
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
  const actionStats = actions.map(id => {
    const mass = rows.reduce((sum, row) => sum + row.weight * row.mix[id], 0);
    const evMass = rows.reduce((sum, row) => sum + row.weight * row.mix[id] * row.ev[id], 0);
    return {
      id,
      label: matchedActionLabel(id),
      mass,
      frequency: totalWeight ? mass / totalWeight : 0,
      frequencyLabel: `${pct(totalWeight ? mass / totalWeight : 0)}%`,
      weightedEV: mass ? evMass / mass : 0,
    };
  });
  const after = node.rangeAfter?.byAction?.[action]?.owners || [];
  const before = node.rangeBefore?.owners || [];
  const successor = node.successor?.edges || [];
  return {
    packageId: pkg.packageId,
    packageVersion: pkg.version,
    scope: pkg.config?.scope || '匹配节点',
    config: {
      boardCards: (pkg.config?.board || []).map(id => card(id)),
      tableSize: pkg.config?.tableSize,
      activePlayers: pkg.config?.activePlayers,
      stackBb: pkg.config?.stackBb,
      potBb: pkg.config?.potBb,
      configFingerprint: pkg.config?.configFingerprint || node.gtoBinding.configFingerprint,
    },
    nodeId,
    actor: policy.actor,
    actions: actionStats,
    selectedAction: action,
    selectedActionLabel: matchedActionLabel(action),
    policyRows: rows,
    rangeBefore: before.map((entries, owner) => ({
      owner,
      entries: entries.map(entry => ({ ...entry, cards: toCards(entry.hole) })),
    })),
    rangeAfter: after.map((entries, owner) => ({
      owner,
      entries: entries.map(entry => ({ ...entry, cards: toCards(entry.hole) })),
    })),
    differences: node.differences || [],
    successor: successor.map(edge => ({ ...edge, label: matchedActionLabel(edge.action) })),
    solver: node.gtoBinding.solver,
    independentValidation: node.gtoBinding.independentValidation,
    layers: MATCHED_LAYERS.map(([id, label]) => ({
      id,
      label,
      available: node.chartEvidence?.available?.includes(id) === true,
    })),
  };
}

export function formatMatchedNumber(value) {
  if (!Number.isFinite(value)) return '—';
  return Math.round(value * 100) / 100;
}
