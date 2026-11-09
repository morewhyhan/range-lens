import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir = 'research/nevir-system';
const read = (name) => JSON.parse(fs.readFileSync(`${dir}/${name}`, 'utf8'));
const spec = read('first-hand-gap-frame-insertions.json');
assert.equal(spec.id, 'FIRST_HAND_GAP_FRAME_INSERTIONS_V1');
assert.deepEqual(spec.insertions.map((x) => x.id), ['I03', 'I05', 'I07', 'I08', 'I10', 'I11']);

const templates = {
  I03: {
    plainWhy: '先把公共牌看成一个整体，后面的牌力、范围和动作比较都要用这个标签。',
    answerShape: '从六类牌面标签中选择适用标签，可多选。',
    answerModes: ['fact'],
    handoff: ['boardTextureTags', 'primaryFocus', 'newBoardEffect'],
    teaching: '牌面类别只描述眼前发生了什么，不直接等于下注动作。',
    ready: true,
  },
  I05: {
    plainWhy: '动作比较前，先确认哪些具体组合在实体上仍然可能。',
    answerShape: '查看同一分母的动作前范围，或明确选择“资料不足，停止”。',
    answerModes: ['range_snapshot', 'stop'],
    handoff: ['rangeBefore', 'normalizationDenominator', 'physicalFilter'],
    teaching: '被公共牌或自己的底牌占用的组合要删掉；这一步还没有代表对手采取任何动作。',
    ready: false,
  },
  I07: {
    plainWhy: '先说明比较动作的目的，才能知道下一步该拿什么证据比较。',
    answerShape: '指出当前课程或参考中声明的比较目的，或选择“资料不足，停止”。',
    answerModes: ['course_rule', 'stop'],
    handoff: ['comparisonPurpose', 'coursePolicyOrReference'],
    teaching: '牌型名称本身不能直接推出动作；动作目的必须来自明确课程规则或匹配参考。',
    ready: false,
  },
  I08: {
    plainWhy: '把下注尺寸翻译成价格和所需权益，执行时才不会只背一个数字。',
    answerShape: '计算底池价格与所需权益，或选择“缺少阈值资料，停止”。',
    answerModes: ['ledger_formula', 'course_rule', 'stop'],
    handoff: ['potOdds', 'requiredEquity', 'size', 'thresholdSource'],
    teaching: '价格公式可以独立核对；具体动作阈值仍必须标明是课程规则还是参考策略。',
    ready: false,
  },
  I10: {
    plainWhy: '动作完成后，必须看到范围怎样变；没有来源时不能猜一个范围。',
    answerShape: '查看同坐标、同分母的动作前后范围，或选择“没有匹配参考，停止”。',
    answerModes: ['matched_reference', 'stop'],
    handoff: ['rangeAfter', 'rangeDelta', 'sourceFingerprint'],
    teaching: '动作后范围不是把实体冲突删掉就算出来，也不能把局部示例改成0/50/100后冒充原始GTO。',
    ready: false,
  },
  I11: {
    plainWhy: '新牌或回应只有在有真实后继时才能进入下一步。',
    answerShape: '指出下一张合法牌/回应及其后继节点，或选择“没有后继资料，停止”。',
    answerModes: ['successor', 'stop'],
    handoff: ['changedField', 'successorIdentity', 'stopReason'],
    teaching: '没有真实后继时停在当前父帧，不默认跳到下一街。',
    ready: false,
  },
};

const cards = spec.insertions.map((insertion) => {
  const t = templates[insertion.id];
  assert.ok(t, `missing template for ${insertion.id}`);
  return {
    id: insertion.id,
    principle: insertion.principle,
    parent: insertion.parent,
    position: { after: insertion.after, before: insertion.before },
    kind: insertion.kind,
    mode: 'nested_child_card',
    question: insertion.question,
    plainWhy: t.plainWhy,
    visual: insertion.visual,
    answerIdentity: insertion.answerIdentity,
    answerShape: t.answerShape,
    answerModes: t.answerModes,
    requiredInputs: insertion.requiredInputs,
    handoffFields: t.handoff,
    returnTo: insertion.returnsTo,
    errorReturn: insertion.parent,
    stopReason: insertion.stop,
    teaching: t.teaching,
    currentReadiness: t.ready ? 'fact_card_ready_strategy_not_applicable' : 'stop_card_ready_reference_missing',
    firstAnswerBeforeHelp: true,
    unknownCountsAsError: true,
    parentSnapshotRestored: true,
    doesNotCreateNewTopLevelStep: true,
  };
});

const out = {
  id: 'FIRST_HAND_GAP_FRAME_CARDS_V1',
  status: 'paper_gap_cards_compiled_stop_boundaries_strategy_not_ready',
  source: 'first-hand-gap-frame-insertions.json',
  purpose: '把首遍原理覆盖缺口编译成父帧内的子卡；资料不足时显示停止，不虚构动作策略。',
  cards,
  rules: {
    cardCount: 6,
    oneQuestionPerCard: true,
    oneCentralVisualPerCard: true,
    sameParentAfterClose: true,
    missingEvidenceStops: true,
    stopIsVisibleAnswer: true,
    noNewTopLevelStep: true,
    factDoesNotBecomeStrategy: true,
    rangeAfterRequiresMatchedReference: true,
    successorRequiresRegisteredNode: true,
  },
  currentEvidence: {
    allInsertionCardsCompiled: true,
    p10HasExplicitStopCard: true,
    p10MatchedReference: false,
    p11SuccessorClosure: false,
    runtimeAttached: false,
    learnerTrial: false,
    NL50Evidence: false,
  },
};

fs.writeFileSync(`${dir}/first-hand-gap-frame-cards.json`, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: out.id,
  cards: out.cards.length,
  p10: out.cards.find((x) => x.principle === 'P10').currentReadiness,
  p11: out.cards.find((x) => x.principle === 'P11').currentReadiness,
}));
