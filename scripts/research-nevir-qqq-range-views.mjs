// Full-range selected-node author views; never publish these as course answers.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {jointFromFactoredReach,rangeView} from './nevir-range-view.mjs';
const dir='research/nevir-system/',source=fs.readFileSync(dir+'sb-bb-qqq-reload-export.json'),data=JSON.parse(source);
const verification=JSON.parse(fs.readFileSync(dir+'sb-bb-qqq-reference-verification.json'));
const hash=crypto.createHash('sha256').update(source).digest('hex');
assert.equal(hash,verification.sourceHashes[dir+'sb-bb-qqq-reload-export.json']);assert.equal(verification.ok,true);
const known=[{viewer:0,holding:'AsKd'},{viewer:1,holding:'7c6c'}];
const close=(a,b)=>assert.ok(Math.abs(a-b)<3e-5*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
let publicViews=0,privateViews=0,unsupported=0;
const records=[];
for(const n of data.nodes){
 const joint=jointFromFactoredReach({orderedHands:n.orderedHands,rawReachWeights:n.rawWeights},n.board);
 const views=[];
 for(let owner=0;owner<2;owner++){
  const v=rangeView(joint,{owner});publicViews++;
  const index=new Map(v.support.map(h=>[h.hole.slice().sort().join(''),h.mass]));
  n.orderedHands[owner].forEach((h,i)=>close(index.get(h.match(/.{2}/g).sort().join(''))??0,n.compatibleMassWeights[owner][i]));
  views.push(v);
 }
 for(const k of known){
  const v=rangeView(joint,{owner:k.viewer^1,viewer:k.viewer,knownHolding:k.holding});privateViews++;
  if(v.status!=='positive_declared_model_support')unsupported++;
  views.push(v);
 }
 for(const v of views){
  assert.equal(v.matrix.length,169);close(v.matrix.reduce((s,c)=>s+c.mass,0),v.denominator);
  if(v.denominator>0)close(v.matrix.reduce((s,c)=>s+c.probability,0),1);
  else assert.ok(v.matrix.every(c=>c.probability===null));
 }
 records.push({id:n.id,historyIndices:n.historyIndices,board:n.board,actor:n.actor,terminal:n.terminal,chance:n.chance,compatibleMass:joint.totalMass,views});
}
assert.equal(records.length,14);
const out={status:'selected_nodes_of_full_declared_tree_projected_not_course_policy_or_quality_pass',inputFingerprint:data.inputFingerprint,
 sourceSHA256:hash,verificationSource:'sb-bb-qqq-reference-verification.json',checks:{nodes:records.length,publicViews,privateViews,unsupportedPrivateViews:unsupported},
 engineTargetReached:verification.engineReportedTargetReached,engineMetricBB:verification.engineReportedMetricBB,
 viewsNotForGrading:true,productChanged:false,learnerTrials:0,
 limitations:['Only fourteen selected nodes, not every node or chance route independently exported.',
 'The public distribution and a known-own-hand opponent distribution have different conditioning.',
 'Compatible mass across different boards is not a path probability: chance denominators are not included.',
 'Per-board posterior probabilities are valid after conditioning; they do not certify the engine strategy or course simplification.',
 'Zero reach under this candidate reference is not an illegal real-world action or a learner error.',
 'No folded-player bunching. No source-course configuration recovery or NL50 validation.'],records};
fs.writeFileSync(dir+'sb-bb-qqq-range-views.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,...out.checks,engineTargetReached:out.engineTargetReached,gradingReference:false}));
