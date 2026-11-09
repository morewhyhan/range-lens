// Preserve the exact prior lock identity, never rewrite historical runtime claims.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const current=fs.readFileSync('research/solver-probe/Cargo.lock','utf8');
const old=JSON.parse(fs.readFileSync('research/nevir-system/engine-export-verification.json')).fileHashes['research/solver-probe/Cargo.lock'];
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
let candidate=current.split(/(?=\[\[package\]\])/).filter(b=>!/^\[\[package\]\]\r?\nname = "(?:bincode|bincode_derive|virtue)"\r?\n/.test(b)).join('');
candidate=candidate.replace(/^ "bincode(?:_derive)?",\r?\n/gm,'');
assert.equal(sha(candidate),old,'Do not manufacture an approximate historical lock');
const file='research/nevir-system/Cargo-before-storage.lock';
fs.writeFileSync(file,candidate);
fs.writeFileSync('research/nevir-system/solver-lock-history.json',JSON.stringify({status:'exact_historical_lock_identity_archived_not_old_binary_rebuilt',archivedFile:file,archivedSHA256:old,currentSHA256:sha(current),addedPackages:['bincode 2.0.0-rc.3','bincode_derive 2.0.0-rc.3','virtue 0.0.13'],oldRuntimeResultsNotRewritten:true},null,2)+'\n');
console.log(JSON.stringify({ok:true,archivedFile:file,exactPriorSHA256:old}));
