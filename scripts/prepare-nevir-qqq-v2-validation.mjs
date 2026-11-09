// Separate v2 readers/checks. Preserve every v1 binary, export and verification artifact.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir='research/nevir-system/',manifest=dir+'sb-bb-qqq-v2-validation-preparation.json';
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
if(process.argv.includes('--record-build')){
 const m=JSON.parse(fs.readFileSync(manifest));
 for(const[f,h]of Object.entries(m.sourceHashes))assert.equal(hash(f),h);
 m.rustLoaderCompiled=true;m.loaderBinary='research/solver-probe/target/release/sb_bb_qqq_reload_v2.exe';m.loaderBinarySHA256=hash(m.loaderBinary);
 fs.writeFileSync(manifest,JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify({ok:true,rustLoaderCompiled:true,completeReferenceLoaded:false}));
}else{
 const groups=[
  ['research/solver-probe/src/bin/sb_bb_qqq_reload.rs','research/solver-probe/src/bin/sb_bb_qqq_reload_v2.rs'],
  ['scripts/verify-nevir-sb-bb-reference.mjs','scripts/verify-nevir-sb-bb-reference-v2.mjs'],
  ['scripts/research-nevir-qqq-range-views.mjs','scripts/research-nevir-qqq-range-views-v2.mjs'],
  ['scripts/research-nevir-qqq-root-policy.mjs','scripts/research-nevir-qqq-root-policy-v2.mjs'],
  ['scripts/research-nevir-qqq-fold-identification.mjs','scripts/research-nevir-qqq-fold-identification-v2.mjs']
 ];
 const replacements=[['sb-bb-qqq-run-state.json','sb-bb-qqq-run-state-v2.json'],['sb-bb-qqq-reference-result.json','sb-bb-qqq-reference-result-v2.json'],
  ['sb-bb-qqq-reference-v1.bin','sb-bb-qqq-reference-v2.bin'],['sb-bb-qqq-reload-export.json','sb-bb-qqq-reload-export-v2.json'],
  ['sb-bb-qqq-reload-comparison.json','sb-bb-qqq-reload-comparison-v2.json'],['sb-bb-qqq-reference-verification.json','sb-bb-qqq-reference-verification-v2.json'],
  ['sb_bb_qqq_reference.rs','sb_bb_qqq_reference_v2.rs'],['sb_bb_qqq_reload.rs','sb_bb_qqq_reload_v2.rs'],
  ['sb_bb_qqq_reference.exe','sb_bb_qqq_reference_v2.exe'],['sb_bb_qqq_reload.exe','sb_bb_qqq_reload_v2.exe'],
  ['sb-bb-qqq-range-views.json','sb-bb-qqq-range-views-v2.json'],['sb-bb-qqq-root-policy-diagnostics.json','sb-bb-qqq-root-policy-diagnostics-v2.json'],
  ['sb-bb-qqq-fold-identification.json','sb-bb-qqq-fold-identification-v2.json']];
 assert.equal(fs.existsSync(manifest),false,'Do not replace an existing validation preparation');
 for(const[,target]of groups)assert.equal(fs.existsSync(target),false,'Existing target '+target);
 const hashes={};
 for(const[from,target]of groups){let s=fs.readFileSync(from,'utf8');for(const[a,b]of replacements)s=s.replaceAll(a,b);fs.writeFileSync(target,s);hashes[target]=hash(target);}
 const m={status:'prepared_pending_completed_v2_strategy_not_validation_success',sourceHashes:hashes,rustLoaderCompiled:false,
 inputFingerprint:JSON.parse(fs.readFileSync(dir+'reference-request-sb-bb-qqq.json')).inputFingerprint,
 expectedArtifacts:['sb-bb-qqq-reload-export-v2.json','sb-bb-qqq-reference-verification-v2.json','sb-bb-qqq-range-views-v2.json','sb-bb-qqq-root-policy-diagnostics-v2.json','sb-bb-qqq-fold-identification-v2.json'],
 v1FilesPreserved:true,referenceLoaded:false,NL50Reference:false,appChanged:false};
 fs.writeFileSync(manifest,JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify({ok:true,preparedFiles:groups.length,completeReferenceLoaded:false}));
}
