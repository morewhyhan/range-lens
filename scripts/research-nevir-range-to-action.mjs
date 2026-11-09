import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir='research/nevir-system/';
const sourceBytes=fs.readFileSync(dir+'history-contrast-evidence.json');
const source=JSON.parse(sourceBytes);
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const ids=source.candidates.map(c=>c.id),close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9);
const questions=[],keys=[];
function normalize(w){const sum=w.reduce((a,b)=>a+b,0);assert.ok(sum>0);return w.map(x=>x/sum);}
for(const path of source.paths){
 const prior=source.candidates.map(c=>c.priorMass);
 const steps=[];let mass=[...prior];
 for(const likelihood of path.likelihoods){
  mass=mass.map((w,i)=>w*likelihood[i]);steps.push([...mass]);
 }
 const posterior=normalize(mass);
 posterior.forEach((p,i)=>close(p,path.posterior[i].probability));
 const check=source.candidates.map(c=>35*c.heroShowdownShare);
 const bet=source.candidates.map(c=>{const r=source.fixedResponse.afterBet17_5[c.id];return r.fold*35+r.call*(70*c.heroShowdownShare-17.5);});
 const expected=v=>posterior.reduce((s,p,i)=>s+p*v[i],0);
 const values={check:expected(check),bet17_5:expected(bet)};
 close(values.check,path.expectedCheck);close(values.bet17_5,path.expectedBet);
 const best=Object.keys(values).filter(a=>Math.abs(values[a]-Math.max(...Object.values(values)))<1e-9);
 for(const phase of ['update_then_choose','choose_without_supplied_posterior']){
  const body={phase,current:structuredClone(path.currentState),observedHistory:path.events,
   priorAtFlop:source.candidates.map(c=>({id:c.id,hole:c.hole,relativeWeight:c.priorMass})),
   observedOpponentActionLikelihoods:path.likelihoods.map((row,i)=>({observationNumber:i+1,conditionalOn:'this holding and the actual preceding history',probabilities:Object.fromEntries(ids.map((id,j)=>[id,row[j]]))})),
   riverResponse:source.fixedResponse,
   assumptions:{source:'author-given model; not recovered real opponent frequencies',priorMeaning:source.context.candidatePrior,chance:source.context.chance},
   task:phase==='update_then_choose'?'先填写三组留下的相对质量，再从过牌与下注17.5选择。':'当前比例不提供；依据原候选和实际两次回应，自行更新后选过牌或下注17.5。可以使用计算器。',
   availableChoices:[{id:'check',label:'过牌'},{id:'bet17_5',label:'下注17.5'},{id:'unknown',label:'我不知道'}]};
  const fingerprint=hash(body),id='RA-'+fingerprint.slice(0,16);
  questions.push({id,body});keys.push({id,inputFingerprint:fingerprint,sourcePath:path.id,sourceSHA256:hash(sourceBytes.toString()),posterior:Object.fromEntries(ids.map((id,i)=>[id,posterior[i]])),unnormalizedSteps:steps,values,best,
   status:'public_author_model_not_frozen_transfer_test'});
 }
}
function validate(q,k){return q.id===k.id&&hash(q.body)===k.inputFingerprint;}
function gradeRange(q,k,entry){
 if(!validate(q,k))return {gradeable:false,reason:'author_input_mismatch'};
 if(entry==='unknown')return {gradeable:true,correct:false,answeredUnknown:true};
 if(!entry||Object.keys(entry).length!==ids.length||ids.some(id=>!Object.hasOwn(entry,id)||!Number.isFinite(entry[id])||entry[id]<0)||Object.values(entry).reduce((a,b)=>a+b,0)<=0)return {gradeable:false,reason:'unfinished_or_invalid_entry'};
 const p=normalize(ids.map(id=>entry[id]));
 return {gradeable:true,correct:ids.every((id,i)=>Math.abs(p[i]-k.posterior[id])<1e-8),
  evidenceScope:'conditional_range_update_only_not_action_or_real_opponent_estimation'};
}
function gradeAction(q,k,choice,{computedRangeFeedbackSeen=false,otherSolutionHelpSeen=false}={}){
 if(!validate(q,k))return {gradeable:false,reason:'author_input_mismatch'};
 if(choice!=='unknown'&&!Object.hasOwn(k.values,choice))return {gradeable:false,reason:'outside_compared_plans'};
 const unknown=choice==='unknown';
 return {gradeable:true,correct:!unknown&&k.best.includes(choice),answeredUnknown:unknown,
  evLossBB:unknown?null:Math.max(...Object.values(k.values))-k.values[choice],
  computedRangeFeedbackSeen,otherSolutionHelpSeen,
  potentiallyUnassistedWithinGivenModel:!computedRangeFeedbackSeen&&!otherSolutionHelpSeen,
  realLearnerOrHeldoutEvidence:false,actualActionCommitted:false};
}
const qA=questions[0],kA=keys[0],qB=questions[2],kB=keys[2];
assert.equal(kA.sourcePath,'HC_A');assert.equal(kB.sourcePath,'HC_B');
const audit=[];
function check(name,actual,expected){for(const [key,value]of Object.entries(expected))assert.deepEqual(actual[key],value);audit.push({name,result:actual});}
check('exact relative weights',gradeRange(qA,kA,{'88':1,QQ:4,JT:1}),{gradeable:true,correct:true});
check('same relative weights scaled',gradeRange(qA,kA,{'88':20,QQ:80,JT:20}),{gradeable:true,correct:true});
check('already normalized accepted',gradeRange(qA,kA,{'88':1/6,QQ:4/6,JT:1/6}),{correct:true});
check('not reset to flop prior',gradeRange(qA,kA,{'88':1,QQ:2,JT:2}),{correct:false});
check('unknown is wrong not uniform',gradeRange(qA,kA,'unknown'),{gradeable:true,correct:false});
check('empty draft not a completed wrong answer',gradeRange(qA,kA,{}),{gradeable:false});
check('cannot zero all candidates',gradeRange(qA,kA,{'88':0,QQ:0,JT:0}),{gradeable:false});
check('B must use actual B history',gradeRange(qB,kB,{'88':1,QQ:4,JT:1}),{correct:false});
check('B update',gradeRange(qB,kB,{'88':4,QQ:4,JT:1}),{correct:true});
check('A action',gradeAction(qA,kA,'bet17_5'),{correct:true,potentiallyUnassistedWithinGivenModel:true});
check('B action',gradeAction(qB,kB,'check'),{correct:true});
check('same visible cards and money not same choice',gradeAction(qB,kB,'bet17_5'),{correct:false});
check('unknown does not execute',gradeAction(qA,kA,'unknown'),{correct:false,actualActionCommitted:false,evLossBB:null});
check('uncalculated legal size not wrong',gradeAction(qA,kA,'bet10'),{gradeable:false});
check('range feedback assists action even if action correct',gradeAction(qA,kA,'bet17_5',{computedRangeFeedbackSeen:true}),{correct:true,potentiallyUnassistedWithinGivenModel:false});
const tampered=structuredClone(qA);tampered.body.observedHistory=qB.body.observedHistory;
check('cannot reuse A reference after B history swap',gradeAction(tampered,kA,'bet17_5'),{gradeable:false});
// A wrong range can preserve the right action. One correct button is not proof of updating.
const wrongRange={'88':1,QQ:4,JT:2};
const wr=normalize(ids.map(id=>wrongRange[id]));
const d=wr[0]*(-17.5)+wr[1]*8.75;assert.ok(d>0);
check('wrong update despite right button',gradeRange(qA,kA,wrongRange),{correct:false});
assert.deepEqual(qA.body.current,qB.body.current);
for(const q of questions){const text=JSON.stringify(q.body);for(const field of ['expectedCheck','expectedBet','integerPosteriorMass','unnormalizedSteps','evBB','best'])assert.ok(!text.includes('"'+field+'"'));}
fs.writeFileSync(dir+'range-to-action-prompts.json',JSON.stringify({status:'author_paper_exercise_inputs',frozen:false,questions},null,2)+'\n');
fs.writeFileSync(dir+'range-to-action-teacher.json',JSON.stringify({status:'author_reference_not_learner_results',keys},null,2)+'\n');
fs.writeFileSync(dir+'range-to-action-verification.json',JSON.stringify({ok:true,publicQuestions:questions.length,independentSourceFamilies:1,authoredHistories:2,audit,wrongRangeStillSelectsRightAction:true,actualLearnerTrials:0,sourcePolicyAcquired:false,newContextCells:0},null,2)+'\n');
console.log(JSON.stringify({ok:true,questions:questions.length,auditCases:audit.length,wrongRangeStillSelectsRightAction:true,realLearners:0,newContextCells:0}));
