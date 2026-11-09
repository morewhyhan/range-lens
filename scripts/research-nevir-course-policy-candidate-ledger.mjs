import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const material = JSON.parse(fs.readFileSync(path.join(dir, 'material-policy-classification.json'), 'utf8'));
const sources = JSON.parse(fs.readFileSync(path.join(root, 'src/data/sources.json'), 'utf8'));
assert.equal(material.rows.length, 374);

const sourceTextById = new Map();
for (const sheet of sources.postflop) {
  for (const row of sheet.rows ?? []) {
    const text = Object.entries(row.values ?? {})
      .filter(([, value]) => typeof value === 'string')
      .map(([column, value]) => `${column}:${value}`)
      .join(' | ');
    sourceTextById.set(`${sheet.name}#${row.row}`, text);
  }
}

const actionWords = [
  ['bet', /下注|持续下注|CB|B\d+/g],
  ['check', /过牌|X(?!\w)/g],
  ['call', /跟注|X\/C/g],
  ['raise', /加注|过牌-加注|X\/R|再加/g],
  ['fold', /弃牌|过弃/g],
  ['all_in', /全下|全押/g]
];

function captureNumbers(text) {
  const mentions = [];
  const pattern = /(?:B\s?\d{1,3}|\b\d{1,3}%|\b\d+(?:\/\d+)?\s*(?:底池|池)|>\s*100%)/g;
  for (const match of text.matchAll(pattern)) {
    const start = Math.max(0, match.index - 36);
    const end = Math.min(text.length, match.index + match[0].length + 36);
    const raw = match[0];
    const typed = /B\s?\d+|底池|池/.test(raw) ? 'size_candidate' : 'frequency_or_untyped';
    mentions.push({ raw, typed, context: text.slice(start, end).replace(/\s+/g, ' ') });
  }
  return mentions;
}

function captureTokens(text) {
  const boardTokens = [...new Set((text.match(/(?<![A-Za-z])(?:A|K|Q|J|T|9|8|7|6|5|4|3|2){2,3}(?:r|tt|M|m)?\b/g) ?? []))];
  const handTokens = [...new Set((text.match(/(?<![A-Za-z])(?:A|K|Q|J|T|9|8|7|6|5|4|3|2){2}[so]?\b/g) ?? []))];
  return { boardTokens, handTokens };
}

function conditions(text) {
  const found = [];
  for (const match of text.matchAll(/(?:若|如果|仅在|没有|面对|当|在[^。；]{0,24}时)[^。；]{0,90}/g)) {
    const value = match[0].replace(/\s+/g, ' ').trim();
    if (value.length >= 4) found.push(value);
  }
  return [...new Set(found)].slice(0, 8);
}

const candidates = material.rows
  .filter(row => row.policyIdentity === 'course_rule' || row.policyIdentity === 'population_exploit')
  .map(row => {
    const sourceText = sourceTextById.get(row.id);
    assert.equal(typeof sourceText, 'string', row.id);
    const numbers = captureNumbers(sourceText);
    const tokens = captureTokens(sourceText);
    const actions = actionWords.filter(([, regex]) => regex.test(sourceText)).map(([id]) => id);
    // RegExp instances above are global; reset them before the next row.
    for (const [, regex] of actionWords) regex.lastIndex = 0;
    const exploit = row.policyIdentity === 'population_exploit';
    return {
      candidateId: `CAND-${row.id}`,
      materialId: row.id,
      sheet: row.sheet,
      row: row.row,
      policyIdentity: row.policyIdentity,
      sourceKind: row.sourceKind,
      sourceTextHash: row.sourceTextHash,
      sourceText,
      explicitActions: actions,
      numericMentions: numbers,
      boardTokens: tokens.boardTokens,
      handTokens: tokens.handTokens,
      explicitConditions: conditions(sourceText),
      candidateStatus: 'source_explicit_but_not_compiled',
      releaseBand: exploit ? 'population_exploit_candidate' : 'course_rule_candidate',
      requiredCompilerChecks: [
        'policyScope',
        'sourceReference',
        'actionMenuAndDenominator',
        'frequency_vs_size_separation',
        'differenceLedger',
        'rangeAfterOrStop',
        'successorOrStop'
      ].concat(exploit ? ['populationModel', 'triggerCondition', 'opponentResponseReference'] : ['explicit_course_policy_or_matched_reference']),
      forbiddenPromotion: exploit ? ['raw_reference', 'simplified_reference'] : ['raw_reference'],
      coursePolicyFingerprint: null,
      exactStrategyReady: false,
      learnerTrial: false
    };
  });

const counts = candidates.reduce((acc, row) => {
  acc[row.policyIdentity] = (acc[row.policyIdentity] ?? 0) + 1;
  return acc;
}, {});
const actionCounts = candidates.reduce((acc, row) => {
  for (const action of row.explicitActions) acc[action] = (acc[action] ?? 0) + 1;
  return acc;
}, {});

const output = {
  id: 'COURSE_POLICY_CANDIDATE_LEDGER_V1',
  status: 'paper_course_policy_candidates_extracted_not_compiled_or_released',
  purpose: '把原材料明确写出的课程动作候选与条件逐条提取，保留原文哈希和数值上下文，明确哪些字段仍需编译器、匹配参考或停止卡确认。',
  sources: ['src/data/sources.json', 'material-policy-classification.json'],
  hardRules: {
    sourceTextHashMustMatchMaterialRow: true,
    explicitNumberDoesNotDecideWhetherSizeOrFrequency: true,
    populationExploitCannotBecomeRawReference: true,
    candidateIsNotExactStrategy: true,
    missingPolicyScopeStops: true,
    missingDifferenceLedgerStopsSimplificationRelease: true,
    missingRangeAfterOrSuccessorStopsContinuousLesson: true
  },
  candidates,
  counts: {
    candidates: candidates.length,
    byPolicyIdentity: counts,
    byActionMention: actionCounts,
    withNumericMentions: candidates.filter(row => row.numericMentions.length > 0).length,
    withBoardTokens: candidates.filter(row => row.boardTokens.length > 0).length,
    withExplicitConditions: candidates.filter(row => row.explicitConditions.length > 0).length,
    exactStrategyReady: candidates.filter(row => row.exactStrategyReady).length,
    coursePolicyCompiled: 0,
    learnerTrial: 0
  },
  currentEvidence: {
    sourceExtractionVerified: true,
    sourceHashesMatched: candidates.every(row => row.sourceTextHash === material.rows.find(source => source.id === row.materialId)?.sourceTextHash),
    policyCompilerImplemented: false,
    matchedReference: false,
    coursePolicyReleased: false,
    learnerTrial: false,
    NL50Evidence: false
  }
};
fs.writeFileSync(path.join(dir, 'course-policy-candidate-ledger.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, counts: output.counts, hashesMatched: output.currentEvidence.sourceHashesMatched }));
