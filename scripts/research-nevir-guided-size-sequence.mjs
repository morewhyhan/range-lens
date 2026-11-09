import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {card,evaluate,compare} from '../src/poker.js';
const dir='research/nevir-system/';
const source=JSON.parse(fs.readFileSync(dir+'size-comparison-evidence.json','utf8'));
const outer=JSON.parse(fs.readFileSync(dir+'first-hand-lesson-packet.json','utf8'));
const parent=outer.frames.find(f=>f.id==='S05');assert.ok(parent);
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const ctx=source.context,model=source.examples.equityFallsButLargeWins;
// Independent ending-stack settlement, rather than copying the source payoff formula.
let branches=0;
for(const example of Object.values(source.examples))for(const action of example.actions){
  let weighted=0,mass=0;
  for(const row of action.contributions){
    const group=source.groups.find(g=>g.id===row.group);assert.ok(group);
    const cards=[...ctx.board,...ctx.hero,...group.hole];assert.equal(new Set(cards).size,9);
    const cmp=compare(evaluate([...ctx.board,...ctx.hero].map(card)),evaluate([...ctx.board,...group.hole].map(card)));
    const share=cmp>0?1:cmp===0?.5:0;close(share,group.equity);
    const b=action.bet,p=ctx.potBB,s=ctx.activeStackBB;
    const endHero=row.response==='fold'?s-b+(p+b):s-b+share*(p+2*b);
    const endOther=row.response==='fold'?s:s-b+(1-share)*(p+2*b);
    close(endHero+endOther+399.5,600);close(endHero-s,row.payoffIfThisHoldingBB);
    weighted+=(endHero-s)*row.weight;mass+=row.weight;branches++;
  }
  close(weighted/mass,action.evBB);
}
assert.deepEqual(model.best,['large']);
const states={
  root:{board:ctx.board,hero:ctx.hero,heroSeat:'BTN',villainSeat:'BB',actor:'BTN',pot:10,heroStack:95.25,villainStack:95.25,heroPut:0,villainPut:0,phase:'unopened',opponentVisible:false},
  bet:{board:ctx.board,hero:ctx.hero,heroSeat:'BTN',villainSeat:'BB',actor:'BB',pot:20,heroStack:85.25,villainStack:95.25,heroPut:10,villainPut:0,phase:'wait_response',opponentVisible:false},
  matched:{board:ctx.board,hero:ctx.hero,heroSeat:'BTN',villainSeat:'BB',actor:null,pot:30,heroStack:85.25,villainStack:85.25,heroPut:10,villainPut:10,phase:'showdown_pending',opponentVisible:false},
  revealed:{board:ctx.board,hero:ctx.hero,heroSeat:'BTN',villainSeat:'BB',actor:null,pot:30,heroStack:85.25,villainStack:85.25,heroPut:10,villainPut:10,phase:'showdown',opponentVisible:true,opponentHole:['Js','Jd']},
  settled:{board:ctx.board,hero:ctx.hero,heroSeat:'BTN',villainSeat:'BB',actor:null,pot:0,heroStack:115.25,villainStack:85.25,phase:'settled',opponentVisible:true,opponentHole:['Js','Jd']}
};
for(const state of Object.values(states))close(state.pot+state.heroStack+state.villainStack+399.5,600);
const frames=[],answers=[];
function add(id,title,state,prompt,options,expected,explanation,given={}){
  frames.push({id,title,state:structuredClone(states[state]),task:{prompt,options:[...options,'我不知道']},given,assessment:'guided_finite_size_model_not_unaided_full_strategy',unknownCountsAsWrong:true});
  answers.push({id,expected,explanation});
}
const row=(group,action)=>model.actions.find(a=>a.id===action).contributions.find(r=>r.group===group);
const pair=group=>({candidate:source.groups.find(g=>g.id===group).hole,small:row(group,'small'),large:row(group,'large'),scope:'Candidate illustration, not actual opponent reveal.'});
add('B01','先认当前决定','root','BB已经过牌，现在自己比较什么？',['过牌与下注','跟注与弃牌','直接结算'],'过牌与下注','自己BTN后行动，当前没有待补。另一手河牌模型，不是原AQ翻牌的答案。');
add('B02','先看能赢谁','root','自己的QQ面对JJ和KJ，哪项对？',['赢JJ、输KJ','两手都赢','两手都输'],'赢JJ、输KJ','QQ是一对Q，赢一对J，输一对K；牌面有K不等于双方都有一对K。',{candidates:['JJ','KJ']});
add('B03','差牌两种都付款','root','给定JJ两种都跟，下10比下5多收到多少？',[5,10,0],5,'面对同一手JJ，两种都赢。当前净收益从15到20，多得5。',pair('JJ'));
add('B04','差牌可能嫌贵','root','66跟5、弃10；面对这一组，哪种收益更高？',['下5','下10','相同'],'下5','小注净得15，大注只拿当前池10。赶走本来会付小注的差牌，可能少收钱。',pair('66'));
add('B05','更好的牌也可能退出','root','KJ跟5、弃10；面对这一组，下10带来什么？',['把原本输的池拿走','让差牌多付钱','必然多亏钱'],'把原本输的池拿走','这组KJ当前赢自己；小注被跟损失5，大注令其弃牌则净得10。是题设响应，不是认为所有KJ都该弃。',pair('KJ'));
add('B06','不能漏掉强端成本','root','KK两种都跟；下10相比下5怎样？',['多损失5','多赚5','没有变化'],'多损失5','自己输给三条K，净收益由−5变−10；大注的成本必须计入。',pair('KK'));
add('B07','本来就能赢的退出','root','AJ在两种下注下都弃；河牌过牌也能赢它，下10比过牌多赚吗？',['没有多赚','多赚10','多赚20'],'没有多赚','本模型最后行动，过牌直接摊牌赢10；对方弃牌也净得10。下注自己的筹码要扣回，不是额外收入。',pair('AJ'));
add('B08','把互斥结果合起来','root','判断整体大小注，能只看JJ多付的钱吗？',['不能，要按所有候选质量合起来','能，能收差牌就够','只看KK就够'],'不能，要按所有候选质量合起来','JJ获益、66少收、KJ退出、KK多亏、AJ不变同时属于不同可能结果，按题设质量比较。',{weights:model.weights});
add('B09','用完整比较选方案','root','按本模型完整比较，当前选什么？',['过牌','下注5','下注10'],'下注10','当前EV过牌8、小注9.5、大注10；这是给了答案支持的跟练，不算独立推导。',{values:model.actions.map(a=>({action:a.id,evBB:a.evBB})),weights:model.weights});
add('B10','别只盯被跟时胜率','root','大注被跟时胜出份额更低，是否就能否定它？',['不能，还要计退出与投入','能，权益低必然差'],'不能，还要计退出与投入','小注被跟5/7，大注被跟2/3，但完整收益大注仍高0.5。关闭对照后还是原模型。',{smallCalledShare:5/7,largeCalledShare:2/3});
add('B11','这次才实际下注','bet','按示范下10以后，接下来等谁？',['BB对手','自己再下10','立即摊牌'],'BB对手','池20、自己85.25，对手尚未回应；比较和预览期间不提前扣钱。');
add('B12','回应完成才到终点','matched','BB实际跟10，河牌行动已完成，下一步是什么？',['摊牌','再发一张牌','自己继续下注'],'摊牌','池30、双方85.25；河牌已满五张，最后一次跟注关闭行动。');
add('B13','此时才亮实际牌','revealed','对手这次实际JsJd，谁赢？',['自己','对手','平分'],'自己','自己的QQ赢JJ。候选比较不代表提前知道实际JJ。');
add('B14','一次结果与事前比较分开','settled','整手从100到115.25，净赢多少？',[15.25,20,30],15.25,'本段河牌95.25到115.25净得20；整手净赢15.25；事前EV10是平均值，三者不能混用。');
const optional=[];
for(const [key,id,prompt]of [['valueLarge','O01','若明确只剩会跟大注的JJ，选什么？'],['valueSmall','O02','若明确只剩跟小注、弃大注的66，选什么？'],['checkBetter','O03','若明确只剩两种都跟的KK，选什么？']]){
  const example=source.examples[key];const options=['过牌','下注5','下注10'];const labels={check:options[0],small:options[1],large:options[2]};
  add(id,'可选：只改给定候选权重','root',prompt,options,labels[example.best[0]],'这是另一种已给齐输入的有限模型；关闭后恢复原五组质量和原比较，不把只剩一手当作真实对手。',{example:key,weights:example.weights,values:example.actions.map(a=>({action:a.id,evBB:a.evBB}))});
  optional.push({openAt:'B09',label:prompt,frames:[id],returnTo:'B09',surface:'feedback',then:'B10',restoreFullFrameHash:hash(frames.find(f=>f.id==='B09'))});
}
const core=frames.filter(f=>f.id.startsWith('B')).map(f=>f.id);assert.equal(core.length,14);assert.equal(optional.length,3);
assert.equal(frames.find(f=>f.id==='B13').state.opponentVisible,true);
for(const f of frames.filter(f=>/^B(0\d|1[012])$/.test(f.id)))assert.equal('opponentHole'in f.state,false);
const restore=structuredClone(parent);assert.equal(hash(restore),hash(parent));
const parentLink={source:'first-hand-lesson-packet.json',frame:'S05',mode:'review_after_first_pass',notice:'原整手结束后回看S05。换另一手河牌QQ和给定模型，不将它的下10答案贴回AQ翻牌。',snapshotHash:hash(parent),returnHash:hash(restore),independentAssessment:false};
const packet={status:'guided_size_paper_sequence_not_UI_or_learner_verified',parentLink,context:ctx,modelInput:{source:'size-comparison-evidence.json',example:'equityFallsButLargeWins',weights:model.weights,groups:source.groups,menu:ctx.menu,noRaises:true},navigation:{core,optional,events:[{from:'B10',to:'B11',event:'Demonstration BTN bet10 once'},{from:'B11',to:'B12',event:'Observed model BB call10 once'},{from:'B12',to:'B13',event:'Reveal actual JsJd only now'},{from:'B13',to:'B14',event:'Award30 to hero once'}]},frames,answers,returnFrame:restore,
  verification:{independentEndingStackBranches:branches,firstActualReveal:'B13',moneyTotalBB:600},release:{preciseOriginalAQStrategy:false,NL50Reference:false,unseenAssessment:false,learnerVerified:false}};
fs.writeFileSync(dir+'guided-size-sequence-packet.json',JSON.stringify(packet,null,2)+'\n');
const {answers:_,returnFrame:__,...publicPart}=packet;
fs.writeFileSync(dir+'guided-size-sequence-prompts.json',JSON.stringify({...publicPart,status:'public_guided_size_paper_frames_not_heldout'},null,2)+'\n');
console.log(JSON.stringify({ok:true,coreFrames:core.length,optionalFrames:optional.length,independentEndingStackBranches:branches,firstActualReveal:'B13',status:packet.status},null,2));
