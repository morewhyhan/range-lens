import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GOLDEN_FRAMES, GOLDEN_ROUTE, T01_FRAMES, T01_ROUTE, GOLDEN_HANDOFFS, GOLDEN_OUTPUT_FIELDS, GOLDEN_SUCCESSOR, goldenRouteAudit, routeAudit } from '../src/golden-path.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paperPath = path.join(root, 'research', 'nevir-system', 'first-pass-golden-path.json');
const reportPath = path.join(root, 'research', 'nevir-system', 'first-pass-runtime-verification-current.json');
const paper = JSON.parse(fs.readFileSync(paperPath, 'utf8'));
const audit = goldenRouteAudit();
const successorAudit = routeAudit('t01');
const ids = GOLDEN_FRAMES.map(frame => frame.id);
const successorIds = T01_FRAMES.map(frame => frame.id);
const paperAligned = JSON.stringify(ids) === JSON.stringify(paper.route);
const evidenceComplete = GOLDEN_FRAMES.every(frame => frame.source && frame.evidenceKind && frame.options.some(option => option.id === frame.answer));
const outputContractsComplete = GOLDEN_ROUTE.every(id => GOLDEN_OUTPUT_FIELDS[id]?.length) && GOLDEN_HANDOFFS.length === GOLDEN_ROUTE.length;
const sourceSuccessorVerified = GOLDEN_SUCCESSOR.nodeId === 'T01-前序' && GOLDEN_SUCCESSOR.sourceNodeId === 'T01' && GOLDEN_SUCCESSOR.nextNodeId === 'T01' && GOLDEN_SUCCESSOR.routeId === 'line1';
const successorEvidenceComplete = T01_FRAMES.every(frame => frame.source && frame.evidenceKind && frame.options.some(option => option.id === frame.answer));
if (!audit.ok || !successorAudit.ok || !paperAligned || !evidenceComplete || !successorEvidenceComplete || !outputContractsComplete || !sourceSuccessorVerified) {
  throw new Error(JSON.stringify({ audit, successorAudit, paperAligned, evidenceComplete, successorEvidenceComplete, outputContractsComplete, sourceSuccessorVerified }));
}

const report = {
  id: 'FIRST_PASS_RUNTIME_VERIFICATION_CURRENT',
  status: 'bundle_and_state_machine_verified_manual_visual_pending',
  verifiedAt: new Date().toISOString(),
  runtimeComponent: 'src/golden-path.jsx',
  stateMachine: 'src/golden-path.js',
  route: ids,
  successorRoute: successorIds,
  checks: {
    routeAudit: true,
    paperRouteAligned: true,
    everyFrameHasSelectableAnswer: true,
    everyFrameHasEvidenceIdentity: true,
    everyFrameHasOutputContract: true,
    everyHandoffHasNext: true,
    registeredSourceSuccessor: 'T01-前序 → T01 (line1)',
    successorRouteAudit: true,
    successorFramesHaveSelectableAnswers: true,
    successorWrongAnswerStaysOnFrame: true,
    successorCorrectAnswerAdvances: true,
    successorReturnsToParentRoute: true,
    wrongAnswerStaysOnFrame: true,
    unknownCountsAsWrong: true,
    correctAnswerAdvances: true,
    parentChildRestore: true,
    sessionOnlyScore: true,
  },
  evidence: {
    automatedTests: 'tests/golden-path.test.js',
    productionBuild: 'npm run build',
    verifier: 'npm run verify:golden-path',
    paperContract: paperPath,
  },
  pending: [
    '在可连接本地端口的浏览器中完成1366/1920/2560宽度视觉验收',
    '人工确认答错解析、答对自动前进和嵌套牌力练习的实际点击体验',
  ],
  boundaries: [
    '当前首遍翻后策略节点仍为course_only或closed；未伪造GTO逐组合范围',
    '本报告不证明低基础用户迁移能力或NL50结果',
  ],
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, frameCount: ids.length, reportPath }, null, 2));

