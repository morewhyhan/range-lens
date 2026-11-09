import fs from 'node:fs';
import crypto from 'node:crypto';
import { assertReferenceCandidateNotLearnerReady, verifyReferenceCandidate } from '../src/gto-reference.js';

const root = new URL('../research/nevir-system/', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, root), 'utf8'));
const sha256 = name => crypto.createHash('sha256').update(fs.readFileSync(new URL(name, root))).digest('hex');
const request = read('reference-request-sb-bb-qqq.json');
const result = read('sb-bb-qqq-reference-result-v2.json');
const verification = read('sb-bb-qqq-reference-verification-v2.json');
const views = read('sb-bb-qqq-range-views-v2.json');
const rollouts = read('qqq-policy-rollouts-v2-verification.json');
const summary = verifyReferenceCandidate({ request, result, verification, views, rollouts });
assertReferenceCandidateNotLearnerReady(summary);
console.log(JSON.stringify({
  ...summary,
  resultSHA256: sha256('sb-bb-qqq-reference-result-v2.json'),
  rangeViewsSHA256: sha256('sb-bb-qqq-range-views-v2.json'),
  rolloutVerificationSHA256: sha256('qqq-policy-rollouts-v2-verification.json'),
}, null, 2));
