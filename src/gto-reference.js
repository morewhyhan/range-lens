const OBJECT = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export const GTO_VIEW_LAYERS = Object.freeze([
  'policy', 'reach_before', 'reach_after', 'delta', 'successor',
]);

const near = (a, b, tolerance = 1e-6) => Math.abs(a - b) <= tolerance;

function fail(message) {
  throw new Error(`参考候选无效：${message}`);
}

/**
 * Recompute the root policy aggregate from the exported per-combination
 * policy and reach weights. This is deliberately independent of the solver's
 * reported aggregate so a candidate can be rejected before it reaches a
 * learner-facing lesson package.
 */
export function verifyReferenceCandidate({ request, result, verification, views, rollouts = null }) {
  if (![request, result, verification, views].every(OBJECT)) fail('输入文件必须是对象');
  const root = result.root;
  if (!OBJECT(root)) fail('缺少根节点');
  const actions = Array.isArray(root.actions) ? root.actions : [];
  const orderedHands = Array.isArray(root.orderedHands?.[0]) ? root.orderedHands[0] : [];
  const policy = root.strategyActionMajor;
  const weights = root.compatibleMassWeights?.[0];
  if (!actions.length || !orderedHands.length) fail('根节点缺少动作或组合');
  if (!Array.isArray(policy) || policy.length !== actions.length * orderedHands.length) {
    fail('逐组合策略长度与动作／组合数量不一致');
  }
  if (!Array.isArray(weights) || weights.length !== orderedHands.length) {
    fail('逐组合到达权重长度不一致');
  }

  const actionMass = Array(actions.length).fill(0);
  let totalMass = 0;
  let minPolicySum = Infinity;
  let maxPolicySum = -Infinity;
  for (let hand = 0; hand < orderedHands.length; hand += 1) {
    let sum = 0;
    for (let action = 0; action < actions.length; action += 1) {
      const value = policy[action * orderedHands.length + hand];
      if (!Number.isFinite(value) || value < 0) fail(`策略值非法：${action}/${hand}`);
      sum += value;
      actionMass[action] += weights[hand] * value;
    }
    minPolicySum = Math.min(minPolicySum, sum);
    maxPolicySum = Math.max(maxPolicySum, sum);
    if (!Number.isFinite(weights[hand]) || weights[hand] < 0) fail(`到达权重非法：${hand}`);
    totalMass += weights[hand];
  }
  if (!near(totalMass, root.jointReachMass, 1e-3)) fail('根节点总到达质量不守恒');
  if (!near(minPolicySum, 1, 1e-5) || !near(maxPolicySum, 1, 1e-5)) {
    fail('逐组合策略没有合计为1');
  }
  const frequencies = actionMass.map(value => value / totalMass);
  const reported = verification.aggregates?.find(item => item.id === 'root')?.frequencies;
  if (!Array.isArray(reported) || reported.length !== frequencies.length) fail('缺少根节点独立复核频率');
  if (frequencies.some((value, index) => !near(value, reported[index], 1e-7))) {
    fail('根节点频率与独立复算不一致');
  }
  const fingerprints = [
    request.inputFingerprint,
    result.inputFingerprint,
    verification.inputFingerprint,
    views.inputFingerprint,
  ];
  if (!fingerprints.every(value => typeof value === 'string' && value === fingerprints[0])) {
    fail('输入指纹不一致');
  }
  const rootView = views.records?.find(record => record.id === 'root');
  if (!rootView) fail('范围视图缺少根节点');
  if (!Array.isArray(rootView.views) || rootView.views.length < 2 || rootView.views.some(view => !Array.isArray(view.support))) {
    fail('根节点缺少双方可重建的范围支持');
  }
  if ((!Array.isArray(root.currentActionEV) && !OBJECT(root.currentActionEV))
    || Object.keys(root.currentActionEV).length !== orderedHands.length * actions.length) {
    fail('根节点缺少逐组合动作EV');
  }

  const releaseBlockers = [
    result.independentValidationPassed === false ? '候选输出尚未通过完整独立策略验证' : null,
    views.viewsNotForGrading ? '范围视图明确标记为不可判分' : null,
    result.sourceCourseConfigurationRecovered === false ? '没有恢复用户课程的完整求解配置' : null,
    result.NL50Reference === false ? '不是NL50目标参考' : null,
  ].filter(Boolean);

  const rolloutEvidence = OBJECT(rollouts) ? {
    status: rollouts.status,
    samples: rollouts.samples,
    independentActionLedgerChecks: rollouts.independentActionLedgerChecks,
    intervalsAllContainEngineValue: Array.isArray(rollouts.records)
      && rollouts.records.every(record => record.intervalContainsEngineValue === true),
    independentBestResponseVerified: rollouts.independentBestResponseVerified === true,
    solverTargetCertified: rollouts.solverTargetCertified === true,
  } : null;

  return {
    status: releaseBlockers.length ? 'reference_candidate_not_releasable' : 'matched_reference_ready_for_import',
    inputFingerprint: fingerprints[0],
    engineRevision: request.engineRevision,
    root: {
      board: request.context?.flop ?? [],
      actions,
      actor: root.actor,
      combinations: orderedHands.length,
      totalMass,
      policySumRange: [minPolicySum, maxPolicySum],
      frequencies,
      reportedFrequencies: reported,
      actionEVEntries: Object.keys(root.currentActionEV).length,
      rangeSupportEntries: rootView.views.map(view => view.support.length),
    },
    verification: {
      physicalReachWeightsChecked: verification.physicalReachWeightsChecked,
      selectedDecisionRows: verification.supportedDecisionRows,
      terminalHandEVChecks: verification.independentTerminalHandEVChecks,
      rootReloadExactlyPreserved: verification.rootAndAfterCheckReloadExactlyPreserved,
    },
    releaseBlockers,
    viewLayers: GTO_VIEW_LAYERS,
    rolloutEvidence,
  };
}

/**
 * Keep a non-releasable candidate outside LessonPackage. A caller must pass
 * the verification result above; this function prevents accidental promotion
 * of an unverified export into a learner-facing matched node.
 */
export function assertReferenceCandidateNotLearnerReady(summary) {
  if (!OBJECT(summary) || summary.status !== 'reference_candidate_not_releasable') {
    throw new Error('只有明确不可发布的候选才能保留在作者侧；不得绕过GTO发布门槛');
  }
  return summary;
}
