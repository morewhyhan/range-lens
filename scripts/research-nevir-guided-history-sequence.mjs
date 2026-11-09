import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {card,evaluate,compare} from '../src/poker.js';
const dir='research/nevir-system/';
const source=JSON.parse(fs.readFileSync(dir+'history-contrast-evidence.json','utf8'));
const outer=JSON.parse(fs.readFileSync(dir+'first-hand-lesson-packet.json','utf8'));
const parent=outer.frames.find(f=>f.id==='S09');assert.ok(parent);
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const a=source.paths.find(p=>p.id==='HC_A'),b=source.paths.find(p=>p.id==='HC_B');assert.ok(a&&b);
const masses={};
for(const p of [a,b]){
  let m=source.candidates.map(c=>10*c.priorMass);const steps=[structuredClone(m)];
  for(const likelihood of p.likelihoods){m=m.map((x,i)=>x*likelihood[i]);steps.push(structuredClone(m));}
  const sum=m.reduce((x,y)=>x+y,0);
  p.posterior.forEach((r,i)=>close(m[i]/sum,r.probability));masses[p.id]=steps;
  // Separate explicit leaf settlement, including both QQ responses.
  let check=0,bet=0;
  for(let i=0;i<source.candidates.length;i++){
    const c=source.candidates[i],s=p.currentState;
    const result=compare(evaluate([...s.board,...s.hero].map(card)),evaluate([...s.board,...c.hole].map(card)));
    const share=result>0?1:result===0?.5:0;close(share,c.heroShowdownShare);
    const q=m[i]/sum,call=source.fixedResponse.afterBet17_5[c.id].call;
    check+=q*(83+share*35-83);
    const endIfCall=83-17.5+share*70,endIfFold=83-17.5+52.5;
    bet+=q*(call*(endIfCall-83)+(1-call)*(endIfFold-83));
    for(const newCard of ['2c','4s'])assert.ok(![...s.hero,...c.hole,...s.board.slice(0,3)].includes(newCard));
  }
  close(check,p.actions.checkEVBB);close(bet,p.actions.bet17_5EVBB);
}
assert.deepEqual(masses.HC_A,[[10,20,20],[2,16,20],[2,8,2]]);
assert.deepEqual(masses.HC_B,[[10,20,20],[10,10,2],[8,8,2]]);
assert.deepEqual(a.currentState,b.currentState);
function state(path,index,actor,phase,mass){
  const ledger=index<0?{pot:21,sb:90,btn:90}:path.ledger[index];
  const board=['Ts','8h','3d'];
  if(index>=2)board.push('2c');if(index>=5)board.push('4s');
  return {board,hero:['Kc','Kd'],heroSeat:'SB',villainSeat:'BTN',actor,phase,pot:ledger.pot,heroStack:ledger.sb,villainStack:ledger.btn,historyPath:path.id,history:path.events.slice(0,index+1),candidateMass:mass,opponentVisible:false};
}
const states={
 root:state(a,-1,'SB','unopened',masses.HC_A[0]),
 checked:state(a,0,'BTN','wait_response',masses.HC_A[0]),
 flopClosed:state(a,1,null,'street_closed',masses.HC_A[1]),
 turn:state(a,2,'SB','unopened',masses.HC_A[1]),
 turnBet:state(a,3,'BTN','wait_response',masses.HC_A[1]),
 turnCalled:state(a,4,null,'street_closed',masses.HC_A[2]),
 river:state(a,5,'SB','unopened',masses.HC_A[2]),
 alternativeStart:state(b,-1,'SB','preview',masses.HC_B[0]),
 alternativeFlopCall:state(b,1,null,'preview_street_closed',masses.HC_B[1]),
 alternativeTurnCheck:state(b,3,'BTN','preview_wait_response',masses.HC_B[1]),
 alternativeTurnClosed:state(b,4,null,'preview_street_closed',masses.HC_B[2]),
 alternativeRiver:state(b,5,'SB','preview_unopened',masses.HC_B[2])
};
states.riverBet={...structuredClone(states.river),pot:52.5,heroStack:65.5,actor:'BTN',phase:'wait_response',history:[...a.events,'river SB bet17.5']};
states.riverCall={...structuredClone(states.riverBet),pot:70,villainStack:65.5,actor:null,phase:'showdown_pending',history:[...states.riverBet.history,'river BTN call17.5'],candidateMass:[2,4,0]};
states.revealed={...structuredClone(states.riverCall),phase:'showdown',opponentVisible:true,opponentHole:['Qc','Qd']};
states.settled={...structuredClone(states.revealed),pot:0,heroStack:135.5,phase:'settled'};
states.highRiverPreview={...structuredClone(states.river),board:['Ts','8h','3d','2c','Qh'],historyPath:'HC_A_until_turn_then_Qh_preview',history:[...a.events.slice(0,-1),'preview dealQh instead of4s'],phase:'preview_card_replacement'};
const turnBoard=['Ts','8h','3d','2c'];
const golden={
 hero:[[1,13,10,8,3],[1,13,10,8,4],[1,13,12,10,8]],
 '88':[[3,8,10,3],[3,8,10,4],[3,8,12,10]],
 QQ:[[1,12,10,8,3],[1,12,10,8,4],[3,12,10,8]],
 JT:[[1,10,11,8,3],[1,10,11,8,4],[1,10,12,11,8]]
};
const newCardFacts={};
for(const [id,hole]of [['hero',['Kc','Kd']],...source.candidates.map(c=>[c.id,c.hole])]){
  const boards=[turnBoard,states.river.board,states.highRiverPreview.board];
  newCardFacts[id]=boards.map((board,i)=>{
    assert.equal(new Set([...board,...hole]).size,board.length+2);
    const result=evaluate([...board,...hole].map(card));assert.deepEqual(result.value,golden[id][i]);
    return {board,value:result.value,bestFive:result.cards.map(c=>c.id)};
  });
}
const compareVectors=(x,y)=>{for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]??0)-(y[i]??0);if(d)return Math.sign(d);}return 0;};
for(const id of ['88','QQ','JT']){
  assert.equal(compareVectors(golden.hero[0],golden[id][0]),compareVectors(golden.hero[1],golden[id][1]));
}
assert.equal(compareVectors(golden.hero[1],golden.QQ[1]),1);assert.equal(compareVectors(golden.hero[2],golden.QQ[2]),-1);
for(const s of Object.values(states))close(s.pot+s.heroStack+s.villainStack+399,600);
const physical=s=>({board:s.board,hero:s.hero,pot:s.pot,heroStack:s.heroStack,villainStack:s.villainStack,actor:s.actor});
assert.deepEqual(physical(states.river),physical(states.alternativeRiver));assert.notDeepEqual(states.river.history,states.alternativeRiver.history);
const frames=[],answers=[];
function add(id,title,key,prompt,options,expected,explanation,given={}){
  frames.push({id,title,state:structuredClone(states[key]),task:{prompt,options:[...options,'我不知道']},given,assessment:'guided_history_facts_and_given_model_not_real_opponent_inference',unknownCountsAsWrong:true});
  answers.push({id,expected,explanation});
}
add('H01','从真实前序开始','root','翻牌刚开始，谁先行动？',['SB自己','BTN对手','发转牌'],'SB自己','SB没位置。此处换成KK作者模型，前面各动作是教学前序，不称最优。');
add('H02','自己过牌仍要等回应','checked','自己过牌以后，能直接发转牌吗？',['不能，要等BTN','能，自己不下注就换街'],'不能，要等BTN','先行动过牌不关闭整街；也不等于弃牌。');
add('H03','强牌也可能过牌','flopClosed','BTN也过牌，模型中的88是不是全没了？',['没有，仍有非零可能','是，强牌不会过牌'],'没有，仍有非零可能','给定88有20%过牌概率，10份留下2份；不是看到一次过牌就估出20%。',{observed:'BTN flop check',likelihoods:a.likelihoods[0],candidateOrder:['88','QQ','JT']});
add('H04','让候选实际变淡','flopClosed','QQ原有20份、题设80%会过牌，过牌支留下多少？',[16,20,4],16,'留下16，不是恢复20；这些圆点代表相对质量，不是16种不同QQ。',{displayMass:masses.HC_A[1]});
add('H05','新街不重置候选','turn','2c来了，是否把候选恢复成10、20、20？',['不恢复，继承2、16、20','恢复，每街重新开始'],'不恢复，继承2、16、20','三候选均不含2c，物理排除不删它们；之前过牌筛选仍保留。');
add('H06','给定下注实际落地','turnBet','示范下注7以后，下一步等谁？',['BTN对手','自己再下注','直接发河牌'],'BTN对手','池28、自己83、对手90；对手尚未回应，先不改成跟注后范围。');
add('H07','连续回应继续筛','turnCalled','BTN跟7后，哪组份额符合本题？',['2、8、2','10、20、20','2、16、20'],'2、8、2','在已留2、16、20上再乘1、1/2、1/10。跟注不等于只剩对子，也不把之前筛选清空。',{observed:'BTN turn call7',likelihoods:a.likelihoods[1],candidateOrder:['88','QQ','JT']});
add('H08','河牌保留整条历史','river','河牌4s发出，现在轮到谁？',['SB自己','BTN对手','直接结算'],'SB自己','河牌不等于结束；SB仍先行动，眼前池35、双方83。');
add('H09','先看当前能赢谁','river','KK对88、QQ、JT，哪项对？',['输88，赢QQ和JT','三组都赢','只赢JT'],'输88，赢QQ和JT','88在这块牌面成三条8；QQ和JT分别是一对Q、一对T。');
add('H10','把留下的候选接到选择','river','按这条历史及给定完整河牌回应，比较结果选什么？',['过牌','下注17.5'],'下注17.5','给定范围1:4:1，过牌175/6，下注385/12，下注较高。不是先过后打必继续下注。',{values:a.actions,weights:masses.HC_A[2],scope:'Given EV help; not unaided strategy. Optional alternative history restores this whole frame.'});
add('H11','比较之后才扣本次钱','riverBet','自己实际下17.5后，接下来做什么？',['等BTN回应','立即收池','再发一张牌'],'等BTN回应','池52.5、自己65.5；对手可能按题设跟或弃，尚未亮牌。');
add('H12','实际回应后再更新','riverCall','BTN这次跟了，原来必弃的JT还在跟注支吗？',['不在','仍按原两份保留'],'不在','88全跟、QQ一半跟、JT全弃：2、8、2更新为2、4、0。实际发生后才改范围，本街完成。',{likelihoods:[1,.5,0]});
add('H13','此时才亮实际QQ','revealed','对手实际QcQd，谁赢？',['自己','对手','平分'],'自己','KK赢QQ；所有先前候选都只是可能牌，不是提前知道QQ。');
add('H14','结算与先前判断分开','settled','从整手100到135.5，净赢多少？',[35.5,52.5,70],35.5,'河牌段83到135.5得52.5，整手得35.5；收回70及事前平均收益都不是这个数字。');
add('J01','可选：从同一起点预演另一条历史','alternativeStart','这条对照能直接接在已完成路线A的河牌后吗？',['不能，从相同翻牌起点预演','能，直接继续扣钱'],'不能，从相同翻牌起点预演','A与B互斥；比较不修改实际A。');
add('J02','先下注被跟的筛选','alternativeFlopCall','这次翻牌先下7被跟，候选留下哪组？',['10、10、2','2、16、20','10、20、20'],'10、10、2','从原10、20、20乘1、1/2、1/10；不是用A的过牌概率。',{likelihoods:b.likelihoods[0]});
add('J03','转牌先过还要等人','alternativeTurnCheck','2c后自己过牌，转牌是否结束？',['没有，要等BTN','结束，直接发河牌'],'没有，要等BTN','仍需对手回应，不能在先行动过牌后直接换街。');
add('J04','后过才关闭街并筛选','alternativeTurnClosed','BTN也过，88原10份按80%留下多少？',[8,2,10],8,'这次转牌过牌用给定80%，留下8；整组成为8、8、2。',{likelihoods:b.likelihoods[1]});
add('J05','眼前一样不代表信息一样','alternativeRiver','两条路线河牌、钱和座位一样，候选也必须一样吗？',['不必须，历史回应不同','必须，只看现在即可'],'不必须，历史回应不同','A是1:4:1，B是4:4:1。改变的不是公共牌，而是各候选走到这里的给定概率。');
add('J06','另一历史重新比较','alternativeRiver','本对照完整比较选什么？',['过牌','下注17.5'],'过牌','B中过牌175/9、下注140/9；强端88比例更高。不能背先打后过必过牌。',{values:b.actions,weights:masses.HC_B[2]});
add('J07','关闭后恢复原题与参考','river','关闭B预演，原A比较恢复哪组？',['2、8、2','8、8、2'],'2、8、2','回原H10反馈，包括其范围与比较，不带入B的过牌答案，不重复计分或发牌。');
add('K01','可选：空白不是完全没变','river','4s出现后，四手牌的最佳五张完全没变吗？',['不是，有踢脚变化，但这三组胜负关系保持','是，空白牌完全不影响五张'],'不是，有踢脚变化，但这三组胜负关系保持','KK、QQ、JT的低位踢脚由3变4；88也换了配牌。但KK仍输88、赢QQ与JT。空白只相对这组候选说。',{physicalFacts:newCardFacts});
add('K02','只替换这一张河牌','highRiverPreview','假设最后一张换Qh，候选QQ成什么？',['三条Q','仍是一对Q','一对K'],'三条Q','QcQd与Qh组成三条Q；只预演替换河牌，不在实际五张公共牌后多发第六张。');
add('K03','看对手改善而非只看自己','highRiverPreview','在Qh预演上，自己KK面对这手QQ还领先吗？',['不领先，三条Q赢一对K','仍领先，因为K大于Q'],'不领先，三条Q赢一对K','比较完整牌型先于对子点数。自己的牌仍是一对K，对方却从一对升到三条。');
add('K04','事实变化不自动生成策略','highRiverPreview','换Qh后，能直接沿用原4s牌面的EV数字判下注吗？',['不能，需匹配新牌面的完整回应比较','能，只要池和后手一样'],'不能，需匹配新牌面的完整回应比较','这里只核对牌力变化，不填新策略；旧数值用的是QQ仍输KK时的终局收益，新牌面已经不同。');
add('K05','回真实河牌与原范围','river','关闭Qh预演，当前实际河牌恢复哪张？',['4s','Qh','两张都保留'],'4s','回H08原反馈，牌、钱、候选、历史与曝光状态恢复；没有实际发Qh，也不把QQ成三条留在真实4s上。');
const core=frames.filter(f=>f.id.startsWith('H')).map(f=>f.id);
const optional=[{openAt:'H10',label:'为什么先前路线会改变范围',frames:frames.filter(f=>f.id.startsWith('J')).map(f=>f.id),returnTo:'H10',surface:'feedback',then:'H11',restoreFullFrameHash:hash(frames.find(f=>f.id==='H10'))}];
optional.push({openAt:'H08',label:'看看这张牌改变了什么',frames:frames.filter(f=>f.id.startsWith('K')).map(f=>f.id),returnTo:'H08',surface:'feedback',then:'H09',restoreFullFrameHash:hash(frames.find(f=>f.id==='H08'))});
assert.equal(core.length,14);assert.equal(optional[0].frames.length,7);assert.equal(optional[1].frames.length,5);
for(const f of frames.filter(f=>/^H(0\d|1[012])$/.test(f.id)))assert.equal('opponentHole'in f.state,false);
assert.equal(frames.find(f=>f.id==='H13').state.opponentVisible,true);
const returnFrame=structuredClone(parent);assert.equal(hash(returnFrame),hash(parent));
const parentLink={source:'first-hand-lesson-packet.json',frame:'S09',mode:'review_after_first_pass',notice:'回看S09怎样带前序比较；换KK与三手候选的给定模型，不补造原AQ策略。',snapshotHash:hash(parent),returnHash:hash(returnFrame),independentAssessment:false};
const events=[
 {from:'H01',to:'H02',event:'Given SB flop check'},
 {from:'H02',to:'H03',event:'Observed BTN flop check'},
 {from:'H04',to:'H05',event:'Deal2c only after both checks'},
 {from:'H05',to:'H06',event:'Given SB turn bet7'},
 {from:'H06',to:'H07',event:'Observed BTN turn call7'},
 {from:'H07',to:'H08',event:'Deal4s only after call'},
 {from:'H10',to:'H11',event:'Demonstration SB river bet17.5 once, only after optional return'},
 {from:'H11',to:'H12',event:'Observed BTN river call17.5 once'},
 {from:'H12',to:'H13',event:'Reveal actual QcQd only now'},
 {from:'H13',to:'H14',event:'Award70 to SB once'}
];
for(const event of events){assert.ok(core.includes(event.from)&&core.includes(event.to));}
const packet={status:'guided_history_paper_sequence_not_UI_or_learner_verified',parentLink,context:source.context,modelInput:{source:'history-contrast-evidence.json',candidates:source.candidates,paths:[a,b],fixedResponse:source.fixedResponse},navigation:{core,optional,events,previewEvents:{J01_to_J02:['SB bet7','BTN call7'],J02_to_J03:['deal2c','SB check'],J03_to_J04:['BTN check'],J04_to_J05:['deal4s'],note:'Animate each event and action handoff separately; preview namespace never mutates actual A.'},firstAnswerLocksPersist:true},frames,answers,returnFrame,
 verification:{masses,matchingPhysicalRiver:true,wholeParentFrameRestored:true,firstActualOpponentReveal:'H13',currentMenusRestricted:true,newCardFacts,goldenFiveCardVectors:12,highRiverPreviewStrategyProvided:false},
 release:{fullOriginalAQStrategy:false,actualOpponentFrequencies:false,unseenAssessment:false,learnerVerified:false,NL50Reference:false}};
fs.writeFileSync(dir+'guided-history-sequence-packet.json',JSON.stringify(packet,null,2)+'\n');
const {answers:_,returnFrame:__,modelInput:___,...prompt}=packet;
fs.writeFileSync(dir+'guided-history-sequence-prompts.json',JSON.stringify({...prompt,modelInput:{candidates:source.candidates,historyLikelihoods:{A:a.likelihoods,B:b.likelihoods},riverResponse:source.fixedResponse},status:'public_history_paper_frames_not_heldout'},null,2)+'\n');
console.log(JSON.stringify({ok:true,coreFrames:core.length,optionalFrames:12,goldenFiveCardVectors:12,firstActualReveal:'H13',samePhysicalRiver:true,status:packet.status},null,2));
