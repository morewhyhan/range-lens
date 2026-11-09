import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertLessonPackage } from '../src/lesson-package.js';
import { createMatchedEvidenceView } from '../src/matched-evidence.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const relativePath = process.argv[2] || 'research/nevir-system/tiny-river-matched-package-v1.json';
const packagePath = path.resolve(root, relativePath);
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
assertLessonPackage(pkg);

const matched = Object.values(pkg.nodes).filter(node => node.evidenceKind === 'matched');
if (!matched.length) throw new Error('课包没有 matched 节点，不能生成匹配发布摘要');

const nodes = matched.map(node => {
  const view = createMatchedEvidenceView(pkg, node.nodeId);
  return {
    nodeId: node.nodeId,
    evidenceKind: node.evidenceKind,
    configFingerprint: view.config.configFingerprint,
    solver: view.solver,
    layers: view.layers.filter(layer => layer.available).map(layer => layer.id),
    actions: view.actions.map(action => ({
      id: action.id,
      frequency: action.frequency,
      weightedEV: action.weightedEV,
    })),
    combinations: view.policyRows.length,
    successorCount: view.successor.length,
    independentValidation: view.independentValidation,
  };
});

console.log(JSON.stringify({
  packagePath: path.relative(root, packagePath).replaceAll(path.sep, '/'),
  packageId: pkg.packageId,
  version: pkg.version,
  config: pkg.config,
  matchedNodeCount: nodes.length,
  nodes,
}, null, 2));
