import {classOf} from './postflop-model.js';
// All percentages share the current, fixed-own-hand conditional denominator.
export function guideDistribution(evidence,reply=null){
 const rows=evidence.rows.map(r=>({...r,weight:r.weight*(reply===null?1:(r.policy[reply]?.frequency||0))}));
 const total=rows.reduce((s,r)=>s+r.weight,0);
 return {rows,total,groups:['weaker','stronger','tie'].map(kind=>({kind,frequency:total?rows.filter(r=>r.kind===kind).reduce((s,r)=>s+r.weight,0)/total:0}))};
}
export function exampleHoldings(distribution,kind,limit=3){
 const pool=distribution.rows.map(r=>({...r,weight:r.weight*(kind==='pay'?(r.kind==='weaker'?r.continue:0):kind==='risk'?(r.kind==='stronger'?r.continue:0):kind==='tieContinue'?(r.kind==='tie'?r.continue:0):kind==='fold'?(r.kind==='stronger'?r.fold:0):kind==='allFold'?r.fold:kind==='all'||r.kind===kind?1:0)})).filter(r=>r.weight>0).sort((a,b)=>b.weight-a.weight||a.hand.localeCompare(b.hand));
 const seen=new Set(),out=[];for(const row of pool){const key=classOf(row.hand);if(seen.has(key))continue;seen.add(key);out.push(row);if(out.length===limit)break;}return out;
}
export function compareActions(mix,tolerance){
 if(!mix.length)return [];
 const best=Math.max(...mix.map(p=>p.ev));
 return mix.map(p=>({...p,loss:Math.max(0,best-p.ev),nearBest:best-p.ev<=tolerance}));
}
