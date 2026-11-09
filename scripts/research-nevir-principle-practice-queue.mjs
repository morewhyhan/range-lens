import fs from 'node:fs';
import assert from 'node:assert/strict';

const q=JSON.parse(fs.readFileSync('research/nevir-system/principle-practice-queue.json','utf8'));
assert.equal(q.id,'PRINCIPLE_PRACTICE_QUEUE_V1');
assert.equal(q.status,'paper_queue_defaults_not_calibrated');
assert.deepEqual(q.lanes.map(x=>x.id),['same_mechanism','adjacent_contrast','delayed_recall','continuous_integration']);
assert.deepEqual(q.lanes.map(x=>x.defaultItems),[5,5,4,1]);
assert.equal(q.lanes[0].pass.firstAttemptCorrectAtLeast,4);
assert.equal(q.lanes[1].exactlyOneChangedField,true);
assert.equal(q.lanes[2].interveningItemsRequired,true);
assert.equal(q.lanes[3].requires.length,3);
for(const key of ['lockPrincipleBeforeState','lockAnswerIdentityBeforeQuestion','saveAnswerAndStopReasonBeforeExposure','oneQuestionPerItem','onePrimaryActionPerItem','sameMechanismChangesSurfaceOnly','adjacentContrastExactlyOneField','delayedRecallHidesTargetMechanism','missingReferenceKeepsActionUnknown','missingSuccessorStopsCurrentParent']) assert.equal(q.generation[key],true);
for(const key of ['noLaneSkipping','retryIsNotIndependent','dontKnowCountsWrong','sameParentAfterError','paperDefaultsRequireCalibration']) assert.equal(q.promotion[key],true);
assert.equal(q.currentEvidence.lowBaselineCalibrated,false);
assert.equal(q.currentEvidence.NL50Evidence,false);
console.log(JSON.stringify({ok:true,status:q.status,lanes:q.lanes.length,defaults:q.lanes.map(x=>x.defaultItems),calibrated:q.currentEvidence.lowBaselineCalibrated}));
