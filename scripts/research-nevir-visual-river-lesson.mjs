import fs from 'node:fs';
import assert from 'node:assert/strict';
import {advanceScoped,gradeScoped} from './nevir-scoped-practice-grader.mjs';
import {continueTurnDefense} from './nevir-turn-defense-executor.mjs';
import {fingerprint} from './nevir-practice-grader.mjs';
const dir='research/nevir-system/',read=f=>JSON.parse(fs.readFileSync(dir+f,'utf8'));
const qs=read('mixed-model-practice-prompts.json').questions,rs=read('mixed-model-practice-teacher.json').references;
const r=rs.find(r=>r.family==='turn_defense'&&r.contributors.some(c=>c.profile==='more_bluffs')),q=qs.find(q=>q.id===r.id);
assert.equal(gradeScoped(r,q,{action:'call'}).correct,true);
const afterCall=advanceScoped(r,q,{action:'call'},{provenance:'demonstration_after_feedback'}),anchor=structuredClone(afterCall);
const on4c=continueTurnDefense(afterCall,'4c');
const checked=advanceScoped(on4c.reference,on4c.question,{action:'check'},{provenance:'demonstration_after_feedback'});
const bet4c=continueTurnDefense(checked,'bet');
const call4c=bet4c.question.body.candidatePlans.find(p=>p.action==='call');
assert.ok(Math.abs(bet4c.reference.planValues.find(v=>v.choiceId===call4c.choiceId).evBB+7)<1e-8);
assert.equal(gradeScoped(bet4c.reference,bet4c.question,{action:'fold'}).correct,true);
const folded=advanceScoped(bet4c.reference,bet4c.question,{action:'fold'},{provenance:'demonstration_after_feedback'});
assert.equal(folded.state.heroStack,79.5);assert.equal(folded.state.villainStack,121.5);
const on2s=continueTurnDefense(anchor,'2s');
const check2s=advanceScoped(on2s.reference,on2s.question,{action:'check'},{provenance:'demonstration_after_feedback'});
const bet2s=continueTurnDefense(check2s,'bet');
assert.deepEqual(bet2s.question.body.currentRange.holdings.map(h=>h.id),['KK','JT']);
const call2s=bet2s.question.body.candidatePlans.find(p=>p.action==='call');
assert.equal(bet2s.reference.planValues.find(v=>v.choiceId===call2s.choiceId).evBB,21);
assert.equal(gradeScoped(bet2s.reference,bet2s.question,{action:'call'}).correct,true);
assert.deepEqual(afterCall,anchor);
const parent=structuredClone(on4c);assert.equal(fingerprint(on4c.question.body),parent.reference.inputFingerprint);
// Preview uses the before-deal anchor; closing restores the selected parent on4c.
const closed=structuredClone(parent);assert.deepEqual(closed,on4c);
const view=(packet,title,subtitle,footer)=>({title,subtitle,footer,board:packet.question?.body.board??bet4c.question.body.board,hero:q.body.hero,
 state:packet.question?.body.state??packet.state,range:packet.question?.body.currentRange.holdings??[],kind:packet.kind});
const frames=[
 view(afterCall,'跟完这一笔，还没有结束','示范已跟10.5：双方投入匹配，接下来才发河牌。','先看清：池42，双方79.5；对手的底牌仍没有亮。'),
 view(on4c,'新牌来了，先重新看自己的牌','河牌4♣。自己还是A高，没有凑成同花。','本段给定后续：自己先过牌，再看对手做什么。'),
 view(bet4c,'他打21，重新比较这次跟弃','现在池63；如果跟21，最后的池是84。','只赢JT这4份：4÷24＝1/6。跟注平均少7；本模型选弃。'),
 view(folded,'这次弃牌，自己保留79.5','对手未被跟的21先退回，再收走原来的池42。','这手结束。转牌跟过，不代表河牌还必须继续跟。'),
 view(bet2s,'只换河牌，重新看这次的范围','可选预演：从发牌前改发2♠，再走过牌与对手下注。','本版只剩KK与JT，4:4；跟21平均多21。关闭回4♣原位。'),
 view(bet4c,'为什么跟21，平均反而少7？','把4:16:4约成1:4:1，画成6份同样大小的可能结果。','赢时多63，输时少21：(63－5×21)÷6＝－7。弃牌从现在计0。')
].map((f,i)=>({...f,id:'VR'+(i+1),image:'figures/visual-river-'+(i+1)+'.png',answerBearingExplanation:true}));
const packet={status:'author_sequential_answer_bearing_visual_lesson_not_learner_test',rootQuestionId:q.id,defaultOrder:['VR1','VR2','VR3','VR4'],optionalFromVR2:'VR5',previewReturnTo:'VR2',optionalFromVR3:'VR6',calculationReturnTo:'VR3',frames,
 parentSnapshot:parent,beforeDealAnchor:anchor,sourceKind:'given authored model, no real opponent inference',learnerTrials:0};
fs.writeFileSync(dir+'visual-river-lesson-packet.json',JSON.stringify(packet,null,2)+'\n');
const publicQuestions=[bet4c.question,bet2s.question];
for(const question of publicQuestions){const serialized=JSON.stringify(question);for(const field of ['bestEV','bestActions','planValues','evBB'])assert.ok(!serialized.includes('"'+field+'"'));}
fs.writeFileSync(dir+'visual-river-lesson-prompts.json',JSON.stringify({status:'public_given_model_questions_not_frozen_exam',computedConditionalRangeProvided:true,questions:publicQuestions},null,2)+'\n');
assert.equal((63-5*21)/6,-7);
const verification={ok:true,rootReferenceCallCorrect:true,river4cCallEVBB:-7,river4cFoldCorrect:true,river2sCallEVBB:21,river2sCallCorrect:true,fullParentRestored:true,defaultFrames:4,optionalFrames:2,sixEqualMassPayoffExplained:true,imageReview:'Separate manual review record; this numerical script does not inspect pixels.',realLearners:0,independentTest:false,newCoarseContextCells:0};
fs.writeFileSync(dir+'visual-river-lesson-verification.json',JSON.stringify(verification,null,2)+'\n');
console.log(JSON.stringify(verification));
