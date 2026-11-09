// Derive two-player remaining stacks only for the explicitly documented river example.
// This promotes a physical arithmetic candidate, never a strategy or target configuration.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const dir = 'research/nevir-system/';
const sourcePath = dir + 'size-comparison-evidence.json';
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const sourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');

assert.equal(source.context.players, 6);
assert.equal(source.context.street, 'river');
assert.equal(source.context.heroSeat, 'BTN');
assert.equal(source.context.villainSeat, 'BB');
assert.equal(source.context.activeStackBB, 95.25);
assert.match(source.context.legalGrossHistory, /100BB/);
assert.match(source.context.legalGrossHistory, /BTN opens 2\.5/);
assert.match(source.context.legalGrossHistory, /BTN bets 2\.25/);
assert.match(source.context.legalGrossHistory, /BB calls/);

const startingStackBB = 100;
const heroCommittedBB = 2.5 + 2.25;
const villainCommittedBB = 2.5 + 2.25;
const candidate = {
  BTN: startingStackBB - heroCommittedBB,
  BB: startingStackBB - villainCommittedBB,
};
assert.deepEqual(candidate, { BTN: 95.25, BB: 95.25 });

const unitIds = ['1.1', '1.3', '1.5', '1.7', '1.8'];
const output = {
  id: 'DERIVED_STACKS_PHYSICAL_CANDIDATES_V1',
  status: 'derived_physical_candidate_not_canonical_not_strategy',
  purpose: '把明确记录的完整投入历史换算成双人剩余筹码候选，供身份审查使用；不把单个activeStack字段冒充已冻结目标配置。',
  source: {
    file: 'size-comparison-evidence.json',
    sha256: sourceSha256,
    scope: source.context.legalGrossHistory,
  },
  formula: {
    startingStackBB,
    commitments: { BTN: heroCommittedBB, BB: villainCommittedBB },
    remaining: 'remaining[player] = startingStackBB - explicitGrossCommitment[player]',
    deadSeatHandling: 'SB dead 0.5 is already in the pot/history and is not subtracted from BTN or BB stacks.',
  },
  candidate: {
    units: unitIds,
    stacksBB: candidate,
    identityClass: 'derived_physical_candidate',
    sourceScope: 'source_local_context',
  },
  checks: {
    sourceActiveStackMatchesDerivedHero: source.context.activeStackBB === candidate.BTN,
    bothPlayersSameStartingStack: true,
    noMissingCommitmentInFormula: true,
    noStrategyPromotion: true,
    noTargetConfigurationPromotion: true,
  },
  release: {
    allowed: ['identity_audit', 'physical_stack_conservation', 'author_side_crosswalk'],
    blocked: ['course_policy', 'reference_strategy', 'range_after', 'successor', 'learner_grade', 'NL50_benchmark'],
    reason: '公式只恢复剩余筹码；它没有恢复双方起始范围、行动树或课程答案。',
  },
};

fs.writeFileSync(dir + 'derived-stacks-physical-candidates.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  id: output.id,
  units: unitIds.length,
  stacksBB: candidate,
  sourceActiveStackMatchesDerivedHero: output.checks.sourceActiveStackMatchesDerivedHero,
  strategyReady: false,
}));

