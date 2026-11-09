import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir='research/nevir-system/',read=f=>JSON.parse(fs.readFileSync(dir+f,'utf8'));
const sha=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const fileHash=f=>sha(fs.readFileSync(dir+f).toString());
const base=read('guided-course-itinerary.json');
assert.equal(base.firstPass.deepEpisodesAutomaticallyOpened,0);assert.equal(base.counts.firstPass,18);assert.equal(base.counts.reviewCore,169);
const sources={outer:'first-hand-lesson-packet.json',value:'guided-value-sequence-packet.json',history:'guided-history-sequence-packet.json'};
const packets=Object.fromEntries(Object.entries(sources).map(([k,f])=>[k,read(f)]));
function parent(kind,id){
 const p=packets[kind],frame=p.frames.find(f=>f.id===id),answer=p.answers.find(a=>a.id===id);assert.ok(frame&&answer);
 return {source:sources[kind],sourceSHA256:fileHash(sources[kind]),frame:structuredClone(frame),answer:structuredClone(answer),
  referenceContext:structuredClone(Object.fromEntries(Object.entries(p).filter(([k])=>!['frames','answers','returnState','returnFrame'].includes(k)))),
  display:'review_feedback',firstAnswer:'not_collected_author_walkthrough',exposure:'already_seen_public_material',actualPokerStateMutation:false};
}
const sizes=read('ip3bet-course-size-prompts.json'),sizeKeys=read('ip3bet-course-size-teacher.json');
const boundaries=read('assumption-boundary-evidence.json');
const rangeQuestions=read('range-to-action-prompts.json'),rangeKeys=read('range-to-action-teacher.json');
const visual=read('visual-river-lesson-packet.json');
const qqq=read('qqq-range-lesson-packet.json'),qqqVerified=read('qqq-range-lesson-verification.json');
assert.equal(qqqVerified.ok,true);assert.equal(qqqVerified.strategicActionQuestions,0);
assert.equal(qqqVerified.sourceHashes['qqq-range-lesson-packet.json'],fileHash('qqq-range-lesson-packet.json'));
const qqqParent={source:qqq.parent.source,sourceSHA256:qqq.parent.sourceSHA256,...structuredClone(qqq.parent.snapshot),actualPokerStateMutation:false};
assert.equal(sha(qqq.parent.snapshot),qqq.parent.snapshotFingerprint);
assert.deepEqual(qqqParent.frame,packets.outer.frames.find(f=>f.id==='S09'));
assert.deepEqual(qqqParent.answer,packets.outer.answers.find(f=>f.id==='S09'));
const mixed=read('mixed-model-practice-prompts.json'),mixedKeys=read('mixed-model-practice-teacher.json'),coverage=read('mixed-model-practice-coverage.json');
for(const [publicPack,teacherPack,field] of [[sizes,sizeKeys,'references'],[rangeQuestions,rangeKeys,'keys'],[mixed,mixedKeys,'references']])for(const q of publicPack.questions){const key=teacherPack[field].find(r=>r.id===q.id);assert.ok(key);assert.equal(sha(q.body),key.inputFingerprint);}
assert.equal(sizes.questions.length,88);assert.equal(rangeQuestions.questions.length,4);assert.equal(mixed.questions.length,85);
const boundScript=fs.readFileSync(dir+'34_从题设答案走向实际判断_条件边界教学.md','utf8');
const boundSteps=[...boundScript.matchAll(/^\| (C\d\d) \|/gm)].map(m=>m[1]);assert.equal(boundSteps.length,8);
const pValue=parent('value','V13');
const rangeChart=read('range-chart-contract-packet.json'),rangeReview=read('range-chart-image-review.json');
assert.equal(rangeReview.packetSHA256,fileHash('range-chart-contract-packet.json'));
assert.equal(rangeReview.figures.length,4);
for(const image of rangeReview.figures){assert.equal(image.sha256,crypto.createHash('sha256').update(fs.readFileSync(dir+image.file)).digest('hex'));assert.equal(image.visuallyOpened,true);}
const chartEnd=rangeChart.frames.at(-1);
for(const k of ['pot','heroStack','villainStack','heroPut','villainPut'])assert.equal(chartEnd.state[k],pValue.frame.state[k]);
assert.deepEqual(chartEnd.knownCards,[...pValue.frame.state.board,...pValue.frame.state.hero]);
assert.equal(chartEnd.matrix.find(c=>c.cell==='KK').conditionalProbability,pValue.frame.given.posterior.KK);
assert.equal(chartEnd.matrix.find(c=>c.cell==='77').conditionalProbability,pValue.frame.given.posterior['77']);
assert.equal(pValue.frame.state.pot,163);assert.equal(pValue.frame.state.heroStack,38);
assert.equal(pValue.frame.given.posterior.KK,1/3);assert.equal(pValue.frame.given.posterior['77'],2/3);
assert.equal(boundaries.context.toCall,38);assert.equal(boundaries.context.finalPotAfterCall,201);
const pHistory=parent('history','H10'),keyA=rangeKeys.keys.find(k=>k.sourcePath==='HC_A');
assert.equal(pHistory.frame.state.historyPath,'HC_A');assert.deepEqual(pHistory.frame.state.candidateMass,[2,8,2]);
const raw=pHistory.frame.state.candidateMass,sum=raw.reduce((a,b)=>a+b,0);['88','QQ','JT'].forEach((id,i)=>assert.ok(Math.abs(raw[i]/sum-keyA.posterior[id])<1e-9));
const entries=[
 {id:'course_size',parent:parent('outer','S05'),label:'换个位置，认这套课的主尺寸',entryTiming:'After the existing size episode and all its child reviews are closed; not nested inside B09.',
  kind:'different_scene_course_abstraction',sourceFiles:['35_翻牌尺寸怎样接回原课且不冒充完整策略.md','ip3bet-course-size-prompts.json','ip3bet-course-size-teacher.json'],
  contents:{adoptedRules:4,physicalVariants:88,mandatoryQuestions:0},
  notice:'换到BTN对CO的有位置3bet翻牌；这小段只练主尺寸，不判某手该不该下注。',returnRule:'Restore original S05, not a 40/67% IP3bet policy.',maxReturnSnapshotsIncludingOuter:1},
 {id:'assumption_boundary',parent:pValue,label:'比例不准，会改变答案吗',entryTiming:'At V13 review feedback; optional, not automatically opened in the 16-frame value route.',
  kind:'same_scene_declared_weight_comparison',sourceFiles:['34_从题设答案走向实际判断_条件边界教学.md','assumption-boundary-evidence.json','43_行动后范围怎么变_具体图表与开源参考.md','range-chart-contract-packet.json','range-chart-image-review.json'],
  contents:{paperStops:boundSteps,numericModel:'river terminal call/fold only',mandatoryQuestions:0,rangeChartExplanation:{frames:4,answerBearing:true,automaticallyOpened:false,kind:'inline_alternative_to_interval_preview_not_another_nested_branch',returnTo:'V13',sameMoneyBoardHandAndFinalPosteriorVerified:true,fullHistoryAndOpponentPolicyEquivalenceClaimed:false}},
  notice:'牌和钱不变，只比较对手候选的份额；这些区间是教学假设。',returnRule:'Restore V13 including original1:2 reference, not the last preview interval.',maxReturnSnapshotsIncludingOuter:2},
 {id:'range_to_action',parent:pHistory,label:'这个比例是怎样留下来的',entryTiming:'At H10 review feedback; do not reopen or overwrite its first answer.',
  kind:'given_history_recalculation_and_explicit_alternative',sourceFiles:['34_从题设答案走向实际判断_条件边界教学.md','range-to-action-prompts.json','range-to-action-teacher.json'],
  contents:{publicForms:4,authoredHistories:2,mandatoryQuestions:0},
  notice:'从本例起始候选沿实际回应重算；另一条历史只是对照，不改这条原线。',returnRule:'Restore HC_A H10,2:8:2, original given values and exposure; no repeated actual bet.',maxReturnSnapshotsIncludingOuter:2},
 {id:'visual_river',parent:parent('outer','S18'),label:'跟完以后，河牌怎样接着走',entryTiming:'After draw, madeDraw and semibluff are fully closed back to S18. Open as a sibling of draw, never as a child of D16.',
  kind:'same_draw_mechanism_explicit_JT4_version',sourceFiles:['36_转牌到河牌的逐张图文试读稿.md','visual-river-lesson-packet.json','visual-river-lesson-prompts.json'],
  contents:{defaultExplanationImages:4,optionalExplanationImages:2,mandatoryQuestions:0,answerBearing:true},
  notice:'另开刚才JT份额为4的版本，示范跟注以后怎样继续；原S18不改。',returnRule:'Close VR5 to VR2 and VR6 to VR3; close whole visual episode to original S18.',maxReturnSnapshotsIncludingOuter:2},
 {id:'current_decision_practice',parent:parent('outer','S18'),label:'自己比较当前这一步',entryTiming:'A sibling practice lane after taught supported examples; never interrupt the initial whole-hand pass.',
  kind:'public_given_models_not_unseen_full_hand_exam',sourceFiles:['mixed-model-practice-prompts.json','mixed-model-practice-teacher.json','mixed-model-practice-coverage.json'],
  contents:{publicQuestions:85,modelFamilies:4,supportedCoarseCells:coverage.localQuestionCells,mandatoryQuestions:0},
  notice:'换一手有完整题设的局面。只练已开放的模型和动作；不代表所有桌面都已覆盖。',returnRule:'Return to original S18 review; actual research branch histories cannot alter the original hand.',maxReturnSnapshotsIncludingOuter:1},
 {id:'full_range_removal',parent:qqqParent,label:'亲眼看见哪些牌留下来',entryTiming:qqq.parent.entryTiming,
  kind:'different_scene_physical_and_given_policy_demonstration_not_optimal_strategy',
  sourceFiles:['qqq-range-lesson-packet.json','qqq-range-lesson-prompts.json','qqq-range-lesson-teacher.json','qqq-range-image-review.json','qqq-range-lesson-verification.json'],
  contents:{staticFrames:4,publicFactForms:3,strategicActionQuestions:0,mandatoryQuestions:0,sourceQualityTargetReached:false,answerBearing:true},
  notice:qqq.parent.notice,returnRule:'Restore the whole original S09 and reference, not the QQQ demonstration or its given candidate response. Preserve exposure and first answer; no actual bet, call or deal is replayed.',
  maxReturnSnapshotsIncludingOuter:1}
];
for(const e of entries){
 const parentKind=Object.keys(sources).find(k=>sources[k]===e.parent.source),ancestors=[];
 const link=packets[parentKind].parentLink;
 if(link){assert.ok(link.source===sources.outer||link.source===sources.outer.replace('-packet.json','-prompts.json'));ancestors.push(parent('outer',link.frame));}
 const parentChain=[...ancestors,e.parent];
 const extraInternalSnapshots=e.id==='visual_river'?1:0;
 assert.equal(parentChain.length+extraInternalSnapshots,e.maxReturnSnapshotsIncludingOuter);
 e.returnChain=parentChain.map(p=>({source:p.source,frame:p.frame.id,fingerprint:sha(p)}));
 e.sourceHashes=Object.fromEntries(e.sourceFiles.map(f=>[f,fileHash(f)]));e.parentFingerprint=sha(e.parent);
 const restored=structuredClone(e.parent);assert.equal(sha(restored),e.parentFingerprint);
 e.returnContract={wholeFrameAndReference:true,sourceVersionBound:true,exposurePreserved:true,firstAnswerReopened:false,doesNotReplayBetDealOrPayout:true};
 e.readiness='author_binding_only_not_implemented_navigation_or_real_learner_pass';
}
assert.equal(Math.max(...entries.map(e=>e.maxReturnSnapshotsIncludingOuter)),2);
assert.equal(visual.previewReturnTo,'VR2');assert.equal(visual.calculationReturnTo,'VR3');
assert.deepEqual(visual.defaultOrder,['VR1','VR2','VR3','VR4']);
assert.equal(visual.parentSnapshot.question.body.board[4],'4c');assert.equal(visual.parentSnapshot.question.body.state.pot,42);
assert.equal(visual.beforeDealAnchor.question.body.board.length,4);
const visualParent=entries.find(e=>e.id==='visual_river');assert.equal(visualParent.parent.source,sources.outer);assert.equal(visualParent.parent.frame.id,'S18');
const output={ok:true,status:'author_extension_bindings_not_added_default_curriculum_or_UI',baseItinerary:{file:'guided-course-itinerary.json',sha256:fileHash('guided-course-itinerary.json'),firstPass:18,reviewCore:169,defaultOptionalFrames:36},
 defaultInsertions:0,newHomeMenus:0,entries,
 safeguards:{noForced88Or85QuestionMarathon:true,noThirdReturnSnapshotRequiredByTheseRoutes:true,helpExposureRemainsHelp:true,noRealLearnerAnswersCollected:true,persistence:'none'},
 notResolved:['Full matched strategy for original hand','Real novice comprehension','Unknown opponent input evidence','Independent unseen continuous assessment','NL50 ability'],learnerTrials:0};
fs.writeFileSync(dir+'guided-course-extensions.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,entries:entries.length,firstPass:18,existingReviewCore:169,automaticInsertions:0,maxReturnSnapshots:2,learnerTrials:0}));
