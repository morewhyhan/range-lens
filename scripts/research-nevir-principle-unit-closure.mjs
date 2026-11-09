import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const dir = path.join(root, 'research/nevir-system');
const principles = JSON.parse(fs.readFileSync(path.join(dir, 'first-pass-principle-coverage.json'), 'utf8'));
const bridge = JSON.parse(fs.readFileSync(path.join(dir, 'unit-architecture-bridge.json'), 'utf8'));
const route = JSON.parse(fs.readFileSync(path.join(dir, 'full-nested-learning-route.json'), 'utf8'));

const groupPrinciples = {
  'compare.unopened': ['P07', 'P08'],
  'compare.bet': ['P07', 'P08'],
  'compare.raise': ['P07', 'P08'],
  'update.response': ['P05', 'P06', 'P09', 'P10'],
  'update.card': ['P03', 'P04', 'P06', 'P11']
};
const parentReinforcement = {
  P01: ['4.5'],
  P02: ['3.1', '4.5'],
  P03: ['5.1', '5.4', '5.5', '5.6'],
  P04: ['5.1', '5.3', '5.4', '5.5'],
  P05: ['4.1', '4.3', '4.4'],
  P06: ['4.1', '4.2', '4.3', '5.7'],
  P07: ['1.1', '2.1', '3.1'],
  P08: ['1.8', '2.2', '3.1', '3.3'],
  P09: ['4.5'],
  P10: ['4.1', '4.3', '4.4'],
  P11: ['5.2', '5.3', '5.7', '5.8'],
  P12: []
};
const parentReview = {
  P12: ['p7_close']
};

const unitIds = new Set(bridge.rows.map(row => row.unitId));
const parentOrder = new Map([
  ['L1_preflop_context', 1], ['p1_context', 2], ['p2_board', 3], ['p3_range', 4],
  ['p4_compare', 5], ['p5_execute', 6], ['p6_update', 7], ['p7_close', 8]
]);
const principleStepOrder = new Map(principles.principles.map(principle => [principle.id, parentOrder.get(principle.firstStep) ?? 99]));
for (const [principle, ids] of Object.entries(parentReinforcement)) {
  for (const id of ids) {
    if (!unitIds.has(id)) throw new Error(`Unknown unit ${id} for ${principle}`);
    const unit = bridge.rows.find(row => row.unitId === id);
    const unitOrder = parentOrder.get(unit.parentFrame);
    if (unitOrder < principleStepOrder.get(principle)) throw new Error(`Reinforcement precedes first introduction: ${principle} -> ${id}`);
  }
}

const rows = principles.principles.map(principle => {
  const reinforcement = parentReinforcement[principle.id] ?? [];
  const byGroup = Object.fromEntries(Object.entries(groupPrinciples).map(([group, ids]) => [
    group,
    bridge.rows.filter(row => row.groupId === group && ids.includes(principle.id)).map(row => row.unitId)
  ]));
  return {
    principleId: principle.id,
    name: principle.name,
    firstIntroduction: principle.firstStep,
    firstQuestion: principle.question,
    reinforcementUnits: [...new Set([...reinforcement, ...Object.values(byGroup).flat()])],
    reinforcementByGroup: byGroup,
    reinforcementByParent: parentReview[principle.id] ?? [],
    transferField: principle.transferField,
    closureRule: '先在父步骤讲清，再在子题中使用，最后在相邻/延迟/连续队列中迁移；不能只凭子题数量证明掌握。'
  };
});

const unitCoverage = bridge.rows.map(row => ({
  unitId: row.unitId,
  parentFrame: row.parentFrame,
  groupId: row.groupId,
  principles: groupPrinciples[row.groupId],
  explicitReinforcement: Object.entries(parentReinforcement).filter(([, ids]) => ids.includes(row.unitId)).map(([id]) => id),
  hasOneQuestion: Boolean(row.teachingQuestion),
  returnsToParent: row.returnTo === row.parentFrame,
  exactGradeRequires: row.exactGradeRequires
}));

const allPrinciples = new Set(rows.map(row => row.principleId));
const coveredUnits = new Set(unitCoverage.filter(row => row.principles.length > 0).map(row => row.unitId));
const output = {
  id: 'PRINCIPLE_UNIT_CLOSURE_V1',
  status: 'paper_principle_unit_closure_compiled_not_trialed',
  sources: ['first-pass-principle-coverage.json', 'unit-architecture-bridge.json', 'full-nested-learning-route.json'],
  rules: {
    everyPrincipleIntroducedOnMainRoute: true,
    everyPrincipleReinforcedByNestedUnitsOrParentOnly: true,
    everyUnitAttachedToAtLeastOnePrinciple: true,
    firstIntroductionPrecedesReinforcement: true,
    transferMustUseDeclaredField: true,
    closureDoesNotProveStrategyOrNL50: true
  },
  principles: rows,
  units: unitCoverage,
  counts: {
    principles: rows.length,
    units: unitCoverage.length,
    principlesWithReinforcement: rows.filter(row => row.reinforcementUnits.length > 0 || row.reinforcementByParent.length > 0).length,
    unitsWithPrinciple: coveredUnits.size
  },
  currentEvidence: {
    allPrinciplesListed: allPrinciples.size === 12,
    all35UnitsAttached: coveredUnits.size === 35,
    learnerTrial: false,
    matchedStrategy: route.currentEvidence.completeMatchedStrategy,
    NL50Evidence: false
  }
};

fs.writeFileSync(path.join(dir, 'principle-unit-closure.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, status: output.status, principles: output.counts.principles, units: output.counts.units, unitsWithPrinciple: output.counts.unitsWithPrinciple }));
