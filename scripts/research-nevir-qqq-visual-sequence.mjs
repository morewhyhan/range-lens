// Author paper sequence using exact physical removal and an explicitly GIVEN candidate policy.
// Never grades the unconverged policy as an optimal poker action.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {DECK} from '../src/poker.js';
const dir='research/nevir-system/',load=f=>JSON.parse(fs.readFileSync(dir+f));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(dir+'sb-bb-qqq-reload-export.json'),data=JSON.parse(raw),verified=load('sb-bb-qqq-reference-verification.json');
assert.equal(hash(raw),verified.sourceHashes[dir+'sb-bb-qqq-reload-export.json']);assert.equal(verified.ok,true);
const base=load('first-hand-lesson-packet.json'),p=base.frames.find(f=>f.id==='S09'),a=base.answers.find(f=>f.id==='S09');assert.ok(p&&a);
const snapshot={frame:structuredClone(p),answer:structuredClone(a),referenceContext:structuredClone(Object.fromEntries(Object.entries(base).filter(([k])=>!['frames','answers'].includes(k)))),display:'review_feedback',firstAnswer:'not_collected_author_walkthrough',exposure:'already_seen_public_material'};
const before=hash(JSON.stringify(snapshot)),restored=structuredClone(snapshot);assert.equal(hash(JSON.stringify(restored)),before);
const board=['Qs','Qh','Qd'],hero=['As','Kd'];
const named=id=>data.nodes.find(n=>n.id===id),nodes=[named('root'),named('root'),named('after_SB_bet198'),named('flop_B198C_before_turn')];
const keys=['raw_BB_input','known_own_cards','after_own_bet','after_BB_call'];
const labels=['先看给定的BB候选清单','排除我们拿着的两张牌','我下注了，对方还没回应','对方跟注后，才按回应筛选'];
const hand=h=>h.match(/.{2}/g),key=h=>h.slice().sort().join('');
const ranks='AKQJT98765432';
function cls(h){const ids=h.map(c=>ranks.indexOf(c[0]));return ids[0]===ids[1]?h[0][0]+h[1][0]:ranks[Math.min(...ids)]+ranks[Math.max(...ids)]+(h[0][1]===h[1][1]?'s':'o');}
const all=[];for(let i=0;i<DECK.length;i++)for(let j=i+1;j<DECK.length;j++){const h=[DECK[i].id,DECK[j].id];all.push({hole:h,cell:cls(h)});}
const cells=[...ranks].flatMap((a,i)=>[...ranks].map((b,j)=>i===j?a+b:i<j?a+b+'s':b+a+'o'));
const frames=nodes.map((n,index)=>{
 assert.ok(n);assert.equal(n.board.length,3);assert.deepEqual(n.board.slice().sort(),board.slice().sort());
 const given=new Map(n.orderedHands[1].map((h,i)=>[key(hand(h)),n.rawWeights[1][i]]));
 const known=index===0?board:[...board,...hero];
 const combos=all.map(h=>({...h,blocked:h.hole.some(c=>known.includes(c)),weight:h.hole.some(c=>known.includes(c))?0:given.get(key(h.hole))??0}));
 const matrix=cells.map(cell=>{
  const hs=combos.filter(h=>h.cell===cell),mass=hs.reduce((s,h)=>s+h.weight,0),possible=cell.length===2?6:cell.endsWith('s')?4:12;
  return {cell,mass,legalPhysicalCombos:hs.filter(h=>!h.blocked).length,positiveModelCombos:hs.filter(h=>h.weight>0).length,fixedCellScale:possible,barFraction:mass/possible};
 });
 const mass=combos.reduce((s,h)=>s+h.weight,0);
 return {id:keys[index],label:labels[index],sourceNode:n.id,sourceHistoryIndices:n.historyIndices,board,hero,rangeOwner:'BB',viewer:'SB',
 calculationView:index===0?'literal_single_player_input_weights_before_private_card_filter_not_joint_public_marginal':'opponent_weights_conditioned_on_exact_own_cards',
 givenPolicy:true,sourceQualityTargetReached:verified.engineReportedTargetReached,answerBearingDemonstration:true,
 state:{potBB:index<2?6:index===2?7.98:9.96,SBStackBB:index<2?97:95.02,BBStackBB:index<3?97:95.02,actor:index<2?'SB':index===2?'BB':'waiting_turn'},
 matrix,support:combos.filter(h=>h.weight>0),totalWeight:mass,positivePhysicalCombos:combos.filter(h=>h.weight>0).length,
 weightMeaning:'Single-player BB root/input weight times its given action likelihood, with known-card conflicts removed; not route probability or a count of equally likely copies.'};
});
assert.deepEqual(frames[1].matrix,frames[2].matrix);assert.equal(frames[0].totalWeight,361);
const root=named('root'),afterBet=named('after_SB_bet198'),call=afterBet.actions.indexOf('Call');assert.ok(call>=0);
const rootW=new Map(root.orderedHands[1].map((h,i)=>[key(hand(h)),root.rawWeights[1][i]]));
const callRule=new Map(afterBet.orderedHands[1].map((h,i)=>[key(hand(h)),afterBet.strategyActionMajor[call*afterBet.orderedHands[1].length+i]]));
for(const h of frames[3].support)assert.ok(Math.abs(h.weight-rootW.get(key(h.hole))*callRule.get(key(h.hole)))<1e-7);
const removed=frames[0].support.filter(h=>h.hole.some(c=>hero.includes(c)));
const pickRemoved=c=>removed.find(h=>h.hole.includes(c)&&h.hole[0][1]===h.hole[1][1])??removed.find(h=>h.hole.includes(c));
assert.ok(pickRemoved('As')&&pickRemoved('Kd'));
const legal=frames[1].support.find(h=>h.cell==='76s')??frames[1].support[0];
const exits=frames[1].support.filter(h=>callRule.get(key(h.hole))===0);assert.ok(exits.length>0);
const exit=exits[0],stay=frames[3].support.find(h=>h.hole.every(c=>!exit.hole.includes(c)))??frames[3].support[0];
frames.forEach((f,i)=>{f.previousIndex=i>0?i-1:null;f.examples={removedByAs:pickRemoved('As'),removedByKd:pickRemoved('Kd'),legalSurvivor:legal,leavesGivenCallBranch:exit,staysInGivenCallBranch:stay};});
const questions=[
 {id:'QV_P1',body:{task:'从这两手给定候选中，点出与自己底牌冲突、现在不可能出现的一手。',board,hero,candidates:[{id:'a',hole:legal.hole},{id:'b',hole:pickRemoved('As').hole}],options:[{id:'a',label:'第一手'},{id:'b',label:'第二手'},{id:'unknown',label:'我不知道'}],evidenceScope:'physical_card_conflict_only'}},
 {id:'QV_P2',body:{task:'我知道自己拿A♠K♦；刚下注1.98BB，对方还没回应。仅凭我下注，要删掉对方的弱牌吗？',board,hero,state:frames[2].state,options:[{id:'remove',label:'删掉，对方已经弃了弱牌'},{id:'keep',label:'保留，还没有观察到对方回应'},{id:'unknown',label:'我不知道'}],evidenceScope:'known_private_hand_conditioning_no_new_opponent_action'}},
 {id:'QV_P3',body:{task:'只按下方给定回应规则：观察到跟注后，哪手不再留在这个跟注分支？',board,hero,
 given:[{id:'a',hole:exit.hole,rootWeight:exit.weight,callFrequency:0},{id:'b',hole:stay.hole,rootWeight:rootW.get(key(stay.hole)),callFrequency:callRule.get(key(stay.hole))}],
 options:[{id:'a',label:'第一手'},{id:'b',label:'第二手'},{id:'unknown',label:'我不知道'}],evidenceScope:'literal_given_policy_update_not_optimal_action_or_population_inference'}}
];
const answers=[{id:'QV_P1',correct:'b',feedback:'一张实体牌只能出现一次；自己拿着A♠，对方就不能同时拿A♠。不是因为对方会弃牌。'},
 {id:'QV_P2',correct:'keep',feedback:'自己已经知道自己的底牌；自己的下注没有替自己提供新的对手信息。对方如何看我们的范围是另一视角。'},
 {id:'QV_P3',correct:'a',feedback:'按本题给定规则，这手跟注概率为0，所以不留在跟注分支。它可能弃牌或加注；不能说现实中此人绝不可能跟。'}];
for(const q of questions){const ans=answers.find(a=>a.id===q.id);ans.inputFingerprint=hash(JSON.stringify(q.body));ans.unknownIsWrong=true;ans.actualPokerActionCommitted=false;ans.exposure='public_after_demonstration_not_unseen_assessment';}
const teacher={status:'author_fact_and_given_rule_keys_not_optimal_strategy',answers,learnerTrials:0};
fs.writeFileSync(dir+'qqq-range-lesson-prompts.json',JSON.stringify({status:'paper_fact_prompts_not_app',questions,learnerTrials:0},null,2)+'\n');
fs.writeFileSync(dir+'qqq-range-lesson-teacher.json',JSON.stringify(teacher,null,2)+'\n');
const out={status:'four_frame_author_range_demonstration_not_precise_strategy_lesson',source:{file:'sb-bb-qqq-reload-export.json',sha256:hash(raw),engineMetricBB:verified.engineReportedMetricBB,engineTargetReached:false},
 parent:{source:'first-hand-lesson-packet.json',frame:'S09',sourceSHA256:hash(fs.readFileSync(dir+'first-hand-lesson-packet.json')),snapshot,snapshotFingerprint:before,restoredFingerprint:hash(JSON.stringify(restored)),
 notice:'另开SB对BB的QQQ示范，自己换成A♠K♦；原S09的牌、钱、前序和参考都保留。只看物理移除与给定回应怎样筛范围，不判断最佳下注。',
 entryTiming:'After closing the existing history review back to outer S09; optional sibling, never another child of H10.',maxReturnSnapshotsIncludingOuter:1},
 defaultInsertions:0,newHomeMenus:0,actualPokerStateMutation:false,frames,publicQuestions:3,strategicActionQuestions:0,learnerTrials:0,
 safeguards:{firstFrameNotJointPublicPosterior:true,privateOpponentRangeUnchangedByOwnAction:true,allGivenRuleQuestionsRetainRuleInputs:true,actualOpponentCardsNeverAssigned:true,noReferenceQualityUpgrade:true,noDatabase:true}};
fs.writeFileSync(dir+'qqq-range-lesson-packet.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,frames:4,questions:3,strategicQuestions:0,weights:frames.map(f=>f.totalWeight),physicalCombos:frames.map(f=>f.positivePhysicalCombos),parentRestored:true,learnerTrials:0}));
