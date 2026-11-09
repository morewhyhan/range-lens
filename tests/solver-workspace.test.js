import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Load the browser module with the same JSON files in Node without requiring import attributes.
const source=fs.readFileSync(new URL('../src/solver-workspace.js',import.meta.url),'utf8').replace(/^import (\w+) from '([^']+)';/gm,(_,name,path)=>`const ${name} = ${fs.readFileSync(new URL(path,new URL('../src/solver-workspace.js',import.meta.url)),'utf8')};`);
const m=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const near=(a,b,t=1e-4)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
test('solver workspace independently rebuilds every exported node joint distribution',()=>{
 for(const node of m.SOLVER_NODES){const {joint,total}=m.masses(node);near(total,joint[1].reduce((s,w)=>s+w,0));for(let side=0;side<2;side++)joint[side].forEach((w,i)=>near(w,node.compatibleMassWeights[side][i]));}
});
test('every action conserves the prior across branches and preserves real exported successors',()=>{
 for(const node of m.SOLVER_NODES.filter(n=>n.actor!==null)){
  let probability=0;const count=node.rawWeights[node.actor].length;
  node.actions.forEach((_,a)=>{const t=m.transition(node,a);probability+=t.probability;
   t.weights[node.actor].forEach((w,i)=>near(w,node.rawWeights[node.actor][i]*node.strategyActionMajor[a*count+i]));
   assert.deepEqual(t.weights[node.actor^1],node.rawWeights[node.actor^1]);
   if(t.next)t.weights.forEach((ws,s)=>ws.forEach((w,i)=>near(w,t.next.rawWeights[s][i])));
  });near(probability,1);
 }
});
test('frequency drills only use supported physical holdings and preserve full solver mix',()=>{
 for(const node of m.SOLVER_NODES.filter(n=>n.actor!==null))for(let i=0;i<20;i++){
  const q=m.frequencyQuestion(node,i);assert.ok(node.compatibleMassWeights[node.actor][q.target.index]>0);
  assert.deepEqual(q.options.find(o=>o.id===q.correct).mix,m.policyFor(node,q.target.index).map(p=>p.frequency));
 }
});
test('range and blocker drills derive their answer from physical holdings, not course labels',()=>{
 for(const node of m.SOLVER_NODES.filter(n=>n.actor!==null))for(let i=0;i<12;i++){
  const retained=m.focusedQuestion(node,i,'retention');
  const expected=node.rawWeights[node.actor][retained.target.index]*m.policyFor(node,retained.target.index)[retained.actionIndex].frequency;
  assert.equal(retained.options.find(o=>o.id===0).text,expected.toFixed(4));
  const blocker=m.focusedQuestion(node,i,'blocker'),own=m.holeCards(blocker.target.hand);
  const count=node.orderedHands[node.actor^1].filter((h,j)=>node.rawWeights[node.actor^1][j]>0&&m.holeCards(h).some(c=>own.includes(c))).length;
  assert.equal(blocker.options.find(o=>o.id===0).text,`移除 ${count} 个组合`);
 }
});
