import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const dir='research/nevir-system/',load=f=>JSON.parse(fs.readFileSync(dir+f));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),file=f=>sha(fs.readFileSync(f));
const p=load('qqq-range-lesson-packet.json'),q=load('qqq-range-lesson-prompts.json'),t=load('qqq-range-lesson-teacher.json'),review=load('qqq-range-image-review.json');
const source=load('sb-bb-qqq-reload-export.json'),request=load('reference-request-sb-bb-qqq.json'),views=load('sb-bb-qqq-range-views.json');
assert.equal(p.source.sha256,file(dir+'sb-bb-qqq-reload-export.json'));assert.equal(p.source.engineTargetReached,false);
assert.equal(p.frames.length,4);assert.equal(q.questions.length,3);assert.equal(p.strategicActionQuestions,0);assert.equal(p.defaultInsertions,0);
const same=(a,b)=>assert.ok(Math.abs(a-b)<3e-5*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const cards=h=>h.match(/.{2}/g),key=h=>h.slice().sort().join('');
let classChecks=0,weightChecks=0;
for(const [index,f]of p.frames.entries()){
 const known=index===0?f.board:[...f.board,...f.hero];assert.equal(new Set(known).size,known.length);
 assert.equal(f.rangeOwner,'BB');assert.equal(f.viewer,'SB');assert.equal(f.answerBearingDemonstration,true);
 assert.equal(f.matrix.length,169);assert.equal(f.sourceQualityTargetReached,false);
 const src=source.nodes.find(n=>n.id===f.sourceNode);assert.ok(src);
 // Check displayed money against exported cumulative investments, not handwritten captions.
 same(f.state.potBB,6+(src.totalBetAmount[0]+src.totalBetAmount[1])/100);
 same(f.state.SBStackBB,97-src.totalBetAmount[0]/100);same(f.state.BBStackBB,97-src.totalBetAmount[1]/100);
 same(f.state.potBB+f.state.SBStackBB+f.state.BBStackBB+400,600);
 const map=new Map(f.support.map(h=>[key(h.hole),h.weight]));
 for(const [i,h]of src.orderedHands[1].entries()){
  const hole=cards(h),expected=hole.some(c=>known.includes(c))?0:src.rawWeights[1][i];
  same(map.get(key(hole))??0,expected);weightChecks++;
 }
 same(f.support.reduce((s,h)=>s+h.weight,0),f.totalWeight);assert.equal(f.support.length,f.positivePhysicalCombos);
 if(index<=2){
  // Independent rank/suit availability formula checks physical enumeration and initial class weights.
  for(const c of f.matrix){
   const a=c.cell[0],b=c.cell[1],na=4-known.filter(h=>h[0]===a).length,nb=4-known.filter(h=>h[0]===b).length;
   const suited=[...'shdc'].filter(s=>!known.includes(a+s)&&!known.includes(b+s)).length;
   const count=a===b?na*(na-1)/2:c.cell.endsWith('s')?suited:na*nb-suited;
   assert.equal(c.legalPhysicalCombos,count);same(c.mass,count*request.ranges.ip.classWeights[c.cell]);classChecks++;
  }
 }
 if(index>0){
  const view=views.records.find(n=>n.id===f.sourceNode).views.find(v=>v.viewer===0&&v.knownHolding.join('')==='AsKd');assert.ok(view);
  same(f.totalWeight,view.denominator);
  for(const c of f.matrix)same(c.mass,view.matrix.find(x=>x.cell===c.cell).mass);
 }
}
assert.deepEqual(p.frames[1].matrix,p.frames[2].matrix);assert.deepEqual(p.frames.map(f=>f.positivePhysicalCombos),[425,378,378,351]);
same(p.frames[0].totalWeight,361);same(p.frames[1].totalWeight,321);
const parent=load(p.parent.source);assert.equal(file(dir+p.parent.source),p.parent.sourceSHA256);
assert.deepEqual(parent.frames.find(f=>f.id===p.parent.frame),p.parent.snapshot.frame);assert.deepEqual(parent.answers.find(f=>f.id===p.parent.frame),p.parent.snapshot.answer);
assert.equal(sha(JSON.stringify(p.parent.snapshot)),p.parent.snapshotFingerprint);assert.equal(p.parent.snapshotFingerprint,p.parent.restoredFingerprint);
for(const qq of q.questions){
 const answer=t.answers.find(a=>a.id===qq.id);assert.equal(sha(JSON.stringify(qq.body)),answer.inputFingerprint);
 assert.equal(answer.unknownIsWrong,true);assert.equal(answer.actualPokerActionCommitted,false);assert.equal(qq.body.options.filter(o=>o.id==='unknown').length,1);
 assert.ok(!('correct' in qq.body)&&!('expected' in qq.body)&&!('answer' in qq.body));
}
const first=q.questions[0].body;
const incompatible=first.candidates.filter(h=>h.hole.some(c=>[...first.board,...first.hero].includes(c))).map(h=>h.id);
assert.deepEqual(incompatible,[t.answers[0].correct]);
assert.equal(t.answers[1].correct,'keep');
const third=q.questions[2].body;assert.deepEqual(third.given.filter(h=>h.rootWeight*h.callFrequency===0).map(h=>h.id),[t.answers[2].correct]);
assert.equal(review.packetSHA256,file(dir+'qqq-range-lesson-packet.json'));assert.equal(review.rendererSHA256,file('scripts/render-nevir-qqq-range-sequence.ps1'));
for(const img of review.figures){const b=fs.readFileSync(dir+img.file);assert.equal(sha(b),img.sha256);assert.deepEqual([b.readUInt32BE(16),b.readUInt32BE(20)],review.dimensions);assert.equal(img.visuallyOpened,true);}
const sources=['qqq-range-lesson-packet.json','qqq-range-lesson-prompts.json','qqq-range-lesson-teacher.json','qqq-range-image-review.json','sb-bb-qqq-reload-export.json'];
const out={ok:true,status:'author_four_frame_fact_and_given_rule_sequence_verified_not_strategy_or_learning_pass',frames:4,publicFactForms:3,strategicActionQuestions:0,physicalReachWeightsChecked:weightChecks,
 independentRankSuitClassChecks:classChecks,ownActionPrivateRangeUnchanged:true,parent:'S09',maxReturnSnapshots:1,parentFullSnapshotRestored:true,visuallyReviewedFigures:review.figures.length,
 initialAndPrivateWeights:[361,321],postGivenCallWeight:p.frames[3].totalWeight,sourceTargetReached:false,sourceHashes:Object.fromEntries(sources.map(f=>[f,file(dir+f)])),
 appChanged:false,learnerTrials:0,unseenAssessment:false};
fs.writeFileSync(dir+'qqq-range-lesson-verification.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({...out,sourceHashes:undefined}));
