import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const files = ['src/main.jsx','src/learning-ui.jsx','src/session.js','src/curriculum.js'];
const source = Object.fromEntries(files.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
const golden = read('first-pass-golden-path.json');
const stateMachine = read('first-lesson-visible-state-machine.json');

assert.equal(golden.currentEvidence.runtime, false);
assert.equal(stateMachine.currentEvidence.runtimeImplemented, false);
const allSource = Object.values(source).join('\n');
const runtimeReadsGoldenPath = allSource.includes('first-pass-golden-path');
const runtimeReadsStateMachine = allSource.includes('first-lesson-visible-state-machine');
const legacyFlatModuleSurface = source['src/main.jsx'].includes('MODULES.filter') && source['src/main.jsx'].includes('module-tabs');
const legacyLearningSurface = source['src/learning-ui.jsx'].includes('选择具体练习') && source['src/learning-ui.jsx'].includes('自由选择');
const oldRouteChoiceSurface = source['src/learning-ui.jsx'].includes('ROUTE_CHOICES');
const routeRuntimeExists = source['src/learning-ui.jsx'].includes("mode==='route'");

const result = {
  id: 'RUNTIME_ROUTE_ATTACHMENT_AUDIT_V1',
  status: 'runtime_uses_legacy_module_surface_canonical_nested_route_not_attached',
  purpose: '区分纸面黄金路径已经对齐与现有React运行时尚未接入的事实，防止模块平铺或旧连续片段被误当成新的L0-L4到p1-p7主线。',
  sources: ['first-pass-golden-path.json','first-lesson-visible-state-machine.json',...files],
  canonicalRoute: golden.canonicalStateRoute,
  runtimeFindings: {
    readsGoldenPath: runtimeReadsGoldenPath,
    readsStateMachine: runtimeReadsStateMachine,
    hasLegacyFlatModuleSurface: legacyFlatModuleSurface,
    hasLegacyLearningSelectionSurface: legacyLearningSurface,
    hasOldRouteChoiceSurface: oldRouteChoiceSurface,
    hasSeparateRouteMode: routeRuntimeExists
  },
  requiredMigration: [
    '让运行时只读取一个规范化的首遍路线课包',
    '把旧MODULES平铺入口降为父帧内按需入口，不作为首页主线',
    '把L0-L4与p1-p7的交接字段接入同一会话状态',
    '答错原位返回，子层关闭后恢复父帧',
    '缺参考或缺后继时显示停止卡而不是生成默认动作'
  ],
  currentEvidence: {
    paperRouteAligned: true,
    runtimeCanonicalRouteAttached: runtimeReadsGoldenPath || runtimeReadsStateMachine,
    runtimeImplemented: false,
    participantObserved: false,
    NL50Evidence: false
  },
  releaseRules: {
    legacyFlatSurfaceCannotCountAsCanonicalRoute: true,
    runtimeAttachmentRequiredBeforeBeginnerClaim: true,
    noAppModificationInThisAudit: true
  }
};

fs.writeFileSync(path.join(dir, 'runtime-route-attachment-audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: result.id,
  status: result.status,
  runtimeReadsCanonicalRoute: result.currentEvidence.runtimeCanonicalRouteAttached,
  legacyFlatModuleSurface,
  legacyLearningSurface,
  participantObserved: result.currentEvidence.participantObserved
}, null, 2));
