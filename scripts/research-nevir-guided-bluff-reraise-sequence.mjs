import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const dir='research/nevir-system/';
const model=JSON.parse(fs.readFileSync(dir+'bluff-reraise-model.json','utf8'));
const outer=JSON.parse(fs.readFileSync(dir+'first-hand-lesson-packet.json','utf8'));
const parent=outer.frames.find(f=>f.id==='S13');assert.ok(parent);
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const clubs=model.rows.find(r=>r.id==='clubs'),hearts=model.rows.find(r=>r.id==='hearts');
const p=clubs.profiles.find(p=>p.id==='KQo_fold52'),h=hearts.profiles.find(p=>p.id==='KQo_fold52'),h55=hearts.profiles.find(p=>p.id==='KQo_fold55');
assert.equal(p.best,'raise_to72.5');assert.equal(h.best,'fold');assert.ok(h55.minRaisePlan.evFromCurrentBB>0&&h55.allInPlan.evFromCurrentBB<0);
const base={board:model.context.board,hero:clubs.hero,heroSeat:'SB',villainSeat:'BTN',pot:97.5,heroStack:65.5,villainStack:38,heroPut:17.5,villainPut:45,actor:'SB',toCall:27.5,phase:'actual_facing_raise',modelIdentity:'clubs_KQo_fold52',opponentVisible:false};
const state=x=>({...structuredClone(base),...x});
const states={root:base,
 previewRaise:state({pot:152.5,heroStack:10.5,heroPut:72.5,actor:'BTN',toCall:27.5,phase:'preview_wait_response'}),
 previewFoldRefund:state({pot:125,heroStack:38,heroPut:45,actor:null,toCall:0,phase:'preview_opponent_fold_refund27.5'}),
 previewJam:state({pot:190.5,heroStack:10.5,villainStack:0,heroPut:72.5,villainPut:83,actor:'SB',toCall:10.5,phase:'preview_facing_short_allin'}),
 actualRaise:state({pot:152.5,heroStack:10.5,heroPut:72.5,actor:'BTN',toCall:27.5,phase:'actual_wait_response'}),
 actualJam:state({pot:190.5,heroStack:10.5,villainStack:0,heroPut:72.5,villainPut:83,actor:'SB',toCall:10.5,phase:'actual_facing_short_allin'}),
 refund:state({pot:180,heroStack:10.5,villainStack:10.5,heroPut:72.5,villainPut:72.5,actor:null,toCall:0,phase:'actual_hero_fold_refund10.5_to_opponent'}),
 settled:state({pot:0,heroStack:10.5,villainStack:190.5,actor:null,toCall:0,phase:'actual_settled_no_opponent_cards_revealed'}),
 hearts:state({hero:hearts.hero,phase:'preview_hero_cards',modelIdentity:'hearts_KQo_fold52'}),
 controlA:state({hero:['Ac','Qh'],phase:'preview_one_card_control',modelIdentity:'Aclub_Qheart_KQo_fold52'}),
 controlQ:state({hero:['Ah','Qc'],phase:'preview_one_card_control',modelIdentity:'Aheart_Qclub_KQo_fold52'}),
 hearts55:state({hero:hearts.hero,phase:'preview_other_declared_version',modelIdentity:'hearts_KQo_fold55'})};
for(const s of Object.values(states))assert.equal(s.pot+s.heroStack+s.villainStack+399,600);
const frames=[],answers=[];
function add(id,title,key,prompt,options,expected,explanation,given={}){frames.push({id,title,state:structuredClone(states[key]),task:{prompt,options:[...options,'我不知道']},given,assessment:'guided_declared_bluff_reraise_model_not_course_or_unseen_strategy',unknownCountsAsWrong:true});answers.push({id,expected,explanation});}
add('Z01','先看当前牌力和街数','root','现在AcQc是A高，河牌已发满，还能靠下一张改善吗？',['不能，已无下一张','能，再听一张花'],'不能，已无下一张','在给定加注候选AKs／KQo前，A高全输；再加的获利只能来自令更好牌退出。');
add('Z02','重算面对加注的价格','root','自己已下17.5，对手加到45，跟注还补多少？',[27.5,45,65.5],27.5,'眼前97.5已经包含双方当前投入，跟后池125。');
add('Z03','不能默认再加就是全下','root','前次完整增量27.5，最小普通再加到多少？',[72.5,62.5,83],72.5,'45+27.5＝72.5，仍留10.5；全下83是另一个更大的合法金额。');
add('Z04','先删除本来就不可能的牌','root','只排除公共牌时，AKs能包含AhKh吗？',['不能，Kh已经在桌上','能，自己没拿Kh'],'不能，Kh已经在桌上','原AKs只有AcKc、AdKd、AsKs三手；避免自己A再删一次已被公共牌排除的组合。',{boardOnlyPool:model.pool,scope:'Board-only template before hero-card removal; includes blocked-by-hero examples for deletion. Not the current legal range or an actual reveal.'});
add('Z05','点A查看删除的继续牌','root','自己Ac占掉哪手本来合法的AKs？',['AcKc','AhKh','没有'],'AcKc','给定AKs全继续，删除的是这组的一份；不能笼统说任意A都删同样对象。');
add('Z06','点Q查看删除的另一组','root','自己Qc在KQo中删掉几手？',[2,3,1],2,'删KdQc、KsQc；KcQc属于同花牌，本来就不在KQo。');
add('Z07','把剩余候选接上回应','root','剩7手KQo，能把它们都算作一定弃牌吗？',['不能，题设只给52%弃，其余继续','能，KQo就是弃牌组'],'不能，题设只给52%弃，其余继续','自己排除后剩2手AKs、7手KQo，整体退出比例为7/9×52%，约40.444%。52%是作者设定，不是测得。',{counts:clubs.counts,KQoFoldProbability:13/25,overallFoldShare:p.foldShare});
add('Z08','保留弃与跟的替代','root','直接跟27.5面对这些候选，当前EV怎样？',[-27.5,0,97.5],-27.5,'河牌所有候选一对K均赢自己A高，跟完直接摊牌，没有未来补牌。');
add('Z09','只预演较小再加','previewRaise','再加到72.5，自己本次新增多少？',[55,72.5,27.5],55,'已付17.5，新增55，自己还留10.5；池152.5，对手仍要回应。');
add('Z10','退出分支算退款','previewFoldRefund','若对手弃，自己未匹配的27.5退后，匹配池多少？',[125,152.5,180],125,'退后自己38，再收125会到163，相对当前65.5净得97.5。这里仍是预演，不实际派钱。');
add('Z11','再加后仍可能被反击','previewJam','对手全下到83只加10.5，是否仍有跟弃决定？',['有，这是不足额全下','没有，不到完整增量就忽略'],'有，这是不足额全下','当前池190.5、自己还补10.5；实际小树已核对这个合法菜单。');
add('Z12','别因之前投入而被迫跟','previewJam','给定继续候选全赢自己，还应因已投入55而补最后10.5吗？',['不，当前跟再亏10.5，弃增量0','应，已经投太多了'],'不，当前跟再亏10.5，弃增量0','新范围仍含AKs和KQo的继续部分，不能把KQo全删；但两组都赢自己。旧投入不是继续理由。');
add('Z13','预演关闭回原决定','root','关掉预演，真实自己还剩多少？',[65.5,10.5,38],65.5,'实际还没再加，所有预演支付、退款与派彩都没进真实历史。');
add('Z14','合并全部选择与金额','root','按本模型全部合法再加区间比较，当前选什么？',['弃牌','跟27.5','再加到72.5','全下83'],'再加到72.5','弃0，跟−27.5，较小再加约+6.678，全下约+0.424。对大小不变的给定回应下，其它再加额不优于72.5。',{values:{fold:0,call:-27.5,minRaise:p.minRaisePlan.evFromCurrentBB,jam:p.allInPlan.evFromCurrentBB},scope:'Given answer support; optimum depends on the declared size-independent responses.'});
add('Z15','现在才实际再加','actualRaise','自己真正加到72.5后，下一步是谁？',['BTN对手','自己再下注','直接收池'],'BTN对手','此时才放55，预演不重复扣；自己留10.5，仍须等对手。');
add('Z16','实际遇到短全下','actualJam','BTN这次全下到83，现在自己还补多少？',[10.5,38,83],10.5,'对手从已下45再放38，池190.5；自己的新增跟注仅10.5。');
add('Z17','在新决定执行比较','actualJam','给定当前范围自己无胜出份额，选什么？',['弃牌','跟10.5'],'弃牌','前面再加正确与现在继续不合算可以同时成立；按当前信息重新比较。');
add('Z18','退对手未匹配的部分','refund','自己弃后，对手最后未匹配10.5怎样？',['退回对手，匹配池180','也算自己又输10.5','退给自己'],'退回对手，匹配池180','自己没有跟最后10.5；对手退回10.5后再收匹配池，不能重复算损失。');
add('Z19','按真实账本派彩','settled','派完池，自己还剩多少？',[10.5,0,65.5],10.5,'对手190.5、自己10.5，加其余弃牌后手399，总600。未实际翻开对手底牌。');
add('Z20','分清当前与整手基点','settled','整手100到10.5，净变化多少？',[-89.5,-55,-100],-89.5,'当前再加决定65.5到10.5损失55，整手此前已经投入34.5。');
add('Z21','不靠一次成功或失败判计划','settled','这次再加被反击后亏55，能仅凭这一支否定事前再加吗？',['不能，仍要比较事前全部回应','能，亏钱就是再加错了'],'不能，仍要比较事前全部回应','给定模型整体较小再加EV仍约+6.678；这次失败是选定的正概率分支，不是对真实频率的验证。');
add('H01','可选：同牌力的花色对照','hearts','换成AhQh、保持52%回应时，完整比较选什么？',['弃牌','跟27.5','再加72.5','全下83'],'弃牌','剩AKs3、KQo6，较小再加−2.133，全下−8.993；A高牌力相同不代表移除相同。',{counts:hearts.counts,values:h});
add('H02','不要重复删已排除的牌','hearts','Ah会再删掉AhKh这手AKs吗？',['不会，Kh在桌上已排除它','会，有A就少一手AKs'],'不会，Kh在桌上已排除它','Qh会删除三手KQo，却没因Ah减少AKs；两边都要看。');
add('H03','恢复实际主手牌','root','关闭花色预演，真实手牌恢复什么？',['AcQc','AhQh','两手一起拿'],'AcQc','回原Z14反馈及2／7候选，不遗留AhQh的弃牌答案。');
add('O01','可选：只变A的花色','controlA','相对AhQh只换AcQh，AKs与KQo剩多少？',['2与6','3与7','2与7'],'2与6','只改A，少一手AcKc；Qh的移除不变。',{compareFrom:{hero:hearts.hero,counts:hearts.counts}});
add('O02','可选：只变Q的花色','controlQ','相对AhQh只换AhQc，哪组改变？',['KQo从6到7，AKs仍3','AKs从3到2','两组都不变'],'KQo从6到7，AKs仍3','用单牌控制区分A与Q的作用，不将同时换两张牌的差异全归因于一张。',{compareFrom:{hero:hearts.hero,counts:hearts.counts}});
add('O03','回主候选和参考','root','关闭单牌控制，主模型剩余是什么？',['AKs2、KQo7','AKs3、KQo6'],'AKs2、KQo7','恢复AcQc与52%回应，首答和曝光身份保留。');
add('T01','可选：全下不是所有再加','hearts55','另一明确版本AhQh且KQo55%弃，小再加+0.917、全下−5.733；能因全下负值就否定所有再加吗？',['不能，还存在较小合法方案','能，全下不好就都不好'],'不能，还存在较小合法方案','这里同时另设手牌与回应，只在这个版本内部比较两个金额，不把它与主模型的差异归因于一个变量。',{minRaiseEV:h55.minRaisePlan.evFromCurrentBB,jamEV:h55.allInPlan.evFromCurrentBB});
add('T02','回原全部条件','root','关闭这个版本，实际主线回应是哪项？',['AcQc且KQo52%弃','AhQh且KQo55%弃'],'AcQc且KQo52%弃','回Z14原反馈再继续Z15，不重答计分或把预演行动带回真实线。');
const core=frames.filter(f=>f.id.startsWith('Z')).map(f=>f.id);assert.equal(core.length,21);
const optional=[{label:'同牌力为什么选择不同',frames:['H01','H02','H03']},{label:'只改一张牌看看',frames:['O01','O02','O03']},{label:'如果只比较全下会漏什么',frames:['T01','T02']}].map(b=>({...b,openAt:'Z14',returnTo:'Z14',surface:'feedback',then:'Z15'}));
assert.equal(optional.reduce((n,b)=>n+b.frames.length,0),8);assert.ok(frames.every(f=>!('opponentHole'in f.state)));
const returnFrame=structuredClone(parent);assert.equal(hash(returnFrame),hash(parent));
const packet={status:'guided_bluff_reraise_paper_sequence_not_UI_or_learner_verified',parentLink:{source:'first-hand-lesson-packet.json',frame:'S13',mode:'review_after_first_pass',notice:'原整手结束后回看S13，再换另一手已经下注遭加的AcQc作者模型；不将本模型补成原AcQd的策略。关闭恢复原S13完整题面。',snapshotHash:hash(parent),returnHash:hash(returnFrame),independentAssessment:false},modelInput:{source:'bluff-reraise-model.json',context:model.context,rows:model.rows,rulesRuntime:'bluff-reraise-rules-runtime.json'},navigation:{core,optional,events:[{from:'Z14',to:'Z15',event:'Actual SB raise_to72.5, add55 once'},{from:'Z15',to:'Z16',event:'Observed BTN allin_to83, add38 once'},{from:'Z17',to:'Z18',event:'Actual SB fold; refund unmatched10.5 to BTN'},{from:'Z18',to:'Z19',event:'Award matched180 to BTN'}]},frames,answers,returnFrame,verification:{tableTotalBB:600,actualOpponentCardsNeverRevealed:true,selectedResult:'A positive-probability opponent-continue branch, not a sample of actual player behavior.',wholeParentFrameRestored:true},release:{fullCoursePolicy:false,empiricalFrequency:false,unseenAssessment:false,learnerVerified:false,NL50Verified:false}};
fs.writeFileSync(dir+'guided-bluff-reraise-sequence-packet.json',JSON.stringify(packet,null,2)+'\n');const{answers:_,returnFrame:__,...prompts}=packet;fs.writeFileSync(dir+'guided-bluff-reraise-sequence-prompts.json',JSON.stringify(prompts,null,2)+'\n');
console.log(JSON.stringify({ok:true,coreFrames:21,optionalFrames:8,opponentCardsCovered:true,wholeParentRestored:true,status:packet.status},null,2));
