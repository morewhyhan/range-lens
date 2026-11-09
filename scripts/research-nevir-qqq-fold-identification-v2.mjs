// Identification bounds: a +5 percentage-point population fold statistic is insufficient
// to identify per-holding folds. This is a declared sensitivity study, not population data.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const dir='research/nevir-system/',raw=fs.readFileSync(dir+'sb-bb-qqq-reload-export-v2.json'),d=JSON.parse(raw);
const v=JSON.parse(fs.readFileSync(dir+'sb-bb-qqq-reference-verification-v2.json'));
assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),v.sourceHashes[dir+'sb-bb-qqq-reload-export-v2.json']);
const n=d.nodes.find(n=>n.id==='after_SB_bet198');assert.equal(n.actor,1);
const len=n.orderedHands[1].length,foldIndex=n.actions.indexOf('Fold');assert.ok(foldIndex>=0);
const total=n.compatibleMassWeights[1].reduce((s,w)=>s+w,0);
const publicP=n.compatibleMassWeights[1].map(w=>w/total),fold=n.orderedHands[1].map((_,i)=>n.strategyActionMajor[foldIndex*len+i]);
const baseFold=fold.reduce((s,f,i)=>s+publicP[i]*f,0),delta=.05;
const capacity=publicP.map((p,i)=>p*(1-fold[i]));assert.ok(capacity.reduce((s,c)=>s+c,0)>=delta);
const hole=h=>h.match(/.{2}/g),key=h=>hole(h).sort().join(''),close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function bound(conditional,maximize){
 const options=publicP.map((p,i)=>({i,r:p>0?conditional[i]/p:0,c:capacity[i]})).filter(o=>o.c>0).sort((a,b)=>maximize?b.r-a.r:a.r-b.r);
 let left=delta,lambda=0;const increment=publicP.map(()=>0);
 for(const o of options){if(left<=1e-14)break;const x=Math.min(left,o.c);increment[o.i]=x/publicP[o.i];left-=x;lambda=o.r;}
 close(left,0);close(increment.reduce((s,x,i)=>s+publicP[i]*x,0),delta);
 increment.forEach((x,i)=>assert.ok(x>=0&&x<=1-fold[i]+1e-9));
 const primal=increment.reduce((s,x,i)=>s+conditional[i]*x,0);
 const dual=lambda*delta+options.reduce((s,o)=>s+o.c*(maximize?Math.max(o.r-lambda,0):Math.min(o.r-lambda,0)),0);
 close(primal,dual);
 return {conditionalIncrease:primal,dualCertificate:dual,increasePerBBHolding:increment};
}
const selected=['AsKd','Ah2h','QcAc','2s2h'],records=[];
for(const h of selected){
 const index=n.orderedHands[0].findIndex(o=>key(o)===key(h));
 if(index<0||n.compatibleMassWeights[0][index]===0){records.push({holding:h,status:'not_supported_on_this_reference_branch'});continue;}
 const own=hole(h),weights=n.orderedHands[1].map((o,i)=>hole(o).some(c=>own.includes(c))?0:n.rawWeights[1][i]);
 const sum=weights.reduce((s,w)=>s+w,0),p=weights.map(w=>w/sum);
 const base=p.reduce((s,x,i)=>s+x*fold[i],0),lo=bound(p,false),hi=bound(p,true);
 assert.ok(lo.conditionalIncrease<=hi.conditionalIncrease+1e-9);
 records.push({holding:h,status:'positive_reference_support',baselineConditionalFold:base,
 minimumConditionalFold:base+lo.conditionalIncrease,maximumConditionalFold:base+hi.conditionalIncrease,
 minimum:lo,maximum:hi});
}
assert.ok(records.some(r=>r.status==='positive_reference_support'));
const out={status:'conditional_fold_identification_bounds_under_declared_sensitivity_not_empirical_course_adjustment',inputFingerprint:d.inputFingerprint,
 engineTargetReached:v.engineReportedTargetReached,sourceSHA256:crypto.createHash('sha256').update(raw).digest('hex'),
 branch:'SB bets1.98 into6, BB current response',baselinePublicFold:baseFold,hypotheticalAdditionalPublicFoldPercentagePoints:5,
 hypotheticalPublicFold:baseFold+delta,allPerHandFoldChangesNonnegative:true,records,
 method:'Fractional-knapsack extrema with matching linear dual certificates. Shift nonfold probability to fold; this does not identify whether call or raise mass changed.',
 limitations:['Five percentage points is a declared sensitivity amount, not a recovered measurement or a resolution of ambiguous percent wording in the notes.',
 'Root policy and public branch distribution remain fixed for this calculation.',
 'No EV, optimal-action or simplification-loss conclusion follows from these fold-rate bounds alone.',
 'Candidate solver policy remains subject to its stated numerical quality and configuration limits.'],courseAnswersGenerated:0,appChanged:false,learnerTrials:0};
fs.writeFileSync(dir+'sb-bb-qqq-fold-identification-v2.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,baselinePublicFold:baseFold,hypotheticalPublicFold:baseFold+delta,records:records.map(({minimum,maximum,...r})=>r),courseAnswersGenerated:0}));
