import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAPTERS,MODEL_PROFILES,COURSE_CASES,chapterPlan,practiceFamilies,createGuidedQuestion,createPracticeQuestion,makeRiverModel,riverEV,bestActions,updateRange,validateModel,learningScoreKey} from '../src/learning.js';
import {activeRules} from '../src/rules.js';
import {assertCards,evaluate,compare} from '../src/poker.js';

function seeded(seed=9){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('the worked example changes its optimum when ONLY the weak calling response changes',()=>{
 const a=makeRiverModel({rng:seeded(12)}),b={...a,groups:a.groups.map(g=>({...g,calls:{...g.calls,large:g.id==='B'?1:g.calls.large}}))};
 for(const [action,wanted] of [['check',8],['small',9],['large',6]])near(riverEV(a,action).value,wanted);
 near(riverEV(b,'large').value,10);assert.deepEqual(bestActions(a),['small']);assert.deepEqual(bestActions(b),['large']);
 assert.deepEqual(a.board,b.board);assert.deepEqual(a.hole,b.hole);
});
test('value, checking, successful and unsuccessful bluffs include ALL branches and the checking alternative',()=>{
 const expectations={sticky:[8,9,10],noValue:[8,7,6],bluffOften:[0,5.5,6],bluffRare:[0,-3.5,-7]};
 for(const [profile,values] of Object.entries(expectations)){
  const m=makeRiverModel({profile,rng:seeded(47)});
  ['check','small','large'].forEach((a,i)=>near(riverEV(m,a).value,values[i]));
 }
 // Split pots return half the original pot, with own new bet cancelling.
 const tie={pot:10,bets:{small:5,large:10},groups:[{weight:1,equity:.5,calls:{small:1,large:1}}]};
 ['check','small','large'].forEach(a=>near(riverEV(tie,a).value,5));
});
test('fractional response EV agrees with an independent outcome enumeration',()=>{
 const rng=seeded(99);
 for(let i=0;i<100;i++){
  const m=makeRiverModel({profile:MODEL_PROFILES[i%5],pool:i%2?'test':'train',variant:i%4,pot:6+i/10,rng});
  for(const action of ['small','large']){
   const B=m.bets[action];let independent=0;
   for(const g of m.groups){
    independent+=g.weight*(1-g.calls[action])*m.pot;
    independent+=g.weight*g.calls[action]*g.equity*(m.pot+B);
    independent-=g.weight*g.calls[action]*(1-g.equity)*B;
   }
   near(riverEV(m,action).value,independent);
  }
 }
});
test('slowplay keeps strong hands in the conditional calling range; impossible actions fail explicitly',()=>{
 const groups=[{weight:.4,responses:{call:.2,raise:0}},{weight:.4,responses:{call:.4,raise:.1}},{weight:.2,responses:{call:.2,raise:.8}}];
 const updated=updateRange(groups,'call');near(updated[0].posterior,2/7);near(updated[1].posterior,4/7);near(updated[2].posterior,1/7);
 const slow=updateRange(groups.map((g,i)=>i===2?{...g,responses:{call:.8,raise:.2}}:g),'call');near(slow[2].posterior,.4);
 near(slow.reduce((s,g)=>s+g.posterior,0),1);
 assert.throws(()=>updateRange([{weight:1,responses:{call:0}}],'call'),/不会发生/);
});
test('every chapter has causal contrasts, boundaries, and held-out exercises with legal cards and answer provenance',()=>{
 const rng=seeded(95);
 for(const c of CHAPTERS){
  const plan=chapterPlan(c.id);assert.ok(plan.length>=8,c.id);assert.ok(plan.some(s=>s.phase==='contrast'),c.id);assert.ok(plan.some(s=>s.phase==='boundary'),c.id);
  assert.ok(practiceFamilies(c.id).length,c.id);
  for(const s of plan)for(let i=0;i<8;i++){
   const q=createGuidedQuestion(c.id,s.index,rng);assertCards([...q.board,...q.hole]);
   assert.equal(q.options.filter(o=>o.id===q.correct).length,1);
   assert.ok(q.chain.condition&&q.chain.change&&q.chain.result);
   if(q.authority==='course')assert.ok(activeRules.find(r=>r.id===q.sourceId));
   if(q.model)validateModel(q.model);
   if(q.comparison){assert.deepEqual(q.model.board,q.comparison.board);assert.deepEqual(q.model.hole,q.comparison.hole);}
  }
 }
});
test('held-out rank structures are genuinely different and full course coverage never opens pending nodes',()=>{
 const train=new Set(),heldout=new Set();const signature=m=>m.board.map(c=>c.rank).sort((a,b)=>a-b).join(',');
 for(let i=0;i<4;i++){train.add(signature(makeRiverModel({pool:'train',variant:i})));heldout.add(signature(makeRiverModel({pool:'test',variant:i})));}
 for(const board of heldout)assert.ok(!train.has(board));
 const rng=seeded();
 for(const c of CHAPTERS){
  const taught=new Set(chapterPlan(c.id).filter(s=>s.kind==='course'&&s.phase!=='transfer').map(s=>s.query));
  for(const spec of practiceFamilies(c.id)){
   const q=createPracticeQuestion(c.id,rng,spec);assert.equal(q.pool,'test');
   if(q.authority==='course')assert.ok(!taught.has(q.courseId),q.courseId);
  }
 }
 const supported=new Set(COURSE_CASES.map(c=>c.ruleId));
 for(const r of activeRules.filter(r=>r.size||r.direction||r.frequency||r.hands?.length||r.task))assert.ok(supported.has(r.id),r.id);
 assert.equal(COURSE_CASES.length,75);
});
test('middle pairs and strong value pairs in the SAME response model produce different decisions',()=>{
 const a=createGuidedQuestion('hands',0,seeded(18)),b=createGuidedQuestion('hands',1,seeded(18));
 assert.deepEqual(a.board,b.board);assert.notDeepEqual(a.hole,b.hole);
 assert.equal(a.correct,'large');assert.equal(b.correct,'check');
 assert.equal(b.model.groups[0].equity,1);assert.equal(b.model.groups[1].equity,0);
});
test('turn comparisons evaluate every remaining weighted group and actual completed draws',()=>{
 const rng=seeded(100);
 for(const spec of chapterPlan('turn').filter(s=>s.kind==='turn')){
  const q=createGuidedQuestion('turn',spec.index,rng);
  for(const g of q.groups){assertCards([...q.comparisonBoard,...q.hole,...g.cards]);}
  if(q.priorGroups){
   near(q.groups.reduce((s,g)=>s+g.weight,0),1);
   const losing=board=>q.groups.reduce((s,g)=>s+g.weight*(compare(evaluate([...board,...q.hole]),evaluate([...board,...g.cards]))<0),0);
   assert.ok(losing(q.comparisonBoard)>losing(q.board));assert.equal(q.correct,'right');
  }else assert.ok(['顺子','同花','同花顺'].includes(evaluate([...q.comparisonBoard,...q.groups[0].cards]).name));
 }
});
test('chapter scores and learning/practice/mixed scores are separate',()=>{
 assert.notEqual(learningScoreKey('size','learn'),learningScoreKey('size','practice'));
 assert.notEqual(learningScoreKey('size','learn'),learningScoreKey('hands','learn'));
 assert.notEqual(learningScoreKey('size','practice'),learningScoreKey('size','mixed'));
});
test('conditional ranges mark joint leaders correctly and reject invalid inputs',()=>{
 const step=chapterPlan('response').find(s=>s.kind==='response'&&s.query==='largest'&&s.extra==='slow');
 const q=createGuidedQuestion('response',step.index,seeded(21));
 const updated=updateRange(q.groups,q.rangeAction);
 near(updated[1].posterior,.4);near(updated[2].posterior,.4);
 assert.equal(q.correct,'B+C');assert.ok(q.options.find(o=>o.id==='B+C').label.includes('并列'));
 assert.throws(()=>updateRange([{weight:-1,responses:{call:1}}],'call'));
 assert.throws(()=>updateRange([{weight:1,responses:{call:1.2}}],'call'));
});
