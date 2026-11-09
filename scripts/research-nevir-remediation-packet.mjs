import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {card,evaluate,compare,assertCards} from '../src/poker.js';
const dir='research/nevir-system';
const mixed=JSON.parse(fs.readFileSync(`${dir}/mixed-course-prescription-evidence.json`,'utf8'));
const same=(a,b)=>a.slice().sort().join(' ')==b.slice().sort().join(' ');
const first=mixed.cases.find(c=>c.family==='A72_base'&&same(c.board,['As','7h','2d'])&&same(c.hole,['Kc','Qc']));
const next=mixed.cases.find(c=>c.family==='A72_base'&&same(c.board,['As','7h','2d'])&&same(c.hole,['Qc','3c']));
assert.ok(first&&next);assert.equal(first.answer.action,'check');assert.equal(next.answer.action,'bet');
const state={questionId:first.id,board:first.board,hole:first.hole,context:mixed.context,adoptedReference:'A72_base',decisionParent:'compare.unopened',money:mixed.context.money};
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const frozen=structuredClone(state),resumeHash=hash(frozen);
const mainValue=evaluate([...state.board,...state.hole].map(card)).value;
assert.deepEqual(mainValue,[0,14,13,12,7,2]);
const alternativeBoard=['As','Kh','2d'];
assert.deepEqual(evaluate([...alternativeBoard,...state.hole].map(card)).value,[1,13,14,12,2]);
const witness=['Qh','Td'];assertCards([...state.board,...state.hole,...witness].map(card));
assert.equal(compare(evaluate([...state.board,...state.hole].map(card)),evaluate([...state.board,...witness].map(card))),1);
// Author trace model only. This does not exercise the app or assert any UI exists.
function trace(useHelp){
 let current=structuredClone(state),counts={correct:0,wrong:0},answerLocked=false;
 const events=[];
 function firstAnswer(action){if(answerLocked){events.push({event:'duplicate_answer_ignored',action});return;}answerLocked=true;counts[action===first.answer.action?'correct':'wrong']++;events.push({event:'first_answer',action,correct:action===first.answer.action,pokerActionCommitted:false});}
 firstAnswer('bet');firstAnswer('unknown');assert.deepEqual(counts,{correct:0,wrong:1});
 assert.equal(hash(current),resumeHash);
 if(useHelp){
  events.push({event:'open_optional_reading_help',resumeHash});
  const preview={...structuredClone(current),board:alternativeBoard,scope:'alternative_flop_preview_not_actual_history'};
  assert.notEqual(hash(preview),resumeHash);assert.equal(hash(current),resumeHash);
  events.push({event:'show_preview',board:preview.board,countsAsIndependentAnswer:false});
  current=structuredClone(frozen);assert.equal(hash(current),resumeHash);
  events.push({event:'close_help_restore_same_decision',restoredHash:hash(current),returnSurface:'feedback',firstAnswerStillLocked:answerLocked,countsAsNewCorrect:false});
 }
 events.push({event:'continue_to_next_independent_question',nextQuestionId:next.id,nextHole:next.hole,notAContinuationOfCurrentHand:true});
 counts.correct++;events.push({event:'next_question_first_answer',action:'bet',correct:true});
 assert.deepEqual(counts,{correct:1,wrong:1});
 return{useHelp,events,counts,originalStateRestored:hash(current)===resumeHash};
}
const teacher={status:'author_remediation_walkthrough_not_app_or_learner_trial',origin:{firstQuestionId:first.id,nextQuestionId:next.id,sourceReview:first.answer.sourceReview},snapshot:state,resumeHash,mainValue,physicalComparison:{villainIllustration:witness,scope:'Current five-card comparison only; not an inferred action-conditioned opponent range.'},optionalPreview:{board:alternativeBoard,mainValue:[1,13,14,12,2],scope:'Illustrative replacement, never a legal turn or current-hand mutation.'},firstAnswer:{proposed:'bet',correctUnderAdoptedRule:'check',legality:'bet is legal but differs from this adopted course rule',commit:false},feedback:'这题按基础简化过牌。现在最佳五张是A、K、Q、7、2，属于A高；K是随后比较的踢脚。',nextQuestion:{id:next.id,board:next.board,hole:next.hole,answer:next.answer},traces:[trace(false),trace(true)],requirements:{correctAutoAdvances:true,wrongOrUnknownShowsExplanation:true,optionalHelpNotMandatoryGate:true,repairDoesNotEraseFirstError:true,referenceReplayMustBeExplicit:true,invalidQuestionNotLearnerError:true,allCountersInMemoryOnly:true,unknownCountsAsWrongOnValidQuestion:true},limits:['No whole-hand strategy continuation is supplied by this pair.','Second question is already public course practice, not unseen transfer.','No UI, database, user results or NL50 validation created.']};
fs.writeFileSync(`${dir}/remediation-walkthrough-packet.json`,JSON.stringify(teacher,null,2)+'\n');
const prompts={status:'paper_trial_prompt_sequence_not_administered',question:{id:first.id,context:mixed.context,board:first.board,hole:first.hole,reference:'采用前面学过的基础简化',options:['过牌','下注','我不知道']},onWrong:{feedback:teacher.feedback,actions:['下一题','看不懂，拆一步']},optionalHelp:{firstTask:'点出当前五张中最大的点数。再指出这手是否成对。',alternativePreview:{board:alternativeBoard,hole:first.hole,task:'换一个翻牌比较：这时是否配到一对？'},closeLabel:'回到刚才那题'},nextQuestion:{id:next.id,board:next.board,hole:next.hole,label:'下一道独立练习',options:['过牌','下注','我不知道']}};
fs.writeFileSync(`${dir}/remediation-walkthrough-prompts.json`,JSON.stringify(prompts,null,2)+'\n');
console.log(JSON.stringify({ok:true,sourceQuestions:[first.id,next.id],fiveCardValue:mainValue,traces:teacher.traces.map(t=>({useHelp:t.useHelp,counts:t.counts,restored:t.originalStateRestored})),status:teacher.status},null,2));
