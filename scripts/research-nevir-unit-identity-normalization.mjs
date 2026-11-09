import fs from 'node:fs';

const dir='research/nevir-system/';
const source=JSON.parse(fs.readFileSync(dir+'unit-execution-field-audit.json','utf8'));
const evidenceCache=new Map();
const readEvidence=(name)=>{
  if(!name)return null;
  if(!evidenceCache.has(name)){
    const file=dir+name;
    evidenceCache.set(name,fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null);
  }
  return evidenceCache.get(name);
};
const nonEmpty=(value)=>value!==null&&value!==undefined&&(!(Array.isArray(value))||value.length>0);
const deriveSourceFallback=(unit,evidence)=>{
  if(!evidence)return {values:{},fields:[],reason:'source_file_missing'};
  const id=unit.id;
  const values={};
  const fields=[];
  const put=(key,value,reason)=>{
    if(nonEmpty(value)){values[key]=value;fields.push({field:key,reason});}
  };
  const context=evidence.context||{};
  if(unit.sourceEvidence==='size-comparison-evidence.json'){
    put('heroHole',context.hero,'size-comparison.context.hero');
    put('activeStackBB',context.activeStackBB,'size-comparison.context.activeStackBB is a single active stack, not a two-player stacks map');
  }
  if(unit.sourceEvidence==='value-trap-tree-evidence.json'){
    const start=context.start||{};
    put('heroHole',context.hero,'value-trap.context.hero');
    put('potBB',start.pot,'value-trap.context.start.pot');
    put('stacksBB',{hero:start.heroStack,villain:start.villainStack},'value-trap.context.start.heroStack/villainStack');
  }
  if(unit.sourceEvidence==='defense-tree-evidence.json'){
    const state=context.state||{};
    put('potBB',state.potIncludingBetBB,'defense-tree.context.state.potIncludingBetBB');
    put('stacksBB',{hero:state.heroStackBB,villain:state.villainStackBB},'defense-tree.context.state.heroStackBB/villainStackBB');
  }
  if(unit.sourceEvidence==='made-plus-draw-evidence.json'){
    const root=evidence.root||{};
    put('street',Array.isArray(root.board)?({3:'flop',4:'turn',5:'river'}[root.board.length]||null):null,'made-plus-draw.root.board length');
    put('heroSeat',root.heroSeat,'made-plus-draw.root.heroSeat');
    put('villainSeat',root.villainSeat,'made-plus-draw.root.villainSeat');
    put('board',root.board,'made-plus-draw.root.board');
    put('heroHole',root.hero,'made-plus-draw.root.hero');
    put('potBB',root.potBB,'made-plus-draw.root.potBB');
    put('stacksBB',{hero:root.heroStack,villain:root.villainStack},'made-plus-draw.root.heroStack/villainStack');
    put('role','preflop_raiser','made-plus-draw.context.observedAuthorHistory explicitly says SB raises to 10 and root.heroSeat is SB');
  }
  if(unit.sourceEvidence==='bluff-reraise-model.json'){
    const current=context.current||{};
    put('potBB',current.pot,'bluff-reraise.context.current.pot');
    put('stacksBB',{hero:current.heroStack,villain:current.villainStack},'bluff-reraise.context.current.heroStack/villainStack');
  }
  if(unit.sourceEvidence==='history-contrast-evidence.json'){
    const state=(evidence.paths||[]).find(p=>p.currentState)?.currentState||{};
    put('street',state.board?({3:'flop',4:'turn',5:'river'}[state.board.length]||null):null,'history-contrast.paths[].currentState.board length');
    put('board',state.board,'history-contrast.paths[].currentState.board');
    put('potBB',state.potBB,'history-contrast.paths[].currentState.potBB');
    put('stacksBB',{hero:state.heroStack,villain:state.villainStack},'history-contrast.paths[].currentState.heroStack/villainStack');
  }
  if(unit.sourceEvidence==='self-range-outcome-evidence.json'){
    const model=evidence.selfRange||{};
    const board=[...(model.flop||[]),...(model.turn?[model.turn]:[])];
    put('street',model.turn?'turn':(model.flop?'flop':null),'self-range-outcome.selfRange.flop/turn');
    put('board',board,'self-range-outcome.selfRange.flop + turn');
    put('heroHole',model.actualHero,'self-range-outcome.selfRange.actualHero');
  }
  if(unit.sourceEvidence==='turn-transfer-evidence.json'){
    const history=evidence.history||{};
    const turnStart=history.turnStart||{};
    put('heroSeat',history.hero,'turn-transfer.history.hero');
    put('villainSeat',history.villain,'turn-transfer.history.villain');
    put('heroHole',history.heroHole,'turn-transfer.history.heroHole');
    put('potBB',turnStart.potBB,'turn-transfer.history.turnStart.potBB');
    put('stacksBB',{hero:turnStart.heroStackBB,villain:turnStart.villainStackBB},'turn-transfer.history.turnStart.heroStackBB/villainStackBB');
  }
  if(unit.sourceEvidence==='blocker-teaching-evidence.json'){
    put('heroHole',context.hero,'blocker-teaching.context.hero');
  }
  return {values,fields,reason:fields.length?'source_fields_explicit':'source_has_no_unit_specific_identity_fields'};
};
const rows=source.units.map((unit)=>{
  const scoped=unit.sourceScopedIdentity||{};
  const frame=scoped.gameFrameCandidate||{};
  const fallback=deriveSourceFallback(unit,readEvidence(unit.sourceEvidence));
  const sourceValue=(key)=>fallback.values[key];
  const street=scoped.street ?? frame.street ?? sourceValue('street') ?? null;
  const role=scoped.roleEvidence ?? sourceValue('role') ?? null;
  const actionState=unit.knownIdentity?.actionStateClass ?? null;
  const heroSeat=scoped.heroSeat ?? frame.heroSeat ?? sourceValue('heroSeat') ?? null;
  const villainSeat=scoped.villainSeat ?? frame.villainSeat ?? sourceValue('villainSeat') ?? null;
  const board=scoped.board ?? frame.board ?? sourceValue('board') ?? null;
  const history=scoped.history ?? frame.history ?? null;
  const potBB=scoped.potBB ?? frame.potBB ?? sourceValue('potBB') ?? null;
  const stacksBB=scoped.stacksBB ?? frame.stacksBB ?? sourceValue('stacksBB') ?? null;
  const heroHole=sourceValue('heroHole') ?? null;
  const activeStackBB=sourceValue('activeStackBB') ?? null;
  const missing=[];
  for(const [key,value] of Object.entries({street,role,actionState,heroSeat,villainSeat,board,history,potBB,stacksBB})){
    if(value===null || value===undefined || (Array.isArray(value)&&value.length===0)) missing.push(key);
  }
  return {
    unitId:unit.id,
    parentFrame:unit.parent,
    groupId:unit.knownIdentity?.groupId ?? null,
    routeStop:unit.knownIdentity?.routeStop ?? null,
    sourceEvidence:unit.sourceEvidence,
    localMaterial:unit.localMaterial,
    identityCandidate:{street,role,actionState,heroSeat,villainSeat,board,history,potBB,stacksBB,heroHole,activeStackBB,scope:scoped.sourceScope ?? frame.scope ?? null},
    sourceFallback:{used:fallback.fields.length>0,reason:fallback.reason,fields:fallback.fields},
    missingIdentityFields:missing,
    status:missing.length===0?'identity_candidate_complete':'identity_candidate_partial',
    strategyReady:false,
    coursePolicyReady:false,
    referencePolicyReady:false,
    releaseStatus:'identity_only_not_practice_ready'
  };
});
const count=(key)=>rows.filter(r=>r.identityCandidate[key]!==null&&r.identityCandidate[key]!==undefined&&!(Array.isArray(r.identityCandidate[key])&&r.identityCandidate[key].length===0)).length;
const output={
  id:'UNIT_IDENTITY_NORMALIZATION_CANDIDATE_V1',
  status:'source_scoped_identity_normalized_not_strategy_ready',
  source:'unit-execution-field-audit.json',
  normalizationRules:{
    street:'sourceScopedIdentity.street ?? gameFrameCandidate.street',
    role:'sourceScopedIdentity.roleEvidence',
    actionState:'knownIdentity.actionStateClass',
    positionAndBoard:'sourceScopedIdentity fields, otherwise gameFrameCandidate fields',
    missingValues:'remain null; no street, role, position, board, policy or successor is invented',
    sourceFallback:'only explicit fields from the named evidence JSON are copied; activeStackBB is kept separate from stacksBB; multi-case packets are not assigned to a unit without a direct mapping'
  },
  counts:{
    units:rows.length,
    parentFrame:rows.filter(r=>r.parentFrame).length,
    actionState:count('actionState'),
    street:count('street'),
    role:count('role'),
    heroSeat:count('heroSeat'),
    villainSeat:count('villainSeat'),
    board:count('board'),
    history:count('history'),
    potBB:count('potBB'),
    stacksBB:count('stacksBB'),
    heroHole:count('heroHole'),
    activeStackBB:count('activeStackBB'),
    identityComplete:rows.filter(r=>r.status==='identity_candidate_complete').length,
    identityPartial:rows.filter(r=>r.status==='identity_candidate_partial').length
  },
  rows,
  releaseRules:{
    identityCandidateMayRouteToParent:true,
    identityCandidateMayLabelVisibleContext:true,
    missingStreetOrRoleBlocksIndependentStrategy:true,
    missingPositionOrBoardBlocksExactRangeView:true,
    identityDoesNotCreateCoursePolicy:true,
    identityDoesNotCreateReferencePolicy:true,
    identityDoesNotCreateSuccessor:true,
    sourceAuditRemainsTruthOfMissingExecutionFields:true
  },
  priorities:{
    firstMissingStreetOrRole:['2.4','3.6','4.1','4.2','4.3','4.4','4.5','4.6','5.1','5.2','5.3','5.4','5.5','5.6','5.7','5.8'],
    nextNeed:'补齐来源可复核的街次、角色、位置与牌面，再接课程规则/参考范围；不能先填动作答案'
  },
  currentEvidence:{
    identityCandidateGenerated:true,
    all35HaveParentFrame:true,
    all35HaveActionState:true,
    all35HaveStreet:false,
    all35HaveRole:false,
    all35HaveCoursePolicy:false,
    all35HaveReferencePolicy:false,
    all35HaveSuccessors:false,
    learnerTrial:false,
    NL50Evidence:false
  }
};
fs.writeFileSync(dir+'unit-identity-normalization-candidate.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,counts:output.counts,status:output.status}));
