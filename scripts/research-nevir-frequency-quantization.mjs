import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir='research/nevir-system/';
const algorithm=JSON.parse(fs.readFileSync(dir+'frequency-quantization-and-edge-compilation.json','utf8'));
const compiler=JSON.parse(fs.readFileSync(dir+'strategy-to-course-compiler-contract.json','utf8'));
const evaluation=JSON.parse(fs.readFileSync(dir+'simplification-evaluation-contract.json','utf8'));
const a72=JSON.parse(fs.readFileSync(dir+'a72-reference-acquisition-spec.json','utf8'));

assert.equal(algorithm.id,'FREQUENCY_QUANTIZATION_EDGE_COMPILATION_V1');
assert.equal(algorithm.status,'quantization_algorithm_written_reference_missing');
assert.deepEqual(algorithm.policySpace.values,[0,0.5,1]);
assert.equal(algorithm.policySpace.constraint,'sum(q_a)=1');
assert.equal(algorithm.policySpace.unsupportedMultiActionCompression,true);
for(const key of ['wBefore','referenceFrequency','courseWeight','frequencyLoss','localEvLoss','referenceAfter','courseAfter','rangeDelta','margin','supportCount'])assert.ok(algorithm.variables[key]);
assert.deepEqual(algorithm.quantizationOrder,['preserveSupportedAction','minimizeFrequencyLoss','minimizeLocalEvLoss','retainEdgeUnresolvedOnTie']);
assert.equal(algorithm.edgeSampling.samplingDoesNotChangeEvaluationWeight,true);
assert.equal(algorithm.edgeSampling.thresholdCalibrationRequired,true);
assert.equal(algorithm.releaseGates.missingReferenceBlocksQuantization,true);
assert.equal(algorithm.releaseGates.physicalFilterSeparateFromActionFilter,true);
assert.equal(algorithm.releaseGates.edgeSamplingDoesNotChangePolicyWeight,true);
assert.equal(compiler.hardGates.noRandomFrequencyApproximation,true);
assert.equal(compiler.hardGates.noRangeInvented,true);
assert.equal(evaluation.releaseGates.singleScenarioCannotSetGlobalThreshold,true);
assert.equal(a72.currentEvidence.solveStarted,false);
assert.equal(algorithm.currentEvidence.matchedReference,false);
assert.equal(algorithm.currentEvidence.quantizationRun,false);
assert.equal(algorithm.currentEvidence.edgeThresholdsCalibrated,false);
console.log(JSON.stringify({ok:true,status:algorithm.status,quantizationRun:algorithm.currentEvidence.quantizationRun,edgeThresholdsCalibrated:algorithm.currentEvidence.edgeThresholdsCalibrated,referenceRequired:true}));
