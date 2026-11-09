import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const dir='research/nevir-system/';
const source=JSON.parse(fs.readFileSync(dir+'active-plan-models.json','utf8'));
const size=JSON.parse(fs.readFileSync(dir+'guided-size-sequence-packet.json','utf8'));
const parent=size.frames.find(f=>f.id==='B09');assert.ok(parent);
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const m=source.weak,plan=m.someBetterFold;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
near(plan.evFromRootBB,129/22);near(m.checkEV,0);near(m.allReraise.evFromRootBB,-10.5);
const called=plan.branches.find(b=>b.id==='KJ'),river=called.riverRows.find(r=>r.river==='4c');
assert.equal(river.action,'hero_check_villain_bet21_hero_fold');near(river.heroNetFromCurrent,-10.5);
const root={board:source.context.board,hero:m.hero,heroSeat:'SB',villainSeat:'BTN',pot:21,heroStack:90,villainStack:90,actor:'SB',toCall:0,phase:'turn_unopened',modelIdentity:'KJ_half_fold_half_call',opponentVisible:false};
const state=x=>({...structuredClone(root),...x});
const states={root,
 betPreview:state({pot:31.5,heroStack:79.5,actor:'BTN',phase:'preview_wait_response'}),
 jamPreview:state({pot:121.5,heroStack:79.5,villainStack:0,toCall:79.5,actor:'SB',phase:'preview_facing_allin'}),
 calledPreview:state({pot:42,heroStack:79.5,villainStack:79.5,actor:null,phase:'preview_turn_closed'}),
 actualBet:state({pot:31.5,heroStack:79.5,actor:'BTN',phase:'actual_wait_response'}),
 actualCall:state({pot:42,heroStack:79.5,villainStack:79.5,actor:null,phase:'actual_turn_closed'}),
 river:state({board:[...root.board,'4c'],pot:42,heroStack:79.5,villainStack:79.5,actor:'SB',phase:'actual_river_unopened'}),
 riverCheck:state({board:[...root.board,'4c'],pot:42,heroStack:79.5,villainStack:79.5,actor:'BTN',phase:'actual_wait_response'}),
 riverBet:state({board:[...root.board,'4c'],pot:63,heroStack:79.5,villainStack:58.5,actor:'SB',toCall:21,phase:'actual_facing_bet'}),
 refund:state({board:[...root.board,'4c'],pot:42,heroStack:79.5,villainStack:79.5,actor:null,phase:'actual_fold_refund21'}),
 settled:state({board:[...root.board,'4c'],pot:0,heroStack:79.5,villainStack:121.5,actor:null,phase:'actual_settled'}),
 alternative:state({phase:'preview_response_change',modelIdentity:'all_reraise'})};
for(const s of Object.values(states))near(s.pot+s.heroStack+s.villainStack+399,600);
const frames=[],answers=[];
function add(id,title,key,prompt,options,expected,explanation,given={}){frames.push({id,title,state:structuredClone(states[key]),task:{prompt,options:[...options,'我不知道']},given,assessment:'guided_declared_weak_lead_plan_not_full_target_policy',unknownCountsAsWrong:true});answers.push({id,expected,explanation});}
add('W01','先认无人下注的起点','root','现在对手还没下注，自己比较什么？',['过牌与主动下注','跟注与弃牌','加到30'],'过牌与主动下注','池21、无待补；不是另一段池31.5、已经面对下注的加注决定。');
add('W02','改善机会与当前成牌分开','root','AsQs有直接听花，现在已经是同花吗？',['没有，当前仍是高牌','已经是同花'],'没有，当前仍是高牌','四张黑桃还差一张；对KJ当前落后，但有未来改善。7／12／38是对三个明确候选的全部获胜河牌数，不是统一补牌数。',{candidates:m.candidates.map(({id,hole,weight,winCards})=>({id,hole,weight,winningRivers:winCards.length}))});
add('W03','找真正的退出目标','root','给定KJ面对10.5一半弃，它是怎样的牌？',['当前赢自己而可能退出','当前输自己而付钱','不可能出现在范围'],'当前赢自己而可能退出','KJ的一对K当前赢自己；只说明这组的退出价值，还没算完整计划。');
add('W04','先预演一次首注','betPreview','预演自己下10.5以后，池与后手怎样？',['池31.5，自己79.5','池42，自己79.5','池21，自己90'],'池31.5，自己79.5','这只是预演。对手尚未跟，不提前显示池42。');
add('W05','反击会让改善机会付不起','jamPreview','题设KK／JT再全下后，自己必须因有听花就跟吗？',['不必，30%低于79.5/201，当前弃较高','必须，听花一定跟'],'不必，30%低于79.5/201，当前弃较高','当前补79.5后池201；给定新范围4:1，跟增量−19.2，弃0。按原决定计，弃损失首注10.5。',{jamShare:plan.jamShare,jamDecision:plan.jamChoice});
add('W06','被跟的未来也要带上','calledPreview','KJ跟完后，是否保证不用再花钱就能看到结果？',['不保证，河牌仍有题设行动','保证，付过首注就免费摊牌'],'不保证，河牌仍有题设行动','池42、双方79.5。给定模型在河牌自己过牌，KJ领先时下注21、自己弃；自己领先时KJ过。这个特定分支的收益数值恰与摊牌一致，不可推广。',{conditionalEVFromRoot:called.conditionalCallEV});
add('W07','预演关闭不扣真钱','root','回原未行动决定，自己实际还有多少？',[90,79.5,0],90,'所有预演都关闭，实际下注还未发生。');
add('W08','合并后才选计划','root','给定全部后续比较，选哪条？',['主动下10.5计划','过牌计划'],'主动下10.5计划','退出贡献8、被跟分支约0.364、再全下支−2.5，合计约5.864，高于给定过牌后最佳受限防守0。',{checkEV:m.checkEV,betEV:plan.evFromRootBB,scope:'Given answer support, not unaided strategy.'});
add('W09','现在才真实下注','actualBet','自己实际下10.5后，下一步是谁？',['BTN对手','自己再下','直接发河牌'],'BTN对手','这次才实际放入10.5，预演不重复收费。');
add('W10','对手实际跟完才换街','actualCall','BTN这次跟10.5，能否发河牌？',['能，本街已匹配完成','不能，还欠21'],'能，本街已匹配完成','池42、双方79.5。此模型只有KJ会平跟，不再保留KK／JT为平跟支候选；这是题设推断，非真实人群规律。');
add('W11','保留当前真实新牌','river','实际发4c后，先由谁行动？',['SB自己','直接结算','BTN直接收池'],'SB自己','没成花不自动结束，也不自动弃牌；先确定当前行动。');
add('W12','执行已给定河牌计划','riverCheck','按给定计划自己过牌后，是否直接摊牌？',['不，等BTN','是，没成花就结束'],'不，等BTN','这是执行给定后续，不是已证明河牌任何主动尺寸都不如过牌。');
add('W13','本次回应以后重新决定','riverBet','题设平跟支只剩KJ，4c后它下21；自己当前赢面0，选什么？',['弃牌','跟21'],'弃牌','本限定信息状态中跟注增量−21、弃0。当前失败不抹去转牌下注的全部分支收益。');
add('W14','先退未匹配的河牌注','refund','自己弃牌，BTN刚下的21怎样处理？',['退回BTN，再结算匹配池42','算成自己新输的21','全部给自己'],'退回BTN，再结算匹配池42','自己没有跟这21，不把未支付的钱重复算成损失。');
add('W15','真实终点按账本派彩','settled','派完池，自己的后手多少？',[79.5,58.5,90],79.5,'对手121.5、自己79.5，加其他弃牌后手399，总额600。对手底牌未实际亮出。');
add('W16','分清本段与整手损失','settled','整手从100到79.5，净变化多少？',[-20.5,-10.5,-42],-20.5,'转牌起点90到79.5损失10.5；之前已投10，整手损失20.5。');
add('W17','不因一次被跟失败就否定计划','settled','这一条平跟路线亏了10.5，能单凭它否定转牌下注吗？',['不能，要看事前全部回应及后续','能，失败一支就说明不该下'],'不能，要看事前全部回应及后续','模型下注平均约+5.864，选定失败分支不代表平均表现。真实范围与回应仍未验证。');
add('N01','可选：只改对下注的回应','alternative','若KK、KJ、JT全部再全下，完整比较哪条更高？',['过牌0','下注−10.5'],'过牌0','改善事实没改，但下注后统一被反击，给定新价格下弃，损失首注10.5。',{checkEV:m.checkEV,betEV:m.allReraise.evFromRootBB});
add('N02','找出真正改变的输入','alternative','这次结论反转，改变的是什么？',['对手面对下注的回应','自己的听花变没了','河牌已提前知道'],'对手面对下注的回应','花色和自己手牌都没变，不能用听牌标签直接选动作。');
add('N03','恢复原给定计划','root','关闭对照，KJ面对10.5恢复哪种回应？',['一半弃、一半跟','全部再全下'],'一半弃、一半跟','恢复W08原模型与比较，回反馈再继续W09；不遗留负值版本。');
const core=frames.filter(f=>f.id.startsWith('W')).map(f=>f.id);assert.equal(core.length,17);assert.ok(frames.every(f=>!('opponentHole'in f.state)));
const returnFrame=structuredClone(parent);assert.equal(hash(returnFrame),hash(parent));
const packet={status:'guided_weak_lead_paper_sequence_not_UI_or_learner_verified',parentLink:{source:'guided-size-sequence-packet.json',frame:'B09',mode:'review_after_size_episode',notice:'从B09再看一手转牌AsQs的完整主动计划。自身手牌、候选和过牌后策略均明确换为新模型，不把差异单独归因于听牌。结束恢复原B09全部参考。',snapshotHash:hash(parent),returnHash:hash(returnFrame),independentAssessment:false},modelInput:{source:'active-plan-models.json',context:source.context,weak:m},navigation:{core,optional:[{openAt:'W08',label:'如果所有候选都反击',frames:['N01','N02','N03'],returnTo:'W08',surface:'feedback',then:'W09'}],events:[{from:'W08',to:'W09',event:'Actual SB bet10.5 once'},{from:'W09',to:'W10',event:'Observed BTN call10.5 once'},{from:'W10',to:'W11',event:'Actual river4c only'},{from:'W11',to:'W12',event:'Given SB river check'},{from:'W12',to:'W13',event:'Observed BTN bet21'},{from:'W13',to:'W14',event:'SB fold and refund unmatched21 to BTN'},{from:'W14',to:'W15',event:'Award matched42 to BTN'}]},frames,answers,returnFrame,release:{allLegalActionsCompared:false,actualOpponentPolicy:false,unseenAssessment:false,learnerVerified:false,NL50Verified:false}};
fs.writeFileSync(dir+'guided-weak-lead-sequence-packet.json',JSON.stringify(packet,null,2)+'\n');const{answers:_,returnFrame:__,...prompts}=packet;fs.writeFileSync(dir+'guided-weak-lead-sequence-prompts.json',JSON.stringify(prompts,null,2)+'\n');
console.log(JSON.stringify({ok:true,coreFrames:17,optionalFrames:3,allOpponentCardsCovered:true,parentRestored:true,status:packet.status},null,2));
