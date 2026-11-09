import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const dir='research/nevir-system/';
const source=JSON.parse(fs.readFileSync(dir+'defense-tree-evidence.json','utf8'));
const draw=JSON.parse(fs.readFileSync(dir+'guided-draw-sequence-packet.json','utf8'));
const parent=draw.frames.find(f=>f.id==='D13');assert.ok(parent);
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const p=source.profiles.find(p=>p.id==='fold_to_raise'),s=p.smallRaise;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const foldPart=8/21*31.5,callPart=8/21*s.callContinuation.conditionalEVBB,jamPart=5/21*(-29.7);
near(foldPart,12);near(callPart,s.callContinuation.evBB);
near(foldPart+callPart+jamPart,p.actions.find(a=>a.id==='raise_to_30').evBB);
near(s.equityFacingJam,.3);near(.3*201-60,.3);near(s.callFromTurnDecisionEVBB,-30+.3);
assert.deepEqual(p.best,['raise_to_30']);assert.deepEqual(p.weights,[4,16,1]);
const root={board:source.context.board,hero:source.context.heroHole,heroSeat:'SB',villainSeat:'BTN',pot:31.5,heroStack:90,villainStack:79.5,heroPut:0,villainPut:10.5,actor:'SB',phase:'actual_current_turn',modelIdentity:p.id,opponentVisible:false};
const state=(v)=>({...structuredClone(root),...v});
const states={root,
 raisedPreview:state({pot:61.5,heroStack:60,heroPut:30,actor:'BTN',phase:'raise_preview'}),
 foldPreview:state({pot:42,heroStack:79.5,heroPut:10.5,actor:null,phase:'preview_fold_refund19.5'}),
 callPreview:state({pot:81,heroStack:60,villainStack:60,heroPut:30,villainPut:30,actor:'SB',phase:'preview_future_river_before_card'}),
 jamPreview:state({pot:141,heroStack:60,villainStack:0,heroPut:30,villainPut:90,actor:'SB',phase:'preview_facing_jam'}),
 actualRaised:state({pot:61.5,heroStack:60,heroPut:30,actor:'BTN',phase:'actual_wait_response'}),
 actualFoldRefund:state({pot:42,heroStack:79.5,heroPut:10.5,actor:null,phase:'actual_fold_refund19.5'}),
 settled:state({pot:0,heroStack:121.5,actor:null,phase:'actual_settled_opponent_cards_not_revealed'})};
for(const x of Object.values(states))near(x.pot+x.heroStack+x.villainStack+399,600);
const frames=[],answers=[];
function add(id,title,key,prompt,options,expected,explanation,given={}){frames.push({id,title,state:structuredClone(states[key]),task:{prompt,options:[...options,'我不知道']},given,assessment:'given_restricted_semibluff_model_not_unseen_strategy',unknownCountsAsWrong:true});answers.push({id,expected,explanation});}
add('A01','先认真正的退出目标','root','自己AsQs目前面对KJ，谁领先？',['KJ的一对K','自己的A高','平分'],'KJ的一对K','当前输给KJ，但仍有未来改善。这里只改明确回应，不称看见听牌就该加。');
add('A02','只改一项回应','root','本版本KJ面对加到30，有一半退出；它是什么目标？',['当前赢自己而会退出的牌','当前输自己而会付钱的牌'],'当前赢自己而会退出的牌','KJ总质量16，其中8份弃、8份跟；KK与JT仍再全下。不是所有领先牌都退出。',{weights:p.weights,candidateOrder:['KK','KJ','JT'],smallResponse:p.smallResponse});
add('A03','算清加到与新增','root','自己这街尚未投入，加到30要新增多少？',[30,19.5,60],30,'对手已下10.5，自己从0到30，所以新增30；对手若跟还补19.5。');
add('A04','先预演不真扣钱','raisedPreview','加到30的预演里，池和自己后手是哪项？',['61.5与60','51与70.5','81与60'],'61.5与60','原池31.5加30；对手尚未跟，所以不是81。这只是预演。');
add('A05','必须把回应算全','raisedPreview','能只看对手弃牌这条好结果吗？',['不能，还要计跟与再全下','能，有更好牌弃就足够'],'不能，还要计跟与再全下','本版本三种回应都有非零概率，不计坏分支会高估加注。');
add('A06','退出时还要退未匹配款','foldPreview','对手弃牌时，自己30比其10.5多出的19.5怎样？',['先退还，再结算匹配池42','全部算成额外盈利','全部丢掉'],'先退还，再结算匹配池42','预演自己先从60回79.5，再赢42，最后121.5；相对当前90净得31.5。');
add('A07','跟注分支保留未来成本','callPreview','对手补19.5跟完，池81、双方60，能直接当免费摊牌吗？',['不能，河牌仍有题设行动','能，听牌只看补张'],'不能，河牌仍有题设行动','原模型包含后续承压；这个分支从转牌决定起的条件EV约−7.909，不是只套自由摊牌权益。',{conditionalEVBB:s.callContinuation.conditionalEVBB,scope:'All legal rivers and given shared-information continuation were evaluated in the existing model.'});
add('A08','再加分支换成当前范围','jamPreview','本版本对手再全下后，候选还含KJ吗？',['不含，只剩KK和JT','还按4:16:1','只剩KK'],'不含，只剩KK和JT','题设KJ只弃或跟，不再全下；新比例KK:JT为4:1，不能沿用原下注范围。',{jamPosterior:s.jamPosterior});
add('A09','面对再全下重算价格','jamPreview','对手全下到90，自己已下30，还补多少？',[60,90,30],60,'眼前池141，跟后201；待补60，不能重复扣已投入30。');
add('A10','当前增量与旧基点分开','jamPreview','给定胜出份额30%，相对现在弃牌，补60的增量是多少？',[.3,-29.7,-30],.3,'201×30%−60＝+0.3；从最初转牌决定计是−29.7，对比当时已花30后的弃牌−30。两个基点不能混判。',{winShare:.3,finalPot:201,callPrice:60/201,scope:'Exact restricted model oracle, not a real-world estimate with a0.3BB precision guarantee.'});
add('A11','关闭预演回真决定','root','关闭全部预演，自己实际还剩多少？',[90,60,79.5],90,'还没实际加注，回原池31.5与原模型。预演的支付、退款和再全下均未写入实际历史。');
add('A12','三种后果合起来比较','root','按给定全部后续，受限菜单选择什么？',['弃牌','跟10.5','加到30','全下90'],'加到30','弃0、跟约−0.159、加到30约+1.916、全下约−33.877。退出贡献12，跟注分支约−3.013，再全下分支约−7.071，合计才是加注EV。',{values:p.actions,weightedContributions:{fold:foldPart,call:callPart,jam:jamPart},scope:'Given EV support, not unaided strategy.'});
add('A13','这次才实际加注','actualRaised','自己按示范加到30，下一步等谁？',['BTN对手','自己再加','直接发河牌'],'BTN对手','现在才实际放入30，原预演不重复收费。');
add('A14','实际弃牌按真实账本退款','actualFoldRefund','BTN这次实际弃牌后，匹配池是多少？',[42,61.5,81],42,'退还自己未匹配19.5后，池21+10.5+10.5＝42；下一步才派彩。');
add('A15','结算与分段收益分开','settled','整手100到121.5，净赢多少？',[21.5,31.5,42],21.5,'从当前转牌90到121.5得31.5，整手得21.5；未亮对手实际底牌，也不把退款算盈利。');
add('A16','不把一次成功升级为人群规律','settled','这次对手弃了，能证明现实KJ都按题设半数弃加吗？',['不能，一次结果不证明频率','能，已经赢到钱'],'不能，一次结果不证明频率','这是选定的正概率演示分支，不能由一次弃牌反推真实人群频率或所有听牌都该加。');
assert.equal(frames.length,16);for(const f of frames)assert.equal('opponentHole'in f.state,false);
const returnFrame=structuredClone(parent);assert.equal(hash(returnFrame),hash(parent));
const packet={status:'guided_semibluff_paper_sequence_not_UI_or_learner_verified',parentLink:{source:'guided-draw-sequence-packet.json',frame:'D13',mode:'review_after_draw_episode',notice:'听牌段结束后回看D13，明确切到KJ会弃或跟加注的给定回应；关闭恢复原压力模型及其弃牌较高比较。',snapshotHash:hash(parent),returnHash:hash(returnFrame),independentAssessment:false},modelInput:{source:'defense-tree-evidence.json',profile:p.id,weights:p.weights,smallResponse:p.smallResponse,jamCall:p.jamCall,scope:source.treeScope},navigation:{core:frames.map(f=>f.id),optional:[],events:[{from:'A12',to:'A13',event:'Actual SB raise_to30 once'},{from:'A13',to:'A14',event:'Observed BTN fold and refund19.5 once'},{from:'A14',to:'A15',event:'Award matched pot42 once'}]},frames,answers,returnFrame,verification:{foldPart,callPart,jamPart,currentJamCallIncrement:.3,rootJamCallEV:-29.7,moneyTotal:600},release:{sourceMatchedTargetPolicy:false,unseenAssessment:false,realLearnerTrial:false,NL50Verified:false}};
fs.writeFileSync(dir+'guided-semibluff-sequence-packet.json',JSON.stringify(packet,null,2)+'\n');
const {answers:_,returnFrame:__,...prompt}=packet;fs.writeFileSync(dir+'guided-semibluff-sequence-prompts.json',JSON.stringify(prompt,null,2)+'\n');
console.log(JSON.stringify({ok:true,frames:16,raiseEV:foldPart+callPart+jamPart,wholeParentRestored:true,status:packet.status},null,2));
