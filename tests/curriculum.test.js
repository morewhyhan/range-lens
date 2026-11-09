import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILLS,lessonPlan,createLessonQuestion,createPracticeQuestion,createRoute,ROUTE_CHOICES,SOURCE_CATALOG,prepareQuestion,gradeTask,instanceKey,scoreKey,increment} from '../src/curriculum.js';
import {COURSE_CASES} from '../src/learning.js';
import {allRules} from '../src/rules.js';
import {DECK,evaluate,compare,card,assertCards} from '../src/poker.js';
import {actionAtSeat} from '../src/context.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function seeded(seed=11){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const correctValue=q=>q.interaction==='five'?q.best.map(c=>c.id):q.expected||q.correct;
test('six-seat history assigns each action to its own actor, not another player in the same sentence',()=>{
 const h=['你在BTN开池，BB跟注','已经到河牌，BB过牌','现在你可以过牌或下注'];
 assert.equal(actionAtSeat(h,'BTN','BTN','BB'),'开池');assert.equal(actionAtSeat(h,'BB','BTN','BB'),'过牌');
 assert.equal(actionAtSeat(['BTN开池','你在SB 3bet','BTN跟注','你过牌，对手下注'],'SB','SB','BTN'),'过牌');
 assert.equal(actionAtSeat(['BTN开池','你在SB 3bet','BTN跟注','你过牌，对手下注'],'BTN','SB','BTN'),'下注');
});
function independentEV(m,action){
 const B=action==='check'?0:m.bets[action];let ev=0;
 for(const g of m.groups){const cmp=compare(evaluate([...m.board,...m.hole]),evaluate([...m.board,...g.cards])),e=cmp>0?1:cmp<0?0:.5;
  if(action==='check')ev+=g.weight*e*m.pot;
  else{const c=g.calls[action];ev+=g.weight*((1-c)*m.pot+c*e*(m.pot+B)-c*(1-e)*B);}
 }
 return ev;
}
test('18 skills have manual demonstration, scaffold, contrasts, independent application and generated answers',()=>{
 assert.equal(SKILLS.length,18);const rng=seeded(72);let total=0;
 for(const s of SKILLS){
  const p=lessonPlan(s.id);assert.equal(p[0].phase,'demo');assert.ok(p.some(p=>p.phase==='guided'));assert.ok(p.filter(p=>p.phase==='contrast').length>=2);assert.ok(p.filter(p=>p.phase==='independent').length>=2);
  for(let i=0;i<p.length;i++){const q=createLessonQuestion(s.id,i,rng);assert.equal(q.skillId,s.id);assert.ok(gradeTask(q,correctValue(q)));assert.ok(!gradeTask(q,'__unknown__'));assert.ok(q.source&&q.explanation&&q.answer);if(p[i].phase==='contrast')assert.ok(q.beforeModel||q.beforeGroups||q.leftBoard||q.contrastBefore,`${s.id} needs an actual comparison`);total++;}
  for(const variant of s.variants)for(let i=0;i<8;i++){const q=createPracticeQuestion(s.id,{rng,serial:i,variant});assert.ok(gradeTask(q,correctValue(q)),`${s.id}/${variant}`);assert.ok(!gradeTask(q,'__unknown__'));total++;}
 }
 assert.ok(total>700);
});
test('generated action answers agree with independent weighted outcome enumeration, including unchanged optima',()=>{
 const rng=seeded(381);let comparisons=0;
 for(const id of ['08','09','10','15'])for(let serial=0;serial<80;serial++){
  const q=createPracticeQuestion(id,{rng,serial});if(!q.model||!q.accepted.some(a=>['check','small','large'].includes(a)))continue;
  const ev=['check','small','large'].map(a=>[a,independentEV(q.model,a)]),max=Math.max(...ev.map(([,v])=>v));
  for(const [a,value]of ev)assert.equal(gradeTask(q,a),Math.abs(value-max)<1e-8);
  if(q.beforeModel){const before=['check','small','large'].map(a=>[a,independentEV(q.beforeModel,a)]),oldMax=Math.max(...before.map(([,v])=>v));if(q.variant==='no-flip')assert.deepEqual(before.filter(([,v])=>Math.abs(v-oldMax)<1e-8).map(([a])=>a),ev.filter(([,v])=>Math.abs(v-max)<1e-8).map(([a])=>a));}
  comparisons++;
 }
 assert.ok(comparisons>100);
});
test('same best-five value accepts alternative physical cards; wrong five cards do not pass',()=>{
 const q=prepareQuestion({title:'选五张',correct:'__five__',interaction:'five',board:['As','Ah','Kd','Qc','Js'].map(card),hole:['Ac','Ad'].map(card),selectionCards:['As','Ah','Kd','Qc','Js','Ac','Ad'].map(card),best:['As','Ah','Ac','Ad','Kd'].map(card),options:[],answer:'四条',explanation:'四条A与K踢脚',source:'规则',family:'test'});
 assert.ok(gradeTask(q,['As','Ah','Ac','Ad','Kd']));assert.ok(!gradeTask(q,['As','Ah','Ac','Ad','Qc']));assert.ok(!gradeTask(q,['As','As','Ac','Ad','Kd']));
 const tie=prepareQuestion({...q,board:['As','Kd','Qh','Jc','Ts'].map(card),hole:['Th','2c'].map(card),selectionCards:['As','Kd','Qh','Jc','Ts','Th','2c'].map(card),best:['As','Kd','Qh','Jc','Ts'].map(card)});
 assert.ok(gradeTask(tie,['As','Kd','Qh','Jc','Th']));assert.ok(gradeTask(tie,['As','Kd','Qh','Jc','Ts']));
});
test('dirty outs are actual winning rivers rather than every flush card',()=>{
 const q=createPracticeQuestion('03',{variant:'dirty-outs',rng:seeded(13)}),known=[...q.board,...q.hole,...q.opponentHole],remaining=DECK.filter(c=>!known.some(k=>k.id===c.id));
 const wins=remaining.filter(c=>compare(evaluate([...q.board,...q.hole,c]),evaluate([...q.board,...q.opponentHole,c]))>0);
 assert.equal(remaining.length,44);assert.equal(wins.length,7);assert.equal(q.correct,'7');assert.deepEqual(new Set(q.outCards.map(c=>c.id)),new Set(wins.map(c=>c.id)));
 assert.equal(q.dirtyExample.heroName,'同花');assert.equal(q.dirtyExample.opponentName,'葫芦');assert.ok(compare(evaluate(q.dirtyExample.hero),evaluate(q.dirtyExample.opponent))<0);
});
test('single-outcome delta uses the explicitly stated certain call, with no contradictory response tags',()=>{
 for(let serial=0;serial<6;serial++){
  const q=createPracticeQuestion('08',{variant:'delta',serial,rng:seeded(3+serial)}),g=q.groups[0];
  assert.equal(g.weight,1);assert.equal(g.calls.small,1);assert.equal(g.calls.large,1);
  const cmp=compare(evaluate([...q.board,...q.hole]),evaluate([...q.board,...g.cards]));
  near(Number(q.correct),cmp*q.money.bet);
 }
});
test('illegal-range and posterior selections remain correct after randomized candidate names',()=>{
 for(let i=0;i<40;i++){
  const q=createPracticeQuestion('05',{variant:'legal-range',rng:seeded(i)});
  const bad=q.groups.filter(g=>{try{assertCards([...q.board,...q.hole,...g.cards]);return false;}catch{return true;}}).map(g=>g.id);
  assert.deepEqual(q.expected,bad);
  const p=createPracticeQuestion('12',{variant:i%2?'retain':'posterior',serial:i,rng:seeded(i+90)}),mass=p.groups.map(g=>g.weight*g.responses[p.rangeAction]),sum=mass.reduce((a,b)=>a+b,0);
  p.groups.forEach((g,n)=>near(p.posterior.find(x=>x.id===g.id).posterior,mass[n]/sum));
  const target=p.variant==='retain'?p.groups.filter((g,n)=>mass[n]>0).map(g=>g.id):p.groups.filter((g,n)=>Math.abs(mass[n]-Math.max(...mass))<1e-8).map(g=>g.id);
  assert.deepEqual(new Set(p.expected),new Set(target));
 }
});
test('all 71 source entries are reachable; every course case keeps authority and pending stays closed',()=>{
 assert.equal(SOURCE_CATALOG.length,71);assert.equal(SOURCE_CATALOG.filter(r=>r.pending).length,5);
 for(const c of COURSE_CASES){const q=createPracticeQuestion('18',{variant:'course',filter:{node:c.ruleId,task:c.task,all:true},serial:c.handIndex||0,rng:seeded(24)});assert.equal(q.courseId,c.id);assert.equal(q.sourceId,c.ruleId);assert.ok(gradeTask(q,q.correct));}
 for(const b of SOURCE_CATALOG.filter(r=>r.kind==='branch')){const q=createPracticeQuestion('04',{variant:'branch',filter:{branchNode:b.id},rng:seeded(2)});assert.equal(q.sourceId,b.id);}
 for(const r of allRules.filter(r=>r.pending))assert.throws(()=>createPracticeQuestion('18',{variant:'course',filter:{node:r.id,all:true}}),/没有/);
 assert.equal(createPracticeQuestion('18',{variant:'course',filter:{node:'R01',all:true},rng:seeded(4)}).authority,'principle');
});
test('connected fragments keep physical board prefixes, pots, stacks, conditions and range posterior',()=>{
 for(const [id]of ROUTE_CHOICES){const qs=createRoute(id,seeded(53)),sum=qs[0].stateMoney.pot+qs[0].stateMoney.hero+qs[0].stateMoney.opponent;
  for(let i=0;i<qs.length;i++){const q=qs[i];prepareQuestion(q);near(q.stateMoney.pot+q.stateMoney.hero+q.stateMoney.opponent,sum);if(i)assert.deepEqual(q.board.slice(0,qs[i-1].board.length),qs[i-1].board);}
  assert.ok(qs.at(-1).routeEnd);
 }
 const q=createRoute('model',seeded(67));
 for(const g of q[1].groups)near(g.weight,q[0].posterior.find(p=>p.id===g.id).posterior);
 for(const g of q[2].model.groups)near(g.weight,q[1].groups.find(p=>p.id===g.id).weight);
 const prepared=q.map((raw,i)=>prepareQuestion(raw,{rng:seeded(37+i*271)}));
 for(const g of prepared[1].groups)assert.deepEqual(g.cards,prepared[2].groups.find(p=>p.id===g.id).cards);
 assert.ok(q[2].model.groups.every(g=>g.calls.small!==undefined));
 assert.ok(createRoute('overbet')[0].premise.includes('快玩'));assert.ok(createRoute('xraise')[0].premise.includes('弱牌'));
});
test('instances are globally held out; recolouring and renamed groups are not new knowledge',()=>{
 const a=createPracticeQuestion('10',{variant:'size-best',rng:seeded(1)});
 const b=prepareQuestion({...a,groups:a.groups.map(g=>({...g,id:g.id+'new',label:'新标签'}))},{skillId:'10',rng:seeded(20)});
 assert.equal(instanceKey(a),instanceKey(b));
 const suitMap={s:'h',h:'d',d:'c',c:'s'};
 const recolour=x=>Array.isArray(x)?x.map(recolour):x&&typeof x==='object'?x.id&&x.rank&&x.suit?card(x.id[0]+suitMap[x.suit]):Object.fromEntries(Object.entries(x).map(([k,v])=>[k,recolour(v)])):x;
 assert.equal(instanceKey(a),instanceKey(recolour(a)));
 const seen=new Set(COURSE_CASES.map(c=>'course:'+c.id));
 const repeated=createPracticeQuestion('18',{variant:'course',filter:{all:true},seen,rng:seeded(3)});assert.ok(repeated.isReview);
 const different=createPracticeQuestion('02',{variant:'best-five',seen:new Set([a.instanceKey]),rng:seeded(4)});assert.ok(!different.isReview);
});
test('independent score scopes include exact branch, scenario, task, unit, mode and mixed set',()=>{
 const keys=[{}, {mode:'practice'},{variant:'straight-outs'}, {filter:{node:'I11'}},{filter:{branchNode:'D01'}},{filter:{branchNode:'D02'}},{filter:{task:'size'}},{filter:{scenario:'ip3'}},{filter:{category:'M'}},{filter:{all:'01,02'}},{filter:{all:'01,03'}}].map(p=>scoreKey({skillId:'03',mode:'learn',...p}));
 assert.equal(new Set(keys).size,keys.length);let scores=increment({},keys[0],false);scores=increment(scores,keys[1],true);assert.deepEqual(scores[keys[0]],{right:0,wrong:1});assert.deepEqual(scores[keys[1]],{right:1,wrong:0});
});
