// Author coverage audit, not an exercise generator or new strategy reference.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir='research/nevir-system/',read=f=>JSON.parse(fs.readFileSync(dir+f,'utf8'));
const prompts=read('mixed-model-practice-prompts.json'),teacher=read('mixed-model-practice-teacher.json'),coarse=read('mixed-model-practice-coverage.json'),claims=read('source-claims.json');
const sourceHash=f=>crypto.createHash('sha256').update(fs.readFileSync(dir+f)).digest('hex');
// Exact observed preflop strings manually reviewed in this bank. Unknown wording fails closed.
const identities=[
 {family:'river_value',hero:'SB',lastRaiser:'SB',caller:'BTN',potType:'3bet',text:'BTN opens2.5; SB raises to10; BB folds; BTN calls; other seats folded'},
 {family:'river_bluff',hero:'SB',lastRaiser:'SB',caller:'BTN',potType:'3bet',text:'BTN opens2.5; SB raises_to10; BB folds; BTN calls'},
 {family:'turn_defense',hero:'SB',lastRaiser:'SB',caller:'BTN',potType:'3bet',text:'UTG/HJ/CO fold; BTN opens to 2.5; SB raises to 10; BB folds; BTN calls'},
 {family:'river_size',hero:'BTN',lastRaiser:'BTN',caller:'BB',potType:'SRP',text:'100BB: BTN opens 2.5, BB calls, SB dead 0.5. Flop BB checks, BTN bets 2.25, BB calls. Turn both check. River BB checks. Earlier actions are observed teaching history, not claimed optimal.'}
];
const questions=teacher.references.map(r=>{
 const q=prompts.questions.find(q=>q.id===r.id);assert.ok(q);
 const identified=identities.find(i=>i.family===r.family&&i.hero===q.body.heroSeat&&i.text===q.body.observedHistory[0]);assert.ok(identified,'Unknown preflop role: '+r.id);
 assert.equal(identified.potType,r.context.potType);
 const role=identified.hero===identified.lastRaiser?'last_preflop_raiser':identified.hero===identified.caller?'preflop_caller':'unresolved';assert.notEqual(role,'unresolved');
 const oldKey=[r.context.position,r.context.potType,r.context.street,r.context.decision].join('/');assert.ok(coarse.coarseCells.some(c=>c.key===oldKey));
 return {id:r.id,family:r.family,heroSeat:q.body.heroSeat,preflopLastRaiser:identified.lastRaiser,preflopCaller:identified.caller,heroRole:role,context:r.context,oldCoarseKey:oldKey,roleAwareKey:role+'/'+oldKey,observedPrefix:q.body.observedHistory[0],inputFingerprint:r.inputFingerprint};
});
assert.equal(questions.length,85);
const roleCells=['last_preflop_raiser','preflop_caller'].flatMap(role=>coarse.coarseCells.map(c=>{
 const matches=questions.filter(q=>q.heroRole===role&&q.oldCoarseKey===c.key);
 return {key:role+'/'+c.key,role,position:c.position,potType:c.potType,street:c.street,decision:c.decision,localQuestionIds:matches.map(q=>q.id),hasPartialLocalModel:matches.length>0,completeTargetPolicyVerified:false};
}));
assert.equal(roleCells.length,96);assert.equal(roleCells.filter(c=>c.hasPartialLocalModel).length,6);
assert.equal(questions.filter(q=>q.heroRole==='preflop_caller').length,0);
const sourceIDs=['R22','R23','R25','R26','R28','R30','R42','R43','R44','R45'];
const sourceRecords=sourceIDs.map(id=>{
 const r=claims.reviews.find(r=>r.id===id);assert.ok(r);
 const text=fs.readFileSync(r.source.file,'utf8');assert.equal(crypto.createHash('sha256').update(text).digest('hex'),r.source.sha256);
 const fragment=claims.fragments.find(f=>f.id===r.fragment);assert.equal(text.split(/\r?\n/)[r.source.line-1].trim(),fragment.text);
 return {id:r.id,source:r.source,fragment:r.fragment,title:r.title,precision:r.claim.precision,reviewStatus:r.status,heroRole:'last_preflop_raiser',
  strategyScope:r.fragment.startsWith('N5-')?'OOP3bet_PFR':'OOP_SRP_PFR',
  opponentResponsesAreNotCompleteOpponentPolicy:true,currentTargetPolicyObtained:false};
});
const output={status:'role_aware_local_bank_and_selected_source_audit_not_comprehensive_strategy',
 scope:'Exact observed histories in the existing85-question bank and ten selected claims from notes2.5/2.7. Does not certify all seven notes or all original Excel content.',
 sourceHashes:Object.fromEntries(['mixed-model-practice-prompts.json','mixed-model-practice-teacher.json','mixed-model-practice-coverage.json','source-claims.json'].map(f=>[f,sourceHash(f)])),
 counts:{originalCoarseCells:48,roleAwareAuditCells:96,existingQuestions:85,lastRaiserQuestions:85,callerQuestions:0,roleCellsWithPartialLocalModel:6,completeTargetPolicyCells:0,selectedSourceClaims:10},
 roleRule:'Facing a bet after checking does not imply preflop caller. The preflop role comes from the full observed history, independently of current position and action.',
 sourceRule:'A paragraph describing how a caller responds to the opener is not a complete graded policy for a learner in the caller seat.',
 sourceRecords,questions,roleCells,
 requiredNextReferences:['BB caller versus BTN opener SRP: same known root ranges and full postflop tree; current A72 request remains unsolved.','Caller in3bet pot: lawful matching caller range and complete policy, not inferred from the3bet chart complement.','Original raiser after checking versus a stab: separate small/large bet and response models, preserving call, raise and reraises.'],
 learnerFlow:'Role is supplied by the small table and observed history; show the same read/compare/act/update loop. Do not add96 menu tiles or repeatedly quiz already-known role.',
 neitherCompletionPercentageNorNewQuestions:true,appChanged:false,learnerTrials:0};
fs.writeFileSync(dir+'defense-role-coverage-evidence.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,...output.counts}));
