import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const crossAge = read('cross-age-low-baseline-acceptance.json');
const visibility = read('first-pass-visibility-contract.json');
const visual = read('first-pass-visual-structure-contract.json');
const questions = read('learner-visible-question-contract.json');
const script = read('first-pass-user-facing-script-contract.json');
const explanation = read('first-pass-explanation-deck.json');
const mental = read('first-pass-mental-model-contract.json');

const forbidden = new Set(questions.forbiddenTechnicalTerms.map(term => term.toLowerCase()));
const containsForbidden = text => [...forbidden].find(term => String(text ?? '').toLowerCase().includes(term));
const failures = [];
const frameRows = [];
const explanationByFrame = new Map(explanation.rows.map(row => [row.frameId, row]));

for (const row of script.rows) {
  const publicTexts = [row.plainQuestion, row.primaryAction, row.userInstruction?.say, row.userInstruction?.click];
  const leaked = publicTexts.map(containsForbidden).find(Boolean) ?? null;
  const exp = explanationByFrame.get(row.frameId);
  const checks = {
    plainQuestionPresent: typeof row.plainQuestion === 'string' && row.plainQuestion.length > 0,
    onePrimaryAction: typeof row.primaryAction === 'string' && row.primaryAction.length > 0,
    centralVisualPresent: typeof exp?.visualMeaning?.primaryVisual === 'string' && exp.visualMeaning.primaryVisual.length > 0,
    technicalDrawerDelayed: exp?.technicalDrawer?.visibleOnlyAfterAnswer === true,
    forbiddenTermLeak: leaked,
    firstAnswerBeforeHelp: row.observationBeforeHelp?.includes('firstAnswer') === true,
    errorReturnPresent: typeof row.errorReturn === 'string' && row.errorReturn.length > 0,
    stopBoundaryPresent: typeof row.stopCondition === 'string' && row.stopCondition.length > 0
  };
  if (checks.forbiddenTermLeak) failures.push(`${row.frameId}:forbidden:${checks.forbiddenTermLeak}`);
  for (const key of ['plainQuestionPresent','onePrimaryAction','centralVisualPresent','technicalDrawerDelayed','firstAnswerBeforeHelp','errorReturnPresent','stopBoundaryPresent']) {
    if (!checks[key]) failures.push(`${row.frameId}:${key}`);
  }
  frameRows.push({ frameId: row.frameId, canonicalState: row.canonicalState, visual: exp?.visualMeaning?.primaryVisual ?? null, checks });
}

const visibilityRows = visibility.steps.map(step => {
  const checks = {
    oneNewConcept: step.maxNewConcepts === 1,
    visualBlocksAtMostThree: step.visualBlocks.length <= 3,
    visibleLayerDefined: step.visibleNow.length > 0,
    answerThenDefined: Array.isArray(step.answerThen),
    hiddenFieldsCarried: Array.isArray(step.carriedHidden),
    childDetailsSeparate: Array.isArray(step.childDetails)
  };
  for (const [key, value] of Object.entries(checks)) if (!value) failures.push(`${step.id}:${key}`);
  return { id: step.id, maxNewConcepts: step.maxNewConcepts, visualBlocks: step.visualBlocks, checks };
});

const questionRows = questions.rows.map(row => {
  const publicText = `${row.plainQuestion} ${row.centerVisual?.questionFrame ?? ''}`;
  const leaked = containsForbidden(publicText);
  const checks = {
    onePrimaryAction: row.onePrimaryAction === true,
    unknownButton: row.unknownButton === true,
    firstAnswerBeforeHelp: row.firstAnswerBeforeHelp === true,
    technicalAliasDelayed: row.technicalAliasLocation === 'answer_explanation_or_evidence_drawer',
    noForbiddenTerm: !leaked,
    centerVisualAtMostThreeObjects: (row.centerVisual?.objects?.length ?? 99) <= 3,
    parentAndReturnDeclared: typeof row.parentFrame === 'string' && typeof row.returnTo === 'string'
  };
  if (leaked) failures.push(`${row.unitId}:forbidden:${leaked}`);
  for (const [key, value] of Object.entries(checks)) if (!value) failures.push(`${row.unitId}:${key}`);
  return { unitId: row.unitId, groupId: row.groupId, checks };
});

const globalChecks = {
  audienceFloorIncludesChildLikeLoad: crossAge.audienceFloor.targetIncludesChildLikeReadingLoad === true,
  audienceFloorIncludesOlderAdultLoad: crossAge.audienceFloor.targetIncludesOlderAdultLikeVisualAndOperationLoad === true,
  colorNotSoleCue: crossAge.fourChannels.visual.colorIsNotSoleCue === true,
  stableCoordinates: crossAge.fourChannels.visual.stableCoordinates === true,
  slowOperationNotError: crossAge.fourChannels.operation.slowOperationIsNotError === true,
  noCountdown: crossAge.fourChannels.operation.noCountdown === true,
  oneQuestionGlobal: visibility.rules.oneQuestion === true && questions.globalRules.oneQuestion === true,
  onePrimaryActionGlobal: visibility.rules.onePrimaryAction === true && questions.globalRules.onePrimaryAction === true,
  rangeVisualRegionFixed: visual.visualRegions.find(region => region.id === 'rangeDelta')?.fixed === true,
  replayRequiresBothLayers: mental.mentalModelContract.replayRequiresBothLayers === true,
  firstAnswerBeforeHelpGlobal: crossAge.onePassArchitectureEvidence.firstAnswerBeforeHelp === true
};
for (const [key, value] of Object.entries(globalChecks)) if (!value) failures.push(`global:${key}`);
assert.equal(frameRows.length, 13);
assert.equal(visibilityRows.length, 7);
assert.equal(questionRows.length, 35);
assert.deepEqual(failures, []);

const output = {
  id: 'LOW_BASELINE_VISUAL_LANGUAGE_AUDIT_V1',
  status: 'paper_low_baseline_visual_language_contract_aligned_trial_missing',
  purpose: '检查一遍路线和35项题面是否真的以低基础用户可见语言、稳定视觉和单动作负荷呈现；防止结构正确但屏幕仍然堆术语。',
  sources: ['cross-age-low-baseline-acceptance.json','first-pass-visibility-contract.json','first-pass-visual-structure-contract.json','learner-visible-question-contract.json','first-pass-user-facing-script-contract.json','first-pass-explanation-deck.json','first-pass-mental-model-contract.json'],
  counts: { firstPassFrames: frameRows.length, visibilitySteps: visibilityRows.length, unitQuestions: questionRows.length, forbiddenLeaks: 0, failures: failures.length },
  globalChecks,
  firstPass: frameRows,
  visibility: visibilityRows,
  units: questionRows,
  currentEvidence: {
    paperAligned: true,
    runtimeObserved: false,
    lowBaselineTrialObserved: false,
    routeComprehensionObserved: false,
    slowExecutionObserved: false,
    NL50Evidence: false
  },
  releaseGate: {
    passed: false,
    reason: '纸面语言、视觉和负荷检查全部通过，但没有真实低基础用户首答、提示次数、回退和迁移观察记录。'
  }
};
fs.writeFileSync(path.join(dir, 'low-baseline-visual-language-audit.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, counts: output.counts }));
