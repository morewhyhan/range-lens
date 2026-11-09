// Publication closure audit: selected exports cannot stand in for a complete interactive tree.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {DECK} from '../src/poker.js';
const dir='research/nevir-system/',raw=fs.readFileSync(dir+'sb-bb-qqq-reload-export.json'),data=JSON.parse(raw);
const v=JSON.parse(fs.readFileSync(dir+'sb-bb-qqq-reference-verification.json'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');assert.equal(sha(raw),v.sourceHashes[dir+'sb-bb-qqq-reload-export.json']);
const byHistory=new Map(data.nodes.map(n=>[JSON.stringify(n.historyIndices),n]));
const hole=h=>h.match(/.{2}/g),id=c=>('23456789TJQKA'.indexOf(c[0]))*4+'cdhs'.indexOf(c[1]);
let decisionNodes=0,actionEdges=0,missingActionEdges=0,chanceEdges=0,missingChanceEdges=0;
const actionGaps=[],chanceRecords=[];
for(const n of data.nodes){
 if(n.actor!==null){decisionNodes++;
  n.actions.forEach((action,i)=>{actionEdges++;if(!byHistory.has(JSON.stringify([...n.historyIndices,i]))){missingActionEdges++;actionGaps.push({parent:n.id,action,childHistory:[...n.historyIndices,i]});}});
 }
 if(!n.chance)continue;
 const hs=n.orderedHands.map(h=>h.map(hole));const deadMass=new Map(DECK.filter(c=>!n.board.includes(c.id)).map(c=>[c.id,0]));
 let mass=0;
 for(let i=0;i<hs[0].length;i++)for(let j=0;j<hs[1].length;j++){
  const a=hs[0][i],b=hs[1][j];if(a.some(c=>b.includes(c)))continue;const w=n.rawWeights[0][i]*n.rawWeights[1][j];if(w===0)continue;
  mass+=w;for(const c of [...a,...b])deadMass.set(c,deadMass.get(c)+w);
 }
 assert.ok(mass>0);const remainingPerPhysicalPair=52-n.board.length-4;
 const cards=[...deadMass].map(([card,blockedMass])=>{
  const p=Math.max(0,mass-blockedMass)/(remainingPerPhysicalPair*mass);
  const included=byHistory.has(JSON.stringify([...n.historyIndices,id(card)]));
  return {card,probability:p,includedInSelectedExport:included};
 });
 assert.ok(Math.abs(cards.reduce((s,c)=>s+c.probability,0)-1)<1e-9);
 const positive=cards.filter(c=>c.probability>0);chanceEdges+=positive.length;missingChanceEdges+=positive.filter(c=>!c.includedInSelectedExport).length;
 const min=positive.reduce((a,b)=>a.probability<b.probability?a:b),max=positive.reduce((a,b)=>a.probability>b.probability?a:b);
 // Independently condition on one actual known own holding, preserving the 45/44 denominator.
 const ownKey=['As','Kd'].sort().join(''),ownIndex=hs[0].findIndex(h=>h.slice().sort().join('')===ownKey);assert.ok(ownIndex>=0&&n.rawWeights[0][ownIndex]>0);
 const own=hs[0][ownIndex];const opp=hs[1].map((h,j)=>({h,w:h.some(c=>own.includes(c))?0:n.rawWeights[1][j]}));const oppMass=opp.reduce((s,o)=>s+o.w,0);
 const privateCards=cards.filter(c=>!own.includes(c.card)).map(c=>({card:c.card,probability:opp.filter(o=>!o.h.includes(c.card)).reduce((s,o)=>s+o.w,0)/(remainingPerPhysicalPair*oppMass)}));
 assert.ok(Math.abs(privateCards.reduce((s,c)=>s+c.probability,0)-1)<1e-9);
 chanceRecords.push({id:n.id,historyIndices:n.historyIndices,board:n.board,compatibleMass:mass,remainingPerPhysicalPair,publicCards:cards,
  numberOfPositivePhysicalCards:positive.length,selectedChildren:positive.filter(c=>c.includedInSelectedExport).length,minPublic:min,maxPublic:max,
  privateView:{viewer:'SB',knownHolding:['As','Kd'],cards:privateCards,notUniformAcrossAllUnseenPublicCards:true}});
}
assert.equal(decisionNodes,10);assert.ok(missingActionEdges>0&&missingChanceEdges>0);
const measuredFiles=['sb-bb-qqq-reload-export.json','sb-bb-qqq-range-views.json','qqq-range-lesson-packet.json','qqq-range-lesson-prompts.json','qqq-range-lesson-teacher.json'];
const out={status:'selected_export_not_closed_for_arbitrary_continuous_strategy_training',sourceSHA256:sha(raw),
 counts:{selectedNodes:data.nodes.length,decisionNodes,chanceNodes:chanceRecords.length,actionEdges,missingActionEdges,positivePhysicalChanceEdges:chanceEdges,missingChanceEdges},
 actionGaps,chanceRecords,measuredBytes:Object.fromEntries(measuredFiles.map(f=>[f,fs.statSync(dir+f).size])),fullAuthorStrategyFileBytes:fs.statSync(dir+'sb-bb-qqq-reference-v1.bin').size,
 standaloneContinuousTrainerReady:false,fullAuthorTreeFileExists:true,sourceTargetReached:false,
 releaseRule:'Publish a declared finite lesson with all allowed next actions/events and required references closed, or use a separately validated full-tree query service. A missing export is not an opponent fold, an illegal poker action or a learner mistake.',
 chanceRule:'Sample a supported private pair then uniformly deal from remaining physical deck, or use the exact conditional public-card law. Uniform choice over all publicly unexposed cards is generally wrong.',
 learnerTrials:0,appChanged:false};
fs.writeFileSync(dir+'sb-bb-qqq-export-closure.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,...out.counts,fullAuthorStrategyBytes:out.fullAuthorStrategyFileBytes,selectedExportBytes:out.measuredBytes['sb-bb-qqq-reload-export.json'],standaloneContinuousTrainerReady:false,
 chanceExamples:chanceRecords.map(r=>({id:r.id,cards:r.numberOfPositivePhysicalCards,denominator:r.remainingPerPhysicalPair,min:r.minPublic,max:r.maxPublic}))}));
