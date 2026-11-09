import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');

const golden = read('first-pass-golden-path.json');
const screen = read('first-pass-screen-coverage-matrix.json');
const stateMachine = read('first-lesson-visible-state-machine.json');
const copy = read('first-pass-copy-deck.json');
const cognitive = read('route-cognitive-slow-execution-bridge.json');
const observation = read('low-baseline-stop-observation-crosswalk.json');

const canonicalRoute = ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7'];
const frameIds = ['G0_welcome','G1_context','G2_preflop_chart','G3_preflop_action','G4_range_bridge','G5_p1_context','G6_p2_hand','G7_p3_range','G8_p4_compare','G9_p5_execute','G10_p6_update','G11_p7_close','G12_recall_transfer'];
const stateForFrame = {
  G0_welcome: 'L0', G1_context: 'L1', G2_preflop_chart: 'L2', G3_preflop_action: 'L3', G4_range_bridge: 'L4',
  G5_p1_context: 'p1', G6_p2_hand: 'p2', G7_p3_range: 'p3', G8_p4_compare: 'p4', G9_p5_execute: 'p5', G10_p6_update: 'p6', G11_p7_close: 'p7', G12_recall_transfer: 'replay_transfer'
};

const rows = golden.frames.map(frame => {
  const stateId = stateForFrame[frame.id];
  const stateRow = stateId === 'replay_transfer' ? null : stateMachine.states.find(x => x.id === stateId);
  const bridgeRow = stateId === 'replay_transfer' ? null : cognitive.rows.find(x => x.stateId === stateId);
  const observationRow = stateId === 'replay_transfer' ? null : observation.rows.find(x => x.stateId === stateId);
  return {
    frameId: frame.id,
    canonicalState: stateId,
    sees: frame.see,
    plainQuestion: frame.ask,
    primaryAction: frame.primaryAction,
    output: frame.output,
    handoff: frame.handoff,
    errorReturn: frame.errorReturn,
    stopCondition: frame.stopCondition,
    afterInstruction: frame.after,
    cognitiveJob: bridgeRow?.cognitiveJob ?? '隐藏标题后复述外层、内层和单变量变化。',
    observationBeforeHelp: observationRow?.requiredBeforeHelp ?? ['firstAnswer','currentLayerSelfLocated','visualAnchorPointed'],
    observationAfterAnswer: observationRow?.requiredAfterAnswer ?? ['nestedStructureEvidence'],
    stateMachineEvents: stateRow ? ['answer_valid','answer_wrong','open_child','missing_evidence','unknown'] : ['replay_pass','replay_fail'],
    userInstruction: stateId === 'replay_transfer' ? {
      see: ['blank_outer_route_map','blank_postflop_inner_route','parent_child_bracket','one_changed_field'],
      say: '先说外层路线，再说翻后七步，并指出陌生变化回到哪一层。',
      click: '复述双层路线并完成单变量迁移',
      leave: '通过后进入下一阶段，否则回到对应父层。'
    } : {
      see: frame.see,
      say: frame.ask,
      click: frame.primaryAction,
      leave: frame.handoff
    }
  };
});

assert.deepEqual(golden.canonicalStateRoute, canonicalRoute);
assert.deepEqual(rows.map(x => x.frameId), frameIds);
assert.equal(screen.rows.length, 13);
assert.equal(stateMachine.states.length, 12);
assert.equal(copy.steps.length, 7);
assert.equal(rows.every(x => x.plainQuestion && x.primaryAction && x.output && x.stopCondition), true);
assert.equal(rows.filter(x => x.canonicalState !== 'replay_transfer').every(x => x.observationBeforeHelp.includes('firstAnswer')), true);
assert.equal(rows.filter(x => x.canonicalState !== 'replay_transfer').every(x => x.observationAfterAnswer.length > 0), true);
assert.equal(rows.filter(x => x.canonicalState !== 'replay_transfer').every(x => x.stateMachineEvents.includes('answer_wrong')), true);
assert.equal(rows.at(-1).canonicalState, 'replay_transfer');
assert.equal(rows.at(-1).userInstruction.see.includes('blank_outer_route_map'), true);
assert.equal(rows.at(-1).userInstruction.see.includes('blank_postflop_inner_route'), true);

const contract = {
  id: 'FIRST_PASS_USER_FACING_SCRIPT_CONTRACT_V1',
  status: 'paper_13_frame_user_script_closed_runtime_and_trial_missing',
  purpose: '把首遍13帧压成用户真正能执行的“看什么→说什么→点什么→留下什么→错了回哪里”脚本，并纳入双层路线回放。',
  sources: ['first-pass-golden-path.json','first-pass-screen-coverage-matrix.json','first-lesson-visible-state-machine.json','first-pass-copy-deck.json','route-cognitive-slow-execution-bridge.json','low-baseline-stop-observation-crosswalk.json'],
  canonicalRoute,
  frameIds,
  rows,
  userProtocol: ['看中心视觉','先用白话回答','完成唯一主要动作','保存首答与交接','答后再显示解析','错了回到最近缺失层','完成13帧后隐藏标题回放'],
  rules: {
    oneQuestionPerFrame: true,
    onePrimaryActionPerFrame: true,
    everyFrameHasPlainQuestion: true,
    everyFrameHasStopCondition: true,
    everyFrameHasErrorReturn: true,
    firstAnswerBeforeExplanation: true,
    unknownCountsAsWrongAndPreservesRoute: true,
    childReturnsToSameParent: true,
    replayRequiresOuterAndInnerRoute: true,
    replayRequiresOneVariableTransfer: true,
    noFlat35ItemHome: true,
    speedIsNotPassCondition: true
  },
  currentEvidence: {
    paperScript: true,
    runtimeScriptAttached: false,
    lowBaselineTrial: false,
    firstPassCompletedByLearner: false,
    replayObserved: false,
    oneVariableTransferObserved: false,
    NL50Evidence: false
  }
};

write('first-pass-user-facing-script-contract.json', contract);

const md = `# 206｜首遍13帧用户执行脚本与双层回放合同

\`\`\`json
{
  "parentDocument": "205_答案身份来源追溯与判分边界合同.md",
  "routeNode": "first_pass_user_facing_script_contract",
  "evidenceLevel": "paper_13_frame_user_script_closed_runtime_and_trial_missing",
  "opensChildren": ["first-pass-user-facing-script-contract.json", "first-pass-golden-path.json", "first-lesson-visible-state-machine.json"],
  "returnTo": "翻后教学系统_统一总纲.md",
  "currentStatus": "13_frame_user_script_and_replay_closed_not_trialed"
}
\`\`\`

## 用户每一帧实际怎样做

首遍不要求用户先懂术语，而是每一帧固定四个动作：

\`\`\`text
看中心视觉 → 用白话回答 → 完成唯一主要动作 → 留下交接和返回点
\`\`\`

回答之前不显示解析；回答“不知道”按错误处理，但留在当前帧；答错回到最近缺失层，不把用户送回首页。只有当前帧的首答、主要动作和交接字段完整，才允许进入下一帧。

13帧分成三段：

1. **外层定位 L0—L4**：桌面、行动、翻前图表、动作权重和起始范围；
2. **翻后内层 p1—p7**：局面、牌力、范围、比较、执行、更新和收束；
3. **隐藏标题回放**：先复述外层，再复述翻后七步，最后完成一次只改一个字段的陌生题。

回放不是额外菜单，而是首遍结束后的验收帧。回放失败时回到对应父层，不能用看完解析后的重答替代第一次结构证据。

详细13帧字段、用户指令、状态机事件和四通道观察见 [first-pass-user-facing-script-contract.json](first-pass-user-facing-script-contract.json)。当前脚本已经纸面闭合，但运行时接入、真人首遍、双层回放和单变量迁移仍未观察。
`;
fs.writeFileSync(path.join(dir, '206_首遍13帧用户执行脚本与双层回放合同.md'), md);

console.log(JSON.stringify({
  ok: true,
  status: contract.status,
  frames: rows.length,
  canonicalStates: canonicalRoute.length,
  replayFrame: rows.at(-1).frameId,
  runtimeScriptAttached: contract.currentEvidence.runtimeScriptAttached,
  replayObserved: contract.currentEvidence.replayObserved
}));
