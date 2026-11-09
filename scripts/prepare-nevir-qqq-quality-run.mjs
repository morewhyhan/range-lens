// New quality attempt after the first run ACTUALLY ended; never an observation-timeout restart.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const dir='research/nevir-system/';
const prior=JSON.parse(fs.readFileSync(dir+'sb-bb-qqq-run-state.json'));
const verification=JSON.parse(fs.readFileSync(dir+'sb-bb-qqq-reference-verification.json'));
assert.equal(prior.status,'finished_candidate_saved');assert.equal(prior.targetReached,false);assert.equal(verification.ok,true);
assert.equal(prior.stoppingReason,'wall_clock_limit');
const target='research/solver-probe/src/bin/sb_bb_qqq_reference_v2.rs';assert.equal(fs.existsSync(target),false,'Never overwrite an existing quality attempt');
let source=fs.readFileSync('research/solver-probe/src/bin/sb_bb_qqq_reference.rs','utf8');
const replacements=[['sb-bb-qqq-run-state.json','sb-bb-qqq-run-state-v2.json'],['sb-bb-qqq-reference-v1.bin','sb-bb-qqq-reference-v2.bin'],['sb-bb-qqq-reference-v1.partial','sb-bb-qqq-reference-v2.partial'],['sb-bb-qqq-reference-result.json','sb-bb-qqq-reference-result-v2.json'],['as_secs()>1200','as_secs()>7200'],['"wallLimitSeconds":1200','"wallLimitSeconds":7200']];
for(const[a,b]of replacements){assert.ok(source.includes(a));source=source.replaceAll(a,b);}
source='// Separate higher-precision attempt; v1 output and its failed target remain intact.\n'+source;
fs.writeFileSync(target,source);
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const out={status:'prepared_not_launched',inputFingerprint:prior.inputFingerprint,previousStatus:prior.status,previousIterations:240,previousTargetReached:false,
 reason:'First completed run failed its unchanged 0.006BB numerical target at the explicit twenty-minute wall limit. Increase compute time while preserving all ranges, menus, future streets and resource guards.',
 newSource:target,wallLimitSeconds:7200,maxIterations:2000,targetMetricBB:.006,threadsRequested:2,requestChanged:false,sourceSHA256:sha(target),
 originalRequestSHA256:sha(dir+'reference-request-btn-bb-a72.json'),QQQRequestSHA256:sha(dir+'reference-request-sb-bb-qqq.json'),priorResultSHA256:sha(dir+'sb-bb-qqq-reference-result.json'),appChanged:false};
fs.writeFileSync(dir+'sb-bb-qqq-quality-attempt-v2-preparation.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,source:target,wallLimitSeconds:7200,targetMetricBB:.006,previousRunTerminal:true,requestChanged:false}));
