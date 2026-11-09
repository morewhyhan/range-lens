import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const dir='research/nevir-system/';
const read=p=>JSON.parse(fs.readFileSync(dir+p,'utf8'));
const model=read('bluff-reraise-model.json'),rules=read('bluff-reraise-rules-runtime.json');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
assert.equal(rules.status,'river_reraise_amounts_runtime_checked_not_solved');
assert.equal(rules.sourceRevision,fs.readFileSync('research/solver-source/.git/HEAD','utf8').trim());
assert.equal(rules.legalMinRaiseTo/100,45+(45-17.5));assert.equal(rules.rejectedBelowMinimum.amount,7249);
assert.match(rules.rejectedBelowMinimum.engineError,/min: 7250/);
assert.equal(rules.maxAllInTo/100,83);assert.equal(rules.heroToCallAfterShortAllIn/100,10.5);
assert.equal(rules.afterOpponentShortAllinActions,'[Fold, Call]');
assert.equal(rules.solveStarted,false);assert.equal(rules.strategyAllocated,false);
const expected={hearts:[3,6,9,-32/15],clubs:[2,7,9,601/90],Aheart_Qclub:[3,7,10,.51],Aclub_Qheart:[2,6,8,4.475]};
for(const row of model.rows){
 const [c,f,n,golden]=expected[row.id];assert.equal(row.counts.AKs,c);assert.equal(row.counts.KQo,f);assert.equal(row.legal.length,n);
 assert.deepEqual(row.currentValue,[0,14,13,12,9,7]);
 for(const holding of row.legal)assert.equal(new Set([...model.context.board,...row.hero,...holding.hole]).size,9);
 const p=row.profiles.find(p=>p.id==='KQo_fold52');const F=f/n*13/25;
 near(p.foldShare,F);near(p.minRaisePlan.evFromCurrentBB,golden);
 // Different endpoint settlement: a fold wins163 and a continued min-raise ends with10.5.
 near(F*163+(1-F)*10.5-65.5,golden);
 near(p.allInPlan.evFromCurrentBB,F*163+(1-F)*0-65.5);
 assert.ok(p.minRaisePlan.evFromCurrentBB>p.allInPlan.evFromCurrentBB);
 assert.equal(p.callEV,-27.5);assert.equal(p.grid.bestR,72.5);
 for(const leaf of [p.minRaisePlan.onFold.ending,p.minRaisePlan.onContinue.ending])near(leaf.hero+leaf.villain+399,600);
}
const h55=model.rows[0].profiles.find(p=>p.id==='KQo_fold55');assert.ok(h55.minRaisePlan.evFromCurrentBB>0);assert.ok(h55.allInPlan.evFromCurrentBB<0);
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const out={ok:true,status:'physical_blockers_current_node_amounts_and_values_checked_not_target_policy',sourceRevision:rules.sourceRevision,
 checks:{heroVariants:4,oneCardSuitControls:2,rankValuesEqual:true,ruleMinimum7250:true,belowMinimumRejected:true,shortAllinOnlyFoldCall:true,profile52EndpointOracles:4,allinOnlyMenuWouldMissAProfitableSizeAt55:true},
 files:Object.fromEntries(['research/solver-probe/src/bin/reraise_rules.rs','scripts/research-nevir-bluff-reraise.mjs',dir+'bluff-reraise-model.json',dir+'bluff-reraise-rules-runtime.json'].map(p=>[p,sha(p)])),
 limits:['This verifies a declared response model, not a solve or empirical poker strategy.','Opponent fold percentages are authored;52% was chosen to expose an action change, not measured.','A mathematical interval and check grid do not specify a real platform chip denomination.','No learner trial, GTO equilibrium or NL50 outcome verified.']};
fs.writeFileSync(dir+'bluff-reraise-verification.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({ok:true,status:out.status,checks:out.checks},null,2));
