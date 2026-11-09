import fs from 'node:fs';
import assert from 'node:assert/strict';

const dir='research/nevir-system/';
const graph=JSON.parse(fs.readFileSync(dir+'unit-dependency-graph.json','utf8'));
const nested=JSON.parse(fs.readFileSync(dir+'nested-35-route.json','utf8'));
const outcome=JSON.parse(fs.readFileSync(dir+'unit-outcome-matrix.json','utf8'));
const curriculum=JSON.parse(fs.readFileSync(dir+'curriculum-release-contract.json','utf8'));

assert.equal(graph.id,'UNIT_DEPENDENCY_GRAPH_V1');
assert.equal(graph.status,'35_unit_dependency_graph_written_not_trialed');
assert.equal(graph.nodes.length,35);
assert.equal(graph.groups.length,5);
const expectedUnits=curriculum.unitGroups.flatMap(g=>g.units);
assert.deepEqual(graph.nodes.map(n=>n.id),expectedUnits);
assert.deepEqual(nested.units.map(n=>n.id),expectedUnits);
assert.deepEqual(outcome.rows.map(n=>n.unitId),expectedUnits);
const nodeIds=new Set(graph.nodes.map(n=>n.id));
const foundations=new Set(graph.foundationNodes);
for(const node of graph.nodes){
  assert.ok(node.label&&node.group&&node.dependsOn.length>=1&&node.concept);
  for(const dep of node.dependsOn)assert.ok(nodeIds.has(dep)||foundations.has(dep),`unknown dependency ${node.id}->${dep}`);
  assert.equal(node.structureUnlock.length>0,true);
  assert.equal(node.strategyUnlock,'matched_reference_and_successor');
}
const adjacency=new Map(graph.nodes.map(n=>[n.id,n.dependsOn.filter(d=>nodeIds.has(d))]));
const visiting=new Set(),visited=new Set();
function visit(id){
  if(visiting.has(id))throw new Error('dependency cycle at '+id);
  if(visited.has(id))return;
  visiting.add(id);for(const dep of adjacency.get(id)||[])visit(dep);visiting.delete(id);visited.add(id);
}
for(const id of nodeIds)visit(id);
assert.equal(visited.size,35);
assert.equal(graph.unlockRules.oneTeachingChildAtATime,true);
assert.equal(graph.unlockRules.mustReturnToParentBeforeNext,true);
assert.equal(graph.unlockRules.structureUnlockDoesNotGrantStrategy,true);
assert.equal(graph.currentEvidence.runtimeUnlockImplemented,false);
assert.equal(graph.currentEvidence.all35StrategyReady,false);
assert.equal(graph.currentEvidence.learnerTrial,false);
console.log(JSON.stringify({ok:true,status:graph.status,nodes:graph.nodes.length,groups:graph.groups.length,acyclic:true,runtimeUnlockImplemented:graph.currentEvidence.runtimeUnlockImplemented}));
