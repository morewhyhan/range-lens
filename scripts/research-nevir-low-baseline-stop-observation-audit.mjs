import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dir = path.join(path.resolve('.'), 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');

const crossAge = read('cross-age-low-baseline-acceptance.json');
const stateCrosswalk = read('first-pass-state-evidence-crosswalk.json');
const guided = read('first-pass-full-guided-administration-audit.json');
const canonicalRoute = ['L0','L1','L2','L3','L4','p1','p2','p3','p4','p5','p6','p7'];
const channelNames = ['language', 'visual', 'memory', 'operation'];

const observationFieldRegistry = {
  firstAnswer: { channel: 'language', timing: 'before_help', meaning: '用户第一次自己给出的回答或明确不知道。' },
  currentLayerSelfLocated: { channel: 'memory', timing: 'before_help', meaning: '用户自己指出当前路线停点。' },
  visualAnchorPointed: { channel: 'visual', timing: 'before_help', meaning: '用户指出本停点的中心视觉锚点。' },
  primaryActionCompleted: { channel: 'operation', timing: 'after_answer', meaning: '用户完成本停点唯一主要动作。' },
  nextLayerSelfLocated: { channel: 'memory', timing: 'after_answer', meaning: '非终点停点中用户自己找到下一层。' },
  nextOrStopSelfLocated: { channel: 'memory', timing: 'after_answer', meaning: '用户自己找到下一停点，或在终点说出停止。' },
  returnPointSelfLocated: { channel: 'memory', timing: 'after_answer', meaning: '用户自己指出答错或关闭子层后回到哪里。' },
  handoffRestated: { channel: 'memory', timing: 'after_answer', meaning: '用户用自己的话复述交给下一层的字段。' },
  hostPromptCount: { channel: 'language', timing: 'throughout', meaning: '主持者在首答前后的提示次数。' },
  hostPromptContent: { channel: 'language', timing: 'throughout', meaning: '提示属于重复问题、指向事实、指向标记、揭示事实还是引导答案。' },
  errorLayer: { channel: 'operation', timing: 'after_error', meaning: '错误归因到哪一层；未知也要记录。' },
  parentRestore: { channel: 'memory', timing: 'after_child_close_or_error', meaning: '回到父帧并恢复父帧字段。' },
  changedField: { channel: 'visual', timing: 'transfer_only', meaning: '迁移题中唯一改变的字段。' },
  retryWithoutRouteReset: { channel: 'operation', timing: 'after_error', meaning: '错误后能在原路线继续，而不是被迫重新开始。' },
  exitPoint: { channel: 'operation', timing: 'terminal_or_stop', meaning: '用户退出、停止或完成的位置。' }
};

const requiredObservationFields = Object.keys(observationFieldRegistry);
const rows = stateCrosswalk.rows.map(row => ({
  stateId: row.stateId,
  frameId: row.frameId,
  parentStateId: row.parentStateId,
  nextState: row.nextState,
  stopCondition: row.stopCondition,
  errorReturn: row.errorReturn,
  centerVisual: row.centerVisual,
  plainQuestion: row.plainQuestion,
  primaryAction: row.primaryAction,
  memoryToken: row.memoryToken,
  channelBindings: {
    language: { question: row.plainQuestion, fields: ['firstAnswer', 'hostPromptCount', 'hostPromptContent'] },
    visual: { anchor: row.centerVisual, fields: ['visualAnchorPointed', ...(row.stateId.startsWith('p') ? ['changedField'] : [])] },
    memory: { token: row.memoryToken, next: row.nextState, return: row.errorReturn, fields: ['currentLayerSelfLocated', 'nextLayerSelfLocated', 'nextOrStopSelfLocated', 'returnPointSelfLocated', 'handoffRestated', 'parentRestore'] },
    operation: { action: row.primaryAction, fields: ['primaryActionCompleted', 'errorLayer', 'retryWithoutRouteReset', 'exitPoint'] }
  },
  requiredBeforeHelp: ['firstAnswer', 'currentLayerSelfLocated', 'visualAnchorPointed'],
  requiredAfterAnswer: ['primaryActionCompleted', ...(row.stateId === 'p7' ? ['nextOrStopSelfLocated'] : ['nextLayerSelfLocated']), 'returnPointSelfLocated', 'handoffRestated'],
  requiredOnError: ['errorLayer', 'retryWithoutRouteReset', ...(row.parentStateId ? ['parentRestore'] : [])],
  requiredOnTransfer: ['changedField'],
  requiredAtExit: ['exitPoint'],
  independentPassRule: '主持者不得替用户指出当前层、答案或下一步；首答未知按错误处理并保留原路线。'
}));

assert.deepEqual(stateCrosswalk.canonicalRoute, canonicalRoute);
assert.deepEqual(rows.map(row => row.stateId), canonicalRoute);
assert.equal(channelNames.length, 4);
assert.equal(requiredObservationFields.length, 15);
assert.equal(guided.checks.observationFieldsComplete, true);
assert.equal(crossAge.passRules.perStopAndPerChannel, true);
assert.equal(crossAge.passRules.averageScoreCannotMaskCoreFailure, true);

const audit = {
  id: 'LOW_BASELINE_STOP_OBSERVATION_CROSSWALK_V1',
  status: 'paper_stop_observation_crosswalk_closed_trial_missing',
  purpose: '把“逐停点、逐通道观察低基础用户是否看懂并能继续”绑定到唯一12停点路线，防止总分或走完按钮替代学习证据。',
  sources: ['cross-age-low-baseline-acceptance.json', 'first-pass-state-evidence-crosswalk.json', 'first-pass-full-guided-administration-audit.json'],
  canonicalRoute,
  channels: channelNames,
  observationFieldRegistry,
  rows,
  rules: {
    allCanonicalStopsMapped: true,
    allFourChannelsBoundAtEveryStop: true,
    firstAnswerBeforeHelp: true,
    averageScoreCannotMaskCoreFailure: true,
    hostLeadingAnswerIsNotIndependentPass: true,
    slowReadingOrOperationIsNotFailure: true,
    p7UsesNextOrStopInsteadOfNextLayer: true,
    parentRestoreRequiredWhenParentExists: true,
    missingObservationIsUnknownNotPass: true
  },
  currentEvidence: {
    paperCrosswalk: true,
    runtimeObservationAttached: false,
    participantObserved: false,
    routeComprehensionObserved: false,
    parentRestoreObserved: false,
    unseenTransferObserved: false
  }
};

const crossAgeUpdated = {
  ...crossAge,
  observationFields: [...new Set([...crossAge.observationFields, ...requiredObservationFields])],
  observationFieldRegistry,
  stopObservationCrosswalk: 'low-baseline-stop-observation-crosswalk.json',
  passRules: {
    ...crossAge.passRules,
    everyCanonicalStopHasFourChannels: true,
    firstAnswerBeforeHelp: true,
    missingObservationIsUnknownNotPass: true
  },
  currentEvidence: {
    ...crossAge.currentEvidence,
    stopObservationCrosswalkPaper: true,
    stopObservationTrial: false
  }
};

write('low-baseline-stop-observation-crosswalk.json', audit);
write('cross-age-low-baseline-acceptance.json', crossAgeUpdated);

const md = `# 200｜低基础逐停点观察与四通道证据交叉合同

\`\`\`json
{
  "parentDocument": "188_跨年龄低基础可理解性与操作验收合同.md",
  "routeNode": "low_baseline_stop_observation_crosswalk",
  "evidenceLevel": "paper_stop_observation_crosswalk_closed_trial_missing",
  "opensChildren": ["low-baseline-stop-observation-crosswalk.json", "cross-age-low-baseline-acceptance.json", "first-pass-state-evidence-crosswalk.json"],
  "returnTo": "翻后教学系统_统一总纲.md",
  "currentStatus": "12_stop_four_channel_observation_mapped_not_trialed"
}
\`\`\`

## 为什么要单独增加这一层

188号已经规定“每个停点、每个通道都要观察”，但如果只有一份总合同，执行时仍可能只记录“用户把一遍按钮点完了”或“总分不错”。200号把这条要求绑定到 L0—L4、p1—p7 的每一个停点，给每个停点固定四类观察：

1. **语言**：用户能不能先自己回答当前问题；主持者用了什么类型的提示；
2. **视觉**：用户能不能指出当前中心视觉和发生变化的字段；
3. **记忆**：用户能不能指出当前层、下一层或终点、错误回退点、交接字段；
4. **操作**：用户能不能完成唯一主要动作，出错后能不能原地重试而不丢路线。

这四类不是四个菜单，而是同一个停点的四个观察镜头。一个停点只要有一类核心观察缺失，就只能记为未知，不能用别的停点高分补齐。

## 用户实际怎样被观察

每到一个停点，系统或主持者按固定顺序记录：

\`\`\`text
先不提示 → 用户说出/选择首答 → 指出当前视觉和层 → 完成唯一动作
→ 说出下一步或停止 → 说出错误回退/父帧 → 记录提示与错误层
\`\`\`

首答之前不允许揭示答案。用户说“我不知道”按错误处理，但仍留在当前路线；解析可以随后出现，解析后的重答只能用于诊断，不能覆盖首答证据。阅读慢、点得慢不算错误；只有页面迫使主持者替用户决定当前层、答案或下一步，才说明该停点的结构没有交给用户。

## 12个停点的机器绑定

机器交叉表的每一行都同时保存 plainQuestion、centerVisual、primaryAction、memoryToken、nextState 和 errorReturn，并绑定四个通道的观察字段。p7是终点，所以它观察“下一步或停止”，不能假设一定有下一个停点。只要父帧存在，就必须观察关闭子层或错误后是否恢复父帧。

| 路线 | 首答前必须看到/说出 | 答后必须交付 | 出错必须记录 |
|---|---|---|---|
| L0—L4 | 当前问题、中心视觉、当前层 | 主要动作、下一层/停止、交接 | 错误层与是否原地重试 |
| p1—p6 | 当前问题、中心视觉、当前层 | 主要动作、下一层、回退点、交接 | 错误层、父帧恢复、原地重试 |
| p7 | 当前问题、结算视觉、当前层 | 结算/停止、迁移交付 | 错误层与退出点 |

详细的12行、15个观察字段和四通道绑定见 [low-baseline-stop-observation-crosswalk.json](low-baseline-stop-observation-crosswalk.json)。它是纸面观察合同，不是已经完成的真人试读。当前 participantObserved、routeComprehensionObserved、parentRestoreObserved 和 unseenTransferObserved 均保持 false。

## 这份合同能推出什么，不能推出什么

它能保证以后做试读时不会漏记某个停点、某个通道或首答顺序，也能把“页面不好懂”和“用户不会策略”分开。它不能证明页面已经实现，不能证明用户已经看懂，更不能推出策略准确、连续三街能力或NL50准备度。只有把真实用户的逐停点记录填回同一字段，并通过错误恢复和未见迁移，才可以进入下一道发布闸门。
`;
fs.writeFileSync(path.join(dir, '200_低基础逐停点观察与四通道证据交叉合同.md'), md);

console.log(JSON.stringify({
  ok: true,
  status: audit.status,
  stops: rows.length,
  channels: channelNames.length,
  observationFields: requiredObservationFields.length,
  runtimeObservationAttached: audit.currentEvidence.runtimeObservationAttached,
  participantObserved: audit.currentEvidence.participantObserved
}));
