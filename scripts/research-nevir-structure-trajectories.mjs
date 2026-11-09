import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {card,assertCards,evaluate,compare} from '../src/poker.js';
const dir='research/nevir-system/',questions=[],keys=[],checkpoints=[];
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function start(id,heroSeat,oppSeat,oop,hero,opp,pot,stack,folded,board,history){
 const n={id,heroSeat,oppSeat,oop,hero,opp,pot,stacks:[stack,stack],paid:[0,0],folded,board,history,actor:oop,phase:'action',checks:0,minRaise:100};valid(n);return n;
}
function valid(n){assert.equal(n.pot+n.stacks[0]+n.stacks[1]+n.folded,60000);assert.ok(n.stacks.every(x=>x>=0));assertCards([...n.board,...n.hero,...n.opp].map(card));}
function act(n,who,action,target){
 assert.equal(n.phase,'action');assert.equal(n.actor,who);const other=who^1,owed=n.paid[other]-n.paid[who];
 if(action==='check'){
  assert.equal(owed,0);n.history.push((who===0?n.heroSeat:n.oppSeat)+'过牌');n.checks++;
  if(n.checks===2){n.actor=null;n.phase=n.board.length===5?'showdown':'street_end';}else n.actor=other;
 }else if(action==='fold'){
  assert.ok(owed>0);n.history.push((who===0?n.heroSeat:n.oppSeat)+'弃牌');
  n.pot-=owed;n.stacks[other]+=owed;n.stacks[other]+=n.pot;n.pot=0;n.paid=[0,0];n.actor=null;n.phase='ended';
 }else{
  const to=action==='call'?n.paid[other]:target,add=to-n.paid[who];assert.ok(add>0&&add<=n.stacks[who]);
  if(action==='call')assert.ok(owed>0);else{assert.ok(to>n.paid[other]);assert.ok(to-n.paid[other]>=n.minRaise||add===n.stacks[who]);n.minRaise=to-n.paid[other];}
  n.stacks[who]-=add;n.pot+=add;n.paid[who]=to;
  n.history.push((who===0?n.heroSeat:n.oppSeat)+(action==='call'?`跟${add/100}`:`${action==='bet'?'下注':'加到'}${to/100}`)+(n.stacks[who]===0?'，已全下':''));
  if(action==='call'){n.actor=null;n.phase=n.board.length===5?'showdown':n.stacks.some(x=>x===0)?'allin_runout':'street_end';}
  else{n.actor=other;n.checks=0;}
 }
 valid(n);
}
function deal(n,c){assert.ok(['street_end','allin_runout'].includes(n.phase));assert.ok(![...n.board,...n.hero,...n.opp].includes(c));const allin=n.phase==='allin_runout';n.board.push(c);n.history.push('发出'+c);n.paid=[0,0];n.checks=0;n.minRaise=100;
 if(allin){n.phase=n.board.length===5?'showdown':'allin_runout';n.actor=null;}else{n.phase='action';n.actor=n.oop;}valid(n);
}
function finish(n){assert.equal(n.phase,'showdown');const c=compare(evaluate([...n.board,...n.hero].map(card)),evaluate([...n.board,...n.opp].map(card)));const share=c>0?1:c<0?0:.5;n.stacks[0]+=n.pot*share;n.stacks[1]+=n.pot*(1-share);n.pot=0;n.paid=[0,0];n.phase='ended';n.actor=null;n.history.push('摊牌并结算');valid(n);}
const nextChoices=[['hero','轮到自己'],['opponent','轮到对手'],['deal','发下一张公共牌'],['runout','补发剩余公共牌后摊牌'],['showdown','摊牌'],['ended','这手已结束'],['unknown','我不知道']].map(([id,label])=>({id,label}));
const branchChoices=[['free','现在可过牌或下注'],['bet','面对下注，比较弃、跟或加'],['raise','面对加注，重新比较'],['allin','面对对手全下，比较跟或弃'],['wait','现在还没轮到自己'],['unknown','我不知道']].map(([id,label])=>({id,label}));
function ask(n,task='next'){
 const publicState={board:[...n.board],hero:[...n.hero],heroSeat:n.heroSeat,opponentSeat:n.oppSeat,potBB:n.pot/100,heroStackBB:n.stacks[0]/100,opponentStackBB:n.stacks[1]/100,heroStreetPutBB:n.paid[0]/100,opponentStreetPutBB:n.paid[1]/100};
 let answer,choices,prompt;
 if(task==='next'){answer=n.phase==='action'?(n.actor===0?'hero':'opponent'):({street_end:'deal',allin_runout:'runout',showdown:'showdown',ended:'ended'})[n.phase];choices=nextChoices;prompt='接下来先发生什么？';}
 else{answer=n.phase!=='action'||n.actor!==0?'wait':n.paid[1]===n.paid[0]?'free':n.stacks[1]===0?'allin':n.paid[0]>0?'raise':'bet';choices=branchChoices;prompt='眼前应进入哪种比较？只选分支，不选最佳打法。';}
 const body={table:'六人现金桌，初始每人100BB；仅显示仍在本手的两人',state:publicState,observedHistory:[...n.history],prompt,choices};
 const fingerprint=hash(body),id='ST-'+fingerprint.slice(0,16);assert.ok(answer);
 questions.push({id,body});keys.push({id,inputFingerprint:fingerprint,answer,scenario:n.id,taskKind:'structure_only_not_strategy',teacherState:structuredClone(n),learnerAttempt:null});
}
function gold(n,name,expected){for(const [k,v]of Object.entries(expected))assert.deepEqual(n[k],v,name+'/'+k);checkpoints.push({scenario:n.id,name,expected});}
const A=start('A','BB','BTN',0,['8c','8d'],['Ah','Qd'],550,9750,39950,['Qh','9h','4s'],['BTN开到2.5，SB弃牌，BB跟注；其余人已弃牌']);
ask(A);ask(A,'branch');act(A,0,'check');ask(A);act(A,1,'bet',200);ask(A);ask(A,'branch');act(A,0,'call');ask(A);
deal(A,'2c');ask(A);act(A,0,'check');ask(A);act(A,1,'check');ask(A);deal(A,'4h');ask(A);act(A,0,'bet',500);ask(A);act(A,1,'raise',1500);ask(A);ask(A,'branch');
gold(A,'river_raise',{pot:2950,stacks:[9050,8050],paid:[500,1500],actor:0});act(A,0,'call');ask(A);gold(A,'river_call',{pot:3950,stacks:[8050,8050],phase:'showdown'});finish(A);ask(A);
const B=start('B','CO','BTN',0,['Qh','Qs'],['Kh','Kd'],1800,9175,39850,['Js','7s','2c'],['CO开到2.5，BTN加到8.25，CO跟注；盲注弃牌，其余人已弃牌']);
ask(B,'branch');act(B,0,'check');ask(B);act(B,1,'bet',600);ask(B,'branch');const anchor=structuredClone(B);act(B,0,'raise',1800);ask(B);act(B,1,'raise',9175);ask(B);ask(B,'branch');
gold(B,'facing_jam',{pot:12775,stacks:[7375,0],paid:[1800,9175],actor:0});act(B,0,'call');ask(B);gold(B,'allin_matched',{pot:20150,stacks:[0,0],phase:'allin_runout'});deal(B,'Ah');ask(B);deal(B,'4d');ask(B);finish(B);ask(B);
const B2=structuredClone(anchor);B2.id='B2';act(B2,0,'raise',9175);ask(B2);ask(B2,'branch');gold(B2,'own_allin_still_waits',{pot:11575,stacks:[0,8575],actor:1,phase:'action'});act(B2,1,'call');ask(B2);deal(B2,'Ah');deal(B2,'4d');ask(B2);finish(B2);ask(B2);
const C=start('C','BB','SB',1,['Tc','9c'],['As','Kd'],600,9700,40000,['Ah','5d','5c'],['其余四人弃牌，SB开到3，BB跟注']);ask(C);act(C,1,'check');ask(C);ask(C,'branch');act(C,0,'check');ask(C);deal(C,'6h');ask(C);act(C,1,'bet',400);ask(C,'branch');act(C,0,'raise',1200);ask(C);act(C,1,'fold');ask(C);gold(C,'refund_and_end',{pot:0,stacks:[10700,9300],phase:'ended'});
assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
for(let i=0;i<questions.length;i++){
 const q=questions[i],k=keys[i];assert.equal(hash(q.body),k.inputFingerprint);assert.ok(q.body.choices.some(c=>c.id===k.answer));
 const text=JSON.stringify(q.body);for(const field of ['actor','phase','answer','teacherState','opp'])assert.ok(!text.includes('"'+field+'"'));
 assert.equal(k.learnerAttempt,null);
}
const counts=Object.fromEntries([...new Set(keys.map(k=>k.answer))].map(a=>[a,keys.filter(k=>k.answer===a).length]));
assert.ok(['hero','opponent','deal','runout','showdown','ended','free','bet','raise','allin','wait'].every(k=>counts[k]>0));
fs.writeFileSync(dir+'structure-trajectory-prompts.json',JSON.stringify({status:'author_new_structure_trial_candidates_not_administered',strategyQuestion:false,frozenForFinalAssessment:false,questions},null,2)+'\n');
fs.writeFileSync(dir+'structure-trajectory-teacher.json',JSON.stringify({status:'author_structure_reference_no_participant_results',keys},null,2)+'\n');
const out={ok:true,status:'legal_trajectory_and_fact_checks_not_learner_pass',questions:questions.length,scenarios:4,initialHandFamilies:3,sharedPrefixScenarios:['B','B2'],answerCounts:counts,goldenCheckpoints:checkpoints,all600BB:true,hiddenActorAndAnswersRemoved:true,knownHeroCardsNeverRedealt:true,sourceRoleCoverage:'Observed caller roles only; no caller strategy established.',independentStrategicTransfer:false,participantExposureVerified:false,learnerTrials:0};
fs.writeFileSync(dir+'structure-trajectory-verification.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({...out,goldenCheckpoints:checkpoints.length}));
