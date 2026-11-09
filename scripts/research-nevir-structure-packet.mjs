import fs from 'node:fs';
import assert from 'node:assert/strict';
import {card,assertCards,evaluate,compare} from '../src/poker.js';

// A restricted research state generator for 14 specified heads-up examples.
// It is NOT a general poker engine or an application implementation.
const dir='research/nevir-system',fullBoard=['Kc','8d','3s','6h','2c'],heroHole=['As','Kd'];
const other=p=>p==='BB'?'BTN':'BB';
function start(){return{street:'flop',board:fullBoard.slice(0,3),pot:550,stacks:{UTG:10000,HJ:10000,CO:10000,BTN:9750,SB:9950,BB:9750},paid:{BB:0,BTN:0},phase:'betting',next:'BB',max:0,lastRaise:100,lastAggression:null,checks:0,history:[]};}
function snapshot(s){return{street:s.street,board:[...s.board],potBB:s.pot/100,stacksBB:Object.fromEntries(Object.entries(s.stacks).map(([k,v])=>[k,v/100])),streetPaidBB:{BB:s.paid.BB/100,BTN:s.paid.BTN/100},foldedSeats:['UTG','HJ','CO','SB',...(s.folder?[s.folder]:[])],phase:s.phase,next:s.next,lastAggression:s.lastAggression,history:[...s.history]};}
function conserve(s){assert.equal(s.pot+Object.values(s.stacks).reduce((a,b)=>a+b,0),60000);assert.ok(Object.values(s.stacks).every(x=>Number.isInteger(x)&&x>=0));}
const actorLabel=p=>p==='BB'?'大盲BB':'按钮BTN';
function act(s,p,a,to=0){
 assert.equal(s.phase,'betting');assert.equal(s.next,p);const rival=other(p),due=s.max-s.paid[p];
 if(a==='check'){
  assert.equal(due,0);s.history.push(`${actorLabel(p)}过牌`);s.checks++;
  if(s.checks===2){s.phase=s.street==='river'?'showdown':'street_closed';s.next=null;}else s.next=rival;
 }else if(a==='fold'){
  assert.ok(due>0);s.history.push(`${actorLabel(p)}弃牌`);s.phase='fold_terminal';s.next=null;s.folder=p;
 }else if(a==='call'){
  assert.ok(due>0&&due<=s.stacks[p]);s.stacks[p]-=due;s.pot+=due;s.paid[p]+=due;
  s.history.push(`${actorLabel(p)}补${due/100}BB跟注`);s.next=null;
  s.phase=s.street==='river'?'showdown':s.stacks[p]===0||s.stacks[rival]===0?'runout':'street_closed';
 }else{
  assert.ok(['bet','raise'].includes(a));assert.ok(Number.isInteger(to));
  const increment=to-s.paid[p];assert.ok(increment>0&&increment<=s.stacks[p]);
  if(a==='bet'){assert.equal(s.max,0);assert.ok(to>=100);s.lastRaise=to;}
  else{assert.ok(due>0&&s.stacks[rival]>0);assert.ok(to-s.max>=s.lastRaise);s.lastRaise=to-s.max;}
  s.stacks[p]-=increment;s.pot+=increment;s.paid[p]=to;s.max=to;s.lastAggression=a;s.checks=0;s.next=rival;
  const text=s.stacks[p]===0?`全下${to/100}BB`:a==='bet'?`下注${to/100}BB`:`加注到${to/100}BB`;
  s.history.push(`${actorLabel(p)}${text}`);
 }
 conserve(s);
}
function deal(s){
 assert.equal(s.phase,'street_closed');assert.ok(s.board.length<5);assert.ok(s.stacks.BB>0&&s.stacks.BTN>0);
 const newCard=fullBoard[s.board.length];s.board.push(newCard);s.street=s.board.length===4?'turn':'river';
 s.paid={BB:0,BTN:0};s.phase='betting';s.next='BB';s.max=0;s.lastRaise=100;s.lastAggression=null;s.checks=0;
 s.history.push(`发${s.street==='turn'?'转牌':'河牌'}${newCard}`);conserve(s);
}
function apply(s,events){for(const e of events){if(e==='deal')deal(s);else act(s,...e);}return s;}
const xx=[['BB','check'],['BTN','check']];
const specs=[
 ['C01','BTN',[['BB','check']],'hero_free'],
 ['C02','BB',[...xx,'deal'],'hero_free'],
 ['C03','BB',[['BB','check'],['BTN','bet',200]],'hero_facing_bet'],
 ['C04','BTN',[...xx,'deal',...xx,'deal',['BB','bet',400]],'hero_facing_bet'],
 ['C05','BTN',[['BB','check'],['BTN','bet',200],['BB','raise',700]],'hero_facing_raise'],
 ['C06','BB',[['BB','check'],['BTN','bet',200],['BB','call'],'deal',['BB','check'],['BTN','bet',600],['BB','raise',1800],['BTN','raise',4000]],'hero_facing_raise'],
 ['C07','BTN',[['BB','check'],['BTN','bet',200]],'wait_for_other'],
 ['C08','BTN',xx,'deal_next'],
 ['C09','BB',[...xx,'deal',...xx,'deal'],'hero_free'],
 ['C10','BTN',[...xx,'deal',['BB','bet',9750],['BTN','call']],'runout'],
 ['C11','BTN',[['BB','check'],['BTN','bet',200],['BB','fold']],'settle_fold'],
 ['C12','BTN',[...xx,'deal',...xx,'deal',...xx],'settle_showdown'],
 ['C13','BTN',[...xx,'deal',['BB','check'],['BTN','bet',9750]],'wait_for_other'],
 ['C14','BTN',[...xx,'deal',['BB','bet',9750]],'hero_facing_bet']
];
function expected(s,hero){
 if(s.phase==='street_closed')return{kind:'deal_next',location:'board',legalHeroActions:[],toCallBB:null,nextOperation:'发下一街，再从新局面看清；不重置前序、范围或金额'};
 if(s.phase==='runout')return{kind:'runout',location:'board',legalHeroActions:[],toCallBB:null,nextOperation:'发完剩余公共牌后摊牌；不再生成双方下注'};
 if(s.phase==='fold_terminal')return{kind:'settle_fold',location:'pot',legalHeroActions:[],toCallBB:null,nextOperation:'退回未匹配投入并结算；不发下一张牌'};
 if(s.phase==='showdown')return{kind:'settle_showdown',location:'pot',legalHeroActions:[],toCallBB:null,nextOperation:'行动结束，比较最佳五张并结算'};
 if(s.next!==hero)return{kind:'wait_for_other',location:'other',legalHeroActions:[],toCallBB:null,nextOperation:'等待对手回应，再按其实际动作更新；不能替他作决定'};
 const due=s.max-s.paid[hero];
 if(due===0)return{kind:'hero_free',location:'self',branch:'compare.unopened',legalHeroActions:['check','bet'],toCallBB:0,nextOperation:'看清后比较过牌与下注，不能直接以牌面或轮次跳到结算'};
 const raises=s.stacks[other(hero)]>0&&s.stacks[hero]>due;
 return{kind:s.lastAggression==='raise'?'hero_facing_raise':'hero_facing_bet',location:'self',branch:s.lastAggression==='raise'?'compare.raise':'compare.bet',legalHeroActions:raises?['fold','call','raise']:['fold','call'],toCallBB:due/100,nextOperation:s.lastAggression==='raise'?'用加注范围与新价格重新比较，不沿用原先价值下注的理由':'根据此下注范围和价格比较合法动作；不是选首次CB尺寸'};
}
const cases=specs.map(([id,hero,events,kind])=>{
 const s=apply(start(),events);assertCards([...s.board,...heroHole].map(card));const answer=expected(s,hero);assert.equal(answer.kind,kind);
 const row={id,hero,heroHole:[...heroHole],state:snapshot(s),answer,scope:'行动与流程检查，不考最优策略，不要求对手遵循某张范围图。'};
 if(id==='C11'){
  const winner=other(s.folder),uncalled=s.paid[winner]-s.paid[s.folder];
  row.answer.settlement={returnUncalledBB:uncalled/100,matchedPotAwardBB:(s.pot-uncalled)/100,winner,endingWinnerBB:(s.stacks[winner]+s.pot)/100};
  assert.deepEqual([uncalled,s.pot-uncalled,s.stacks[winner]+s.pot],[200,550,10300]);
 }
 if(id==='C12'){
  row.revealedVillainHole=['Qh','8h'];assertCards([...s.board,...heroHole,...row.revealedVillainHole].map(card));
  assert.ok(compare(evaluate([...s.board,...heroHole].map(card)),evaluate([...s.board,...row.revealedVillainHole].map(card)))>0);
  row.answer.settlement={winner:'BTN',grossPotBB:s.pot/100,endingWinnerBB:(s.stacks.BTN+s.pot)/100};
 }
 return row;
});
assert.deepEqual(cases.filter(c=>c.answer.toCallBB>0).map(c=>[c.id,c.answer.toCallBB]),[['C03',2],['C04',4],['C05',5],['C06',22],['C14',97.5]]);
assert.deepEqual(cases.find(c=>c.id==='C14').answer.legalHeroActions,['fold','call']);
assert.equal(cases.find(c=>c.id==='C10').state.potBB,200.5);
assert.equal(cases.find(c=>c.id==='C13').state.potBB,103);
const packet={
 status:'author_trial_packet_not_administered',date:'2026-10-19',purpose:'V2 首次导览后的行动定位、金额与终点诊断；不测最优策略，不是NL50资格题。',
 scenario:{players:6,initialBB:100,ante:0,preflop:'UTG/HJ/CO弃，BTN开到2.5BB，SB弃，BB跟；SB死盲0.5BB留池。',flopStartingPotBB:5.5,activeStartingStacksBB:{BTN:97.5,BB:97.5},moneyScope:'抽水前账本；终局毛额，未指定净抽水'},
 learnerPrompt:{first:'下一步先点哪里？自己／对手／公共牌／底池／我不知道。',ifSelf:'只选现在合法的动作，并填待补额。不要求选最佳策略。',ifBoardOrPot:'说明接下来发生什么，以及能不能再下注。'},
 administration:{showOneCaseAtATime:true,stepNamesHidden:true,firstResponseBeforeFollowups:true,noThinkAloudRequirementDuringFirstResponse:true,allowSlowAndHistoryReview:true,unknownCountsAsError:true,teachingAfterFirstResponse:true,priorFeedbackMayAffectLaterResponses:true,wholePacketUnaidedClaimAfterRemediation:false,unhelpedRetryNeedsFreshInstance:true,sessionOnly:true},
 leakage:'这是公开的作者与试读候选题，不是冻结保留考试；阅读或练过后不得拿同题/花色同构声称陌生迁移。',
 cases,
 scopeLimits:['只支持所列单挑、等有效筹码与完整加注例；不是一般规则引擎','已知牌合法与金额守恒不证明真实读者会做','同一结构的多题不等于足够统计样本','没有真实试读记录，V2仍未验证','无策略答案，不能用正确定位冒充V3/V4'],
};
fs.writeFileSync(`${dir}/first-pass-structure-packet.json`,JSON.stringify(packet,null,2));
const prompts={status:packet.status,date:packet.date,purpose:packet.purpose,scenario:packet.scenario,learnerPrompt:packet.learnerPrompt,leakage:packet.leakage,cases:cases.map(c=>({id:c.id,hero:c.hero,heroHole:c.heroHole,state:{street:c.state.street,board:c.state.board,potBB:c.state.potBB,stacksBB:c.state.stacksBB,streetPaidBB:c.state.streetPaidBB,foldedSeats:c.state.foldedSeats,history:c.state.history},...(c.revealedVillainHole?{revealedVillainHole:c.revealedVillainHole}:{}),scope:c.scope}))};
fs.writeFileSync(`${dir}/first-pass-structure-prompts.json`,JSON.stringify(prompts,null,2));
const face=c=>{const x=card(c);return '23456789TJQKA'[x.rank-2]+({s:'♠',h:'♥',d:'♦',c:'♣'}[x.suit]);};
const streetNames={flop:'翻牌',turn:'转牌',river:'河牌'};
const briefHistory=c=>c.state.history.map(x=>x.replace(/[2-9TJQKA][shdc]\b/g,m=>face(m))).join(' → ');
const opening=`# 第一遍结构检查：可直接试读的14张状态卡\n\n2026年10月19日。总入口：[统一总纲](../../翻后教学系统_统一总纲.md)。这是作者和试读使用的文稿，不是新增软件或14门并列课程。\n\n## 怎样使用\n\n先完成整手导览，再一次只展示下面一张卡。每张卡是独立片段，不能把C01接到C02当同一手。暂时收起四步名称、答案色和本稿后面的教师说明；保留牌、历史、位置与金额。\n\n共同条件：六人现金桌，初始100BB，无前注。UTG/HJ/CO弃牌，BTN开到2.5BB，SB弃牌，BB跟注；SB的0.5BB留在池中。进入翻牌时底池5.5BB，BTN和BB都剩97.5BB。只看这些片段的合法流程，不要求对手符合某张策略图，不考最佳下注动作。\n\n每题第一次只问：**下一步先点哪里？自己／对手／公共牌／底池／我不知道。** 若点自己，勾出当前合法动作（过牌、下注、弃牌、跟注、加注）并填还需补多少；若点公共牌或底池，再说明接下来发生什么、能不能继续下注。\n\n允许慢想和回看历史。“我不知道”按错误处理并进入补教。先记第一反应，再问针对性诊断；先问诊断会提示答案，不能还记作独立正确。这里没有真实试读结果。\n\n公开状态卡是候选材料，不是最终保留题。练过同题或仅换花色的同构版本，再答对不能算陌生迁移。\n`;
let md=opening;
for(const c of cases){
 md+=`\n## 状态卡 ${c.id}\n\n[打开单张图卡](figures/structure-${c.id}.png)。图卡只展示题面，不标下一位或正确动作。\n\n你在${actorLabel(c.hero)}，底牌${c.heroHole.map(face).join(' ')}。当前${streetNames[c.state.street]}：${c.state.board.map(face).join(' ')}。\n\n翻后经过：${briefHistory(c)}。\n\n现在桌上${c.state.potBB}BB；BTN后手${c.state.stacksBB.BTN}BB，BB后手${c.state.stacksBB.BB}BB。${c.id==='C12'?`双方已亮牌，对方${c.revealedVillainHole.map(face).join(' ')}。`:''}\n\n下一步先点哪里？如轮到你，哪些动作合法、待补多少？\n`;
}
md+=`\n## 教师说明：第一反应收好以后再看\n\n答案与逐状态金额见[first-pass-structure-packet.json](first-pass-structure-packet.json)的cases[].answer。本文件不把答案名称写在题头。脚本只验证指定例子的金额、行动顺序、合法牌和预期位置，不能自动验证人是否理解。\n\nC01/C02检查没有待补时的主动选择；C03/C04检查面对下注；C05/C06检查面对加注及新价格；C07检查轮到对手；C08检查本街结束；C09检查河牌仍需行动；C10检查全下匹配后发完牌；C11检查弃牌退款与结算；C12检查行动结束后的摊牌。C13/C14额外区分“我全下了还要等对手”和“对手全下了轮到我跟弃”。12项核心加2项全下边界，是初版覆盖配额，不是科学验证的最佳题量。\n\n只看最终选项不足以诊断原因。第一反应之后，错价格才展开本街双方已投入；把河牌当结算才补行动指针；被加注仍选CB尺寸才问现在应对照原跟注范围还是新加注范围。不能只用一次按钮结果推断用户不懂某个原理。\n\n补完回原任务可以检查刚才解释是否听懂；随后需要另一实例检查是否能独立调用。受帮助重做与首次独立回答分别记录在本轮观察表，不建长期数据库。观察字段：题号、第一位置、合法动作、待补、是否用帮助、具体卡点、补教后是否返回原任务。没有实际作答，不填任何成绩。\n\n本稿仅补V2的可执行材料；仍需要真正零基础读者试读和新实例复查。最优策略、完整范围推理、连续多街取舍与NL50表现另按[验收方案](04_正确性与NL50验收方案.md)检验。\n`;
md+='\n反馈时机与证据身份：沿用练习的即时对错与错误解析。每题先收首答，再反馈；若前题补教影响了后题，后题首答也不等于整包无帮助。观察表保留此前已给的提示与补教位置，报告为“补教后的结构表现”。要检验最初导览单独产生了什么效果，另用未受中途补教影响的新实例与相应试读安排，不能将本候选包正确率直接用于该结论。\n\n这些状态只制造合法行动与终点，不示范其中下注值得采用。全下边界卡尤其不能当作常规下注尺度教学；当前任务不考最佳策略。单张图卡是文档中的静态试读材料，没有改动应用界面。\n';
md+='\n图卡从[first-pass-structure-prompts.json](first-pass-structure-prompts.json)的公开题面字段生成。该文件不含正确位置、下一行动者、终点标签、待补答案或正确合法动作表；它保留实际已投入等必要事实，让用户自己判断。教师答案只在完整packet文件中。这样做防止制作时误把答案颜色或推导结果预先放到题面；不是将公开候选题变成秘密保留考试。\n';
fs.writeFileSync(`${dir}/15_第一遍结构检查_可直接试读稿.md`,md);
console.log(JSON.stringify({status:packet.status,cases:cases.length,callAmounts:cases.filter(c=>c.answer.toCallBB>0).map(c=>[c.id,c.answer.toCallBB]),allinBoundary:[cases.find(c=>c.id==='C13').answer,cases.find(c=>c.id==='C14').answer],learnerResults:'not_collected'},null,2));
