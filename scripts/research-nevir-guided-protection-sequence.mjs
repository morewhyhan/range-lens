import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {card,evaluate,compare} from '../src/poker.js';
const dir='research/nevir-system/';
const source=JSON.parse(fs.readFileSync(dir+'active-plan-models.json','utf8'));
const size=JSON.parse(fs.readFileSync(dir+'guided-size-sequence-packet.json','utf8'));
const parent=size.frames.find(f=>f.id==='B09');assert.ok(parent);
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const model=source.protection;
assert.ok(model.checkEV>model.weakFolds.evFromRootBB);assert.ok(model.checkEV<model.weakCalls.evFromRootBB);
const root={board:source.context.board,hero:model.hero,heroSeat:'SB',villainSeat:'BTN',pot:21,heroStack:90,villainStack:90,actor:'SB',phase:'turn_unopened',modelIdentity:'AJ_folds_KK_jams',opponentVisible:false};
const states={root,responsePreview:{...root,phase:'preview_response_change',modelIdentity:'AJ_calls_KK_jams'},
 check:{...root,actor:'BTN',phase:'actual_wait_turn_response'},
 turnClosed:{...root,actor:null,phase:'actual_turn_closed'},
 river:{...root,board:[...root.board,'Ah'],actor:'SB',phase:'actual_river_unopened'},
 riverCheck:{...root,board:[...root.board,'Ah'],actor:'BTN',phase:'actual_wait_river_response'},
 showdown:{...root,board:[...root.board,'Ah'],actor:null,phase:'actual_showdown_pending'},
 revealed:{...root,board:[...root.board,'Ah'],actor:null,phase:'actual_showdown',opponentVisible:true,opponentHole:['As','Jc']},
 settled:{...root,board:[...root.board,'Ah'],pot:0,heroStack:90,villainStack:111,actor:null,phase:'actual_settled',opponentVisible:true,opponentHole:['As','Jc']}};
for(const s of Object.values(states))assert.equal(s.pot+s.heroStack+s.villainStack+399,600);
assert.equal(compare(evaluate([...states.river.board,...root.hero].map(card)),evaluate([...states.river.board,'As','Jc'].map(card))),-1);
const frames=[],answers=[];
function add(id,title,key,prompt,options,expected,explanation,given={}){frames.push({id,title,state:structuredClone(states[key]),task:{prompt,options:[...options,'我不知道']},given,assessment:'given_protection_plan_comparison_not_full_target_strategy',unknownCountsAsWrong:true});answers.push({id,expected,explanation});}
add('P01','先回当前未下注决定','root','转牌刚开始，自己没有待补，现在比较什么？',['过牌与下注','跟注与弃牌'],'过牌与下注','换成另一手作者计划模型，原B09河牌QQ的下10不移植过来。');
add('P02','只看AJ这组','root','QQ当前对AsJc，谁领先？',['自己的一对Q','对方A高','平分'],'自己的一对Q','有K公共牌不等于AJ已成一对K。');
add('P03','找到真正的反超牌','root','固定AJ后，44张合法河牌中哪组会让它反超？',['剩余3张A','所有高于7的牌','所有方片'],'剩余3张A','Ac、Ad、Ah配成一对A；其它41张自己赢。这里还没实际发牌。',{lossCards:['Ac','Ad','Ah'],riverCount:44});
add('P04','承认保护确实有好处','root','若这组AJ现在弃牌，能消除它反超的机会吗？',['能，但只说明这一组的好处','不能，保护永远没用'],'能，但只说明这一组的好处','固定AJ时，当前拿21优于给定过牌计划的21×41/44；全范围结论还没比较完。');
add('P05','补回全部候选','root','原给定范围除了3份AJ，还有什么？',['1份KK','没有其它候选','3份QQ'],'1份KK','不能因为刚才只看AJ，就把原模型的强端删掉。',{candidates:model.candidates.map(({id,hole,weight})=>({id,hole,weight}))});
add('P06','把被反击的成本算回去','root','给定KK面对10.5再全下，自己按新范围弃，首注10.5会回来吗？',['不会，首注已匹配','会，自己最后弃牌就全退'],'不会，首注已匹配','KK强于QQ且这条再全下支只有KK，弃掉后本次10.5是实际损失；未匹配的对手多余全下另退。',{scope:'Response and continuation are fixed author inputs; only this limited menu is compared.'});
add('P07','按份额计算强端成本','root','KK占1/4，损失10.5对平均收益贡献多少？',[-2.625,-10.5,0],-2.625,'不能拿一个条件分支的全额成本直接与整个范围的保护收益混比。');
add('P08','合并收益与成本','root','保护贡献约+1.074，强端成本−2.625，合计怎样？',['约−1.551','约+3.699','保护有效所以必然为正'],'约−1.551','保护本身有效，但给定完整范围中未抵过强端成本。',{denialGain:model.denialGainContribution,strongCost:model.strongRangeCostContribution});
add('P09','比较完整计划','root','按给定全部计划，当前选哪条？',['过牌计划','下注10.5计划'],'过牌计划','14.676136高于13.125。只比较已给定的后续计划，不叫任意动作的全局最优。',{checkEV:model.checkEV,betEV:model.weakFolds.evFromRootBB,scope:'Displayed EVs are answer support; not unaided strategy.'});
add('P10','这次才实际过牌','check','自己过牌以后，是否直接发河牌？',['不，先等BTN','是，没下注就换街'],'不，先等BTN','自己先行动，仍要对手回应。');
add('P11','对手也过才关闭街','turnClosed','BTN按给定计划过牌后，下一步是什么？',['发河牌','直接结算四张牌','自己在转牌再下'],'发河牌','本街双方完成行动，公共牌尚未发满。');
add('P12','坏牌来了仍要认行动者','river','实际来Ah，下一步先是谁？',['SB自己','直接结算','BTN直接拿池'],'SB自己','河牌发出仍有行动。当前只展示真实Ah，预演的其它A不留在桌上。');
add('P13','执行已给定的后续计划','riverCheck','按给定河牌过牌计划执行后，现在等谁？',['BTN对手','自己再下注','直接派彩'],'BTN对手','本例后续规定自己过牌，不能把执行示范说成独立选出最优河牌动作。');
add('P14','河牌行动关闭','showdown','BTN也过了，接下来是什么？',['摊牌比五张','再发第六张','继续下注'],'摊牌比五张','最后一街双方完成行动后才结算。');
add('P15','此时才亮AJ','revealed','对手实际AsJc，谁赢？',['对手一对A','自己一对Q','平分'],'对手一对A','这次确实被反超；先前候选示意不是提前揭实际底牌。');
add('P16','当前净额与整手净额','settled','自己从整手100到90，整手净变化多少？',[-10,0,-21],-10,'本段从90到90没有新增损失；整手前序已投入10。对手收池21不等于自己净输21。');
add('P17','不能从坏结果倒推下注','settled','能只因这次AJ配A，就改判之前一定该下注保护吗？',['不能，仍要比较事前全部候选和成本','能，出现坏牌说明过牌错了'],'不能，仍要比较事前全部候选和成本','给定计划比较仍是过牌较高；一次输赢不改变事前模型，也不验证现实范围准确。');
add('T01','可选：只改AJ愿不愿付钱','responsePreview','另一版本AJ全跟10.5、KK仍再全下，给定计划选什么？',['下注10.5','过牌'],'下注10.5','下注约18.852273，高于相同过牌计划14.676136。',{version:'AJ_calls_KK_jams',checkEV:model.checkEV,betEV:model.weakCalls.evFromRootBB});
add('T02','指出改变的原因','responsePreview','这个反转来自什么变化？',['AJ愿意付钱','自己的QQ变成更大对子','河牌已知安全'],'AJ愿意付钱','牌与钱没改，改变的是给定回应；不能背保护牌统一下注或统一过牌。');
add('T03','关闭后恢复原参考','root','关闭对照，实际主模型AJ面对10.5又怎样？',['全弃','全跟'],'全弃','恢复原P09反馈、13.125比较和首答锁，不把新版本下注结论留到原题。');
const core=frames.filter(f=>f.id.startsWith('P')).map(f=>f.id);assert.equal(core.length,17);
for(const f of frames.filter(f=>/^P(0\d|1[0-4])$/.test(f.id)))assert.equal('opponentHole'in f.state,false);
const returnFrame=structuredClone(parent);assert.equal(hash(returnFrame),hash(parent));
const packet={status:'guided_protection_plan_paper_sequence_not_UI_or_learner_verified',parentLink:{source:'guided-size-sequence-packet.json',frame:'B09',mode:'review_after_size_episode',notice:'尺寸段结束后回看B09，换另一手转牌QQ及其完整给定计划。关闭恢复原河牌QQ的完整比较，不移植过牌答案。',snapshotHash:hash(parent),returnHash:hash(returnFrame),independentAssessment:false},modelInput:{source:'active-plan-models.json',context:source.context,protection:model},navigation:{core,optional:[{openAt:'P09',label:'如果AJ愿意付钱',frames:['T01','T02','T03'],returnTo:'P09',surface:'feedback',then:'P10'}],events:[{from:'P09',to:'P10',event:'Actual SB turn check'},{from:'P10',to:'P11',event:'Observed BTN turn check'},{from:'P11',to:'P12',event:'Actual riverAh only'},{from:'P12',to:'P13',event:'Given SB river check'},{from:'P13',to:'P14',event:'Observed BTN river check'},{from:'P14',to:'P15',event:'RevealAsJc only now'},{from:'P15',to:'P16',event:'Award21 to BTN once'}]},frames,answers,returnFrame,release:{actualOpponentPolicy:false,fullActionOptimum:false,unseenAssessment:false,learnerVerified:false,NL50Verified:false}};
fs.writeFileSync(dir+'guided-protection-sequence-packet.json',JSON.stringify(packet,null,2)+'\n');const {answers:_,returnFrame:__,...prompts}=packet;fs.writeFileSync(dir+'guided-protection-sequence-prompts.json',JSON.stringify(prompts,null,2)+'\n');
console.log(JSON.stringify({ok:true,coreFrames:17,optionalFrames:3,firstActualReveal:'P15',wholeParentRestored:true,status:packet.status},null,2));
