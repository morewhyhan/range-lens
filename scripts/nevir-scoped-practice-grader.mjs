// Research-only dispatch: a finite plan menu is not a full poker action reference.
import {fingerprint,gradeRoot,advanceRoot} from './nevir-practice-grader.mjs';
import {advanceRiverSize} from './nevir-river-size-executor.mjs';
import {advanceRiverValue} from './nevir-river-value-executor.mjs';
import {advanceTurnDefense} from './nevir-turn-defense-executor.mjs';
const near=(a,b)=>Math.abs(a-b)<1e-9;
function resolve(question,answer){
 if(answer?.choiceId==='unknown'||answer?.action==='unknown')return {action:'unknown'};
 if(answer?.choiceId)return question.body.candidatePlans.find(p=>p.choiceId===answer.choiceId)??null;
 return answer;
}
export function gradeScoped(reference,question,answer,options={}){
 if(reference.id!==question.id||fingerprint(question.body)!==reference.inputFingerprint)return {gradeable:false,correct:null,reason:'author_input_mismatch_not_learner_error'};
 const actual=resolve(question,answer);
 if(answer?.choiceId&&!actual)return {gradeable:false,correct:null,reason:'ui_choice_not_in_published_question'};
 if(reference.domain==='continuous_raise_interval')return gradeRoot(reference,question,actual,options);
 if(reference.domain!=='finite_candidate_plans')return {gradeable:false,correct:null,reason:'unknown_reference_domain'};
 if(actual?.action==='unknown')return {gradeable:true,correct:false,evLossBB:null,unknownCountsAsWrong:true,feedback:{bestActions:reference.bestActions,bestEV:reference.bestEV}};
 const plan=question.body.candidatePlans.find(p=>p.action===actual?.action&&
   (p.to===undefined||near(p.to,actual.to))&&(actual.amount===undefined||near(p.amount,actual.amount)));
 if(!plan)return {gradeable:false,correct:null,reason:'requested_action_not_covered_by_compared_plan_set',notALegalityRuling:true};
 const value=reference.planValues.find(v=>v.choiceId===plan.choiceId).evBB;
 return {gradeable:true,correct:near(value,reference.bestEV),evLossBB:reference.bestEV-value,
  feedback:{bestActions:reference.bestActions,bestEV:reference.bestEV,evOrigin:'current_decision',scope:'Only the declared plans and their permitted continuation menus.'},
  evidence:{answerHelpUsed:!!options.answerHelpUsed,realLearnerObserved:false,answerKind:reference.givenActionExecutionOnly?'given_action_execution':'given_plan_comparison'}};
}
export function advanceScoped(reference,question,answer,options={}){
 if(reference.family==='turn_defense')return advanceTurnDefense(reference,question,resolve(question,answer),options);
 if(reference.family==='river_value')return advanceRiverValue(reference,question,resolve(question,answer),options);
 if(reference.family==='river_size')return advanceRiverSize(reference,question,resolve(question,answer),options);
 if(reference.domain!=='continuous_raise_interval')return {kind:'execution_adapter_not_yet_available_for_this_domain',actualActionCommitted:false};
 return advanceRoot(reference,question,resolve(question,answer),options);
}
