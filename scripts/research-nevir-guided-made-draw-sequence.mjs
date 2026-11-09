import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const dir='research/nevir-system/';
const evidence=JSON.parse(fs.readFileSync(dir+'made-plus-draw-evidence.json','utf8'));
const draw=JSON.parse(fs.readFileSync(dir+'guided-draw-sequence-packet.json','utf8'));
const parent=draw.frames.find(f=>f.id==='D06');assert.ok(parent);
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const root={board:evidence.root.board,hero:evidence.root.hero,heroSeat:'SB',villainSeat:'BTN',actor:'SB',pot:141,heroStack:60,villainStack:0,toCall:60,phase:'facing_effective_allin',opponentVisible:false};
const states={root,
 matched:{...root,pot:201,heroStack:0,toCall:0,actor:null,phase:'allin_matched_wait_river'},
 river:{...root,board:[...root.board,'8s'],pot:201,heroStack:0,toCall:0,actor:null,phase:'showdown_pending'},
 revealed:{...root,board:[...root.board,'8s'],pot:201,heroStack:0,toCall:0,actor:null,phase:'showdown',opponentVisible:true,opponentHole:['9c','8c']},
 settled:{...root,board:[...root.board,'8s'],pot:0,heroStack:0,villainStack:201,toCall:0,actor:null,phase:'settled',opponentVisible:true,opponentHole:['9c','8c']}};
for(const s of Object.values(states))assert.equal(s.pot+s.heroStack+s.villainStack+399,600);
const frames=[],answers=[];
function add(id,title,key,prompt,options,expected,explanation,given={}){frames.push({id,title,state:structuredClone(states[key]),task:{prompt,options:[...options,'我不知道']},given,assessment:'guided_declared_made_draw_allin_model_not_target_policy',unknownCountsAsWrong:true});answers.push({id,expected,explanation});}
add('F01','成牌与改善同时保留','root','Jd7d现在有一对J，还能同时听方片吗？',['能，两件事同时存在','不能，有对子就不是听牌'],'能，两件事同时存在','JdJs成一对J，自己两张方片加9d5d共有四张方片。不是在对子与听牌两个标签中只能选一个。');
add('F02','当前赢面看具体对象','root','当前面对AA、98、55，自己领先哪组？',['98','AA和55','三组都领先'],'98','当前一对J赢一对9，输一对A和三条5。权重2:1:1时，当前领先组占1/4。',{candidates:evidence.candidates.map(({id,hole,weight})=>({id,hole,weight}))});
add('F03','名义成花不等于赢','root','只作候选预演：若河牌2d、对手55，自己成花就赢了吗？',['没有，55成葫芦','赢，成花一定大'],'没有，55成葫芦','对手5c5h加5d与2c2d组成葫芦；自己的方片同花仍输。2d是本例失效补牌。',{preview:{replaceOrAppend:'one hypothetical river only',river:'2d',candidate:'55',actualHistoryMutated:false}});
add('F04','已经领先也会被反超','root','只作候选预演：河牌9h、对手98，自己原先领先就保证赢吗？',['不保证，98成三条9','保证，已有顶对'],'不保证，98成三条9','自己成为J和9两对仍输三条9。这个预演不是已发出的真实河牌。',{preview:{river:'9h',candidate:'98',actualHistoryMutated:false}});
add('F05','把未来结果分开','root','当前领先组以后输掉的结果，要怎样处理？',['从保留的赢面中扣掉','仍算赢，再额外加听牌概率'],'从保留的赢面中扣掉','按互斥格子计：当前领先后赢40、后输4；当前落后后赢36、仍输96。176是按权重缩放的份额，不是176张河牌。',{disjoint:evidence.disjointOutcomes});
add('F06','赢面只合并一次','root','按全部合法河牌，最终赢面是哪项？',['76/176＝19/44','当前25%直接加成花概率','当前25%完全不变'],'76/176＝19/44','合并40与36份获胜结果。也可从44份当前领先中扣4份反超，再加36份改善；不能把重叠结果重复算。',{winCounts:evidence.candidates.map(c=>({id:c.id,wins:c.wins,losses:c.losses,weight:c.weight}))});
add('F07','全下价格看跟后池','root','对手已经全下，补60后的匹配池是多少？',[201,141,81],201,'眼前141已含对手60，自己补60后201。只有一张河牌，匹配后不再有后街下注。');
add('F08','按完整条件比较','root','给定范围与全部跑牌结果，现在在跟弃之间选什么？',['跟60','弃牌'],'跟60','19/44约43.18%高于60/201约29.85%；当前EV约+26.795，对比弃牌0。只限这个明确给定模型。',{callEVBB:evidence.comparison.callEVFromCurrentBB,foldEVBB:0,scope:'Given full comparison is answer help; no claim of unaided inference or real opponent accuracy.'});
add('F09','这次才实际跟注','matched','自己补完60以后，还能再下注吗？',['不能，双方有效全下已匹配','能，等河牌再下'],'不能，双方有效全下已匹配','双方0后手、池201；预演没有扣钱，这次才真正支付60。');
add('F10','先完成剩余发牌','matched','现在公共牌只有四张，下一步是什么？',['发河牌','立即按四张结算','继续叫对手下注'],'发河牌','投入匹配后还需发完合法公共牌；没有新下注决定。');
add('F11','实际新牌与预演分开','river','这次实际发8s，刚才预演的2d和9h是否也留在桌上？',['不留，只用实际五张','全部一起保留'],'不留，只用实际五张','实际牌面Js9d5d2c8s；前面的2d与9h互斥预演已经关闭。');
add('F12','最后才揭真实候选','revealed','实际9c8c成两对9与8，谁赢？',['对手','自己','平分'],'对手','自己仍是一对J，输两对。不是看最高一对J大于9就判自己赢。');
add('F13','一次损失的基点','settled','这手从100到0，整手净变化多少？',[-100,-60,201],-100,'当前决定只再付60，但整手早已投入40，整手净输100；派给对手201不等于自己净输201。');
add('F14','正确比较仍可能输这一次','settled','能因为这次被反超，就把事前给定模型内较高EV的跟注改判成错吗？',['不能，只能按事前条件比较','能，输了就说明不能跟'],'不能，只能按事前条件比较','这是作者选定的正概率失败分支。它不改变模型平均值，也不证明现实对手范围正确。');
assert.equal(frames.length,14);for(const f of frames.slice(0,11))assert.equal('opponentHole'in f.state,false);
const returnFrame=structuredClone(parent);assert.equal(hash(returnFrame),hash(parent));
const packet={status:'guided_made_draw_paper_sequence_not_UI_or_learner_verified',parentLink:{source:'guided-draw-sequence-packet.json',frame:'D06',mode:'review_after_draw_episode',notice:'原听牌段完成后回看D06，换另一手有当前对子兼听花的给定全下模型；关闭恢复原AsQs的全部D06参考，不混用范围和胜率。',snapshotHash:hash(parent),returnHash:hash(returnFrame),independentAssessment:false},modelInput:{source:'made-plus-draw-evidence.json',context:evidence.context,candidates:evidence.candidates.map(({rivers,...c})=>c),comparison:evidence.comparison},navigation:{core:frames.map(f=>f.id),optional:[],events:[{from:'F08',to:'F09',event:'Actual SB call60 once'},{from:'F10',to:'F11',event:'Actual river8s only'},{from:'F11',to:'F12',event:'Reveal9c8c only now'},{from:'F12',to:'F13',event:'Award201 to BTN once'}]},frames,answers,returnFrame,verification:{totalBB:600,firstActualOpponentReveal:'F12',wholeParentFrameRestored:true},release:{fullTargetPolicy:false,unseenAssessment:false,learnerVerified:false,NL50Verified:false}};
fs.writeFileSync(dir+'guided-made-draw-sequence-packet.json',JSON.stringify(packet,null,2)+'\n');const {answers:_,returnFrame:__,...publicPart}=packet;fs.writeFileSync(dir+'guided-made-draw-sequence-prompts.json',JSON.stringify(publicPart,null,2)+'\n');
console.log(JSON.stringify({ok:true,frames:14,reveal:'F12',parentRestored:true,status:packet.status},null,2));
