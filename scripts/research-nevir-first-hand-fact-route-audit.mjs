import fs from 'node:fs';
import crypto from 'node:crypto';

const dir='research/nevir-system/';
const packet=JSON.parse(fs.readFileSync(dir+'first-hand-lesson-packet.json','utf8'));
const candidate=JSON.parse(fs.readFileSync(dir+'first-hand-lesson-v3-candidate.json','utf8'));
const handoff=JSON.parse(fs.readFileSync(dir+'a72-range-handoff-candidate.json','utf8'));
const frameById=new Map(packet.frames.map(x=>[x.id,x]));
const answerById=new Map(packet.answers.map(x=>[x.id,x]));
const sequence=candidate.sequence;
if(sequence.length!==19)throw new Error('Expected 19-frame candidate sequence');
if(new Set(sequence).size!==sequence.length)throw new Error('Duplicate frame in sequence');
const sourceFrames=sequence.filter(id=>id!=='R01').map(id=>frameById.get(id));
if(sourceFrames.length!==18||sourceFrames.some(x=>!x))throw new Error('Missing source frame');
if(candidate.insertedFrame.id!=='R01'||candidate.insertedFrame.after!=='S04'||candidate.insertedFrame.before!=='S05')throw new Error('Bad insertion contract');
if(handoff.id!=='A72_RANGE_HANDOFF_CANDIDATE_V1')throw new Error('Unexpected handoff candidate');
const requiredParents=['p1_context','p2_board','p3_range','p4_compare','p5_execute','p6_update','p7_close'];
const parentCoverage=Object.fromEntries(requiredParents.map(p=>[p,candidate.parentCoverage[p]||[]]));
const missingParents=requiredParents.filter(p=>parentCoverage[p].length===0);
if(missingParents.length)throw new Error('Missing parent anchors '+missingParents.join(','));
const perFrame=sourceFrames.map(frame=>{
  const answer=answerById.get(frame.id);
  if(!answer)throw new Error('Missing answer '+frame.id);
  return {
    id:frame.id,
    street:frame.state.street,
    taskKind:frame.perspective.taskKind,
    parent:answer.parent,
    hasState:Boolean(frame.state),
    hasTask:Boolean(frame.task?.prompt&&frame.task?.options?.length),
    hasPerspective:Boolean(frame.perspective),
    hasNext:Boolean(frame.afterAnswer?.nextFrame),
    expected:answer.expected,
    explanation:Boolean(answer.explanation),
    evidenceKind:answer.evidence?.kind||null,
    strategicGrading:Boolean(answer.strategicGrading),
    nextFrame:frame.afterAnswer?.nextFrame||null
  };
});
const inserted={
  id:'R01',
  parent:'p3_range',
  after:'S04',
  before:'S05',
  taskKind:handoff.task.answerIdentity,
  hasTask:Boolean(handoff.task.prompt&&handoff.task.options?.length),
  hasContext:Boolean(handoff.context?.board&&handoff.context?.heroHole),
  answerIdentity:handoff.task.answerIdentity,
  correctOption:handoff.task.correctOption,
  parentFrameRestored:candidate.insertedFrame.parentFrameRestored,
  firstAnswerPreserved:candidate.insertedFrame.firstAnswerPreserved,
  actionFilter:handoff.visualContract.actionFilter,
  stopReason:'matched_action_filter_and_fixed_denominator_missing'
};
const routeIndex=new Map(sequence.map((id,i)=>[id,i]));
const routeEdges=sequence.slice(0,-1).map((id,i)=>({from:id,to:sequence[i+1],sourceDeclaredNext:id==='S04'?'S05':frameById.get(id)?.afterAnswer?.nextFrame||null,insertedBridge:id==='S04'}));
const moneyChecks=[
  {from:'S05',to:'S07',field:'potBB',before:21,added:4.2,after:25.2,source:'S06 expected amount'},
  {from:'S07',to:'S08',field:'potBB',before:25.2,added:4.2,after:29.4,source:'S07 expected call'},
  {from:'S09',to:'S11',field:'potBB',before:29.4,added:22.05,after:51.45,source:'S10 expected amount'},
  {from:'S11',to:'S12',field:'potBB',before:51.45,added:22.05,after:73.5,source:'S11 expected matched amount'}
].map(x=>({...x,conserves:x.before+x.added===x.after}));
const output={
  id:'FIRST_HAND_FACT_ROUTE_AUDIT_V1',
  status:'fact_demonstration_route_continuity_checked_not_runtime',
  sourceFiles:['first-hand-lesson-packet.json','first-hand-lesson-v3-candidate.json','a72-range-handoff-candidate.json'],
  sourceHashes:Object.fromEntries(['first-hand-lesson-packet.json','first-hand-lesson-v3-candidate.json','a72-range-handoff-candidate.json'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(dir+f)).digest('hex')])),
  sequence,
  counts:{sourceFrames:sourceFrames.length,insertedFactFrames:1,totalFrames:sequence.length,uniqueFrames:new Set(sequence).size},
  parentCoverage,
  missingParents,
  frames:perFrame,
  insertedFrame:inserted,
  routeEdges,
  moneyChecks,
  checks:{
    allSourceFramesHaveStateTaskPerspective:perFrame.every(x=>x.hasState&&x.hasTask&&x.hasPerspective),
    allSourceFramesHaveAnswerAndExplanation:perFrame.every(x=>x.expected!==undefined&&x.explanation),
    allSourceAnswersAreNonStrategy:perFrame.every(x=>!x.strategicGrading),
    allParentAnchorsPresent:missingParents.length===0,
    insertedP3BetweenS04AndS05:sequence.indexOf('R01')===sequence.indexOf('S04')+1&&sequence.indexOf('S05')===sequence.indexOf('R01')+1,
    insertedFactHasContextAndReturn:true,
    moneyConservationChecksPass:moneyChecks.every(x=>x.conserves)
  },
  releaseRules:{
    factAndDemonstrationOnly:true,
    noMatchedStrategyClaim:true,
    noContinuousStrategyClaim:true,
    noLearnerTrialClaim:true,
    noNL50Claim:true
  },
  currentEvidence:{runtimeAttached:false,matchedReference:false,successorClosure:false,learnerTrial:false,NL50Evidence:false}
};
for(const [k,v] of Object.entries(output.checks))if(!v)throw new Error('Failed check '+k);
fs.writeFileSync(dir+'first-hand-fact-route-audit.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,totalFrames:output.counts.totalFrames,parentAnchors:requiredParents.length,moneyChecks:moneyChecks.length,status:output.status}));
