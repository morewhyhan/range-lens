import fs from 'node:fs';
import path from 'node:path';

const dir=path.resolve('research/nevir-system');
const matrix=JSON.parse(fs.readFileSync(path.join(dir,'unit-outcome-matrix.json'),'utf8'));
const dependency=JSON.parse(fs.readFileSync(path.join(dir,'unit-dependency-graph.json'),'utf8'));
const expectedGroups={
  'compare.unopened':{parent:'p4_compare',node:'A5',prereq:['A1','A2','A3','A4'],next:'A6',projection:['courseDecision','amountOrNoBet','rangeAfterOrStopReason','ledgerAfter']},
  'compare.bet':{parent:'p4_compare',node:'A5',prereq:['A1','A2','A3','A4'],next:'A6',projection:['courseDecision','amountOrNoBet','rangeAfterOrStopReason','ledgerAfter']},
  'compare.raise':{parent:'p4_compare',node:'A5',prereq:['A1','A2','A3','A4'],next:'A6',projection:['courseDecision','amountOrNoBet','rangeAfterOrStopReason','ledgerAfter']},
  'update.response':{parent:'p6_update',node:'A7',prereq:['A1','A2','A3','A4','A5','A6'],next:'A8',projection:['changedState','rangeAfterOrStopReason','ledgerAfter','successorOrStopReason']},
  'update.card':{parent:'p6_update',node:'A7',prereq:['A1','A2','A3','A4','A5','A6'],next:'A8',projection:['changedState','rangeAfterOrStopReason','ledgerAfter','successorOrStopReason']}
};
if(matrix.unitCount!==35||matrix.rows.length!==35) throw new Error(`matrix must contain 35 rows, got ${matrix.rows.length}`);
if(dependency.nodes.length!==35) throw new Error('dependency graph must contain 35 nodes');
const depById=new Map(dependency.nodes.map(x=>[x.id,x]));
const rows=matrix.rows.map(row=>{
  const g=expectedGroups[row.groupId];
  if(!g) throw new Error(`unknown group ${row.groupId}`);
  if(!depById.has(row.unitId)) throw new Error(`missing dependency node ${row.unitId}`);
  if(row.parentRouteNode!==g.parent||row.returnTo!==g.parent) throw new Error(`parent mismatch ${row.unitId}`);
  return {
    unitId:row.unitId,label:row.label,groupId:row.groupId,groupOrder:row.groupOrder,childOrder:row.childOrder,
    parentFrame:g.parent,returnTo:g.parent,primaryArchitectureNode:g.node,prerequisiteArchitectureNodes:g.prereq,
    nextArchitectureNode:g.next,requiredOutputProjection:g.projection,minimumOutcomeLevel:row.minimumOutcomeLevel,
    teachingQuestion:row.teachingQuestion,evidence:row.evidence,evidenceIdentity:row.evidenceIdentity,localMaterial:row.localMaterial,
    requiredOutputs:row.requiredOutputs,missingEvidenceAction:row.missingEvidenceAction,nextEvidenceTask:row.nextEvidenceTask,
    exactGradeRequires:row.exactGradeRequires,stopReasonWhenMissing:row.stopReasonWhenMissing,
    flatHomeVisible:false,opensOnlyFromParent:row.guards.opensOnlyFromParent,firstPassVisible:row.firstPassVisible,
    currentEvidence:row.currentEvidence
  };
});
const out={
  id:'UNIT_ARCHITECTURE_BRIDGE_V1',status:'paper_all35_bridge_not_released',source:['unit-outcome-matrix.json','unit-dependency-graph.json','architecture-replay-contract.json'],unitCount:35,
  groupOrder:['compare.unopened','compare.bet','compare.raise','update.response','update.card'],rows,
  rules:{all35Listed:true,eachRowHasArchitectureNode:true,eachRowHasPrerequisites:true,eachRowReturnsToParent:true,oneChildAtATime:true,flatHomeVisible:false,missingEvidenceStops:true,structureUnlockDoesNotGrantStrategy:true},
  currentEvidence:{bridgeCompiled:true,all35StrategyReady:false,all35LearnerTrial:false,runtimeUnlockImplemented:false,NL50Evidence:false}
};
fs.writeFileSync(path.join(dir,'unit-architecture-bridge.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,status:out.status,units:out.rows.length,groups:out.groupOrder,parents:[...new Set(out.rows.map(x=>x.parentFrame))],flatHomeVisible:out.rules.flatHomeVisible}));
