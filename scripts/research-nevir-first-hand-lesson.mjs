import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {DECK,card,assertCards,evaluate,compare} from '../src/poker.js';

// Documentation / paper-trial content only. No application or learner persistence.
const dir='research/nevir-system';
const walkBytes=fs.readFileSync(`${dir}/full-walkthrough-reference.json`);
const walk=JSON.parse(walkBytes),rows=walk.ledger.rows;
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const referenceHash=crypto.createHash('sha256').update(walkBytes).digest('hex');
const clone=x=>structuredClone(x);
const board=walk.reference.boardFromLink,hero=walk.selectedHands.hero,villain=walk.selectedHands.villain;
const seats=['UTG','HJ','CO','BTN','SB','BB'];
const at=(id,phase)=>clone(rows.find(r=>r.id===id)[phase]);
const eventHistory=(id,phase)=>{
 const index=rows.findIndex(r=>r.id===id)+(phase==='after'?1:0);
 return rows.slice(0,index).map(r=>({street:r.before.street,actor:r.actor,action:r.action,addedBB:r.addedBB,totalStreetPaidBB:r.after.streetPaidBB[r.actor]}));
};
function makeState(id,phase,actor,mode='active'){
 const s=at(id,phase),n={preflop:0,flop:3,turn:4,river:5}[s.street];
 const history=eventHistory(id,phase),foldedSeats=history.filter(h=>h.action==='fold').map(h=>h.actor);
 return{...s,board:board.slice(0,n),heroSeat:'SB',heroHole:hero,opponentSeat:'BTN',opponentHoleVisible:false,actor,mode,foldedSeats,history};
}
const frames=[],answers=[];
function frame(id,title,event,phase,actor,prompt,options,expected,explanation,parent,mode='active'){
 frames.push({id,title,state:makeState(event,phase,actor,mode),task:{prompt,options:[...options,'我不知道']},navigationLabel:parent});
 answers.push({id,expected,explanation,parent,evidence:{kind:'gross_ledger_and_rule_fact',event,phase},strategicGrading:false});
}
frame('S01','先找到自己','post_bb','after','UTG','这一手你坐在哪里？',['SB','BTN','BB'],'SB','自己在小盲SB。六个座位仍在，只是之后会有人弃牌。','read.context');
frames[0].notice='先跟着观察这手牌的流程与金额；本次先练完整流程，老师示范的下注不作为你的最佳策略考试。';
frame('S02','把动作中的总额与新增分开','pf05','before','SB','示范加到10BB。自己已贴0.5，这次新增多少？',[9.5,10,7.5],9.5,'加到10包含已经贴的0.5，所以新增9.5；这题执行给定动作，不判断AQ是否应该3bet。','execute.amount');
frame('S03','翻牌发出后，谁先动','f01','before','SB','现在先轮到谁行动？',['SB','BTN','已经摊牌'],'SB','翻前已经结束。SB在BTN前行动，池21，双方后手90。','read.context');
frame('S04','先把牌看对','f01','before','SB','自己的两张与公共牌合起来，现在是什么牌？',['高牌','一对','两对','三条'],'一对','A♣和A♥是一对，Q♦是踢脚。公共牌两张红心不等于自己已成同花。','read.cards');
frame('S05','现在比较哪一组选择','f01','before','SB','本街还没人下注，自己可以先比较什么？',['过牌与下注','只能弃牌或跟注','直接摊牌'],'过牌与下注','现在没有待补金额。应比较过牌与下注的后果；本结构示范尚不判AQ的最佳动作。','compare.unopened');
frame('S06','执行示范给定的下注','f01','before','SB','这一轮示范给定下注20%底池。21BB的20%是多少？',[4.2,5.25,21],4.2,'放入4.2后池25.2，自己后手85.8，接下来等BTN。20%是本次给定线路，不是从顶对自动推得。','execute.amount');
frame('S07','对手回应也要真正发生','f02','before','BTN','BTN本次选择跟注，需要放入多少？',[4.2,21,0],4.2,'对手投入4.2，池变29.4，双方85.8。本次跟注是示范回应，未说明AJ的最优频率。','update.response');
frame('S08','带着前序看第四张牌','t01','before','SB','转牌来了。现在应怎样继续？',['带着刚才的行动和金额重新看清','重新发自己的两张牌','恢复翻前所有范围不看中间行动'],'带着刚才的行动和金额重新看清','仍是这手AQ。钱与已发生的下注被跟保留；真实策略还需继承对应行动筛选。','update.card');
frame('S09','这一轮重新比较','t01','before','SB','比较转牌选择，应该看哪一组信息？',['当前范围、新牌、池与后手及各方案后续','只沿用翻牌按钮','只看自己是不是顶对'],'当前范围、新牌、池与后手及各方案后续','上轮下注不强迫这轮继续。来源未给齐本候选的逐手响应，因此不编AQ的纯动作答案。','compare.unopened');
frame('S10','执行第二轮给定动作','t01','before','SB','这一轮示范给定下注75%底池。29.4BB的75%是多少？',[22.05,29.4,4.2],22.05,'下注22.05后，池51.45，自己后手63.75；对手尚未跟注。','execute.amount');
frame('S11','跟完，才能进入下一街','t02','before','BTN','对手跟22.05以后，池会变成多少？',[73.5,51.45,201],73.5,'51.45再加22.05等于73.5。双方本街投入匹配后，才发河牌。','update.response');
frame('S12','第五张牌不自动结束牌局','r01','before','SB','河牌发出了，现在是什么情况？',['SB还要行动','已经自动摊牌','BTN已经全下'],'SB还要行动','没有第六张公共牌，但还没有结束这一轮行动。自己仍可比较当前方案。','read.context');
frame('S13','河牌仍要比较选择','r01','before','SB','这一轮先比较什么，再决定怎样行动？',['过牌与下注的当前后果','到了河牌就自动摊牌','只要顶对就一定全下'],'过牌与下注的当前后果','没有待补，仍要比较过牌与下注。此线路的牌类方向不证明AcQd每次都全下。接下来只观察老师给定的全下63.75，约为池的86.7%。','compare.unopened');
frame('S14','自己全下，还得等回应','r01','after','BTN','自己已经没有后手，这手现在结束了吗？',['还没有，等待BTN回应','已经自动获胜','立即给双方再发一张牌'],'还没有，等待BTN回应','BTN还有63.75，需要决定跟或弃。自己的全下不是对手已跟。','update.response');
frame('S15','确认行动真正结束','r02','after',null,'本次BTN已跟完，双方无后手。现在做什么？',['摊牌并结算','再下注一次','发第六张公共牌'],'摊牌并结算','河牌的全下已经被匹配，不再添加下注或公共牌。','update.end','showdown');
frame('S16','此时才揭开对手底牌','r02','after',null,'比较双方最佳五张，这次谁赢？',['SB','BTN','平分'],'SB','双方都有一对A；自己Q踢脚高于对手J踢脚。摊牌获胜不反证前面所有策略最优。','read.cards','showdown');
frames.at(-1).state.opponentHoleVisible=true;frames.at(-1).state.opponentHole=villain;
frame('S17','收回总池与净赢多少分开','r02','after',null,'忽略抽水，自己从100BB开始、现在收回201BB，整手毛利润多少？',[101,201,100],101,'收回的201包含自己的投入。相对起始100，整手毛利润是101；未扣抽水。','update.end','settled');
frames.at(-1).state.potBB=0;frames.at(-1).state.stacksBB.SB=201;frames.at(-1).state.opponentHoleVisible=true;frames.at(-1).state.opponentHole=villain;
frames.at(-1).state.history.push({street:'river',actor:'SB',action:'gross_award',addedBB:201});

const structurePublic=JSON.parse(fs.readFileSync(`${dir}/first-pass-structure-prompts.json`,'utf8'));
const structureTeacher=JSON.parse(fs.readFileSync(`${dir}/first-pass-structure-packet.json`,'utf8'));
const probe=clone(structurePublic.cases.find(c=>c.id==='C03'));
frames.push({id:'S18',title:'上一手结束，换个短局面找下一步',state:{...probe.state,heroSeat:probe.hero,heroHole:probe.heroHole,opponentSeat:'BTN',opponentHoleVisible:false,mode:'new_structure_candidate'},scenario:structurePublic.scenario,task:{prompt:'下一步先处理谁的决定？',options:['自己','对手','发公共牌','结算','我不知道']},navigationLabel:null,notice:'这是另一手牌，现在你从SB换到BB。公开的结构候选题，不是已冻结的陌生测试，也不是最佳动作题。'});
answers.push({id:'S18',expected:'自己',explanation:'BB已经过牌，BTN下注2，现在轮到BB回应。随后比较弃、跟、加；待补2。',parent:'compare.bet',evidence:{kind:'existing_structure_candidate',case:'C03',answer:structureTeacher.cases.find(c=>c.id==='C03').answer},strategicGrading:false});
assert.equal(frames.length,18);
// Every observed monetary action is explicitly replayed between frames, once.
const replay={S01:['pf01','pf02','pf03','pf04'],S02:['pf05','pf06','pf07'],S06:['f01'],S07:['f02'],S10:['t01'],S11:['t02'],S13:['r01'],S14:['r02']};
for(let i=0;i<frames.length-1;i++){
 const f=frames[i];f.afterAnswer={nextFrame:frames[i+1].id,ledgerEvents:replay[f.id]||[]};
 if(['S02','S07','S11'].includes(f.id))f.afterAnswer.dealStreet={S02:'flop',S07:'turn',S11:'river'}[f.id];
 if(f.id==='S13')f.afterAnswer.narration='本次示范选择全下63.75。观察筹码移入，行动交给BTN。';
 if(f.id==='S15')f.afterAnswer.revealOnNextFrame=true;
 if(f.id==='S16')f.afterAnswer.settlement='Award gross pot201 to SB; no rake in this ledger';
 if(f.id==='S17')f.afterAnswer.resetToNewScenario=true;
}
assert.deepEqual(Object.values(replay).flat(),rows.filter(r=>!r.id.startsWith('post_')).map(r=>r.id));
const learnerTaskKinds={S01:'identify_own_seat',S02:'execute_given_own_amount',S03:'identify_next_actor',S04:'read_own_cards',S05:'identify_available_comparison',S06:'execute_given_own_amount',S07:'observe_opponent_amount',S08:'identify_update_step',S09:'identify_needed_inputs',S10:'execute_given_own_amount',S11:'observe_opponent_call_and_pot',S12:'identify_next_actor',S13:'identify_available_comparison',S14:'wait_for_opponent',S15:'identify_settlement_transition',S16:'compare_revealed_showdown',S17:'account_settled_result',S18:'new_hand_identify_next_actor'};
for(const f of frames){
 f.perspective={handSegment:f.id==='S18'?'H02':'H01',viewerSeat:f.state.heroSeat,...(f.id==='S18'?{actingSeatHiddenForThisTask:true}:{actingSeat:f.state.actor}),ownCardOwner:f.state.heroSeat,taskKind:learnerTaskKinds[f.id],selectsOpponentPolicy:false,gradesIndependentStrategy:false,actualOpponentCards:f.state.opponentHoleVisible?'revealed':'hidden'};
 assert.equal(Object.hasOwn(f.state,'actor'),f.id!=='S18');assert.ok(f.perspective.taskKind);
 assert.equal(Math.round(100*(f.state.potBB+Object.values(f.state.stacksBB).reduce((a,b)=>a+b,0))),60000);
 assertCards([...f.state.board,...f.state.heroHole,...(f.state.opponentHole||[])].map(card));
 if(Number(f.id.slice(1))<16){assert.equal(f.state.opponentHoleVisible,false);assert.equal(Object.hasOwn(f.state,'opponentHole'),false);}
}

// Literal prose is not merely a globally renamed copy of the link's suits.
const prose=['As','9c','2h','7s','4d'],link=board;
const suits=['s','h','d','c'];
function perms(xs){return xs.length?xs.flatMap((x,i)=>perms(xs.filter((_,j)=>i!==j)).map(t=>[x,...t])):[[]];}
const suitEquivalence=perms(suits).some(p=>prose.every((id,i)=>id[0]===link[i][0]&&p[suits.indexOf(id[1])]===link[i][1]));
function flushCandidates(b){
 const available=DECK.filter(c=>![...b,...hero].includes(c.id));let count=0;
 for(let i=0;i<available.length;i++)for(let j=i+1;j<available.length;j++){
  const cs=[...b.map(card),available[i],available[j]];
  if(suits.some(s=>cs.filter(c=>c.suit===s).length>=5))count++;
 }
 return count;
}
const proseWet=[...prose.slice(0,4),'4h'],linkWet=[...link.slice(0,4),'4h'];
const visualReview=JSON.parse(fs.readFileSync(`${dir}/source-river-chart-visual-review.json`,'utf8'));
assert.equal(visualReview.originalChartsInspected,2);
const sourceReconciliation={proseLiteralBoard:prose,linkBoard:link,globallySuitEquivalent:suitEquivalence,proseFlopSuitGroups:new Set(prose.slice(0,3).map(c=>c[1])).size,linkFlopSuitGroups:new Set(link.slice(0,3).map(c=>c[1])).size,prose4hFlushCandidateCombos:flushCandidates(proseWet),link4hFlushCandidateCombos:flushCandidates(linkWet),scope:'Physical consistency with hero AcQd; no opponent action weighting. Two original static river charts visually inspected for rank/color partitions and aggregate frequencies; exact per-combo policy and EV remain unavailable.',originalChartVisuallyVerified:true,visualVerificationScope:'Static charts only; not per-combo strategy validation',visualReviewRecord:'source-river-chart-visual-review.json'};
assert.equal(suitEquivalence,false);assert.equal(sourceReconciliation.prose4hFlushCandidateCombos,0);assert.equal(sourceReconciliation.link4hFlushCandidateCombos,45);

function deepFreeze(x){if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))deepFreeze(v);}return x;}
const branchSpecs=[
 {id:'B01',origin:'S05',prompt:'SB改过牌、BTN下注4.2后，现在要补多少才能跟？',expected:4.2,modify:s=>{s.streetPaidBB.SB=0;s.streetPaidBB.BTN=4.2;s.potBB=25.2;s.stacksBB.BTN=85.8;s.actor='SB';s.history.push({street:'flop',actor:'SB',action:'check'},{street:'flop',actor:'BTN',action:'bet',addedBB:4.2});}},
 {id:'B02',origin:'S07',prompt:'BTN改为加到12.6，SB现在待补多少？',expected:8.4,modify:s=>{s.streetPaidBB.BTN=12.6;s.potBB=37.8;s.stacksBB.BTN=77.4;s.actor='SB';s.history.push({street:'flop',actor:'BTN',action:'raise_to',totalStreetPaidBB:12.6,addedBB:12.6});}},
 {id:'B03',origin:'S14',prompt:'BTN改弃牌，先退还SB多少未匹配筹码？',expected:63.75,modify:s=>{s.potBB=0;s.stacksBB.SB=137.25;s.actor=null;s.mode='settled';s.foldedSeats.push('BTN');s.history.push({street:'river',actor:'BTN',action:'fold'},{street:'river',actor:'SB',action:'refund',addedBB:63.75},{street:'river',actor:'SB',action:'gross_award',addedBB:73.5});}},
 {id:'B04',origin:'S12',prompt:'河牌改成4♥，对手是否在实体牌上可能有同花？',expected:'可能',modify:s=>{s.board=[...link.slice(0,4),'4h'];}}
];
const branches=branchSpecs.map(b=>{
 const original=frames.find(f=>f.id===b.origin),frozen=deepFreeze(clone(original.state)),before=hash(frozen),fork=clone(frozen);
 b.modify(fork);assert.equal(hash(frozen),before);assert.equal(Math.round(100*(fork.potBB+Object.values(fork.stacksBB).reduce((a,v)=>a+v,0))),60000);
 const restored=clone(frozen);assert.deepEqual(restored,original.state);
 return{id:b.id,originFrame:b.origin,notice:'另一条路线，结束后恢复原快照；不接着当作主线历史。',state:fork,task:{prompt:b.prompt,options:typeof b.expected==='number'?[b.expected,0,'我不知道']:['可能','不可能','我不知道']},answer:b.expected,snapshotHashBefore:before,snapshotHashAfterRestore:hash(restored),restoredState:restored,returnFrame:b.origin,grade:'facts_only_not_strategy'};
});
const policyGates=[
 {id:'G_FLOP_HERO',frame:'S05',actor:'SB',requested:'AcQd bet20 versus check on Ah9c2h',available:'Link supplies action history; Nevir N5-L8 supplies general A-high25 direction',missing:'Matched AcQd frequency / alternatives and ranges; 20 and25 not silently interchangeable',status:'precise_strategy_not_ready'},
 {id:'G_FLOP_RESPONSE',frame:'S07',actor:'BTN',requested:'AdJs call20 on the selected flop',available:'Author-selected legal response',missing:'Matched caller range and exact response policy',status:'precise_strategy_not_ready'},
 {id:'G_TURN_HERO',frame:'S09',actor:'SB',requested:'AcQd bet75 after B20-C on 7s',available:'Link supplies history; separate turn article studies other board instances',missing:'Same prior branch and combo alternatives; general IP course turns do not prove SB OOP action',status:'precise_strategy_not_ready'},
 {id:'G_TURN_RESPONSE',frame:'S11',actor:'BTN',requested:'AdJs call75 after the specified history',available:'Author-selected legal response',missing:'Matched response weights after both earlier decisions',status:'precise_strategy_not_ready'},
 {id:'G_RIVER_HERO',frame:'S13',actor:'SB',requested:'AcQd jam86.73 versus check / other size',available:'River article hand-class direction plus two original static charts inspected for rank/color partitions and node aggregate sizes',missing:'Exact AcQd combo frequency and EVs, matched full ranges and complete alternatives; aggregate chart not a combo answer',status:'reported_hand_class_direction_only'},
 {id:'G_RIVER_RESPONSE',frame:'S15',actor:'BTN',requested:'AdJs call river jam',available:'Author-selected legal response',missing:'Matched BTN response; chosen showdown cannot prove call optimal',status:'precise_strategy_not_ready'}
];
const output={status:'first_hand_structure_paper_trial_not_strategy_lesson_or_learner_result',referenceHash,sourceReconciliation,publication:{structurePaperTrial:'author_content_ready_for_trial_not_administered',preciseStrategyLesson:false,NL50Reference:false,learnerTrials:0},frames,answers,branches,policyGates,administration:{showOneFrameAtATime:true,guidedResponsesNotUnaidedScores:true,unknownCountsAsError:true,firstResponseBeforeCorrection:true,immediateFeedback:true,correctCanAdvance:true,publicExamplesNotFrozenHoldout:true,persistence:'none; author research files only'},notClaimed:['All-combo optimal action knowledge','True first-pass learning result','New software UI','Matching NL50 policy']};
fs.writeFileSync(`${dir}/first-hand-lesson-packet.json`,JSON.stringify(output,null,2));
const prompts={status:output.status,scope:'一手牌的流程、牌力与金额跟练；不是最优动作课。按当前帧展示，不提前显示后面的帧。',administration:output.administration,frames,branches:branches.map(({answer,restoredState,snapshotHashBefore,snapshotHashAfterRestore,...visible})=>visible)};
fs.writeFileSync(`${dir}/first-hand-lesson-prompts.json`,JSON.stringify(prompts,null,2));
console.log(JSON.stringify({frames:frames.length,branches:branches.length,sourceReconciliation,preciseStrategyDecisionsReady:policyGates.filter(g=>g.status==='precise_strategy_ready').length,policyGates:policyGates.length,status:output.status},null,2));
