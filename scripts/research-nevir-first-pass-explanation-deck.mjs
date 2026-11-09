import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const dir = path.join(root, 'research', 'nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const handoff = read('first-pass-handoff-ledger.json');
const copy = read('first-pass-copy-deck.json');

assert.equal(handoff.id, 'FIRST_PASS_HANDOFF_LEDGER_V1');
assert.equal(copy.id, 'FIRST_PASS_COPY_DECK_V1');
assert.equal(handoff.rows.length, 13);

const cards = {
  G0_welcome: {
    observe: '桌面人数、有效筹码和今天要走的路线。',
    why: '先把练习发生在哪张桌上固定住；如果场景没固定，后面的图表和金额都没有对象。',
    changed: '本帧只确认场景，不改变牌局。',
    carry: '把桌面和训练路线交给下一帧，下一帧开始读行动事实。',
    technicalAfter: 'tableFrame / input identity',
    sourceIdentity: '课程输入身份'
  },
  G1_context: {
    observe: '座位、弃牌、行动箭头、前面动作、底池和待补金额。',
    why: '先知道谁在行动、发生过什么、继续要付多少钱，才知道应该查哪张图或哪种牌局。',
    changed: '本帧不判断好坏，只锁定行动者、历史和价格。',
    carry: '把行动事实交给翻前图表坐标帧。',
    technicalAfter: 'contextFrame / history state',
    sourceIdentity: '牌局事实与金额账本'
  },
  G2_preflop_chart: {
    observe: '一张命名明确的169格翻前图和自己的手牌坐标。',
    why: '先找到格子，避免把“我觉得应该做什么”混进查图这一步。',
    changed: '本帧只确认坐标，不提前判断动作。',
    carry: '把坐标格交给下一帧读取颜色、动作和权重。',
    technicalAfter: 'preflopCell / chart coordinate',
    sourceIdentity: '用户提供的简化翻前图'
  },
  G3_preflop_action: {
    observe: '被选中的格子、图例和该格的权重。',
    why: '同一个坐标可能代表确定动作或混合权重，必须先读清身份再继续。',
    changed: '本帧把坐标翻译成课程动作，不把未知权重当成确定动作。',
    carry: '把动作身份和权重交给起始范围桥。',
    technicalAfter: 'preflopAction / action weight',
    sourceIdentity: '用户提供的翻前图例'
  },
  G4_range_bridge: {
    observe: '同一范围坐标、已知牌和被划掉的实体组合。',
    why: '先分清哪些牌因为已经被看见而不可能，哪些只是课程资料还没提供。',
    changed: '本帧只做物理排除和分母确认，不把划掉的牌说成对手主动弃牌。',
    carry: '把起始范围、分母和已知牌交给翻后局面。',
    technicalAfter: 'physical filter / denominator',
    sourceIdentity: '物理牌张事实与范围来源'
  },
  G5_p1_context: {
    observe: '翻牌、行动者、前序历史、底池、后手和待补金额。',
    why: '进入翻后先把行动权和价格重新锁定，同时保留翻前交接的范围入口。',
    changed: '本帧只确认当前局面，不从牌面直接猜下注。',
    carry: '把局面卡和前序范围交给读牌帧。',
    technicalAfter: 'p1 context / context snapshot',
    sourceIdentity: '冻结局面输入'
  },
  G6_p2_hand: {
    observe: '公共牌、自己的两张牌、最佳五张位置和牌力顺序。',
    why: '先把能直接看见的牌面事实读对，后面的范围和动作才有正确起点。',
    changed: '本帧只确认最佳五张、牌型和改善牌，不跳到下注答案。',
    carry: '把牌力事实和合法改善牌交给范围变化帧。',
    technicalAfter: 'best five / hand class / improvement cards',
    sourceIdentity: '牌力评估与合法跑牌事实'
  },
  G7_p3_range: {
    observe: '同坐标的行动前范围、物理排除、行动筛选和固定分母。',
    why: '现在才看“对手还可能拿什么”，并把实体不可能和行动后变少分开。',
    changed: '只解释当前范围差异，不把范围差异直接变成下注答案。',
    carry: '把范围和变化身份交给动作比较帧。',
    technicalAfter: 'range before/after / physical versus action filter',
    sourceIdentity: '匹配参考或明确课程政策；缺失则停止'
  },
  G8_p4_compare: {
    observe: '当前合法按钮、真实价格、动作目的和资料身份。',
    why: '只有在局面、牌力和范围都准备好后，才比较当前允许的动作。',
    changed: '本帧比较选择，不让结果或单张牌名替代价格、范围和后续。',
    carry: '把选中的课程动作和理由交给执行账本。',
    technicalAfter: 'course policy / action comparison',
    sourceIdentity: '匹配参考与课程简化政策'
  },
  G9_p5_execute: {
    observe: '动作按钮、投入金额、动作前后底池、后手和下一行动者。',
    why: '想法必须落成合法动作；金额和行动权错了，后面的范围也会错。',
    changed: '本帧只执行一个动作并检查守恒。',
    carry: '把动作、金额、账本和下一行动者交给更新帧。',
    technicalAfter: 'ledger transition / next actor',
    sourceIdentity: '动作菜单与金额公式'
  },
  G10_p6_update: {
    observe: '回应或新牌、唯一变化高亮、动作后范围和真实后继。',
    why: '下一步不是重新猜整手牌，而是保留未变字段，只更新这一次真正改变的东西。',
    changed: '明确一项变化，若没有真实后继就停在当前父帧。',
    carry: '把变化字段、动作后范围和后继或停止原因交给收口帧。',
    technicalAfter: 'state delta / successor or stop',
    sourceIdentity: '动作后范围与后继图'
  },
  G11_p7_close: {
    observe: '结算账本、当时决策、结果、错误层和回放入口。',
    why: '输赢只是结果；先把当时能看到的依据和错误层分开，才能知道下次从哪里重查。',
    changed: '本帧只收束本手并定位一个错误层，不用结果倒推答案。',
    carry: '把结算、回退层和下一次练习入口交给回放。',
    technicalAfter: 'settlement / error attribution / replay entry',
    sourceIdentity: '事实结算与决策证据分离'
  },
  G12_recall_transfer: {
    observe: '没有标题的外层路线图、翻后七步、父子括号和一个陌生变化。',
    why: '最后要确认留下的是一套顺序，而不是刚刚跟着按钮走完的一次演示。',
    changed: '只改变一个字段，先说受影响层，再完成同类判断。',
    carry: '输出外层路线、内层路线、返回点和单变量迁移结果；之后才决定是否进入下一阶段。',
    technicalAfter: 'outer/inner route recall / one-variable transfer',
    sourceIdentity: '学习者首答与迁移证据'
  }
};

const rows = handoff.rows.map(row => {
  const card = cards[row.frameId];
  assert.ok(card, `missing explanation card for ${row.frameId}`);
  return {
    frameId: row.frameId,
    canonicalState: row.canonicalState,
    output: row.produces,
    question: row.plainQuestion,
    explanationOrder: ['answerStatus', 'whyThisStep', 'changedOrPreserved', 'handoff', 'sourceIdentity'],
    afterAnswer: {
      answerStatus: '先显示对/错/不知道，不先显示技术词。',
      whyThisStep: card.why,
      changedOrPreserved: card.changed,
      handoff: card.carry,
      sourceIdentity: card.sourceIdentity
    },
    visualMeaning: {
      observe: card.observe,
      primaryVisual: row.primaryVisual,
      preservedFields: row.preservedFields,
      changedFieldRule: '只突出本帧真正改变的字段；没有变化的字段保持同样位置和样式。'
    },
    plainLanguage: {
      title: row.userInstruction.say,
      explanation: card.why,
      nextSentence: card.carry
    },
    technicalDrawer: {
      aliases: [card.technicalAfter],
      visibleOnlyAfterAnswer: true,
      sourceIdentity: card.sourceIdentity
    },
    wrongAnswer: {
      returnTo: row.errorReturn,
      message: row.stopCondition,
      preserve: row.preservedFields,
      noRouteReset: true
    },
    terminal: row.terminal
  };
});

for (const row of rows) {
  assert.equal(row.explanationOrder.length, 5);
  assert.equal(row.afterAnswer.answerStatus.length > 0, true);
  assert.equal(row.technicalDrawer.visibleOnlyAfterAnswer, true);
  assert.equal(row.wrongAnswer.noRouteReset, true);
}

const deck = {
  id: 'FIRST_PASS_EXPLANATION_DECK_V1',
  status: 'paper_explanation_sequence_closed_runtime_and_trial_missing',
  purpose: '把首遍每一帧的答后解析统一为“答案状态→为什么现在做→哪项改变/保留→交给下一步→资料身份”，让解释建立路线而不是堆术语。',
  sources: ['first-pass-handoff-ledger.json', 'first-pass-copy-deck.json', 'learner-visible-question-contract.json'],
  route: handoff.route,
  rows,
  visualSemantics: {
    crossOut: '实体牌张冲突或物理不可能',
    fade: '仍然可能但权重或行动后比例变低',
    glow: '当前唯一变化字段',
    lock: '必须保留的父帧字段',
    stopCard: '资料不足或没有真实后继，停在当前父帧',
    colorIsNotSoleCue: true
  },
  rules: {
    firstAnswerBeforeExplanation: true,
    explanationOrderFixed: true,
    plainLanguageBeforeTechnicalAlias: true,
    factsBeforeStrategy: true,
    oneChangedFieldOnTransfer: true,
    sameParentAfterWrongAnswer: true,
    sourceIdentityVisibleAfterAnswer: true,
    noResultBackPropagation: true,
    oneCentralVisualPerFrame: true
  },
  currentEvidence: {
    paperDeck: true,
    runtimeAttached: false,
    lowBaselineTrial: false,
    unseenTransferObserved: false
  }
};

fs.writeFileSync(path.join(dir, 'first-pass-explanation-deck.json'), JSON.stringify(deck, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: deck.id,
  rows: deck.rows.length,
  fixedExplanationOrder: deck.rules.explanationOrderFixed,
  factsBeforeStrategy: deck.rules.factsBeforeStrategy,
  runtimeAttached: deck.currentEvidence.runtimeAttached
}));
