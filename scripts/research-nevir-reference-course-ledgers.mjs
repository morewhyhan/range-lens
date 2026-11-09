import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir='research/nevir-system/';
const queue=JSON.parse(fs.readFileSync(dir+'unit-field-completion-queue.json','utf8'));
const outcomes=JSON.parse(fs.readFileSync(dir+'unit-outcome-matrix.json','utf8'));
const nested=JSON.parse(fs.readFileSync(dir+'nested-35-route.json','utf8'));
const requiredBlocks=['identity','physical','reference','course','difference','range','successor','teaching'];
const outcomesById=new Map(outcomes.rows.map(row=>[row.unitId,row]));
const nestedById=new Map(nested.units.map(row=>[row.id,row]));

function buildRow(row){
  const outcome=outcomesById.get(row.unitId), route=nestedById.get(row.unitId);
  assert.ok(outcome&&route,`missing parent crosswalk ${row.unitId}`);
  assert.equal(outcome.parentRouteNode,route.parentRouteNode,`parent mismatch ${row.unitId}`);
  assert.equal(outcome.returnTo,route.returnTo,`return mismatch ${row.unitId}`);
  assert.equal(route.opensOnlyFromParent,true,`flat release ${row.unitId}`);
  return {
    unitId:row.unitId,
    groupId:row.groupId,
    parentFrame:row.parentFrame,
    parentRouteNode:route.parentRouteNode,
    returnTo:route.returnTo,
    opensOnlyFromParent:route.opensOnlyFromParent,
    oneQuestion:route.oneQuestion,
    onePrimaryAction:route.onePrimaryAction,
    firstPassRepresentative:row.firstPassRepresentative,
    sourceEvidence:row.sourceEvidence,
    localMaterial:row.localMaterial,
    nextPhase:row.nextPhase,
    identity:{status:row.identityStatus,missingFields:row.identityMissingFields},
    physical:{status:'not_populated',source:null},
    reference:{status:'missing',source:null,actionFrequency:null,actionEV:null,successors:[]},
    course:{status:'not_populated',source:null,policy:null},
    difference:{status:'not_comparable',actionDelta:null,rangeDelta:null,evDelta:null},
    range:{status:'not_populated',fixedDenominator:null,before:null,afterByAction:{}},
    successor:{status:'missing',nodes:[]},
    teaching:{status:'not_populated',question:outcome.teachingQuestion,errorReturn:row.missingEvidenceAction,transferVariant:null,minimumOutcome:outcome.minimumOutcomeLevel,requiredOutputs:outcome.requiredOutputs},
    releaseStatus:'not_open',
    stopReason:row.stopReason,
    exactGradeRequires:row.exactGradeRequires,
    guards:{
      noReferenceInvented:true,
      noCoursePolicyInvented:true,
      noRangeInvented:true,
      noSuccessorInvented:true,
      noExactGradeWithoutMatchedReference:true
    }
  };
}

function build(){
  assert.equal(queue.queue.length,35);
  const rows=queue.queue.map(buildRow);
  assert.equal(new Set(rows.map(row=>row.unitId)).size,35);
  return {
    id:'UNIT_REFERENCE_COURSE_LEDGER_SKELETON_V1',
    status:'all35_skeletons_compiled_not_populated',
    purpose:'为35项建立统一对照账本位置；空栏保持未知，禁止把相似案例、工具界面或课程示例补成策略参考。',
    sourceQueue:'unit-field-completion-queue.json',
    requiredBlocks,
    rows,
    summary:{
      units:rows.length,
      referenceMissing:rows.filter(row=>row.reference.status==='missing').length,
      courseNotPopulated:rows.filter(row=>row.course.status==='not_populated').length,
      rangeNotPopulated:rows.filter(row=>row.range.status==='not_populated').length,
      successorMissing:rows.filter(row=>row.successor.status==='missing').length,
      notOpen:rows.filter(row=>row.releaseStatus==='not_open').length,
      firstPassRepresentatives:rows.filter(row=>row.firstPassRepresentative).map(row=>row.unitId)
    },
    releaseRules:{
      skeletonDoesNotReleasePractice:true,
      missingReferenceBlocksReferenceGrade:true,
      missingSuccessorBlocksContinuousRoute:true,
      unknownIsNotZero:true,
      allRowsRequireOwnEvidence:true
    },
    currentEvidence:{
      all35RowsPresent:true,
      anyMatchedReference:false,
      anyReleasedStrategy:false,
      runtimeCompiler:false,
      learnerTrial:false,
      NL50Evidence:false
    }
  };
}

const output=build();
const outputPath=dir+'unit-reference-course-ledgers.json';
if(process.argv.includes('--write')){
  fs.writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');
}else{
  const existing=JSON.parse(fs.readFileSync(outputPath,'utf8'));
  assert.deepEqual(existing,output,'ledger skeleton JSON is stale; run with --write');
}
console.log(JSON.stringify({ok:true,status:output.status,units:output.summary.units,referenceMissing:output.summary.referenceMissing,notOpen:output.summary.notOpen,representatives:output.summary.firstPassRepresentatives}));
