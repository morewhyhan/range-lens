const OBJECT = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const NON_EMPTY = value => typeof value === 'string' && value.trim().length > 0;

export const EVIDENCE_KINDS = Object.freeze([
  'fact_only', 'experiment_only', 'course_only', 'matched', 'conditional', 'closed',
]);

function requireField(errors, value, path) {
  if (!NON_EMPTY(value)) errors.push(`${path} 必须是非空字符串`);
}

function validateNode(node, nodeId, errors) {
  const path = `nodes.${nodeId}`;
  if (!OBJECT(node)) {
    errors.push(`${path} 必须是对象`);
    return;
  }
  requireField(errors, node.nodeId, `${path}.nodeId`);
  if (node.nodeId !== nodeId) errors.push(`${path}.nodeId 必须与键一致`);
  if (!EVIDENCE_KINDS.includes(node.evidenceKind)) errors.push(`${path}.evidenceKind 无效`);
  if (!Array.isArray(node.sourceRefs) || node.sourceRefs.length === 0) errors.push(`${path}.sourceRefs 不能为空`);
  if (!OBJECT(node.gtoBinding)) errors.push(`${path}.gtoBinding 必须存在`);
  if (!OBJECT(node.chartEvidence)) errors.push(`${path}.chartEvidence 必须存在`);
  if (!OBJECT(node.successor) || !NON_EMPTY(node.successor.status)) errors.push(`${path}.successor.status 必须存在`);

  if (node.evidenceKind === 'closed') {
    requireField(errors, node.closedReason, `${path}.closedReason`);
    if (node.gtoBinding?.status !== 'closed') errors.push(`${path} 关闭节点必须使用 closed GTO 状态`);
  }

  if (node.evidenceKind === 'matched') {
    const binding = node.gtoBinding;
    if (binding?.status !== 'matched') errors.push(`${path} matched 节点必须使用 matched GTO 状态`);
    if (!NON_EMPTY(binding?.configFingerprint)) errors.push(`${path}.gtoBinding.configFingerprint 缺失`);
    if (!OBJECT(binding?.solver)) errors.push(`${path}.gtoBinding.solver 缺失`);
    for (const field of ['name', 'commit', 'outputHash']) requireField(errors, binding?.solver?.[field], `${path}.gtoBinding.solver.${field}`);
    for (const view of ['policy', 'reach_before', 'reach_after', 'delta', 'successor']) {
      if (!binding?.views?.includes(view)) errors.push(`${path}.gtoBinding.views 缺少 ${view}`);
    }
    if (!OBJECT(node.policy)) errors.push(`${path}.policy 缺失`);
    if (!OBJECT(node.rangeBefore) || !OBJECT(node.rangeAfter)) errors.push(`${path} matched 节点必须同时提供 rangeBefore 和 rangeAfter`);
    if (!Array.isArray(node.differences)) errors.push(`${path}.differences 必须是数组`);
    if (!Array.isArray(node.chartEvidence?.available) || !['policy', 'reach_before', 'reach_after', 'delta', 'successor'].every(view => node.chartEvidence.available.includes(view))) {
      errors.push(`${path}.chartEvidence 必须包含完整策略图层`);
    }
  }
}

function validateQuestion(question, index, errors) {
  const path = `questions.${index}`;
  if (!OBJECT(question)) {
    errors.push(`${path} 必须是对象`);
    return;
  }
  requireField(errors, question.instanceKey, `${path}.instanceKey`);
  requireField(errors, question.nodeId, `${path}.nodeId`);
  requireField(errors, question.prompt, `${path}.prompt`);
  if (!EVIDENCE_KINDS.includes(question.evidenceKind)) errors.push(`${path}.evidenceKind 无效`);
  if (!Array.isArray(question.options) || question.options.length === 0) errors.push(`${path}.options 不能为空`);
  requireField(errors, question.interaction, `${path}.interaction`);
  if (question.available === false) requireField(errors, question.missingReason, `${path}.missingReason`);
}

function validateAnswerKey(answer, index, errors) {
  const path = `answerKeys.${index}`;
  if (!OBJECT(answer)) {
    errors.push(`${path} 必须是对象`);
    return;
  }
  requireField(errors, answer.questionKey, `${path}.questionKey`);
  if (answer.accepted === undefined) errors.push(`${path}.accepted 必须存在`);
  if (!Array.isArray(answer.sourceRefs) || answer.sourceRefs.length === 0) errors.push(`${path}.sourceRefs 不能为空`);
  if (!OBJECT(answer.precision)) errors.push(`${path}.precision 必须存在`);
  if (!OBJECT(answer.explanation)) errors.push(`${path}.explanation 必须存在`);
  requireField(errors, answer.nextNodeOrStop, `${path}.nextNodeOrStop`);
}

/**
 * Validate the smallest runtime lesson contract. It deliberately validates
 * evidence identity and release boundaries, not every solver-specific field.
 */
export function validateLessonPackage(pkg) {
  const errors = [];
  if (!OBJECT(pkg)) return { valid: false, errors: ['课包必须是对象'] };
  requireField(errors, pkg.packageId, 'packageId');
  requireField(errors, pkg.version, 'version');
  if (!OBJECT(pkg.config)) errors.push('config 必须存在');
  if (!OBJECT(pkg.nodes) || Object.keys(pkg.nodes).length === 0) errors.push('nodes 不能为空');
  else Object.entries(pkg.nodes).forEach(([nodeId, node]) => validateNode(node, nodeId, errors));
  if (!Array.isArray(pkg.questions)) errors.push('questions 必须是数组');
  else pkg.questions.forEach((question, index) => validateQuestion(question, index, errors));
  if (!Array.isArray(pkg.answerKeys)) errors.push('answerKeys 必须是数组');
  else pkg.answerKeys.forEach((answer, index) => validateAnswerKey(answer, index, errors));
  return { valid: errors.length === 0, errors };
}

export function assertLessonPackage(pkg) {
  const result = validateLessonPackage(pkg);
  if (!result.valid) throw new Error(`课包无效：${result.errors.join('；')}`);
  return pkg;
}

