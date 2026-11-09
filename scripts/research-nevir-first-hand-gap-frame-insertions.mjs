import fs from 'node:fs';
import assert from 'node:assert/strict';

const x=JSON.parse(fs.readFileSync('research/nevir-system/first-hand-gap-frame-insertions.json','utf8'));
assert.equal(x.id,'FIRST_HAND_GAP_FRAME_INSERTIONS_V1');
assert.equal(x.status,'paper_insertion_spec_strategy_and_runtime_missing');
assert.equal(x.baseSequence.length,19);
assert.equal(x.insertions.length,6);
assert.deepEqual(x.insertions.map(i=>i.id),['I03','I05','I07','I08','I10','I11']);
assert.deepEqual(x.insertions.map(i=>i.principle),['P03','P05','P07','P08','P10','P11']);
for(const i of x.insertions){assert.ok(i.after&&i.before&&i.parent&&i.kind&&i.question&&i.visual&&i.answerIdentity&&i.requiredInputs.length&&i.returnsTo&&i.stop);}
for(const key of ['exactlySixInsertions','mainHistoryUnchanged','oneQuestionPerInsertion','oneCentralVisualPerInsertion','returnsToOriginalMainline','missingEvidenceStops','factDoesNotBecomeStrategy','noFlatHomeMenu']) assert.equal(x.rules[key],true);
assert.equal(x.currentEvidence.compiledIntoFirstHandPacket,false);
assert.equal(x.currentEvidence.NL50Evidence,false);
console.log(JSON.stringify({ok:true,status:x.status,insertions:x.insertions.length,principles:x.insertions.map(i=>i.principle),compiled:x.currentEvidence.compiledIntoFirstHandPacket}));
