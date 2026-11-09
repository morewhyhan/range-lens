import fs from 'node:fs';
import assert from 'node:assert/strict';

const x=JSON.parse(fs.readFileSync('research/nevir-system/gap-frame-reference-closure.json','utf8'));
assert.equal(x.id,'GAP_FRAME_REFERENCE_CLOSURE_V1');
assert.equal(x.status,'reference_closure_matrix_written_not_received');
assert.equal(x.rows.length,6);
assert.deepEqual(x.rows.map(r=>r.insertion),['I03','I05','I07','I08','I10','I11']);
assert.equal(x.requiredSharedConfiguration.length,10);
assert.equal(x.rows.find(r=>r.insertion==='I03').status,'fact_open_strategy_not_applicable');
assert.equal(x.rows.find(r=>r.insertion==='I05').referenceGate,'A72_RANGE_HANDOFF');
assert.equal(x.rows.find(r=>r.insertion==='I10').referenceGate,'G_FLOP_RESPONSE');
assert.equal(x.rows.find(r=>r.insertion==='I11').referenceGate,'G_TURN_HERO');
for(const key of ['allRowsUseSharedConfiguration','factAndStrategyIdentitiesSeparate','aggregateFrequencyNotEnoughForRangeDelta','missingReferenceStops','differentContextCannotSubstitute','zeroReceivedNodesCurrent']) assert.equal(x.rules[key],true);
assert.equal(x.currentEvidence.receivedRows,0);
assert.equal(x.currentEvidence.NL50Evidence,false);
console.log(JSON.stringify({ok:true,status:x.status,rows:x.rows.length,received:x.currentEvidence.receivedRows,strategyReady:x.currentEvidence.strategyReadyRows}));
