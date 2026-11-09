// Research packet, no UI or learner records. Physical combos precede 169-cell aggregation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fingerprint} from './nevir-practice-grader.mjs';
import {advanceRiverValue,replyRiverValue} from './nevir-river-value-executor.mjs';
const dir='research/nevir-system/',ranks='AKQJT98765432',suits='shdc';
const teacher=JSON.parse(fs.readFileSync(dir+'mixed-model-practice-teacher.json'));
const prompts=JSON.parse(fs.readFileSync(dir+'mixed-model-practice-prompts.json'));
const r=teacher.references.find(r=>r.family==='river_value'&&r.contributors.some(c=>c.node==='river_start'&&c.profile==='induces'));
const q=prompts.questions.find(q=>q.id===r.id);
const canonical=h=>[...h].sort().join('');
function cell(h){const a=ranks.indexOf(h[0][0]),b=ranks.indexOf(h[1][0]);if(a===b)return ranks[a]+ranks[b];const hi=Math.min(a,b),lo=Math.max(a,b);return ranks[hi]+ranks[lo]+(h[0][1]===h[1][1]?'s':'o');}
const deck=[...ranks].flatMap(r=>[...suits].map(s=>r+s));
const all=[];for(let i=0;i<52;i++)for(let j=i+1;j<52;j++)all.push({hole:[deck[i],deck[j]],cell:cell([deck[i],deck[j]])});
assert.equal(all.length,1326);
const cells=[...ranks].flatMap((a,i)=>[...ranks].map((b,j)=>i===j?a+b:i<j?a+b+'s':b+a+'o'));
assert.equal(new Set(cells).size,169);
for(const c of cells)assert.equal(all.filter(h=>h.cell===c).length,c.length===2?6:c.endsWith('s')?4:12);
const before=advanceRiverValue(r,q,{action:'check'});
const bet=replyRiverValue(before,'bet17_5');
const raise=advanceRiverValue(bet.reference,bet.question,{action:'raise',to:45});
const jam=replyRiverValue(raise,'jam83');
const baseline=10,known=new Set([...q.body.board,...q.body.hero]);
const states=[['before_bet','对手行动前',before],['after_bet','对手下注17.5后',bet],['after_own_raise','我们加到45后，等待对手',raise],['after_jam','对手全下83后',jam]];
const frames=states.map(([id,label,p])=>{
 const hs=p.question.body.currentRange.holdings,mass=hs.reduce((s,h)=>s+h.relativeWeight,0),byHand=new Map(hs.map(h=>[canonical(h.hole),h.relativeWeight]));
 const physical=all.map(h=>{const blocked=h.hole.some(c=>known.has(c)),weight=byHand.get(canonical(h.hole))??0;assert.ok(!blocked||weight===0);return {...h,physicalStatus:blocked?'blocked_by_known_cards':'legal',modelStatus:weight>0?'positive_model_support':'zero_in_declared_finite_model',mass:weight,conditionalProbability:weight/mass};});
 const matrix=cells.map(c=>{const a=physical.filter(h=>h.cell===c);const m=a.reduce((s,h)=>s+h.mass,0);return {cell:c,legalPhysicalCombos:a.filter(h=>h.physicalStatus==='legal').length,supportedPhysicalCombos:a.filter(h=>h.mass>0).length,mass:m,baselineShare:m/baseline,conditionalProbability:m/mass};});
 assert.equal(physical.filter(h=>h.physicalStatus==='legal').length,990);
 assert.ok(Math.abs(matrix.reduce((s,c)=>s+c.mass,0)-mass)<1e-9);
 assert.ok(Math.abs(matrix.reduce((s,c)=>s+c.conditionalProbability,0)-1)<1e-9);
 return {id,label,rangeOwner:'BTN',perspective:'SB holding 9c9d',knownCards:[...known],actor:p.question.body.actor,state:p.question.body.state,history:p.question.body.observedHistory,totalRelativeMass:mass,retainedAgainstFirstFrame:mass/baseline,physical,matrix,inputFingerprint:fingerprint(p.question.body)};
});
assert.deepEqual(frames.map(f=>f.totalRelativeMass),[10,9,9,3]);
assert.deepEqual(frames[1].physical.map(h=>h.mass),frames[2].physical.map(h=>h.mass));
const kk=frames.map(f=>f.matrix.find(c=>c.cell==='KK'));
assert.deepEqual(kk.map(c=>c.mass),[1,1,1,1]);
assert.ok(Math.abs(kk[3].conditionalProbability-1/3)<1e-9);
const out={status:'author_range_chart_data_contract_not_product_or_target_policy',sourceInputFingerprint:r.inputFingerprint,
 coverage:'Complete only inside the declared five-holding fixed-opponent model. Zero outside this model does not mean a real opponent cannot hold that hand.',
 massUnit:'Relative probability mass, not a number of physical combinations.',baselineMass:baseline,
 opponentPolicyKnownByConstruction:true,learnerObserved:false,newNL50Coverage:false,frames,
 checks:{physicalCombos:1326,cells:169,legalGivenSevenKnownCards:990,masses:[10,9,9,3],ownKnownActionDoesNotFilterOpponent:true,kkMassUnchangedButShareRises:true}};
fs.writeFileSync(dir+'range-chart-contract-packet.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,...out.checks}));
