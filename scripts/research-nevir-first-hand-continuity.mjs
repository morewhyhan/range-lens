import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir='research/nevir-system/';
const packet=JSON.parse(fs.readFileSync(dir+'first-hand-lesson-packet.json','utf8'));
const candidate=JSON.parse(fs.readFileSync(dir+'first-hand-lesson-v3-candidate.json','utf8'));
const range=JSON.parse(fs.readFileSync(dir+'a72-range-handoff-candidate.json','utf8'));
const byId=Object.fromEntries(packet.frames.map(x=>[x.id,x]));
const sequence=candidate.sequence;
const rParent=byId.S04;
assert.equal(sequence.length,19);
assert.deepEqual(sequence,['S01','S02','S03','S04','R01','S05','S06','S07','S08','S09','S10','S11','S12','S13','S14','S15','S16','S17','S18']);
const r01={
  id:'R01',
  title:'范围事实：先划掉实体冲突',
  state:JSON.parse(JSON.stringify(rParent.state)),
  task:range.task,
  perspective:{handSegment:'H01',viewerSeat:'SB',actingSeat:'SB',ownCardOwner:'SB',taskKind:'physical_range_filter',selectsOpponentPolicy:false,gradesIndependentStrategy:false,actualOpponentCards:'hidden'},
  parent:'p3_range',
  navigationLabel:'range.physical_filter',
  afterAnswer:{nextFrame:'S05',ledgerEvents:[]},
  answerIdentity:'physical_fact',
  returnTo:'p4_compare'
};
const frames=sequence.map(id=>{
 if(id==='R01')return r01;
 const frame=JSON.parse(JSON.stringify(byId[id]));
 if(id==='S04')frame.afterAnswer.nextFrame='R01';
 return frame;
});
assert.equal(frames.filter(Boolean).length,19);
for(let i=0;i<frames.length-1;i++)assert.equal(frames[i].afterAnswer?.nextFrame,frames[i+1].id,`next mismatch ${frames[i].id}`);
assert.equal(frames.at(-1).afterAnswer?.nextFrame,undefined);
const primary=frames.filter(f=>f.id!=='S18');
const stateRequired=['street','board','potBB','stacksBB','heroSeat','actor','history'];
for(const frame of primary){
 assert.ok(frame.state,`missing state ${frame.id}`);
 for(const key of stateRequired)assert.ok(frame.state[key]!==undefined,`missing ${key} ${frame.id}`);
 assert.ok(frame.task&&frame.perspective,`missing task/perspective ${frame.id}`);
}
assert.equal(r01.state.street,rParent.state.street);
assert.deepEqual(r01.state.board,rParent.state.board);
assert.deepEqual(r01.state.history,rParent.state.history);
assert.equal(r01.state.potBB,rParent.state.potBB);
assert.deepEqual(r01.state.stacksBB,rParent.state.stacksBB);
assert.equal(r01.parent,'p3_range');
assert.equal(r01.answerIdentity,'physical_fact');
assert.equal(r01.afterAnswer.nextFrame,'S05');
const main=frames.filter(f=>f.id!=='S18');
const boardLengths=main.map(f=>f.state.board.length);
for(let i=1;i<boardLengths.length;i++)assert.ok(boardLengths[i]>=boardLengths[i-1],`board regressed ${main[i-1].id}->${main[i].id}`);
const historyLengths=main.map(f=>f.state.history.length);
for(let i=1;i<historyLengths.length;i++)assert.ok(historyLengths[i]>=historyLengths[i-1],`history regressed ${main[i-1].id}->${main[i].id}`);
const pots=main.map(f=>f.state.potBB);
for(let i=1;i<pots.length;i++){
 if(main[i].id==='S17')continue; // settlement is the only intentional pot reset
 assert.ok(pots[i]>=pots[i-1],`pot regressed ${main[i-1].id}->${main[i].id}`);
}
const heroHoles=main.map(f=>JSON.stringify(f.state.heroHole));
assert.equal(new Set(heroHoles).size,1);
assert.deepEqual(candidate.parentCoverage,{p1_context:['S03','S12'],p2_board:['S04'],p3_range:['R01'],p4_compare:['S05','S09','S13'],p5_execute:['S06','S10'],p6_update:['S07','S08','S11','S14'],p7_close:['S15','S16','S17']});
const parentCoverage=candidate.parentCoverage;
assert.equal(Object.keys(parentCoverage).length,7);
for(const [parent,ids] of Object.entries(parentCoverage))for(const id of ids)assert.ok(sequence.includes(id),`${parent} missing ${id}`);
assert.equal(frames.at(-1).id,'S18');
assert.notEqual(frames.at(-1).state.heroSeat,main.at(-1).state.heroSeat);
const output={
 id:'FIRST_HAND_CONTINUITY_AUDIT_V1',
 status:'paper_continuity_audited_not_runtime',
 sourceFiles:['first-hand-lesson-packet.json','first-hand-lesson-v3-candidate.json','a72-range-handoff-candidate.json'],
 sequence,
 primaryHandSequence:sequence.filter(x=>x!=='S18'),
 reviewFrame:'S18',
 counts:{totalFrames:19,primaryHandFrames:18,insertedFactFrames:1,reviewFrames:1,uniqueFrames:new Set(sequence).size},
 parentCoverage,
 continuityChecks:{nextPointers:true,requiredStateFields:true,insertedRangeFrameInheritsS04:true,boardNeverRegresses:true,historyNeverRegresses:true,potNeverRegressesExceptSettlement:true,heroHoleStable:true,reviewFrameExplicitlyResets:true},
 insertedFrame:{id:'R01',parent:'p3_range',answerIdentity:'physical_fact',returnsTo:'p4_compare',strategyReferenceRequired:true,actionFilterAvailable:false},
 currentEvidence:{paperContinuity:true,runtimeAttached:false,completeSuccessorClosure:false,matchedStrategyReference:false,learnerTrial:false,NL50Evidence:false},
 releaseRules:{continuityAuditDoesNotProveStrategy:true,missingSuccessorBlocksContinuousLesson:true,physicalFactDoesNotProveActionFilter:true,reviewFrameIsNotMainHandSuccessor:true}
};
fs.writeFileSync(dir+'first-hand-continuity-audit.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,status:output.status,totalFrames:output.counts.totalFrames,primaryHandFrames:output.counts.primaryHandFrames,parentLayers:Object.keys(parentCoverage).length,learnerTrial:output.currentEvidence.learnerTrial}));
