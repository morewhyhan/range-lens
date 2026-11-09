import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const dir = path.join(root, 'research', 'nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const queue = read('session-question-queue-contract.json');
const architecture = read('nested-release-architecture-contract.json');
const handoff = read('first-pass-handoff-ledger.json');
const crossAge = read('cross-age-low-baseline-acceptance.json');

assert.equal(queue.id, 'SESSION_QUESTION_QUEUE_CONTRACT_V1');
assert.deepEqual(queue.stages, ['first_pass', 'map', 'guided', 'independent', 'adjacent', 'delayed', 'continuous']);
assert.equal(architecture.firstPassRepresentativeUnits.length, 5);
assert.equal(handoff.rows.length, 13);
assert.equal(crossAge.passRules.firstAnswerBeforeHelp, true);

const stages = [
  {
    id: 'S0_first_pass',
    schedulerStage: 'first_pass',
    userSees: '一条从桌面到收口的完整路线；每一步只问一个问题，五个代表单元只作为路线上的短子题。',
    userDoes: ['跟着当前父帧回答白话问题', '完成唯一主要动作', '看见交给下一步的卡片'],
    produces: ['routeCompleted', 'firstAnswerRecorded', 'handoffCards'],
    addedLoad: '只认识顺序和交接，不要求独立记住35项。',
    exitGate: ['firstPassRouteComplete', 'firstAnswerRecorded'],
    onFailure: '留在当前父帧，修正当前交接；不回首页，不打开专题菜单。',
    childAccess: 'onlyFirstPassRepresentatives',
    helpPolicy: '先答后提示；提示只指向当前视觉或问题，不直接说答案。'
  },
  {
    id: 'S1_map',
    schedulerStage: 'map',
    userSees: '不再显示步骤标题，只保留路线标记、当前父帧和返回点。',
    userDoes: ['说出外层L0—L4', '说出翻后p1—p7', '在三个陌生父帧中指出当前层和下一层'],
    produces: ['outerInnerRecall', 'parentFrameIdentified', 'plainQuestionRepeated'],
    addedLoad: '从跟随路线变成取回路线；不新增策略知识。',
    exitGate: ['parentFrameIdentified', 'plainQuestionRepeated'],
    onFailure: '回到对应父帧的路线卡，只补定位，不提前进入单元练习。',
    childAccess: 'noNewChild',
    helpPolicy: '只显示当前层和相邻方向；不能高亮答案。'
  },
  {
    id: 'S2_guided',
    schedulerStage: 'guided',
    userSees: '当前父帧中的一个单元；先看基准卡，再看同一父帧里的单变量对照。',
    userDoes: ['回答基准卡', '指出唯一变化字段', '关闭子题并找回父帧'],
    produces: ['requiredOutputComplete', 'sameParentRestore', 'baseContrastLink'],
    addedLoad: '在同一父帧内增加一个原理关系，不改变主线。',
    exitGate: ['firstAnswerSaved', 'requiredOutputComplete', 'sameParentRestore'],
    onFailure: '只重做当前单元的基准或对照卡；父帧快照保持不变。',
    childAccess: 'oneUnitAtATime',
    helpPolicy: '按观察事实→指出变化→复述交接的顺序逐级提示。'
  },
  {
    id: 'S3_independent',
    schedulerStage: 'independent',
    userSees: '同一父帧的陌生基准题，隐藏原理标题和教师示范。',
    userDoes: ['先独立回答', '完成事实/范围/动作或停止输出', '确认错误回退层'],
    produces: ['independentFirstAnswer', 'errorLayerNamed', 'retryComplete'],
    addedLoad: '减少引导，让用户沿同一七步程序自己找到答案。',
    exitGate: ['answerBeforeHelp', 'errorLayerNamed', 'retryComplete'],
    onFailure: '回到最近缺失层，不因最后按钮正确而跳过缺失的交接。',
    childAccess: 'sameParentOnly',
    helpPolicy: '允许重问、指向可见事实和路线标记；引导答案不计独立通过。'
  },
  {
    id: 'S4_adjacent',
    schedulerStage: 'adjacent',
    userSees: '同一父帧、同一资料身份，只改变一个相邻条件。',
    userDoes: ['先指出改变字段', '指出受影响层', '用同一交接格式重新作答'],
    produces: ['exactlyOneChangedField', 'affectedLayerNamed', 'sameParentRetry'],
    addedLoad: '开始把原理从一个案例搬到相邻案例。',
    exitGate: ['exactlyOneChangedField', 'affectedLayerNamed', 'sameParentRetry'],
    onFailure: '回到同一父帧并显示保持字段；不同时改变位置、牌面、价格和历史。',
    childAccess: 'oneVariableOnly',
    helpPolicy: '先让用户指出变化，之后才显示差分图；不先给策略按钮。'
  },
  {
    id: 'S5_delayed',
    schedulerStage: 'delayed',
    userSees: '在插入其他同父题后，原父帧的回忆入口和一张未见对照题。',
    userDoes: ['找回原父帧', '说出范围或停止边界', '完成单变量迁移'],
    produces: ['orderRecalled', 'returnPointRecalled', 'rangeOrStopRecalled'],
    addedLoad: '加入间隔和回忆，检验是否依赖刚看过的标题。',
    exitGate: ['orderRecalled', 'returnPointRecalled', 'rangeOrStopRecalled'],
    onFailure: '退回该父帧的结构回放，不增加题量来掩盖回忆缺口。',
    childAccess: 'sameParentOrDeclaredTransfer',
    helpPolicy: '只给路线与字段提示；解析后重答不算首次迁移。'
  },
  {
    id: 'S6_continuous',
    schedulerStage: 'continuous',
    userSees: '同一手牌的翻牌→转牌→河牌连续后继；范围、账本、行动权和下一节点始终可追溯。',
    userDoes: ['完成每街的定位、事实、范围、比较、执行和更新', '确认真实后继或停止', '把结算与当时决策分开'],
    produces: ['ledgerContinuity', 'rangeSnapshotContinuity', 'successorOrStop', 'resultSeparatedFromDecision'],
    addedLoad: '增加时间连续性；不新增未声明的行动树。',
    exitGate: ['ledgerContinuity', 'rangeSnapshotContinuity', 'successorOrStop', 'resultSeparatedFromDecision'],
    onFailure: '回到发生断裂的街次父帧；缺少真实后继就停在停止卡。',
    childAccess: 'realSuccessorOnly',
    helpPolicy: '允许查看当前街的事实和账本，但不把未来结果倒灌成当时答案。'
  },
  {
    id: 'S7_release_review',
    schedulerStage: 'complete',
    userSees: '冻结配置下的未曝光题包和独立复核记录；不显示训练题答案或原理标题。',
    userDoes: ['先完成未曝光题', '记录帮助、未知和停止', '接受独立重建与差异审查'],
    produces: ['heldoutExecution', 'independentReview', 'targetAuditRecord'],
    addedLoad: '从课程内练习进入目标级证据审计。',
    exitGate: ['heldoutPackage', 'independentReview', 'targetConfigFrozen', 'realDecisionAudit'],
    onFailure: '保持目标级未发布，回到缺证据的上一阶段；不能用总分或短期输赢替代。',
    childAccess: 'noTrainingCaseReuse',
    helpPolicy: '未曝光评分时不提供解析；解析只能在独立记录冻结后打开。'
  }
];

assert.equal(stages.length, 8);
assert.deepEqual(stages.slice(0, 7).map(stage => stage.schedulerStage), queue.stages);
for (const stage of stages) {
  assert.ok(stage.id && stage.schedulerStage);
  assert.ok(stage.userSees && stage.userDoes.length > 0);
  assert.ok(stage.produces.length > 0 && stage.exitGate.length > 0);
  assert.ok(stage.onFailure && stage.helpPolicy);
}

const contract = {
  id: 'LEARNER_SESSION_PROGRESSION_CONTRACT_V1',
  status: 'paper_user_session_progression_closed_runtime_and_trial_missing',
  purpose: '把后台题队列阶段翻译成用户实际体验：每次只增加一种负荷，始终沿同一父子主线，失败回到最近缺失层。',
  sources: [
    'session-question-queue-contract.json',
    'nested-release-architecture-contract.json',
    'first-pass-handoff-ledger.json',
    'cross-age-low-baseline-acceptance.json'
  ],
  canonicalUserRoute: handoff.route,
  firstPassRepresentativeUnits: architecture.firstPassRepresentativeUnits,
  stageOrder: stages.map(stage => stage.id),
  stages,
  sessionRules: {
    noFlatHomeMenu: true,
    oneCurrentParentFrame: true,
    onePrimaryQuestion: true,
    onePrimaryAction: true,
    firstAnswerBeforeHelp: true,
    sameParentAfterError: true,
    oneNewLoadPerStage: true,
    unknownStopsExactGrade: true,
    resultNeverRewritesDecision: true,
    targetClaimRequiresIndependentEvidence: true
  },
  evidenceRecord: {
    requiredFields: ['sessionId', 'stageId', 'caseId', 'firstAnswer', 'helpLevel', 'errorLayer', 'parentRestore', 'handoff', 'exitGate', 'releaseStatus'],
    independentFields: ['firstAnswer', 'currentLayer', 'primaryOutput', 'errorLayer', 'changedField', 'successorOrStop'],
    assistedFields: ['answerAfterPrompt', 'answerAfterVisual', 'answerAfterExplanation'],
    neverMergeIndependentAndAssisted: true,
    speedIsDescriptiveOnly: true
  },
  currentEvidence: {
    paperContract: true,
    runtimeScheduler: false,
    runtimeParentRestore: false,
    lowBaselineTrial: false,
    heldoutTrial: false,
    targetAudit: false,
    NL50Evidence: false
  },
  guards: {
    paperStagePlanIsNotRuntime: true,
    firstPassIsNotMastery: true,
    continuousRouteIsNotNL50: true,
    noAggregateScorePromotion: true,
    noTrainingCaseReuseInHoldout: true
  }
};

fs.writeFileSync(path.join(dir, 'learner-session-progression-contract.json'), JSON.stringify(contract, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: contract.id,
  stages: contract.stages.length,
  firstPassRepresentatives: contract.firstPassRepresentativeUnits.length,
  oneNewLoadPerStage: contract.sessionRules.oneNewLoadPerStage,
  runtimeScheduler: contract.currentEvidence.runtimeScheduler
}));
