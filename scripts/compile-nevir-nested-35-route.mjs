import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('.');
const dir=path.join(root,'research/nevir-system');
const readiness=JSON.parse(fs.readFileSync(path.join(dir,'learning-unit-readiness.json'),'utf8'));
const groupOrder=[
  {parent:'compare.unopened',routeNode:'p4_compare',label:'无人下注时比较',returnTo:'p4_compare',gate:'compare'},
  {parent:'compare.bet',routeNode:'p4_compare',label:'面对下注时比较',returnTo:'p4_compare',gate:'compare'},
  {parent:'compare.raise',routeNode:'p4_compare',label:'面对加注时比较',returnTo:'p4_compare',gate:'compare'},
  {parent:'update.response',routeNode:'p6_update',label:'对手回应后的更新',returnTo:'p6_update',gate:'update'},
  {parent:'update.card',routeNode:'p6_update',label:'新牌出现后的更新',returnTo:'p6_update',gate:'update'}
];
const groupBy=new Map(groupOrder.map((g,i)=>[g.parent,{...g,index:i}]));
const units=readiness.units.map((u,index)=>{
  const group=groupBy.get(u.parent); if(!group) throw new Error('Unknown parent '+u.parent);
  const groupUnits=readiness.units.filter(x=>x.parent===u.parent);
  const childIndex=groupUnits.findIndex(x=>x.id===u.id);
  const previous=childIndex===0?'parent_entered':groupUnits[childIndex-1].id;
  return {
    id:u.id,
    label:u.label,
    globalOrder:index+1,
    groupOrder:group.index+1,
    childOrder:childIndex+1,
    parent:u.parent,
    parentRouteNode:group.routeNode,
    returnTo:group.returnTo,
    groupLabel:group.label,
    unlockAfter:previous,
    opensOnlyFromParent:true,
    oneQuestion:true,
    onePrimaryAction:true,
    localMaterial:u.localMaterial,
    evidence:u.evidence,
    evidenceIdentity:u.localMaterial==='M'?'finite_model':'fact_or_ledger',
    exactGradeRequires:'matched_reference_and_successor',
    missingEvidenceAction:'stop_at_current_unit_and_return_to_parent',
    firstPassVisible:false,
    fullMatchingTargetPolicyVerified:u.fullMatchingTargetPolicyVerified,
    learnerTrialVerified:u.learnerTrialVerified,
    status:'paper_nested_route_not_released'
  };
});
const output={
  id:'NESTED_35_ROUTE_V1',
  status:'paper_nested_route_compiled_not_released',
  purpose:'Compile all 35 author units into one post-first-pass nested queue without creating a flat learner home.',
  firstPass:{
    uses:['p1_context','p2_board','p3_range','p4_compare','p5_execute','p6_update','p7_close'],
    exposesUnitIds:false,
    representativeUnitPerGroup:true,
    maxOpenTeachingChildren:1,
    parentFrameRestoredOnClose:true
  },
  groupOrder:groupOrder.map((g,i)=>({order:i+1,parent:g.parent,routeNode:g.routeNode,label:g.label,returnTo:g.returnTo,unlockAfter:i===0?'p4_compare_or_p6_update':groupOrder[i-1].parent})),
  units,
  queueRules:{
    oneGroupAtATime:true,
    oneUnitAtATime:true,
    laterUnitRequiresPreviousUnitInSameGroup:true,
    laterGroupRequiresPreviousGroupClosed:true,
    unknownCountsAsWrong:true,
    missingReferenceStopsExactGrade:true,
    missingSuccessorStopsContinuousLesson:true,
    retryDoesNotOverwriteFirstAnswer:true,
    noFlat35UnitHome:true,
    noRandomFrequencyApproximation:true
  },
  currentStatus:{
    all35PaperNested:true,
    all35FullMatchingTargetPolicyVerified:false,
    all35LearnerTrialVerified:false,
    completeContinuousPackage:false,
    runtimeImplemented:false,
    NL50Evidence:false
  }
};
fs.writeFileSync(path.join(dir,'nested-35-route.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({output:path.join(dir,'nested-35-route.json'),groups:groupOrder.length,units:units.length,status:output.status},null,2));
