import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fingerprint} from './nevir-practice-grader.mjs';
import {gradeScoped,advanceScoped} from './nevir-scoped-practice-grader.mjs';
const dir='research/nevir-system/',read=f=>JSON.parse(fs.readFileSync(dir+f,'utf8'));
const value=read('value-trap-tree-evidence.json'),defense=read('defense-tree-evidence.json'),size=read('size-comparison-evidence.json');
const questions=[],references=[],byFingerprint=new Map();
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function option(name,toCall){
 if(name==='fold')return {action:'fold',label:'弃牌'};
 if(name==='check')return {action:'check',label:'过牌'};
 if(name==='call')return {action:'call',amount:toCall,label:`跟${toCall}`};
 const c=/^call([\d.]+)$/.exec(name);if(c)return {action:'call',amount:+c[1],label:`跟${c[1]}`};
 const r=/^raise(?:_to_)?([\d.]+)$/.exec(name);if(r)return {action:'raise',to:+r[1],label:`加到${r[1]}`};
 const j=/^jam(?:_to_)?([\d.]+)$/.exec(name);if(j)return {action:'raise',to:+j[1],label:`全下${j[1]}`};
 const b=/^bet(?:_)?([\d.]+)$/.exec(name);if(b)return {action:'bet',to:+b[1],label:`下注${b[1]}`};
 throw Error('Unknown plan '+name);
}
function scene(position,potType,street,s){return {position,potType,street,decision:s.villainStack===0&&s.toCall>0?'facing_allin':s.toCall>0?(s.heroPut>0?'facing_raise':'facing_bet'):'free'};}
const cell=s=>[s.position,s.potType,s.street,s.decision].join('/');
function insert(body,values,provenance,family,tags){
 const fp=fingerprint(body),existing=byFingerprint.get(fp);
 if(existing){values.forEach((v,i)=>close(v,existing.ref.planValues[i].evBB));existing.ref.contributors.push(provenance);return;}
 const id='M-'+fp.slice(0,16),bestEV=Math.max(...values);
 const planValues=values.map((evBB,i)=>({choiceId:body.candidatePlans[i].choiceId,evBB}));
 const bestActions=planValues.filter(v=>Math.abs(v.evBB-bestEV)<1e-9).map(v=>({choiceId:v.choiceId}));
 const ref={id,inputFingerprint:fp,domain:'finite_candidate_plans',planValues,bestEV,bestActions,contributors:[provenance],family,context:tags,sourceKind:'author_given_math_model',executionAdapterReady:['river_size','river_value','turn_defense'].includes(family)};
 const q={id,body};questions.push(q);references.push(ref);byFingerprint.set(fp,{q,ref});
}
const canonicalPlans=(names,cost)=>names.map((n,i)=>({choiceId:`p${i}`,...option(n,cost)}));
function baseBody(board,hero,s,heroSeat,villainSeat,history){return {board,hero,heroSeat,villainSeat,actor:heroSeat,state:s,observedHistory:history,
 prompt:'按本题给定条件，从这些方案中选择。',comparisonScope:'Only the declared candidate plans and their given continuation menus, not all legal poker actions.',referenceKind:'author_given_model',unknownOption:{choiceId:'unknown',label:'我不知道'}};}
// Independently recalculate the value-tree reference before projecting any input.
const shares={KK:0,'77':1,AK:1,QQ:1,QT:1};
function evaluateValueProfile(p){
 const ids=value.holdings.map(h=>h.id),prior=Object.fromEntries(ids.map((id,i)=>[id,p.weights[i]]));
 const total=m=>Object.values(m).reduce((a,b)=>a+b,0),mean=(m,f)=>ids.reduce((s,id)=>s+(m[id]??0)*f(id),0)/total(m);
 const jams=id=>id==='KK'||id==='77';
 const callsJam=id=>id==='KK'||(id==='77'&&!p.fold77ToHeroJam);
 function afterLead(m){return {fold:-17.5,call27_5:mean(m,id=>125*shares[id]-45),jam83:mean(m,id=>callsJam(id)?201*shares[id]-83:80)};}
 function afterBet(m){
  const jm=Object.fromEntries(ids.map(id=>[id,jams(id)?m[id]??0:0])),mass=total(jm);
  const jamDecision=mass?Math.max(-45,201*mean(jm,id=>shares[id])-83):0;
  return {fold:0,call17_5:70*mean(m,id=>shares[id])-17.5,raise45:mean(m,id=>jams(id)?jamDecision:id==='AK'?80:52.5),jam83:mean(m,id=>callsJam(id)?201*shares[id]-83:52.5)};
 }
 const betProbability=id=>jams(id)?1:id==='AK'?p.weakBet:id==='QT'?p.airBet:0;
 const bm=Object.fromEntries(ids.map(id=>[id,prior[id]*betProbability(id)]));
 const checked=mean(prior,id=>(1-betProbability(id))*35*shares[id])+total(bm)/total(prior)*Math.max(...Object.values(afterBet(bm)));
 const rm=Object.fromEntries(ids.map(id=>[id,jams(id)?prior[id]:0]));
 const led=total(rm)/total(prior)*Math.max(...Object.values(afterLead(rm)))+mean(prior,id=>jams(id)?0:id==='AK'?52.5:id==='QQ'?43.75:35);
 return {root:{check:checked,'bet17.5':led},afterLead,afterBet};
}
const sourceValueRecords=16;
for(const p of value.profiles){
 const independent=evaluateValueProfile(p);
 for(const n of p.nodes){
  assert.ok(n.observedMass>0);const m=Object.fromEntries(value.holdings.map(h=>[h.id,n.posterior[h.id]*n.observedMass]));
  let expected;
  if(n.id==='river_start')expected=[independent.root.check,independent.root['bet17.5']];
  else if(n.id==='after_lead_villain_raise45'){const v=independent.afterLead(m);expected=[v.fold,v.call27_5,v.jam83];}
  else if(n.id==='after_check_villain_bet17.5'){const v=independent.afterBet(m);expected=[v.fold,v.call17_5,v.raise45,v.jam83];}
  else {const mass=Object.values(m).reduce((a,b)=>a+b,0),e=(m['77']??0)/mass;expected=[-45,201*e-83];}
  n.actions.forEach((a,i)=>close(a.evFromRiverRootBB,expected[i]));
  const raw=value.holdings.map(h=>Math.round(m[h.id]));raw.forEach((v,i)=>close(v,m[value.holdings[i].id]));
  const gcd=(a,b)=>b?gcd(b,a%b):a;const scale=raw.reduce(gcd,0)||1;
  const range=value.holdings.map((h,i)=>({id:h.id,hole:h.hole,relativeWeight:raw[i]/scale})).filter(h=>h.relativeWeight>0);
  const s={...n.state,toCall:Math.max(0,n.state.villainPut-n.state.heroPut),foldedStacks:399};delete s.minRaise;
  const prefixes={river_start:[],'after_check_villain_bet17.5':['SB check','BTN bet17.5'],after_lead_villain_raise45:['SB bet17.5','BTN raise_to45'],after_xraise_villain_jam:['SB check','BTN bet17.5','SB raise_to45','BTN allin_to83']};
  const body=baseBody(value.context.board,value.context.hero,s,'SB','BTN',[...value.context.history,...prefixes[n.id]]);
  body.currentRange={holdings:range,weightMeaning:'Relative current conditional mass, not a count of distinct copies of a hand.'};
  const jamRows=range.map(h=>({holding:h.id,callProbability:h.id==='KK'||(h.id==='77'&&!p.fold77ToHeroJam)?1:0}));
  const raiseRows=range.map(h=>({holding:h.id,response:h.id==='KK'||h.id==='77'?'jam_to83':h.id==='AK'?'call_to45':'fold'}));
  if(n.id==='river_start')body.futureModel={afterHeroCheck:range.map(h=>({holding:h.id,bet17_5Probability:h.id==='KK'||h.id==='77'?1:h.id==='AK'?p.weakBet:h.id==='QT'?p.airBet:0})),afterHeroBet17_5:range.map(h=>({holding:h.id,response:h.id==='KK'||h.id==='77'?'raise_to45':h.id==='AK'?'call':h.id==='QQ'?'half_call_half_fold':'fold'})),afterHeroRaise45:raiseRows,afterHeroJam83:jamRows,heroFutureMenus:value.treeScope,checkBehindEndsStreet:true};
  else if(n.id==='after_check_villain_bet17.5')body.futureModel={afterHeroRaise45:raiseRows,afterHeroJam83:jamRows,afterOpponentJam:['fold','call38']};
  else if(n.id==='after_lead_villain_raise45')body.futureModel={afterHeroJam83:jamRows};
  else body.futureModel={afterCall:'Showdown; no future bet or card'};
  body.candidatePlans=canonicalPlans(n.actions.map(a=>a.action),s.toCall);
  const currentValues=n.actions.map(a=>a.evFromRiverRootBB+n.state.heroPut);
  n.actions.forEach((a,i)=>{if(a.relativeToCurrentFoldBB!==null)close(a.relativeToCurrentFoldBB,currentValues[i]);});
  insert(body,currentValues,{file:'value-trap-tree-evidence.json',profile:p.id,node:n.id,originShiftBB:n.state.heroPut},'river_value',scene('OOP','3bet','river',s));
 }
}
const defenseOracles={pressure:[0,-7/44,-30,-5217/154],more_bluffs:[0,35/88,-1689/88,-1689/88],fold_to_raise:[0,-7/44,295/154,-5217/154],fold_to_shove:[0,-7/44,-30,2225/154]};
for(const p of defense.profiles){
 p.actions.forEach((a,i)=>close(a.evBB,defenseOracles[p.id][i]));
 const s={pot:31.5,heroStack:90,villainStack:79.5,heroPut:0,villainPut:10.5,toCall:10.5,foldedStacks:399};
 const body=baseBody(defense.context.board,defense.context.heroHole,s,'SB','BTN',defense.context.history);
 body.currentRange={holdings:defense.holdings.map((h,i)=>({id:h.id,hole:h.hole,relativeWeight:p.weights[i]}))};
 body.futureModel={afterHeroRaise30:defense.holdings.map((h,i)=>({holding:h.id,...p.smallResponse[i]})),afterHeroAllin90:defense.holdings.map((h,i)=>({holding:h.id,callProbability:p.jamCall[i]})),opponentRiverPolicy:defense.opponentRiverPolicy,heroFutureMenu:defense.treeScope,uniformLegalRivers:true};
 body.calculationSupport={kind:'provided_conditional_showdown_table',meaning:'Intermediate computation help for plan comparison; not independent proof of reading/equity skill.',tables:defense.holdings.map(h=>({holding:h.id,outcomes:h.rivers.map(r=>({river:r.river,heroShowdownShare:r.share}))}))};
 body.candidatePlans=canonicalPlans(p.actions.map(a=>a.id),10.5);
 insert(body,p.actions.map(a=>a.evBB),{file:'defense-tree-evidence.json',profile:p.id},'turn_defense',scene('OOP','3bet','turn',s));
}
for(const [name,p]of Object.entries(size.examples)){
 const range=size.groups.filter(g=>p.weights[g.id]>0).map(g=>({id:g.id,hole:g.hole,relativeWeight:p.weights[g.id],smallCallProbability:(p.responseOverrides[g.id]?.callsSmall??g.callsSmall)?1:0,largeCallProbability:(p.responseOverrides[g.id]?.callsLarge??g.callsLarge)?1:0}));
 const evs=p.actions.map(a=>{
  let mass=0,total=0;
  for(const h of range){const share=size.groups.find(g=>g.id===h.id).equity;const call=a.id==='check'?1:a.id==='small'?h.smallCallProbability:h.largeCallProbability;
   const b=a.bet,own=size.context.activeStackBB;
   const expectedEnd=call*(own-b+share*(10+2*b))+(1-call)*(own+10);
   total+=h.relativeWeight*(expectedEnd-own);mass+=h.relativeWeight;
  }
  const ev=total/mass;close(ev,a.evBB);return ev;
 });
 const s={pot:10,heroStack:95.25,villainStack:95.25,heroPut:0,villainPut:0,toCall:0,foldedStacks:399.5};
 const body=baseBody(size.context.board,size.context.hero,s,'BTN','BB',[size.context.legalGrossHistory]);
 body.currentRange={holdings:range.map(({smallCallProbability,largeCallProbability,...h})=>h)};
 body.futureModel={opponentAlreadyChecked:true,afterHeroCheck:'Showdown',afterBet:range.map(h=>({holding:h.id,callBet5:h.smallCallProbability,callBet10:h.largeCallProbability})),otherResponses:'Fold; no raise in this model'};
 body.candidatePlans=canonicalPlans(['check','bet5','bet10'],0);
 insert(body,evs,{file:'size-comparison-evidence.json',example:name},'river_size',scene('IP','SRP','river',s));
}
const finiteCount=questions.length;
const oldPublic=read('no-answer-practice-prompts.json'),oldTeacher=read('no-answer-practice-teacher.json');
for(const old of oldPublic.questions){
 const r=oldTeacher.references.find(r=>r.id===old.id);assert.ok(r);
 const body=structuredClone(old.body);body.candidatePlans=body.options.filter(a=>a.action!=='unknown').map((a,i)=>({choiceId:`p${i}`,...a}));delete body.options;body.unknownOption={choiceId:'unknown',label:'我不知道'};
 body.comparisonScope='Current node over the declared continuous raise interval and allowed author chip grid.';
 const fp=fingerprint(body),id='M-'+fp.slice(0,16);questions.push({id,body});references.push({...r,id,inputFingerprint:fp,domain:'continuous_raise_interval',family:'river_bluff',context:{position:'OOP',potType:'3bet',street:'river',decision:'facing_raise'},contributors:[{file:'no-answer-practice-teacher.json',sourceId:old.id}],sourceKind:'author_given_math_model',executionAdapterReady:true});
}
assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
const uniqueBestKinds=new Set();let tied=0;
for(let i=0;i<questions.length;i++){
 const q=questions[i],r=references[i];assert.equal(fingerprint(q.body),r.inputFingerprint);
 const st=q.body.state??q.body;close(st.pot+st.heroStack+st.villainStack+st.foldedStacks,600);
 assert.equal(q.body.actor,q.body.heroSeat);
 const bestChoices=r.domain==='finite_candidate_plans'?r.bestActions:r.bestActions.map(a=>({choiceId:q.body.candidatePlans.find(p=>p.action===a.action&&(a.to===undefined||p.to===a.to)).choiceId}));
 if(bestChoices.length>1)tied++;else{
  const p=q.body.candidatePlans.find(p=>p.choiceId===bestChoices[0].choiceId);
  uniqueBestKinds.add(p.label.startsWith('全下')?'allin':p.action);
 }
 for(const best of bestChoices)assert.equal(gradeScoped(r,q,best).correct,true);
 assert.equal(gradeScoped(r,q,{choiceId:'unknown'}).correct,false);
 const changed=structuredClone(q);changed.body.actor='other';assert.equal(gradeScoped(r,changed,bestChoices[0]).gradeable,false);
 assert.equal(gradeScoped(r,q,{choiceId:'not_a_real_button'}).gradeable,false);
 if(r.domain==='finite_candidate_plans')assert.equal(advanceScoped(r,q,bestChoices[0]).actualActionCommitted,r.executionAdapterReady);
}
const limited=references.find(r=>r.domain==='finite_candidate_plans'&&r.contributors.some(c=>c.node==='after_lead_villain_raise45'));
const limitedQ=questions.find(q=>q.id===limited.id);assert.equal(gradeScoped(limited,limitedQ,{action:'raise',to:72.5}).gradeable,false);
const continuous=references.find(r=>r.domain==='continuous_raise_interval'),continuousQ=questions.find(q=>q.id===continuous.id);
assert.equal(gradeScoped(continuous,continuousQ,{action:'raise',to:74}).gradeable,true);
const active=new Map();references.forEach(r=>{const k=cell(r.context);if(!active.has(k))active.set(k,new Map());const f=active.get(k);if(!f.has(r.family))f.set(r.family,[]);f.get(r.family).push(r.id);});
const allCells=[];for(const position of ['IP','OOP'])for(const potType of ['SRP','3bet'])for(const street of ['flop','turn','river'])for(const decision of ['free','facing_bet','facing_raise','facing_allin']){const s={position,potType,street,decision};allCells.push({...s,key:cell(s),hasLocalQuestion:active.has(cell(s))});}
assert.equal(allCells.length,48);
function makeSampler(seed,allowedCells=[...active.keys()]){
 let n=seed>>>0;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 const cells=allowedCells.filter(c=>active.has(c));
 return ()=>{
  if(!cells.length)return {questionId:null,reason:'no_supported_context_no_silent_fallback'};
  const k=cells[Math.floor(random()*cells.length)],families=[...active.get(k).keys()],family=families[Math.floor(random()*families.length)],ids=active.get(k).get(family);
  return {questionId:ids[Math.floor(random()*ids.length)],cell:k,family};
 };
}
assert.equal(makeSampler(10,['IP/3bet/flop/free'])().questionId,null);
const checkSampler=makeSampler(20261021),seenCells=new Set();
for(let i=0;i<1200;i++){const x=checkSampler();assert.ok(questions.some(q=>q.id===x.questionId));seenCells.add(x.cell);}
assert.equal(seenCells.size,active.size);
const forbidden=new Set(['evBB','bestEV','bestActions','best','chosen','isCorrect','relativeToCurrentFoldBB']);
function scan(x){if(x&&typeof x==='object')for(const[k,v]of Object.entries(x)){assert.ok(!forbidden.has(k),'Answer leak '+k);scan(v);}}
questions.forEach(scan);
const coverage={status:'author_scope_inventory_not_curriculum_or_learner_pass',questions:questions.length,authoredModelFamilies:4,sourceValueNodeRecords:sourceValueRecords,deduplicatedValueNodeQuestions:finiteCount-12,finitePlanQuestions:finiteCount,continuousIntervalQuestions:60,tiedQuestions:tied,uniqueBestButtonKinds:[...uniqueBestKinds],coarseCells:allCells,localQuestionCells:allCells.filter(c=>c.hasLocalQuestion).length,
 sampler:{order:'supported context cell -> model family -> question',interpretation:'Pedagogical balance, not empirical hand frequencies.',pureBluffProbabilityUnderThisSampler:1/active.size/active.get('OOP/3bet/river/facing_raise').size,uniformQuestionBankPureBluffProbability:60/questions.length,noSilentUnsupportedFallback:true},
 executionAdapters:{ready:references.filter(r=>r.executionAdapterReady).length,unavailable:references.filter(r=>!r.executionAdapterReady).length,finiteReadyFamilies:['river_size','river_value','turn_defense'],meaning:'Research execution only; not implemented app UI. Coverage of these declared domains is not complete poker coverage.'},
 limitations:['Only six coarse cells contain local questions; presence is not complete coverage of those cells.','No flop comparison inside this mathematical bank. Course-prescription flop exercises exist separately and have a different evidence identity.','IP3bet and OOP SRP plan comparisons are absent here.','All current models have hero as prior aggressor; caller training is not established by this bank.','Finite menu references cannot grade other legal amounts; all declared families now have local research adapters, not app UI or unrestricted action execution.','Defense questions provide showdown tables as intermediate help.','All cases are public authored examples or parameters; no frozen unseen transfer, real learner or NL50 evidence.']};
assert.equal(coverage.localQuestionCells,6);assert.equal(finiteCount,25);assert.equal(questions.length,85);assert.ok(['call','allin','check','bet','raise','fold'].every(k=>uniqueBestKinds.has(k)));
const common={status:'public_mixed_given_model_practice_not_unseen_exam',questionsTotal:questions.length,defaultTrainingFeedback:'immediate',frozenTest:false,learnerDataStored:false};
fs.writeFileSync(dir+'mixed-model-practice-prompts.json',JSON.stringify({...common,questions},null,2)+'\n');
const demoSampler=makeSampler(20261021);
fs.writeFileSync(dir+'mixed-model-practice-teacher.json',JSON.stringify({...common,status:'author_reference_keys_not_learner_performance',references,samplerExample:Array.from({length:12},()=>demoSampler())},null,2)+'\n');
coverage.sourceHashes=Object.fromEntries(['value-trap-tree-evidence.json','defense-tree-evidence.json','size-comparison-evidence.json','no-answer-practice-teacher.json'].map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(dir+p)).digest('hex')]));
fs.writeFileSync(dir+'mixed-model-practice-coverage.json',JSON.stringify(coverage,null,2)+'\n');
console.log(JSON.stringify({ok:true,questions:questions.length,finitePlanQuestions:finiteCount,valueNodesAfterDedup:finiteCount-12,tied,uniqueBestKinds:[...uniqueBestKinds],coarseCellsWithQuestions:coverage.localQuestionCells,coarseCellsAudited:48,sampler:coverage.sampler,status:coverage.status},null,2));
