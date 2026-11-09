import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const aliasBridge = read('release-stage-alias-bridge.json');
const visibleMachine = read('first-lesson-visible-state-machine.json');
const unified = read('unified-learner-evidence-release-gates.json');
const scriptContract = read('first-pass-user-facing-script-contract.json');

const route = ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7'];
const userStages = aliasBridge.canonicalUserStages.map(x => x.id);
const stateFields = [
  'userStage',
  'routeStateId',
  'parentFrameStack',
  'childFrame',
  'unitReleaseStage',
  'helpLevel',
  'caseIdentity',
  'firstAnswer',
  'requiredOutput',
  'errorLayer',
  'returnTo',
  'handoffPayload',
  'successorOrStop',
  'releaseDecision'
];

const transitions = [
  {from:'U0_guided_route', to:'U1_structure_recall', gate:'V1_guided_first_pass', requires:['allCanonicalStatesVisited','handoffObserved','stopBoundaryVisible']},
  {from:'U1_structure_recall', to:'U2_same_parent_practice', gate:'V2_hidden_structure_recall', requires:['routeRecall','layerLocation','parentRestore','errorReturn']},
  {from:'U2_same_parent_practice', to:'U3_slow_single_step', gate:'unit.guided_to_independent', requires:['firstAnswerBeforeHelp','requiredOutputComplete','errorLayerClassified']},
  {from:'U3_slow_single_step', to:'U4_adjacent_transfer', gate:'V4_unseen_slow_single_step', requires:['matchedOrDeclaredPolicy','amountChecked','rangeAfterOrStop','legalSuccessorOrStop']},
  {from:'U4_adjacent_transfer', to:'U5_delayed_recall', gate:'V3_single_variable_transfer', requires:['exactlyOneChangedField','affectedLayer','preservedFields','firstAnswerBeforeHelp']},
  {from:'U5_delayed_recall', to:'U6_continuous_three_street', gate:'unit.delayed_to_continuous', requires:['orderRecalled','returnPointRecalled','rangeOrStopRecalled']},
  {from:'U6_continuous_three_street', to:'U7_target_review', gate:'V5_continuous_three_street', requires:['successorOrStopEveryNode','rangeConservation','ledgerConservation','actionRightContinuity']},
  {from:'U7_target_review', to:null, gate:'V6_target_external_review', requires:['frozenTargetConfig','heldoutDecisions','independentReview','realDecisionAudit','externalBenchmark']}
];

assert.deepEqual(visibleMachine.route, route);
assert.deepEqual(scriptContract.canonicalRoute, route);
assert.deepEqual(userStages, ['U0_guided_route','U1_structure_recall','U2_same_parent_practice','U3_slow_single_step','U4_adjacent_transfer','U5_delayed_recall','U6_continuous_three_street','U7_target_review']);
assert.equal(unified.gates.length, 7);
assert.equal(transitions.length, 8);
assert.equal(transitions.filter(x => x.to !== null).length, 7);
assert.equal(transitions.every(x => x.from && x.gate && x.requires.length > 0), true);

const contract = {
  id: 'USER_STAGE_RUNTIME_ADOPTION_CONTRACT_V1',
  status: 'paper_user_stage_runtime_contract_written_not_implemented',
  purpose: '规定运行时只采用U0—U7作为用户进阶字段，并把canonical路线、父帧、单元释放、帮助和证据卡接到同一个会话状态；不把作者别名做成页面菜单。',
  sources: [
    'release-stage-alias-bridge.json',
    'first-lesson-visible-state-machine.json',
    'first-pass-user-facing-script-contract.json',
    'unified-learner-evidence-release-gates.json'
  ],
  canonicalUserStages: userStages,
  canonicalRoute: route,
  sessionStateFields: stateFields,
  transitions,
  visibleRules: {
    showPlainStageNameOnly: true,
    showOneRouteStateAtATime: true,
    showOnePrimaryQuestion: true,
    showOnePrimaryAction: true,
    authorAliasesHidden: true,
    requiredInputsAreNeverHidden: true,
    childCloseRestoresParentSnapshot: true,
    missingEvidenceStopsCurrentParent: true
  },
  transitionRules: {
    nextStateComesFromCanonicalRoute: true,
    userStageCannotAdvanceFromTotalScore: true,
    userStageCannotAdvanceFromSpeed: true,
    failedTransitionStaysOrReturnsToSameParent: true,
    unitReleaseDoesNotCreateHomeRoute: true,
    unknownIsRecordedAsErrorNotSkipped: true,
    sessionOnlyNoDatabase: true
  },
  forbiddenRuntimeShortcuts: [
    'flatModulesMenuAsPrimaryRoute',
    'numericAliasAsVisibleStage',
    'scoreBasedStageJump',
    'speedBasedStageJump',
    'randomNextState',
    'defaultActionWhenEvidenceMissing',
    'childCloseToHomeInsteadOfParent',
    'persistLearnerStageAfterSession'
  ],
  currentEvidence: {
    paperContract: true,
    runtimeReadsUserStage: false,
    runtimeParentRestore: false,
    runtimeStageTransitions: false,
    learnerTrial: false,
    targetEvidence: false
  },
  guards: {
    contractDoesNotEqualRuntime: true,
    runtimeRouteDoesNotEqualLearnerMastery: true,
    continuousDoesNotEqualNL50: true
  }
};

fs.writeFileSync(path.join(dir, 'user-stage-runtime-adoption-contract.json'), JSON.stringify(contract, null, 2) + '\n');

const transitionRows = transitions.map(x => `| ${x.from} | ${x.to ?? '终点/停止'} | ${x.gate} | ${x.requires.join('、')} |`).join('\n');
const stateFieldText = stateFields.join('、');
const md = `# 219｜U0—U7用户进阶运行时采用合同\n\n\`\`\`json\n{\n  "parentDocument": "218_训练阶段别名与唯一用户进阶桥.md",\n  "routeNode": "user_stage_runtime_adoption_contract",\n  "evidenceLevel": "paper_user_stage_runtime_contract_written_not_implemented",\n  "opensChildren": ["user-stage-runtime-adoption-contract.json", "218_训练阶段别名与唯一用户进阶桥.md", "first-lesson-visible-state-machine.json"],\n  "returnTo": "翻后教学系统_统一总纲.md",\n  "currentStatus": "paper_user_stage_runtime_contract_written_not_implemented"\n}\n\`\`\`\n\n218号已经规定用户只看到U0—U7。本合同进一步规定运行时必须保存什么、怎样转移，以及哪些快捷方式禁止使用。它是实现前的状态合同，不是页面已经完成的证据。\n\n## 会话状态\n\n运行时只需在当前会话保存以下字段：\n\n${stateFieldText}\n\n其中，userStage只能取U0—U7，routeStateId只能取L0—L4或p1—p7；作者侧P/S/V/C/L编号不能成为用户导航值。\n\n## 唯一进阶转移\n\n| 当前阶段 | 下一阶段 | 闸门 | 必须留下的证据 |\n|---|---|---|---|\n${transitionRows}\n\n失败时停在当前阶段或返回同一父帧最近缺失层；不从总分、速度或随机题结果推断升级。子层关闭后恢复原父帧，不能返回首页。\n\n## 页面可见边界\n\n- 页面只显示当前阶段的白话名称、当前路线位置、一个问题和一个主要动作；\n- 必要牌面、历史、金额、行动权和分母不能被“帮助撤除”隐藏；\n- 作者别名、闸门编号、总分和后台题池不作为用户入口；\n- 资料不足显示停止卡，不能默认生成动作或下一街；\n- 所有状态只保留在当前会话，不建立用户数据库。\n\n当前合同只证明字段和转移已经写清，运行时尚未读取U阶段、尚未验证父帧恢复和真人学习。机器结果见 [user-stage-runtime-adoption-contract.json](user-stage-runtime-adoption-contract.json)。\n`;
fs.writeFileSync(path.join(dir, '219_U0_U7用户进阶运行时采用合同.md'), md);

console.log(JSON.stringify({
  ok: true,
  id: contract.id,
  status: contract.status,
  stages: contract.canonicalUserStages.length,
  routeStates: contract.canonicalRoute.length,
  transitions: contract.transitions.length,
  currentEvidence: contract.currentEvidence
}, null, 2));
