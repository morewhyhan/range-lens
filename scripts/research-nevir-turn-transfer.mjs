import fs from 'node:fs';
import assert from 'node:assert/strict';
import {DECK,card,assertCards,evaluate,compare,HAND_NAMES} from '../src/poker.js';

// Research only: physical updates and fully stated teaching models. Never a policy export.
const dir='research/nevir-system';
const prior=JSON.parse(fs.readFileSync(`${dir}/starting-range-example.json`,'utf8'));
const claims=JSON.parse(fs.readFileSync(`${dir}/source-claims.json`,'utf8'));
const board=prior.context.board,hero=prior.context.heroHole;
const known=[...board,...hero],remaining=DECK.filter(c=>!known.includes(c.id));
const totalMass=prior.combos.reduce((s,c)=>s+c.mass,0);
const sum=rows=>rows.reduce((s,c)=>s+c.mass,0);
function possibleStraightRanks(ids){
 const ranks=new Set(ids.map(id=>card(id).rank));if(ranks.has(14))ranks.add(1);
 const result=[];
 for(let high=5;high<=14;high++){
  const needed=Array.from({length:5},(_,i)=>high-i).filter(r=>!ranks.has(r));
  if(needed.length<=2)result.push({high,missingRanks:needed.map(r=>r===1?14:r)});
 }
 return result;
}
function physicalUpdate(turn){
 const newBoard=[...board,turn],kept=prior.combos.filter(c=>!c.cards.includes(turn));
 const heroValue=evaluate([...newBoard,...hero].map(card));
 const distribution={ahead:{combos:0,mass:0},tie:{combos:0,mass:0},behind:{combos:0,mass:0}};
 for(const c of kept){
  const cmp=compare(heroValue,evaluate([...newBoard,...c.cards].map(card)));
  const group=distribution[cmp>0?'ahead':cmp<0?'behind':'tie'];group.combos++;group.mass+=c.mass;
 }
 const c=card(turn),sameSuitCount=newBoard.filter(x=>card(x).suit===c.suit).length;
 return{turn,flags:{overcard:c.rank>Math.max(...board.map(x=>card(x).rank)),pairsBoard:board.some(x=>card(x).rank===c.rank),thirdSameSuit:sameSuitCount===3,fourthSameSuit:sameSuitCount===4,straightRankWindows:possibleStraightRanks(newBoard)},heroBest:heroValue.value,heroCategory:heroValue.name,remainingCombos:kept.length,remainingMass:sum(kept),blockedCombos:prior.combos.length-kept.length,blockedMass:totalMass-sum(kept),currentComparison:distribution,turnProbabilityUnderOnlyThisPrior:sum(kept)/(45*totalMass)};
}
const turns=remaining.map(c=>physicalUpdate(c.id));
assert.equal(turns.length,47);
assert.equal(turns.reduce((s,t)=>s+t.remainingCombos,0),306*45);
assert.equal(turns.reduce((s,t)=>s+t.remainingMass,0),252*45);
assert.ok(Math.abs(turns.reduce((s,t)=>s+t.turnProbabilityUnderOnlyThisPrior,0)-1)<1e-12);
const pairs=[
 {id:'blank',turn:'2d',opponent:['Kc','Jh'],expectedHeroCategory:'一对',expectedOpponentCategory:'高牌',expectedComparison:1,lesson:'低牌只是纹理描述；不能自动变成过牌指令'},
 {id:'flush',turn:'9s',opponent:['Js','8s'],expectedHeroCategory:'一对',expectedOpponentCategory:'同花',expectedComparison:-1,lesson:'第三张黑桃让两张黑桃听牌成花；不是所有对手都成花'},
 {id:'straight',turn:'Jh',opponent:['Kc','9c'],expectedHeroCategory:'一对',expectedOpponentCategory:'顺子',expectedComparison:-1,lesson:'新牌完成了具体的9TJQK五张'},
 {id:'own_improvement',turn:'As',opponent:['Kc','Jc'],expectedHeroCategory:'两对',expectedOpponentCategory:'顺子',expectedComparison:-1,lesson:'自己变两对，同时对手TJQKA；改善不等于相对领先'},
 {id:'trips',turn:'Qc',opponent:['Qd','Ts'],expectedHeroCategory:'三条',expectedOpponentCategory:'葫芦',expectedComparison:-1,lesson:'自己的三条Q仍输QQQTT葫芦'},
 {id:'paired_low',turn:'5d',opponent:['5h','5c'],expectedHeroCategory:'两对',expectedOpponentCategory:'四条',expectedComparison:-1,lesson:'公共牌成对不等于所有人同样受益'},
 {id:'overcard',turn:'Kd',opponent:['Kc','Jc'],expectedHeroCategory:'一对',expectedOpponentCategory:'一对',expectedComparison:-1,lesson:'还是一对Q，但对手已经是一对K'}
].map(row=>{
 const newBoard=[...board,row.turn];assertCards([...newBoard,...hero,...row.opponent].map(card));
 const hv=evaluate([...newBoard,...hero].map(card)),ov=evaluate([...newBoard,...row.opponent].map(card));
 assert.equal(hv.name,row.expectedHeroCategory);assert.equal(ov.name,row.expectedOpponentCategory);assert.equal(compare(hv,ov),row.expectedComparison);
 const beforeHero=evaluate([...board,...hero].map(card)),beforeOpponent=evaluate([...board,...row.opponent].map(card));
 return{...row,heroBest:hv.value,opponentBest:ov.value,heroBestCards:hv.cards.map(c=>c.id),opponentBestCards:ov.cards.map(c=>c.id),before:{heroBest:beforeHero.value,opponentBest:beforeOpponent.value,heroBestCards:beforeHero.cards.map(c=>c.id),opponentBestCards:beforeOpponent.cards.map(c=>c.id),comparison:compare(beforeHero,beforeOpponent)}};
});

// Four explicitly chosen possible holdings: not a reconstruction of BB's actual policy.
const teachingHoldings=[
 {id:'55',cards:['5d','5c'],priorMass:1,active:{fold:0,call:.25,raise:.75},passive:{fold:0,call:1,raise:0}},
 {id:'QJ',cards:['Qd','Jc'],priorMass:1,active:{fold:0,call:1,raise:0},passive:{fold:0,call:1,raise:0}},
 {id:'KJ',cards:['Kc','Jh'],priorMass:1,active:{fold:.5,call:.5,raise:0},passive:{fold:.75,call:.25,raise:0}},
 {id:'22',cards:['2d','2h'],priorMass:1,active:{fold:.75,call:.25,raise:0},passive:{fold:1,call:0,raise:0}}
];
for(const h of teachingHoldings){
 assertCards([...known,...h.cards].map(card));
 for(const model of ['active','passive'])assert.equal(Object.values(h[model]).reduce((a,b)=>a+b,0),1);
}
function inherit(model,turn=null){
 const rows=teachingHoldings.map(h=>({id:h.id,cards:h.cards,priorMass:h.priorMass,callLikelihood:h[model].call,mass:h.priorMass*h[model].call*(turn&&h.cards.includes(turn)?0:1)}));
 const mass=sum(rows);assert.ok(mass>0);
 for(const r of rows)r.probability=r.mass/mass;
 return{model,observedAction:'call',turn,totalMass:mass,rows,set55Share:rows[0].probability};
}
const inherited=['active','passive'].flatMap(m=>[inherit(m),inherit(m,'2d'),inherit(m,'9s')]);
assert.equal(inherited[0].set55Share,1/8);assert.equal(inherited[3].set55Share,4/9);
assert.equal(inherited[1].totalMass,7/4);assert.equal(inherited[1].set55Share,1/7);
assert.equal(inherited[3].rows.find(r=>r.id==='22').mass,0);
assert.ok(inherited[0].rows.find(r=>r.id==='55').mass>0,'Slowplays must survive nonzero call likelihood');

// Factual fork of a six-seat, 100BB hand; amounts do not imply any strategic prescription.
const history={players:6,startingStackBB:100,hero:'BTN',villain:'BB',deadSB:.5,preflop:'BTN raise to 2.5; BB call',flop:'BB check; BTN bet 2; BB call',flopBoard:board,heroHole:hero,turn:'2d',turnStart:{potBB:9.5,heroStackBB:95.5,villainStackBB:95.5,foldedStacksBB:399.5},branches:[
 {id:'BB_bet',events:'BB bet 6',potIncludingBetBB:15.5,heroStackBB:95.5,villainStackBB:89.5,toCallBB:6,legalHeroActions:['fold','call','raise'],afterCallPotBB:21.5,afterCallEachStackBB:89.5,immediateCallPrice:6/21.5},
 {id:'BB_raise',events:'BB check; BTN bet 6; BB raise to 20',potIncludingBetBB:35.5,heroStackBB:89.5,villainStackBB:75.5,toCallBB:14,legalHeroActions:['fold','call','raise'],afterCallPotBB:49.5,afterCallEachStackBB:75.5,immediateCallPrice:14/49.5}
]};
for(const b of history.branches){
 assert.equal(b.potIncludingBetBB+b.heroStackBB+b.villainStackBB+history.turnStart.foldedStacksBB,600);
 assert.equal(b.afterCallPotBB+2*b.afterCallEachStackBB+history.turnStart.foldedStacksBB,600);
 assert.equal(b.afterCallPotBB,b.potIncludingBetBB+b.toCallBB);
}
const sourceCases=[
 {id:'small_bet_turn',fragment:'N4-L28',review:'R19',needed:['3bet pot','flop small range bet then call','opponent assumptions from section'],answerPrecision:'conditional_direction_not_any_hand_action',use:'同一牌面先继承翻牌被跟前序'},
 {id:'monotone_fourth',fragment:'N4-L32',review:'R20',needed:['3bet pot','Ks Ts 5s flop','actual turn identity'],answerPrecision:'reported_range_frequency_not_combo_frequency',use:'第四张黑桃与8c对照；40/66不是任意手牌掷骰'},
 {id:'straight_turn',fragment:'N4-L33',review:'R21',needed:['3bet pot','Jh Ts 2d flop','small flop bet version unresolved'],answerPrecision:'reported_range_frequency_and_direction',use:'9d与5c对照；25/33前序版本仍待核实'},
 {id:'xr_called',fragment:'N5-L22',review:'R23',needed:['SB vs BTN 3bet pot','T83 rainbow','specified overfold lock','XR called'],answerPrecision:'conditional_preference',use:'被跟后的过牌不是已经弃牌；K例单列'},
 {id:'srp_tight_recreational',fragment:'N7-L25',review:'R26',needed:['single raised pot','SB vs BB context','stated tight/recreational strong betting assumption'],answerPrecision:'conditional_adjustment_not_complete_defense',use:'不能借3bet底池T83扩成任意诈唬XR'},
 {id:'srp_aggregate',fragment:'N7-L20',review:null,needed:['single raised pot','SB check BB bet SB raise','aggregate population version'],answerPrecision:'source_report_not_current_read',use:'该段少弃牌；不可与下一人群段合并平均'},
 {id:'srp_regs',fragment:'N7-L27',review:null,needed:['single raised pot','SB vs BB context','stated regular player over-stab assumption'],answerPrecision:'conditional_population_explanation',use:'更多弱牌下注可改变加注收益；身份标签本身不是概率'}
].map(c=>{
 const f=claims.fragments.find(f=>f.id===c.fragment);assert.ok(f);
 if(c.review)assert.equal(claims.reviews.find(r=>r.id===c.review).fragment,c.fragment);
 return{...c,source:{file:f.source.file,line:f.source.line,sha256:f.source.sha256},strategicPolicyAcquired:false};
});
const tasks=[
 ['U01','update.response','先选刚才的真实路线','原历史','路线标签被隐藏','保留下注被跟/双方过牌/加注被跟的区别','history_only'],
 ['U02','update.card','点出新牌排除的实体牌','2d与原图','冲突组合不预先划除','只删撞牌，不重置前序质量','turns'],
 ['U03','read.cards','选自己现在的五张与对手的五张','As例','大小关系不预先显示','自己改善但相对落后','pairs/own_improvement'],
 ['U04','read.cards','区分三条与葫芦','Qc例','牌型名称被隐藏','QQQTT优于三条Q','pairs/trips'],
 ['U05','read.range','保留仍可能慢打的强牌','四候选模型active','答案宽度被隐藏','55跟注质量1/4不等于0','inherited/active'],
 ['U06','read.range','比较同一跟注在两模型里的含义','两套响应均明示','强牌占比被隐藏','同一观察不唯一决定范围','inherited'],
 ['U07','update.card','先保留跟注筛选，再发2d','active call后发牌','两个更新的结果被隐藏','22实体冲突；其余不恢复原权重','inherited/active/2d'],
 ['U08','compare.unopened','选择当前应比较的路线与资料精度','课程三组转牌对照','原理标题被隐藏','总频率不是任意AQ的动作答案','sourceCases'],
 ['U09','compare.bet','面对BB下注先找合法选择与待补','BB_bet账本','答案被隐藏','无免费过牌；仍需比较跟弃加','history/BB_bet'],
 ['U10','compare.raise','面对加注算差额与跟后池','BB_raise账本','差额被隐藏','补14而不是补20；价格不等于前街胜率即跟','history/BB_raise'],
 ['U11','compare.raise','核对XR建议的适用条件','三组来源与当前底池/对手设定','正确来源不预选','不跨底池或无依据人群借用纯动作','sourceCases'],
 ['U12','update.response','动作后回到同一手牌继续','跟注完成的同一账本','步骤导航不自动预选','保持牌/历史/范围/金额一致，不跳到独立例题','history']
].map(([id,parent,action,input,fade,criterion,evidence])=>({id,parent,action,input,fade,criterion,evidence,unknownCountsAsError:true}));
const output={status:'research_content_contract_not_complete_strategy_or_learner_evidence',context:{board,hero,priorChart:prior.source.chart,state:'No intervening postflop action likelihoods applied to exhaustive card facts'},physicalFacts:{turns,turnCount:47,legalOpponentTurnPairs:306*45,massPairTotal:252*45,scope:'One starting prior only; CURRENT made-hand ordering, NOT showdown equity or real post-action range. Turns may be selected for teaching; model deal probabilities are conditional on this prior.'},pairs,teachingModel:{scope:'Four author-selected candidate holdings and two explicit response models; not player/Nevir/solver probabilities, not derived complete BB strategy',holdings:teachingHoldings,inherited},history,sourceCases,tasks,release:{physicalCardFacts:true,completeTurnStrategy:false,sourceConditionalMatchingOnly:true,actualLearnerTrials:0,NL50Evidence:false},handCategoryOrder:HAND_NAMES};
fs.writeFileSync(`${dir}/turn-transfer-evidence.json`,JSON.stringify(output,null,2));
console.log(JSON.stringify({turns:turns.length,legalOpponentTurnPairs:output.physicalFacts.legalOpponentTurnPairs,massPairTotal:output.physicalFacts.massPairTotal,pairs:pairs.map(p=>({id:p.id,hero:p.heroBest,opponent:p.opponentBest})),inheritance:inherited.map(r=>({model:r.model,turn:r.turn,mass:r.totalMass,set55Share:r.set55Share})),sourceCases:sourceCases.length,tasks:tasks.length,status:output.status},null,2));
