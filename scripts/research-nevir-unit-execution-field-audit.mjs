import fs from 'node:fs';
import crypto from 'node:crypto';

const dir='research/nevir-system/';
const readiness=JSON.parse(fs.readFileSync(dir+'learning-unit-readiness.json','utf8'));
const release=JSON.parse(fs.readFileSync(dir+'curriculum-release-contract.json','utf8'));
const requiredFields=['unitId','parentFrame','street','role','actionState','sourceIdentity','factInputs','coursePolicy','referencePolicy','rangeBefore','rangeAfter','legalSuccessors','question','explanation','errorReturn','transferVariant','releaseStatus'];
const groupByUnit=new Map();
for(const group of release.unitGroups)for(const id of group.units)groupByUnit.set(id,{groupId:group.id,routeStop:group.routeStop,actionStateClass:{'compare.unopened':'unopened','compare.bet':'facing_bet','compare.raise':'facing_raise','update.response':'response_update','update.card':'new_card_update'}[group.id]||'unknown'});
function readEvidence(name){try{return JSON.parse(fs.readFileSync(dir+name,'utf8'));}catch{return null;}}
function firstObject(...xs){return xs.find(x=>x&&typeof x==='object')||null;}
function inferScopedIdentity(name){
  const e=readiness.units.find(u=>u.evidence===name); // only used for stable lookup below
  const j=readEvidence(name);if(!j)return {street:null,heroSeat:null,villainSeat:null,roleEvidence:null,sourceScope:'unavailable'};
  const candidates=[j.context,j.scenario,j.state,j.current,j.start,j.frames?.[0]?.state,j.cases?.[0]?.state].filter(Boolean);
  const c=firstObject(...candidates)||{};
  const board=c.board||c.state?.board||j.board||j.scenario?.board||null;
  const street=c.street||j.street||(Array.isArray(board)?({3:'flop',4:'turn',5:'river'}[board.length]||null):null);
  const heroSeat=c.heroSeat||j.heroSeat||null,villainSeat=c.villainSeat||j.villainSeat||null;
  const history=JSON.stringify([c.history,c.legalGrossHistory,c.observedAuthorHistory,c.preflop,j.history,j.observedAuthorHistory]).toLowerCase();
  let roleEvidence=null;
  if(heroSeat==='SB' && /btn.*open/.test(history) && /sb.*rais/.test(history))roleEvidence='preflop_raiser';
  else if(heroSeat==='BTN' && /btn.*open/.test(history) && /sb.*rais/.test(history) && /btn.*call/.test(history))roleEvidence='preflop_caller';
  else if(heroSeat==='BB' && /btn.*open/.test(history) && /bb.*call/.test(history))roleEvidence='blind_defender';
  else if(heroSeat==='BTN' && /btn.*open/.test(history) && /bb.*call/.test(history))roleEvidence='preflop_raiser';
  else if(typeof j.priorChart==='string' && j.priorChart.toLowerCase().startsWith('bb-'))roleEvidence='blind_defender';
  const historyValue=c.history||c.legalGrossHistory||c.observedAuthorHistory||c.preflop||j.history||j.observedAuthorHistory||null;
  const gameFrameCandidate={
    street:street||null,
    heroSeat:heroSeat||null,
    villainSeat:villainSeat||null,
    board:Array.isArray(board)?board:null,
    history:historyValue,
    potBB:c.potBB??c.state?.potIncludingBetBB??c.start?.pot??null,
    stacksBB:c.stacksBB||((c.heroStackBB!==undefined||c.villainStackBB!==undefined)?{hero:c.heroStackBB??null,villain:c.villainStackBB??null}:null),
    toCallBB:c.toCallBB??c.state?.toCallBB??c.current?.toCall??null,
    scope:(street||heroSeat||villainSeat)?'source_local_context':'unavailable',
    strategyReady:false
  };
  return {street,heroSeat,villainSeat,roleEvidence,sourceScope:gameFrameCandidate.scope,gameFrameCandidate};
}
const units=readiness.units.map(u=>{
  const knownIdentity=groupByUnit.get(u.id)||{groupId:null,routeStop:null,actionStateClass:'unknown'};
  const scopedIdentity=inferScopedIdentity(u.evidence);
  const fields={
    unitId:'present',
    parentFrame:u.parent?'present':'missing',
    street:'missing',
    role:'missing',
    actionState:'missing',
    sourceIdentity:u.localMaterial&&u.evidence?'present':'missing',
    factInputs:u.prerequisite&&u.firstOperation?'present':'partial',
    coursePolicy:'missing',
    referencePolicy:u.fullMatchingTargetPolicyVerified?'present':'missing',
    rangeBefore:'missing',
    rangeAfter:'missing',
    legalSuccessors:'missing',
    question:u.firstOperation?'present':'missing',
    explanation:'missing',
    errorReturn:u.returnRule?'present':'missing',
    transferVariant:'missing',
    releaseStatus:'missing'
  };
  return {id:u.id,parent:u.parent,label:u.label,knownIdentity,sourceScopedIdentity:scopedIdentity,fields,sourceEvidence:u.evidence||null,localMaterial:u.localMaterial||null,gap:u.gap||null};
});
const counts={};
for(const field of requiredFields){counts[field]={present:0,partial:0,missing:0};for(const u of units)counts[field][u.fields[field]]++;}
const output={
  status:'audit_only_not_release_evidence',
  source:'learning-unit-readiness.json',
  sourceHash:crypto.createHash('sha256').update(fs.readFileSync(dir+'learning-unit-readiness.json')).digest('hex'),
  requiredFields,
  unitCount:units.length,
  allUnitsListed:units.length===35,
  knownIdentityCoverage:{groupId:units.filter(u=>u.knownIdentity.groupId).length,routeStop:units.filter(u=>u.knownIdentity.routeStop).length,actionStateClass:units.filter(u=>u.knownIdentity.actionStateClass!=='unknown').length,street:0,role:0},
  sourceScopedIdentityCoverage:{street:units.filter(u=>u.sourceScopedIdentity.street).length,positionPair:units.filter(u=>u.sourceScopedIdentity.heroSeat&&u.sourceScopedIdentity.villainSeat).length,roleEvidence:units.filter(u=>u.sourceScopedIdentity.roleEvidence).length,gameFrameCandidate:units.filter(u=>u.sourceScopedIdentity.gameFrameCandidate.scope==='source_local_context').length},
  units,
  fieldCounts:counts,
  releaseInterpretation:{
    completeExecutionFieldSet:false,
    all35ContinuousReady:false,
    missingFieldBlocksExactStrategy:['street','role','actionState','coursePolicy','referencePolicy','rangeBefore','rangeAfter','legalSuccessors','explanation','transferVariant','releaseStatus'],
    localMaterialDoesNotFillMissingField:true,
    noUnknownsWereInvented:true
  },
  nextWork:['attach street role and action state to every unit','attach declared course policy and matched reference identity','attach fixed-denominator range snapshots before and after actions','attach legal successors or explicit stop reasons','attach unseen transfer slot and release status'],
  learnerTrial:false,
  NL50Evidence:false
};
fs.writeFileSync(dir+'unit-execution-field-audit.json',JSON.stringify(output,null,2)+'\n');
const scopedBundle={
  id:'SOURCE_SCOPED_UNIT_GAMEFRAMES_V1',
  status:'fact_candidate_bundle_not_strategy_ready',
  source:'unit-execution-field-audit.json',
  releaseIdentity:'independent_fact_candidate',
  strategyReady:false,
  rows:units.filter(u=>u.sourceScopedIdentity.gameFrameCandidate.scope==='source_local_context').map(u=>({
    unitId:u.id,
    parentFrame:u.parent,
    groupId:u.knownIdentity.groupId,
    routeStop:u.knownIdentity.routeStop,
    sourceEvidence:u.sourceEvidence,
    gameFrame:u.sourceScopedIdentity.gameFrameCandidate,
    rangeBefore:null,
    rangeAfter:null,
    legalSuccessors:[],
    stopReason:'no_complete_range_or_successor_reference',
    strategyReady:false
  })),
  guards:{
    noRangeInvented:true,
    noSuccessorInvented:true,
    localContextDoesNotImplyCoursePolicy:true,
    localContextDoesNotImplyNL50:true
  },
  currentEvidence:{matchedReference:false,coursePolicy:false,learnerTrial:false,NL50Evidence:false}
};
fs.writeFileSync(dir+'source-scoped-unit-gameframes.json',JSON.stringify(scopedBundle,null,2)+'\n');
console.log(JSON.stringify({ok:true,unitCount:output.unitCount,allUnitsListed:output.allUnitsListed,fieldCounts:output.fieldCounts,status:output.status}));
