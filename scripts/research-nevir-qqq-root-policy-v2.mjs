// Compare declared ROOT-ONLY substitutions against the frozen candidate continuation.
// No course rule is inferred; no opponent re-optimization or full-policy rounding is claimed.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir='research/nevir-system/',raw=fs.readFileSync(dir+'sb-bb-qqq-reload-export-v2.json'),d=JSON.parse(raw);
const v=JSON.parse(fs.readFileSync(dir+'sb-bb-qqq-reference-verification-v2.json'));
assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),v.sourceHashes[dir+'sb-bb-qqq-reload-export-v2.json']);
const n=d.nodes[0];assert.equal(n.actor,0);assert.deepEqual(n.actions,['Check','Bet(198)','Bet(402)','AllIn(9700)']);
const len=n.orderedHands[0].length,mass=n.compatibleMassWeights[0].reduce((s,w)=>s+w,0);
const half=[];for(let a=0;a<=2;a++)for(let b=0;b<=2-a;b++)for(let c=0;c<=2-a-b;c++)half.push([a/2,b/2,c/2,(2-a-b-c)/2]);
assert.equal(half.length,10);
const rows=n.orderedHands[0].map((h,i)=>{
 const frequency=n.actions.map((_,a)=>n.strategyActionMajor[a*len+i]),ev=n.actions.map((_,a)=>n.actionEV[a*len+i]);
 const base=frequency.reduce((s,p,a)=>s+p*ev[a],0);
 const nearest=half.map(p=>({p,d:p.reduce((s,x,a)=>s+(x-frequency[a])**2,0)})).sort((a,b)=>a.d-b.d)[0].p;
 const quantizedEV=nearest.reduce((s,p,a)=>s+p*ev[a],0);
 return {holding:h,mass:n.compatibleMassWeights[0][i],share:n.compatibleMassWeights[0][i]/mass,frequency,actionEVBB:ev.map(x=>x/100),
 referenceEVBB:base/100,nearestHalfGrid:nearest,halfGridEVBB:quantizedEV/100,halfGridDifferenceBB:(quantizedEV-base)/100,
 bestOneStepGainBB:(Math.max(...ev)-base)/100};
});
const baseline=rows.reduce((s,r)=>s+r.share*r.referenceEVBB,0);
const policies=[...n.actions.map((action,a)=>({name:'root_always_'+action,expectedBB:rows.reduce((s,r)=>s+r.share*r.actionEVBB[a],0)})),
 {name:'root_nearest_half_grid',expectedBB:rows.reduce((s,r)=>s+r.share*r.halfGridEVBB,0)}].map(p=>({...p,differenceFromCandidateBB:p.expectedBB-baseline}));
const gain=rows.reduce((s,r)=>s+r.share*r.bestOneStepGainBB,0);
// A root-only deviation is included in the engine's unrestricted finite-tree best response.
assert.ok(gain<=2*v.engineReportedMetricBB+.02,'Root-only gain exceeds declared global metric with numerical allowance');
const split=n.actions.indexOf('Bet(198)');
const child=d.nodes.find(n=>n.id==='after_SB_bet198');assert.ok(child);
const referenceBranchMass=child.compatibleMassWeights[0].reduce((s,w)=>s+w,0);
const largestLosses=rows.filter(r=>r.mass>0).sort((a,b)=>a.halfGridDifferenceBB-b.halfGridDifferenceBB).slice(0,10);
const out={status:'root_only_fixed_candidate_policy_diagnostics_not_course_policy_or_exploitability',inputFingerprint:d.inputFingerprint,
 sourceSHA256:crypto.createHash('sha256').update(raw).digest('hex'),engineTargetReached:v.engineReportedTargetReached,
 engineReportedMetricBB:v.engineReportedMetricBB,baselineRootEVBB:baseline,rootPolicies:policies,bestRootOnlyDeviationGainBB:gain,largestConditionalHalfGridLosses:largestLosses,
 branchComparison:{action:n.actions[split],referenceCompatibleBranchMass:referenceBranchMass,hypotheticalAlwaysActionBranchMass:mass,
 referenceRawOOPReach:child.rawWeights[0],hypotheticalRawOOPReach:n.rawWeights[0],orderedHands:n.orderedHands[0],
 meaning:'Root action likelihood changes only OOP raw reach; both public marginals must be rebuilt with card compatibility. No BB response has occurred yet.'},
 limitations:['Hypothetical author substitutions, not recovered course prescriptions.',
 'Only the first SB action changes. Both players use exactly the candidate continuation thereafter.',
 'Action EV arithmetic comes from the engine; independent selected terminal checks do not independently establish all these action values.',
 'No complete-policy simplification, adaptive opponent, new equilibrium or independent exploitability test.',
 'Nearest Euclidean frequency rounding need not preserve EV or strategy quality. This is a diagnostic, not the selected teaching policy.',
 'A global reference metric is not a per-holding action EV error bound. No pure-action or frequency grading is released.'],
 appChanged:false,courseAnswersGenerated:0,learnerTrials:0};
fs.writeFileSync(dir+'sb-bb-qqq-root-policy-diagnostics-v2.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,baselineRootEVBB:baseline,rootPolicies:policies,rootOnlyDeviationGainBB:gain,engineTargetReached:out.engineTargetReached,courseAnswersGenerated:0}));
