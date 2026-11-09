import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

const snapshot = read('a72-c1-independent-physical-snapshot.json');
const firstCourse = read('first-course-closure-audit.json');
const generator = read('automatic-question-generation-contract.json');
const intake = read('reference-snapshot-intake-and-match-contract.json');
assert.equal(snapshot.currentEvidence.independentRecompute, true);
assert.equal(snapshot.currentEvidence.matchedActionPolicy, false);
assert.equal(firstCourse.currentEvidence.a72ReferenceSolved, false);
assert.equal(generator.outputContract.requiredFields.includes('questionId'), true);
assert.equal(intake.guards.noMatchMeansNoExactGrade, true);

const common = {
  sourceIdentity: 'A72_C1_independent_physical_snapshot',
  configurationFingerprint: snapshot.inputFingerprint,
  parentSnapshotHash: hash({ candidateId: snapshot.candidateId, inputFingerprint: snapshot.inputFingerprint }),
  visibleInputs: {
    table: '6人现金桌',
    effectiveStackBB: 100,
    preflop: 'UTG/HJ/CO弃牌，BTN开2.5BB，SB弃牌，BB跟注',
    board: snapshot.coordinateIdentity.board,
    actor: snapshot.coordinateIdentity.firstActor,
    potBB: 5.5,
    rangeLabels: ['BB普通中', 'BTN开池'],
    hidden: ['opponentHoleCards','referenceActionFrequency','futureOpponentAction']
  }
};

const fixtures = [
  {
    questionId: 'A72_FACT_P1_ACTOR_V1',
    routeParent: 'p1_context',
    unitId: null,
    questionMode: 'fact',
    ...common,
    plainPrompt: '现在翻牌前的动作结束了，翻牌先轮到谁？',
    primaryAction: 'select_one',
    requiredOutput: ['currentActor'],
    options: ['BB','BTN','已经摊牌','我不知道'],
    answerIdentity: 'fact',
    gradingRule: { acceptedOutputs: ['BB'], toleranceOrExactness: 'exact', unknownHandling: 'wrong', firstAnswerPreserved: true, helpLevel: 'H0' },
    answer: { currentActor: 'BB' },
    explanation: '前面是BTN开池、SB弃牌、BB跟注；翻牌前没有新的动作，所以翻牌先由BB行动。',
    rangeViewOrStop: { type: 'none', reason: 'this card only locates the actor' },
    successorOrStop: { type: 'next', next: 'p2_board' },
    transferSpec: null
  },
  {
    questionId: 'A72_FACT_P3_JOINT_PRIOR_V1',
    routeParent: 'p3_range',
    unitId: '5.7',
    questionMode: 'fact',
    ...common,
    plainPrompt: '已知这三张公共牌和两边的起始范围，去掉撞牌后，双方一共有多少种合法组合配对？',
    primaryAction: 'enter_number',
    requiredOutput: ['compatiblePairs','physicalFilterSeparate'],
    options: ['164251','17255','124335.25','我不知道'],
    answerIdentity: 'fact',
    gradingRule: { acceptedOutputs: [{ compatiblePairs: 164251, physicalFilterSeparate: true }], toleranceOrExactness: 'exact', unknownHandling: 'wrong', firstAnswerPreserved: true, helpLevel: 'H1' },
    answer: { compatiblePairs: snapshot.counts.compatiblePairs, physicalFilterSeparate: true, unnormalizedMass: snapshot.jointPrior.unnormalizedMass },
    explanation: '先删掉公共牌冲突和双方私牌相撞的组合；这一步只说明哪些组合在实体上可能，尚未使用任何下注频率。',
    rangeViewOrStop: { type: 'fact_chart', before: ['BB:358个实体组合','BTN:507个实体组合'], joint: '164251个合法组合配对', actionFilter: 'not_applied' },
    successorOrStop: { type: 'next', next: 'p4_compare', note: '只有取得匹配动作参考后才可比较下注' },
    transferSpec: { changedField: 'board', preservedFields: ['ranges','history','configuration'], affectedLayer: 'p3_range', holdoutStatus: 'not_open_without_new_fact_snapshot' }
  },
  {
    questionId: 'A72_STOP_P4_REFERENCE_MISSING_V1',
    routeParent: 'p4_compare',
    unitId: '1.5',
    questionMode: 'stop',
    ...common,
    plainPrompt: '现在没有与这套范围、牌面、筹码和动作菜单完全匹配的下注参考。此时应该怎么办？',
    primaryAction: 'select_stop',
    requiredOutput: ['stopReason','returnTo'],
    options: ['按相邻牌面猜一个下注','把权益最高的动作当答案','停在当前节点并返回p4','我不知道'],
    answerIdentity: 'stop',
    gradingRule: { acceptedOutputs: [{ stopReason: 'missing_matched_reference', returnTo: 'p4_compare' }], toleranceOrExactness: 'exact', unknownHandling: 'wrong', firstAnswerPreserved: true, helpLevel: 'H0' },
    answer: { stopReason: 'missing_matched_reference', returnTo: 'p4_compare' },
    explanation: 'C2参考策略尚未取得，不能把相邻案例、权益或有限模型当成动作答案；停止是这一题的正确结果。',
    rangeViewOrStop: { type: 'stop_card', reason: 'missing_matched_reference', visible: '资料不足：不能判精确动作' },
    successorOrStop: { type: 'stop', returnTo: 'p4_compare', next: null },
    transferSpec: null
  }
];

const required = generator.outputContract.requiredFields;
for (const fixture of fixtures) {
  for (const field of required) assert.ok(Object.hasOwn(fixture, field), `${fixture.questionId}:${field}`);
  assert.equal(fixture.configurationFingerprint, snapshot.inputFingerprint);
  assert.equal(fixture.answerIdentity === 'fact' ? fixture.questionMode === 'fact' : fixture.questionMode === 'stop', true);
  assert.equal(fixture.options.includes('我不知道'), true);
  assert.equal(fixture.visibleInputs.hidden.includes('referenceActionFrequency'), true);
}
assert.equal(new Set(fixtures.map(x => x.questionId)).size, fixtures.length);
assert.equal(fixtures.find(x => x.questionMode === 'stop').answerIdentity, 'stop');
assert.equal(fixtures.find(x => x.questionMode === 'stop').successorOrStop.type, 'stop');

const out = {
  id: 'A72_FACT_AND_STOP_QUESTION_FIXTURES_V1',
  status: 'paper_fact_and_stop_question_fixtures_compiled_strategy_fixture_blocked',
  purpose: '用已经独立核对的A72事实和缺参考停止边界，验证自动出题器能生成可追溯的题卡而不越级生成策略答案。',
  sources: ['a72-c1-independent-physical-snapshot.json','first-course-closure-audit.json','automatic-question-generation-contract.json','reference-snapshot-intake-and-match-contract.json'],
  fixtures,
  rules: {
    allRequiredQuestionFieldsPresent: true,
    everyFixtureHasUnknownButton: true,
    factDoesNotUseActionFrequency: true,
    stopDoesNotUseDefaultAction: true,
    sameConfigurationFingerprint: true,
    uniqueQuestionIdentity: true,
    strategyFixturesBlockedUntilMatchedReference: true,
    actionAfterRangeFixtureBlockedUntilC3: true
  },
  currentEvidence: {
    factFixturesCompiled: true,
    stopFixtureCompiled: true,
    referencePolicyFixture: false,
    rangeAfterFixture: false,
    successorStrategyFixture: false,
    runtimeAttached: false,
    learnerTrial: false,
    NL50Evidence: false
  }
};

write('a72-fact-and-stop-question-fixtures.json', out);

const md = `# 214｜A72事实题与停止题的自动出题样板

\`\`\`json
{
  "parentDocument": "157_自动出题与覆盖闭合合同.md",
  "routeNode": "a72_fact_and_stop_question_fixtures",
  "evidenceLevel": "paper_fact_and_stop_question_fixtures_compiled_strategy_fixture_blocked",
  "opensChildren": ["a72-fact-and-stop-question-fixtures.json", "a72-c1-independent-physical-snapshot.json", "automatic-question-generation-contract.json"],
  "returnTo": "翻后教学系统_统一总纲.md",
  "currentStatus": "fact_and_stop_fixture_ready_strategy_fixture_blocked"
}
\`\`\`

## 这三张题卡怎样证明出题器没有越级

第一张只问翻牌先轮到谁，答案来自已经冻结的前序动作；第二张只问 A♠7♥2♦ 下两边起始范围经过撞牌过滤后有多少合法组合配对，答案是 164251，并明确没有使用下注频率；第三张是停止题，因为 C2 匹配策略还没有取得，正确答案不是猜下注，而是停在 p4。

三张题都使用同一个 A72 输入指纹，都有唯一题目身份，都有“我不知道”按钮，且隐藏未来动作和参考频率。它们分别验证定位、物理范围事实和资料不足边界；它们不能证明下注策略，也不能打开动作后范围或连续三街练习。

## 以后怎样从这里扩展

只有 C2 取得逐组合参考，才可以在同一父帧增加动作比较题；只有 C3 取得动作后范围，才可以增加范围变化题；只有 C4/C5 取得真实后继，才可以增加转牌、河牌和连续题。每增加一种题，仍须保留来源身份、固定配置、范围分母、停止原因和父帧返回。

机器样板见 [a72-fact-and-stop-question-fixtures.json](a72-fact-and-stop-question-fixtures.json)。当前事实题和停止题已编译，策略题、动作后范围题和连续后继题继续关闭。
`;
fs.writeFileSync(path.join(dir, '214_A72事实题与停止题的自动出题样板.md'), md);

console.log(JSON.stringify({
  ok: true,
  status: out.status,
  fixtures: fixtures.length,
  factFixtures: fixtures.filter(x => x.questionMode === 'fact').length,
  stopFixtures: fixtures.filter(x => x.questionMode === 'stop').length,
  strategyFixture: out.currentEvidence.referencePolicyFixture,
  rangeAfterFixture: out.currentEvidence.rangeAfterFixture
}));
