import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const bridge = JSON.parse(fs.readFileSync(path.join(dir, 'unit-architecture-bridge.json'), 'utf8'));
const release = JSON.parse(fs.readFileSync(path.join(dir, 'unit-learner-release-matrix.json'), 'utf8'));
const route = JSON.parse(fs.readFileSync(path.join(dir, 'full-nested-learning-route.json'), 'utf8'));

const layerCatalog = [
  { id: 'context', label: '局面', question: '谁在行动、前面发生了什么、要多少钱？', returnStep: 'p1_context' },
  { id: 'board', label: '牌面', question: '公共牌的花色、连接和配对是什么？', returnStep: 'p2_board' },
  { id: 'hand', label: '自己的牌', question: '最佳五张和改善牌是什么？', returnStep: 'p2_board' },
  { id: 'range', label: '范围', question: '哪些组合留下、退出或只是被实体牌移除？', returnStep: 'p3_range' },
  { id: 'purpose', label: '动作目的', question: '这个动作是在取值、保护、实现权益还是拒绝权益？', returnStep: 'p4_compare' },
  { id: 'price', label: '价格', question: '这个尺寸让多少钱进入底池，所需价格是多少？', returnStep: 'p4_compare' },
  { id: 'execution', label: '执行', question: '实际投入多少，底池和后手如何变化？', returnStep: 'p5_execute' },
  { id: 'update', label: '状态更新', question: '回应或新牌只改变了哪一个字段？', returnStep: 'p6_update' },
  { id: 'successor', label: '下一步', question: '真实后继是什么，还是已经明确终止？', returnStep: 'p6_update' },
  { id: 'result', label: '结算复盘', question: '结果和当时的决策怎样分开？', returnStep: 'p7_close' }
];

const groupLayers = {
  'compare.unopened': ['purpose', 'price', 'range'],
  'compare.bet': ['range', 'price', 'purpose', 'successor'],
  'compare.raise': ['price', 'purpose', 'execution', 'successor'],
  'update.response': ['range', 'execution', 'context', 'result'],
  'update.card': ['board', 'hand', 'range', 'successor']
};
const releaseById = new Map(release.rows.map(row => [row.unitId, row]));
const routeById = new Map(route.units.map(row => [row.unitId, row]));

const rows = bridge.rows.map((row, index) => {
  const releaseRow = releaseById.get(row.unitId);
  const routeRow = routeById.get(row.unitId);
  const layers = groupLayers[row.groupId];
  if (!releaseRow || !routeRow || !layers) throw new Error(`Missing feedback source for ${row.unitId}`);
  return {
    sequence: index + 1,
    unitId: row.unitId,
    label: row.label,
    groupId: row.groupId,
    parentFrame: row.parentFrame,
    returnTo: row.returnTo,
    primaryErrorLayer: layers[0],
    allowedErrorLayers: layers,
    layerQuestions: layers.map(id => layerCatalog.find(layer => layer.id === id)),
    feedbackSequence: [
      'mark_wrong_or_unknown_without_explanation_leak',
      'name_one_error_layer_in_plain_language',
      'show_one_missing_fact_or_changed_field',
      'restore_same_parent_and_preserve_first_answer',
      'retry_one_question_before_full_explanation'
    ],
    retryPolicy: {
      sameParent: true,
      firstAnswerPreserved: true,
      dontShowNeighborUnits: true,
      dontRevealFullAnswerBeforeRetry: true,
      dontAdvanceOnUnknown: true,
      maxHelpChangePerRetry: 1
    },
    stopPolicy: {
      missingEvidenceStopsAtCurrentUnit: true,
      stopReason: releaseRow.stopReason,
      returnTo: routeRow.returnTo
    },
    currentEvidence: {
      paperFeedbackSpecified: true,
      runtimeImplemented: false,
      beginnerTrial: false
    }
  };
});

const output = {
  id: 'UNIT_ERROR_FEEDBACK_MATRIX_V1',
  status: 'paper_unit_error_feedback_compiled_not_trialed',
  purpose: '为35项规定错误层、反馈顺序、父帧回退和帮助撤除，确保低基础学习者能从错误回到可执行步骤。',
  sources: ['unit-architecture-bridge.json', 'unit-learner-release-matrix.json', 'full-nested-learning-route.json'],
  layerCatalog,
  globalRules: {
    oneErrorLayerAtATime: true,
    plainLanguageBeforeTechnicalTerm: true,
    preserveFirstAnswer: true,
    retryBeforeFullExplanation: true,
    wrongDoesNotAdvance: true,
    unknownCountsAsWrong: true,
    missingEvidenceStopsRatherThanInvents: true,
    errorFeedbackDoesNotBecomeFlatTopicMenu: true
  },
  rows,
  counts: {
    units: rows.length,
    parentRestores: rows.filter(row => row.retryPolicy.sameParent).length,
    oneLayerAtATime: rows.filter(row => row.feedbackSequence.length === 5).length,
    runtimeImplemented: 0,
    beginnerTrial: 0
  },
  currentEvidence: {
    all35RowsSpecified: rows.length === 35,
    runtimeImplemented: false,
    beginnerTrial: false,
    NL50Evidence: false
  }
};

fs.writeFileSync(path.join(dir, 'unit-error-feedback-matrix.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, counts: output.counts }));
