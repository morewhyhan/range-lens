import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {card,assertCards} from '../src/poker.js';
const dir='research/nevir-system/',file='C:/Users/why/Desktop/笔记 Nevir/2.2-有利位置3bet底池—第一部分_中文笔记.md';
const bytes=fs.readFileSync(file),lines=bytes.toString('utf8').split(/\r?\n/),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const definitions=[
 {id:'T62_rainbow',ranks:['T','6','2'],texture:'rainbow',line:42,size:.67,text:'10-6-2彩虹：67%'},
 {id:'T62_twotone',ranks:['T','6','2'],texture:'two_tone',line:41,size:.4,text:'10-6-2带同花听牌：40%'},
 {id:'852_monotone',ranks:['8','5','2'],texture:'monotone',line:43,size:.25,text:'2-5-8（单调牌面）：总是25%'},
 {id:'962_rainbow',ranks:['9','6','2'],texture:'rainbow',line:39,size:.67,text:'9-6-2彩虹（低连接干燥）：应该用大尺寸（如67%）'}
];
for(const d of definitions)assert.ok(lines[d.line-1].includes(d.text),'Source line changed: '+d.id);
assert.ok(lines[49].includes('筹码深度100bb'));
const permutations=[];for(const a of ['s','h','d','c'])for(const b of ['s','h','d','c'])for(const c of ['s','h','d','c'])permutations.push([a,b,c]);
const questions=[],references=[];
for(const d of definitions)for(const suits of permutations){
 const distinct=new Set(suits).size,want=d.texture==='rainbow'?3:d.texture==='two_tone'?2:1;if(distinct!==want)continue;
 const board=d.ranks.map((rank,i)=>rank+suits[i]);assertCards(board.map(card));
 const body={board,players:6,effectiveStartingStackBB:100,heroSeat:'BTN',villainSeat:'CO',preflopRole:'last_raiser',potType:'3bet',street:'flop',actor:'BTN',opponentAlreadyChecked:true,
  taskKind:'adopted_course_primary_size_lookup_not_hand_action',
  prompt:'本题只练这套课程简化采用的主下注尺寸。此处采用25%、40%、67%三个档位；不判断某一手牌是否应该下注。请选择对应档位。',
  scope:'Only the explicitly supported named rank/texture classes in this course exercise. Not a full range strategy or new-board sizing algorithm.',
  choices:[{id:'s25',label:'25%底池'},{id:'s40',label:'40%底池'},{id:'s67',label:'67%底池'},{id:'unknown',label:'我不知道'}]};
 const fp=hash(JSON.stringify(body)),id='IPS-'+fp.slice(0,16);
 questions.push({id,body});references.push({id,inputFingerprint:fp,adoptedFamily:d.id,answer:'s'+Math.round(d.size*100),adoptedPotFraction:d.size,
  source:{file,line:d.line,text:lines[d.line-1],sha256:hash(bytes)},
  evidenceKind:'execution_of_adopted_course_size_abstraction',
  notSupported:['which_hole_cards_bet','hand_betting_frequency','opponent_response','next_street_policy','full_solver_equilibrium'],
  abstractionBoundary:d.texture==='two_tone'?'The note names this rank/texture class without locating the repeated suit. All three repeated-suit rank pairs are admitted only under this declared coarse course abstraction, not claimed globally suit-isomorphic.':'Physical suit variants of the stated rank/texture class; not independent source mechanisms.'});
}
assert.equal(questions.length,88);assert.equal(new Set(questions.map(q=>q.id)).size,88);
function grade(q,r,choice){
 if(q.id!==r.id||hash(JSON.stringify(q.body))!==r.inputFingerprint)return {gradeable:false,reason:'author_input_mismatch'};
 if(!q.body.choices.some(c=>c.id===choice))return {gradeable:false,reason:'unpublished_choice'};
 return {gradeable:true,correct:choice===r.answer,unknownCountsAsWrong:choice==='unknown',evidenceKind:r.evidenceKind,independentActionOptimalityClaim:false};
}
for(let i=0;i<questions.length;i++){
 const q=questions[i],r=references[i];assert.equal(grade(q,r,r.answer).correct,true);assert.equal(grade(q,r,'unknown').correct,false);
 const changed=structuredClone(q);changed.body.heroSeat='SB';assert.equal(grade(changed,r,r.answer).gradeable,false);
 assert.equal(grade(q,r,'s75').gradeable,false);
 const text=JSON.stringify(q.body);assert.ok(!text.includes('"answer"')&&!text.includes('"adoptedPotFraction"'));
}
const counts=Object.fromEntries(definitions.map(d=>[d.id,references.filter(r=>r.adoptedFamily===d.id).length]));
assert.deepEqual(counts,{T62_rainbow:24,T62_twotone:36,'852_monotone':4,'962_rainbow':24});
const result={ok:true,status:'course_size_abstraction_not_full_action_reference',questions:88,sourceFamilies:4,counts,
 sourceSHA256:hash(bytes),scopeLine:{line:50,text:lines[49]},
 excludedAmbiguousReferences:[{line:40,text:lines[39],reason:'Explicit uncertainty retained; no forced unique action/size question.'},{line:46,text:lines[45],reason:'The note compares40/67; retain as explanation rather than force a unique answer.'}],
 sameRanksChangedTexture:{rainbow:'s67',twoTone:'s40',meaning:'Adopted course rule contrast, not proof that wet boards universally use smaller bets.'},
 sourceCallerPolicyFound:false,mathematicalMixedBankNewCells:0,learnerTrials:0,frozen:false};
fs.writeFileSync(dir+'ip3bet-course-size-prompts.json',JSON.stringify({status:result.status,questions},null,2)+'\n');
fs.writeFileSync(dir+'ip3bet-course-size-teacher.json',JSON.stringify({status:result.status,references},null,2)+'\n');
fs.writeFileSync(dir+'ip3bet-course-size-verification.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,excludedAmbiguousReferences:undefined,scopeLine:undefined},null,2));
