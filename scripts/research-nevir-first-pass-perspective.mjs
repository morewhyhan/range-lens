// Author information/perspective checks. Does not simulate a learner result.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir='research/nevir-system/',read=f=>JSON.parse(fs.readFileSync(dir+f,'utf8'));
const teacher=read('first-hand-lesson-packet.json'),publicPack=read('first-hand-lesson-prompts.json'),route=read('guided-course-itinerary.json');
assert.deepEqual(publicPack.frames,teacher.frames);assert.equal(teacher.frames.length,18);
const rows=teacher.frames.map((f,i)=>{
 const s=f.state,p=f.perspective;assert.equal(p.viewerSeat,s.heroSeat);assert.equal(p.ownCardOwner,s.heroSeat);assert.equal(p.gradesIndependentStrategy,false);assert.equal(p.selectsOpponentPolicy,false);
 if(i<17){assert.equal(s.heroSeat,'SB');assert.deepEqual(s.heroHole,['Ac','Qd']);assert.equal(p.handSegment,'H01');}
 else{assert.equal(s.heroSeat,'BB');assert.deepEqual(s.heroHole,['As','Kd']);assert.equal(p.handSegment,'H02');assert.ok(f.notice.includes('另一手牌')&&f.notice.includes('SB换到BB'));}
 if(i<15||i===17){assert.equal(s.opponentHoleVisible,false);assert.equal(Object.hasOwn(s,'opponentHole'),false);assert.equal(p.actualOpponentCards,'hidden');}
 if(i===15||i===16){assert.equal(s.opponentHoleVisible,true);assert.equal(s.opponentSeat,'BTN');assert.deepEqual(s.opponentHole,['Ad','Js']);}
 if(i===17){assert.equal(Object.hasOwn(s,'actor'),false);assert.equal(Object.hasOwn(p,'actingSeat'),false);assert.equal(p.actingSeatHiddenForThisTask,true);assert.equal(f.navigationLabel,null);}
 else assert.equal(p.actingSeat,s.actor);
 return {frame:f.id,viewerSeat:p.viewerSeat,ownCards:s.heroHole,taskKind:p.taskKind,actualOpponentCards:p.actualOpponentCards,actingSeatShown:Object.hasOwn(s,'actor'),selectsOpponentPolicy:false,independentStrategyGrading:false};
});
for(const id of ['S07','S11']){const f=teacher.frames.find(f=>f.id===id);assert.equal(f.state.actor,'BTN');assert.ok(f.perspective.taskKind.startsWith('observe_opponent'));}
for(const id of ['S02','S06','S10']){const f=teacher.frames.find(f=>f.id===id);assert.equal(f.state.actor,'SB');assert.equal(f.perspective.taskKind,'execute_given_own_amount');}
assert.equal(teacher.frames.find(f=>f.id==='S14').perspective.taskKind,'wait_for_opponent');
assert.ok(teacher.answers.every(a=>a.strategicGrading!==true));
const switches=route.switches.map(s=>{
 assert.ok(s.beforePerspective&&s.afterPerspective&&s.userNotice);assert.equal(s.originalPokerActionReplayed,false);
 if(s.kind==='response_model_change')assert.deepEqual(s.beforePerspective,s.afterPerspective);
 else assert.ok(s.userNotice.includes(s.afterPerspective.viewerSeat)&&s.userNotice.includes('手牌'));
 return {from:s.from,to:s.to,kind:s.kind,before:s.beforePerspective,after:s.afterPerspective,seatChanged:s.beforePerspective.viewerSeat!==s.afterPerspective.viewerSeat,userNotice:s.userNotice};
});
assert.equal(switches.length,11);
const sources=['first-hand-lesson-packet.json','first-hand-lesson-prompts.json','guided-course-itinerary.json'];
const output={status:'first_pass_perspective_and_declared_entry_checks_not_UI_or_learner_validation',sourceHashes:Object.fromEntries(sources.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(dir+f)).digest('hex')])),
 checks:{firstPassFrames:18,originalHandFramesWithFixedSB:17,explicitNewHandChanges:1,opponentAmountObservationFrames:2,givenOwnAmountFrames:3,opponentCardsHiddenBeforeS16:true,S18ActorAnswerStillHidden:true,declaredEpisodeSwitches:11,episodeSeatChanges:switches.filter(s=>s.seatChanged).length},
 rows,switches,limits:['Only the18 first-pass frames and11 declared episode entries were audited here.','Full internal episode information flow and future UI display still require validation.','A hidden check answer is intentional; removing the actor from the problem does not remove it from the underlying poker world.','All materials are public and answer-bearing in places, not a frozen unseen examination.','No real beginner trial or new strategy reference.'],appChanged:false,learnerTrials:0};
fs.writeFileSync(dir+'first-pass-perspective-evidence.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,...output.checks}));
