import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const dir='research/nevir-system/';
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fileHash=p=>crypto.createHash('sha256').update(fs.readFileSync(dir+p)).digest('hex');
const files={bluff:'guided-bluff-reraise-sequence-packet.json',weakLead:'guided-weak-lead-sequence-packet.json',protection:'guided-protection-sequence-packet.json',madeDraw:'guided-made-draw-sequence-packet.json',outer:'first-hand-lesson-packet.json',size:'guided-size-sequence-packet.json',update:'guided-update-sequence-packet.json',history:'guided-history-sequence-packet.json',value:'guided-value-sequence-packet.json',reraise:'guided-reraise-sequence-packet.json',draw:'guided-draw-sequence-packet.json',semibluff:'guided-semibluff-sequence-packet.json'};
const packets=Object.fromEntries(Object.entries(files).map(([id,p])=>[id,JSON.parse(fs.readFileSync(dir+p,'utf8'))]));
const frame=(id,key)=>{const f=packets[id].frames.find(f=>f.id===key);assert.ok(f,`${id}/${key}`);return f;};
const core=id=>packets[id].navigation?.core??packets[id].frames.map(f=>f.id);
assert.deepEqual(core('outer'),Array.from({length:18},(_,i)=>`S${String(i+1).padStart(2,'0')}`));
const visits=[],stack=[],returns=[],switches=[];
const counts={firstPass:0,reviewCore:0,optional:0};
let maxDepth=0;
function snapshot(id,key){
  const p=packets[id];
  return {packet:files[id],sourceFileHash:fileHash(files[id]),frame:structuredClone(frame(id,key)),
    answer:structuredClone(p.answers.find(a=>a.id===key)),
    referenceContext:structuredClone(Object.fromEntries(Object.entries(p).filter(([k])=>!['frames','answers','returnState','returnFrame'].includes(k)))),
    surface:'review_feedback',firstAnswer:'not_collected_author_walkthrough',exposure:'already_seen_public_material'};
}
function show(id,key,kind){
  const f=frame(id,key);assert.ok(packets[id].answers.find(a=>a.id===key));
  counts[kind]++;
  visits.push({event:'show_one_frame',packet:files[id],frame:key,kind,depth:stack.length,
    stateHash:hash(f.state),hasAnswerHelp:Object.keys(f.given??{}).length>0,learnerResponseCollected:false});
}
function ownPerspective(id,key){
  const p=packets[id],f=frame(id,key);
  const source=p.modelInput?.source?JSON.parse(fs.readFileSync(dir+p.modelInput.source,'utf8')):null;
  const context=p.context??p.modelInput?.context??source?.context??{};
  const viewerSeat=f.state.heroSeat??context.heroSeat;
  const ownCards=f.state.heroHole??f.state.hero??f.state.hole??context.heroHole??context.hero;
  assert.ok(viewerSeat&&Array.isArray(ownCards)&&ownCards.length===2,'Unresolved learner perspective '+id+'/'+key);
  return {viewerSeat,ownCards:[...ownCards],board:[...(f.state.board??context.board)]};
}
const showOwnCards=cards=>cards.map(c=>(c[0]==='T'?'10':c[0])+({s:'♠',h:'♥',d:'♦',c:'♣'}[c[1]])).join(' ');
function enter(parentId,parentFrame,childId){
  const p=packets[childId].parentLink;
  assert.equal(p.frame,parentFrame);
  // Some existing children name the public prompt file; full teacher frame is preserved here.
  assert.ok(p.source===files[parentId]||p.source===files[parentId].replace('-packet.json','-prompts.json'));
  const s=snapshot(parentId,parentFrame);stack.push(s);maxDepth=Math.max(maxDepth,stack.length);
  const beforePerspective=ownPerspective(parentId,parentFrame),afterPerspective=ownPerspective(childId,core(childId)[0]);
  const sameHandResponse=['reraise','semibluff'].includes(childId);
  if(sameHandResponse)assert.deepEqual(beforePerspective,afterPerspective);
  const seatNotice=beforePerspective.viewerSeat===afterPerspective.viewerSeat?`仍坐${afterPerspective.viewerSeat}`:`从${beforePerspective.viewerSeat}换到${afterPerspective.viewerSeat}`;
  switches.push({from:`${parentId}/${parentFrame}`,to:childId,notice:p.notice,beforePerspective,afterPerspective,
    userNotice:sameHandResponse?`仍坐${afterPerspective.viewerSeat}，手牌不变；换一种明确给定的对手回应，原例不改。`:`换另一手：你${seatNotice}，手牌是${showOwnCards(afterPerspective.ownCards)}。完成后回原题。`,
    parentHash:hash(s),originalPokerActionReplayed:false,kind:['reraise','semibluff'].includes(childId)?'response_model_change':'different_hand'});
  visits.push({event:'enter_teaching_comparison',child:childId,depth:stack.length});
  return hash(s);
}
function leave(expectedHash){
  const s=stack.pop();assert.ok(s);assert.equal(hash(s),expectedHash);
  assert.deepEqual(s,snapshot(Object.keys(files).find(k=>files[k]===s.packet),s.frame.id));
  returns.push({packet:s.packet,frame:s.frame.id,parentHash:expectedHash,returnHash:hash(s),wholeFrameAndReferenceRestored:true,
    surface:'review_feedback',alreadySeen:true,originalPokerActionReplayed:false,firstAnswerReopened:false});
  visits.push({event:'return_to_review_feedback',packet:s.packet,frame:s.frame.id,depth:stack.length});
}

// The first complete pass contains no automatic jumps into any deeper episode.
for(const key of core('outer'))show('outer',key,'firstPass');
assert.equal(stack.length,0);assert.equal(counts.firstPass,18);
visits.push({event:'first_pass_finished_before_any_deepening',source:'outer',gradedAsFullStrategy:false});

function episode(parentKey,id,after){
  visits.push({event:'select_completed_hand_review_anchor',frame:parentKey,pokerHistoryMutation:false});
  const h=enter('outer',parentKey,id);
  for(const key of core(id))show(id,key,'reviewCore');
  after?.();leave(h);
}
episode('S05','size',()=>{
  visits.push({event:'select_completed_size_episode_review_anchor',frame:'B09',after:'B14',pokerHistoryMutation:false});
  const h=enter('size','B09','protection');for(const key of core('protection'))show('protection',key,'reviewCore');leave(h);
  const weakHash=enter('size','B09','weakLead');for(const key of core('weakLead'))show('weakLead',key,'reviewCore');leave(weakHash);
  visits.push({event:'close_size_review',from:'B09',replayB10ToB14:false});
});
episode('S08','update');
episode('S09','history');
episode('S13','value',()=>{
  visits.push({event:'select_completed_value_episode_review_anchor',frame:'V07',after:'V16',pokerHistoryMutation:false});
  const h=enter('value','V07','reraise');for(const key of core('reraise'))show('reraise',key,'reviewCore');leave(h);
  visits.push({event:'close_value_review',from:'V07',replayV08ToV16:false});
});
episode('S13','bluff');
episode('S18','draw',()=>{
  visits.push({event:'select_completed_draw_episode_review_anchor',frame:'D06',after:'D16',pokerHistoryMutation:false});
  const madeHash=enter('draw','D06','madeDraw');for(const key of core('madeDraw'))show('madeDraw',key,'reviewCore');leave(madeHash);
  visits.push({event:'select_completed_draw_episode_review_anchor',frame:'D13',after:'D16',pokerHistoryMutation:false});
  const h=enter('draw','D13','semibluff');for(const key of core('semibluff'))show('semibluff',key,'reviewCore');leave(h);
  visits.push({event:'close_draw_review',from:'D13',replayD14ToD16:false});
});
assert.equal(stack.length,0);assert.equal(returns.length,11);assert.equal(counts.reviewCore,169);assert.equal(maxDepth,2);
// Author-only optional path contracts: no insertion into the default route.
const optional=[];
for(const id of ['size','protection','weakLead','update','history','reraise','bluff'])for(const block of packets[id].navigation.optional){
  assert.ok(core(id).includes(block.openAt));assert.equal(block.returnTo,block.openAt);
  const original=snapshot(id,block.openAt),h=hash(original);
  const extra=block.frames.map(key=>{assert.ok(!core(id).includes(key));return frame(id,key);});
  const restored=structuredClone(original);assert.equal(hash(restored),h);
  optional.push({packet:files[id],...block,parentHash:h,returnHash:hash(restored),wholeFrameAndReferenceRestored:true,
    optionalFrames:extra.map(f=>f.id),firstAnswerReopened:false,defaultRouteIncludesTheseFrames:false});
}
assert.equal(optional.reduce((n,b)=>n+b.optionalFrames.length,0),36);
// Existing child return states must match their declared original anchor, independently of navigation.
for(const id of ['update','value','draw'])assert.deepEqual(packets[id].returnState,frame('outer',packets[id].parentLink.frame).state);
assert.deepEqual(packets.reraise.returnFrame,frame('value','V07'));
assert.deepEqual(packets.size.returnFrame,frame('outer','S05'));
assert.deepEqual(packets.history.returnFrame,frame('outer','S09'));
assert.deepEqual(packets.semibluff.returnFrame,frame('draw','D13'));
assert.deepEqual(packets.madeDraw.returnFrame,frame('draw','D06'));
assert.deepEqual(packets.protection.returnFrame,frame('size','B09'));
assert.deepEqual(packets.weakLead.returnFrame,frame('size','B09'));
assert.deepEqual(packets.bluff.returnFrame,frame('outer','S13'));
const out={status:'author_itinerary_assembly_not_UI_or_learner_trial',sources:Object.fromEntries(Object.entries(files).map(([id,p])=>[id,{file:p,sha256:fileHash(p)}])),
  firstPass:{frames:core('outer'),deepEpisodesAutomaticallyOpened:0,scope:'17 frames of the original hand and S18 explicitly another short structure case; not 18 independent strategy decisions.'},
  reviewOrder:[{anchor:'S05',episode:'size',defaultFrames:14,nestedReviewsAfterEpisode:[{anchor:'B09',episode:'protection',defaultFrames:17},{anchor:'B09',episode:'weakLead',defaultFrames:17}]},{anchor:'S08',episode:'update',defaultFrames:11},{anchor:'S09',episode:'history',defaultFrames:14},{anchor:'S13',episode:'value',defaultFrames:16,nestedReviewAfterEpisode:{anchor:'V07',episode:'reraise',defaultFrames:13}},{anchor:'S13',episode:'bluff',defaultFrames:21},{anchor:'S18',episode:'draw',defaultFrames:16,nestedReviewsAfterEpisode:[{anchor:'D06',episode:'madeDraw',defaultFrames:14},{anchor:'D13',episode:'semibluff',defaultFrames:16}]}],
  counts,maxNestedComparisonFramesOnStack:maxDepth,visits,switches,returns,optional,
  rules:{oneFrameAtATime:true,reviewDoesNotReplayActualHand:true,answerHelpDoesNotBecomeIndependent:true,noLearnerScoresSynthesized:true,persistence:'none',continueOrExitAllowed:true},
  readiness:{firstPassStructuralPaperCandidate:true,completeOriginalStrategyLesson:false,all35TeachingSequencesComplete:false,unseenAssessmentReady:false,realLearnerVerified:false,NL50Verified:false},
  remaining:['Complete matched strategy inputs for the original hand.','Sequential teaching and counterexamples for remaining abilities beyond these eleven episodes.','Prepared unseen checks with reference and no exposed isomorphic neighbors.','Real novice administration and revision; application implementation only when authorized.']};
fs.writeFileSync(dir+'guided-course-itinerary.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,counts,maxNestedComparisonFramesOnStack:maxDepth,wholeParentReturns:returns.length,optionalBlocks:optional.length,status:out.status},null,2));
