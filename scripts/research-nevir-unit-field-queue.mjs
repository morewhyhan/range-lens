import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir='research/nevir-system/';
const audit=JSON.parse(fs.readFileSync(dir+'unit-execution-field-audit.json','utf8'));
const identity=JSON.parse(fs.readFileSync(dir+'unit-identity-normalization-candidate.json','utf8'));
const outcomes=JSON.parse(fs.readFileSync(dir+'unit-outcome-matrix.json','utf8'));
const representatives=JSON.parse(fs.readFileSync(dir+'first-pass-representative-units.json','utf8'));
const schema=JSON.parse(fs.readFileSync(dir+'course-unit-field-schema-map.json','utf8'));

const phaseOrder=[
  {id:'identity_source',fields:['street','role','actionState'],purpose:'只补来源明确的街次、角色、行动状态和位置身份',stop:'身份缺失时停在identity_only_not_practice_ready'},
  {id:'identity_canonical',fields:['street','role','actionState'],purpose:'把已核对的sourceScopedIdentity迁移到规范字段',stop:'迁移失败时保留source_local_context，不开放策略'},
  {id:'fact_frame',fields:['factInputs','sourceIdentity'],purpose:'冻结牌、钱、历史、合法性和来源指纹',stop:'事实或来源不一致时降级为fact'},
  {id:'course_policy',fields:['coursePolicy'],purpose:'单独声明课程简化和答案身份',stop:'没有课程规则时不生成course_policy题'},
  {id:'reference_policy',fields:['referencePolicy'],purpose:'取得同条件参考策略、EV、动作频率和版本指纹',stop:'没有匹配参考时不开放精确策略判分'},
  {id:'range_snapshots',fields:['rangeBefore','rangeAfter'],purpose:'保存固定视角、固定分母的动作前后范围',stop:'没有逐手权重或分母时只开放物理事实'},
  {id:'successors',fields:['legalSuccessors'],purpose:'闭合回应、新牌、终局和账本后继',stop:'缺后继时停在当前父帧'},
  {id:'teaching_transfer',fields:['explanation','transferVariant'],purpose:'补当前层解析、一个改变和一个保持对照',stop:'未见变体未冻结时不开放independent_candidate'},
  {id:'release',fields:['releaseStatus'],purpose:'写明fact、demonstration、course_policy或reference_policy身份',stop:'发布身份不明确时not_open'}
];
const groupOrder=['compare.unopened','compare.bet','compare.raise','update.response','update.card'];
const identityById=new Map(identity.rows.map(row=>[row.unitId,row]));
const outcomeById=new Map(outcomes.rows.map(row=>[row.unitId,row]));
const repByGroup=new Map(representatives.representatives.map(row=>[row.group,row.unit]));

function phaseFor(row,idRow){
  if(idRow.missingIdentityFields.length>0)return 'identity_source';
  if(['street','role','actionState'].some(field=>row.fields[field]!=='present'))return 'identity_canonical';
  if(['factInputs','sourceIdentity'].some(field=>row.fields[field]!=='present'))return 'fact_frame';
  if(row.fields.coursePolicy!=='present')return 'course_policy';
  if(row.fields.referencePolicy!=='present')return 'reference_policy';
  if(row.fields.rangeBefore!=='present'||row.fields.rangeAfter!=='present')return 'range_snapshots';
  if(row.fields.legalSuccessors!=='present')return 'successors';
  if(row.fields.explanation!=='present'||row.fields.transferVariant!=='present')return 'teaching_transfer';
  if(row.fields.releaseStatus!=='present')return 'release';
  return 'ready';
}

function build(){
  assert.equal(audit.unitCount,35);assert.equal(identity.rows.length,35);assert.equal(outcomes.rows.length,35);
  const rows=[...audit.units].sort((a,b)=>{
    const groupDelta=groupOrder.indexOf(a.knownIdentity.groupId)-groupOrder.indexOf(b.knownIdentity.groupId);
    if(groupDelta!==0)return groupDelta;
    return (outcomeById.get(a.id)?.childOrder??0)-(outcomeById.get(b.id)?.childOrder??0);
  }).map(row=>{
    const idRow=identityById.get(row.id),outcome=outcomeById.get(row.id);
    assert.ok(idRow&&outcome,`missing linked row ${row.id}`);
    const phase=phaseFor(row,idRow);
    return {
      unitId:row.id,
      groupId:row.knownIdentity.groupId,
      parentFrame:row.parent,
      groupOrder:outcome.groupOrder,
      childOrder:outcome.childOrder,
      firstPassRepresentative:repByGroup.get(row.knownIdentity.groupId)===row.id,
      sourceEvidence:row.sourceEvidence,
      localMaterial:row.localMaterial,
      identityStatus:idRow.status,
      identityMissingFields:idRow.missingIdentityFields,
      canonicalMissingFields:Object.entries(row.fields).filter(([,status])=>status!=='present').map(([field])=>field),
      nextPhase:phase,
      nextAction:phase==='identity_source'?'补来源可复核的身份字段并重算物理快照':phase==='identity_canonical'?'把已核对候选迁移到canonical gameFrame，不改变策略':phase==='fact_frame'?'冻结事实输入、来源指纹和合法性检查':phase==='course_policy'?'声明课程简化、动作菜单和判分身份':phase==='reference_policy'?'取得同条件逐手参考策略和EV':phase==='range_snapshots'?'生成动作前后固定分母范围图':phase==='successors'?'闭合回应、新牌和终局后继':phase==='teaching_transfer'?'补解析、单变量迁移和保持对照':'确认发布身份并进入发布审查',
      stopReason:row.gap,
      minimumOutcome:outcome.minimumOutcomeLevel,
      exactGradeRequires:outcome.exactGradeRequires,
      missingEvidenceAction:outcome.missingEvidenceAction
    };
  });
  const unitsByPhase=Object.fromEntries(phaseOrder.map(phase=>[phase.id,rows.filter(row=>row.nextPhase===phase.id).map(row=>row.unitId)]));
  const firstPassUnits=Object.values(Object.fromEntries(representatives.representatives.map(row=>[row.group,row.unit])));
  return {
    id:'UNIT_FIELD_COMPLETION_QUEUE_V1',
    status:'queue_compiled_from_audit_not_released',
    purpose:'把35项从当前字段缺口按依赖顺序补齐，禁止先写动作答案再回填身份、范围或后继。',
    sourceDocuments:['unit-execution-field-audit.json','unit-identity-normalization-candidate.json','unit-outcome-matrix.json','course-unit-field-schema-map.json','first-pass-representative-units.json'],
    phaseOrder,
    groupOrder,
    firstPassRule:{representativePerGroup:1,representatives:Object.fromEntries(representatives.representatives.map(row=>[row.group,row.unit])),fullQueueAfter:['order_recall','layer_location','error_recovery','one_variable_transfer'],flatHomeMenuForbidden:true},
    authorFrontier:{
      activePhase:phaseOrder.find(phase=>unitsByPhase[phase.id].length>0)?.id??'ready',
      phaseUnits:unitsByPhase,
      nextPhaseOrder:phaseOrder.map(phase=>phase.id),
      learnerExposure:{beforeStructureEvidence:firstPassUnits,afterStructureEvidence:'group_order_one_at_a_time',oneQuestionPerItem:true,flatHomeMenuForbidden:true},
      strategyReleaseBlockedUntil:['course_policy','reference_policy','range_snapshots','successors']
    },
    requiredCanonicalFields:schema.canonicalRequired,
    queue:rows,
    summary:{unitCount:rows.length,identityComplete:identity.counts.identityComplete,identityPartial:identity.counts.identityPartial,firstPhaseCounts:Object.fromEntries(phaseOrder.map(phase=>[phase.id,rows.filter(row=>row.nextPhase===phase.id).length])),coursePolicyReady:0,referencePolicyReady:0,rangeSnapshotsReady:0,successorReady:0,learnerTrial:false,NL50Evidence:false},
    releaseRules:{identityBeforePolicy:true,policyBeforeReferenceGrade:true,referenceBeforeActionAfterRange:true,rangeBeforeSuccessorLesson:true,successorBeforeContinuousRoute:true,unknownNeverBecomesActionAnswer:true,queueDoesNotProveLearnerMastery:true},
    currentEvidence:{queueCompiled:true,all35RowsLinked:true,runtimeImplemented:false,matchedReference:false,learnerTrial:false,NL50Evidence:false}
  };
}

const output=build();
const outputPath=dir+'unit-field-completion-queue.json';
if(process.argv.includes('--write')){
  fs.writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');
}else{
  const existing=JSON.parse(fs.readFileSync(outputPath,'utf8'));
  assert.deepEqual(existing,output,'queue JSON is stale; run with --write');
}
assert.equal(output.queue.length,35);
assert.equal(output.summary.identityComplete+output.summary.identityPartial,35);
assert.equal(output.firstPassRule.representatives['compare.unopened'],'1.5');
assert.equal(output.firstPassRule.representatives['compare.bet'],'2.1');
assert.equal(output.firstPassRule.representatives['compare.raise'],'3.1');
assert.equal(output.firstPassRule.representatives['update.response'],'4.5');
assert.equal(output.firstPassRule.representatives['update.card'],'5.7');
assert.equal(output.releaseRules.unknownNeverBecomesActionAnswer,true);
console.log(JSON.stringify({ok:true,status:output.status,units:output.queue.length,identityComplete:output.summary.identityComplete,identityPartial:output.summary.identityPartial,firstPhaseCounts:output.summary.firstPhaseCounts}));
