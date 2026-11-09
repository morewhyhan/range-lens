import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import ranges from '../src/data/ranges.json' with {type:'json'};

const root=path.resolve('.');
const request=JSON.parse(fs.readFileSync(path.join(root,'research/nevir-system/reference-request-btn-bb-a72.json'),'utf8'));
const board=new Set(request.context.flop);
const ranks='23456789TJQKA';
const suits=['s','h','d','c'];
const deck=[...ranks].flatMap(rank=>suits.map(suit=>rank+suit));
const rankIndex=card=>ranks.indexOf(card[0]);
const canonicalHole=hole=>[...hole].sort((a,b)=>deck.indexOf(a)-deck.indexOf(b)).join(',');

function expandClass(hand){
  const a=rankIndex(hand[0]),b=rankIndex(hand[1]),out=[];
  for(const x of deck) for(const y of deck){
    if(x===y||rankIndex(x)!==a||rankIndex(y)!==b) continue;
    if(a===b && deck.indexOf(x)>deck.indexOf(y)) continue;
    if(hand.endsWith('s')&&x[1]!==y[1]) continue;
    if(hand.endsWith('o')&&x[1]===y[1]) continue;
    out.push([x,y]);
  }
  return out;
}

function expectedClassWeights(chart, action){
  return Object.fromEntries(Object.entries(chart.hands).map(([hand,entry])=>[hand,entry.action[action]||0]));
}

function compareRange(role, chartId, action){
  const chart=Object.values(ranges).find(x=>x.id===chartId);
  assert.ok(chart,`missing chart ${chartId}`);
  const declared=request.ranges[role];
  const expectedWeights=expectedClassWeights(chart,action);
  const declaredClasses=declared.classWeights;
  for(const [hand,weight] of Object.entries(expectedWeights)) assert.equal(declaredClasses[hand]??0,weight,`${role} class weight mismatch ${hand}`);
  const expected=new Map();
  for(const [hand,weight] of Object.entries(expectedWeights)){
    if(weight<=0) continue;
    for(const hole of expandClass(hand)){
      if(hole.some(card=>board.has(card))) continue;
      expected.set(canonicalHole(hole),{hole,hand,weight});
    }
  }
  const actual=new Map();
  for(const row of declared.rootHands){
    assert.equal(row.hole.length,2,`${role} hand must have two cards`);
    assert.equal(new Set(row.hole).size,2,`${role} duplicate private cards`);
    assert.equal(row.hole.some(card=>board.has(card)),false,`${role} private card conflicts with flop`);
    const key=canonicalHole(row.hole);
    assert.equal(actual.has(key),false,`${role} duplicate combo ${key}`);
    actual.set(key,row);
  }
  assert.equal(actual.size,expected.size,`${role} expanded combo count mismatch`);
  for(const [key,ref] of expected){
    const row=actual.get(key);
    assert.ok(row,`${role} missing combo ${key}`);
    assert.equal(row.hand,ref.hand,`${role} class mismatch ${key}`);
    assert.equal(row.weight,ref.weight,`${role} combo weight mismatch ${key}`);
  }
  for(const key of actual.keys()) assert.ok(expected.has(key),`${role} unexpected combo ${key}`);
  return {chartId,action,classCount:Object.keys(expectedWeights).length,nonZeroClasses:Object.values(expectedWeights).filter(x=>x>0).length,combos:actual.size,classWeightHash:crypto.createHash('sha256').update(JSON.stringify(expectedWeights)).digest('hex'),comboHash:crypto.createHash('sha256').update(JSON.stringify([...actual.values()].map(x=>({hole:x.hole,hand:x.hand,weight:x.weight})))).digest('hex')};
}

const roleSnapshots={
  oop:compareRange('oop','bb-普通中','call'),
  ip:compareRange('ip','open-BTN','raise')
};
const oop=request.ranges.oop.rootHands,ip=request.ranges.ip.rootHands;
let compatiblePairs=0,unnormalizedMass=0,overlapPairs=0;
for(const hero of oop) for(const villain of ip){
  const overlap=hero.hole.some(card=>villain.hole.includes(card));
  if(overlap){overlapPairs++;continue;}
  compatiblePairs++;
  unnormalizedMass+=hero.weight*villain.weight;
}
assert.equal(compatiblePairs,request.jointPrior.compatiblePairs);
assert.equal(unnormalizedMass,request.jointPrior.unnormalizedMass);
const orderedPrivateHandsHash=crypto.createHash('sha256').update(JSON.stringify({oop,ip})).digest('hex');
const output={
  id:'A72_C1_INDEPENDENT_PHYSICAL_SNAPSHOT_V1',
  status:'independent_physical_snapshot_verified_action_filter_not_applied',
  candidateId:request.id,
  inputFingerprint:request.inputFingerprint,
  sourceFiles:request.sourceFiles,
  coordinateIdentity:{board:request.context.flop,oop:request.context.oopSeat,ip:request.context.ipSeat,firstActor:request.context.firstActor,preflop:request.context.preflop},
  roleSnapshots,
  counts:{oopRootHands:oop.length,ipRootHands:ip.length,compatiblePairs,overlapPairs},
  jointPrior:{compatiblePairs,unnormalizedMass,definition:request.jointPrior.definition},
  hashes:{orderedPrivateHandsHash},
  checks:{classWeightsMatchSourceCharts:true,allPrivateCardsValid:true,boardConflictsZero:true,duplicatePrivateCombosZero:true,overlapPairsExcluded:true,jointPriorMatchesManifest:true,physicalFilterSeparatedFromActionFilter:true},
  releaseBoundary:'starting_range_fact_and_physical_filter_only',
  currentEvidence:{independentRecompute:true,matchedActionPolicy:false,actionConditionedRange:false,successorClosure:false,learnerTrial:false,nl50Evidence:false}
};
fs.writeFileSync(path.join(root,'research/nevir-system/a72-c1-independent-physical-snapshot.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,id:output.id,compatiblePairs,unnormalizedMass,orderedPrivateHandsHash}));
