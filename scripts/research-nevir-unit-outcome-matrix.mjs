import fs from 'node:fs';

const dir='research/nevir-system/';
const route=JSON.parse(fs.readFileSync(dir+'nested-35-route.json','utf8'));
const readiness=JSON.parse(fs.readFileSync(dir+'learning-unit-readiness.json','utf8'));
const readinessById=new Map(readiness.units.map(x=>[x.id,x]));
const compareGroups=new Set(['compare.unopened','compare.bet','compare.raise']);
const updateGroups=new Set(['update.response','update.card']);
const rows=route.units.map(unit=>{
  const source=readinessById.get(unit.id);
  if(!source)throw new Error('Missing readiness unit '+unit.id);
  const isCompare=compareGroups.has(unit.parent),isUpdate=updateGroups.has(unit.parent);
  const minimumOutcomeLevel=isCompare?'O3_slow_execution':'O5_continuous_route';
  const requiredOutputs=isCompare
    ? ['action','amountOrNoBet','reason','rangeAfterOrStopReason','ledgerAfter']
    : ['changedState','rangeAfterOrStopReason','ledgerAfter','successorOrStopReason'];
  return {
    unitId:unit.id,
    label:unit.label,
    groupId:unit.parent,
    parentRouteNode:unit.parentRouteNode,
    returnTo:unit.returnTo,
    groupOrder:unit.groupOrder,
    childOrder:unit.childOrder,
    firstPassVisible:unit.firstPassVisible,
    evidence:unit.evidence,
    evidenceIdentity:unit.evidenceIdentity,
    localMaterial:unit.localMaterial,
    teachingQuestion:source.firstOperation,
    prerequisite:source.prerequisite,
    minimumOutcomeLevel,
    requiredOutputs,
    exactGradeRequires:unit.exactGradeRequires,
    missingEvidenceAction:unit.missingEvidenceAction,
    stopReasonWhenMissing:'no_complete_range_or_successor_reference',
    currentEvidence:{
      fullMatchingTargetPolicyVerified:source.fullMatchingTargetPolicyVerified,
      learnerTrialVerified:source.learnerTrialVerified,
      status:unit.status
    },
    nextEvidenceTask:source.gap,
    guards:{
      oneQuestion:unit.oneQuestion,
      onePrimaryAction:unit.onePrimaryAction,
      opensOnlyFromParent:unit.opensOnlyFromParent,
      noStrategyFromLocalMaterial:true,
      noLevelSkip:true
    }
  };
});
const output={
  id:'UNIT_OUTCOME_MATRIX_V1',
  status:'all35_outcome_targets_mapped_not_released',
  source:['nested-35-route.json','learning-unit-readiness.json','goal-outcome-ladder.json'],
  unitCount:rows.length,
  allUnitsListed:rows.length===35,
  targetCounts:{
    O3_slow_execution:rows.filter(x=>x.minimumOutcomeLevel==='O3_slow_execution').length,
    O5_continuous_route:rows.filter(x=>x.minimumOutcomeLevel==='O5_continuous_route').length
  },
  rows,
  rules:{
    firstPassDoesNotReleaseChildUnits:true,
    localMaterialDoesNotGrantStrategyGrade:true,
    missingReferenceStopsExactGrade:true,
    missingSuccessorStopsContinuousLesson:true,
    everyRowHasReturnTo:true,
    everyRowHasStopReason:true,
    all35MustPassTheirOwnEvidence:true
  },
  currentEvidence:{
    all35Mapped:true,
    all35CompleteExecution:false,
    all35LearnerTrial:false,
    continuousPackage:false,
    NL50Evidence:false
  }
};
fs.writeFileSync(dir+'unit-outcome-matrix.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,unitCount:output.unitCount,targetCounts:output.targetCounts,status:output.status}));
