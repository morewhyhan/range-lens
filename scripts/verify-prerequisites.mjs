import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { charts, bbSituations } from '../src/preflop.js';
import { HAND_NAMES } from '../src/poker.js';
import { allRules } from '../src/rules.js';
import { POSTFLOP_COVERAGE, assertPostflopRegistry } from '../src/postflop-registry.js';

const sourceDir = 'C:/Users/why/Desktop/笔记 Nevir';
const workbookHashes = {
  '翻前策略整合版_六工作表.xlsx': '25E7ACABA5B8BBD15D2BC5C1985A6852BE358C218B88AE2EEBB603C1147ACE34',
  '翻后策略_分支与推理版.xlsx': '0386F3C0A077291617605F10E3B3B1670C013CF055F91B06E05D2409774A5D8A',
};

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

assert.equal(charts.length, 15);
assert.equal(charts.reduce((n, chart) => n + Object.keys(chart.hands).length, 0), 2535);
assert.equal(bbSituations.length, 20);
assert.deepEqual(HAND_NAMES, ['高牌', '一对', '两对', '三条', '顺子', '同花', '葫芦', '四条', '同花顺']);
assert.equal(allRules.length, 58);
assert.deepEqual(assertPostflopRegistry(), POSTFLOP_COVERAGE);

const hashes = {};
for (const [name, expected] of Object.entries(workbookHashes)) {
  const file = `${sourceDir}/${name}`;
  assert.ok(fs.existsSync(file), `找不到源工作簿：${file}`);
  hashes[name] = sha256(file);
  assert.equal(hashes[name], expected, `源工作簿哈希变化：${name}`);
}

console.log(JSON.stringify({
  buildPrerequisites: { charts: 15, cells: 2535, bbSituations: 20, handCategories: 9 },
  postflopCoverage: POSTFLOP_COVERAGE,
  workbookHashes: hashes,
  nextBoundary: '低基础学习效果不在本轮验收；精确逐组合后继只在有数据的课包开放',
}, null, 2));

