// Exact current made-hand composition, not equity or an action recommendation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {card,evaluate} from '../src/poker.js';
const dir='research/nevir-system/',raw=fs.readFileSync(dir+'reference-request-sb-bb-qqq.json'),r=JSON.parse(raw);
const groups=['quads','AA_KK_full_house','JJ_to_22_full_house','trips_with_unpaired_kickers'];
const roots=['oop','ip'].map(role=>r.ranges[role].rootHands);
function group(h){
 const rank=evaluate([...r.context.flop,...h.hole].map(card)).value;
 const pocket=h.hole[0][0]===h.hole[1][0],hasQ=h.hole.some(c=>c[0]==='Q');
 assert.equal(rank[0],hasQ?7:pocket?6:3);
 return hasQ?groups[0]:pocket?('AK'.includes(h.hole[0][0])?groups[1]:groups[2]):groups[3];
}
const joint=roots.map(hs=>hs.map(()=>0));let pairs=0,total=0;
for(let i=0;i<roots[0].length;i++)for(let j=0;j<roots[1].length;j++){
 const a=roots[0][i],b=roots[1][j];if(a.hole.some(c=>b.hole.includes(c)))continue;
 const m=a.weight*b.weight;total+=m;pairs++;joint[0][i]+=m;joint[1][j]+=m;
}
assert.equal(total,r.jointPrior.unnormalizedMass);assert.equal(pairs,r.jointPrior.compatiblePairs);
const summary=roots.map((hs,s)=>{
 const counts=Object.fromEntries(groups.map(g=>[g,{physicalHands:0,literalRootWeight:0,compatibleJointMass:0,publicConditionalShare:0}]));
 hs.forEach((h,i)=>{const v=counts[group(h)];v.physicalHands++;v.literalRootWeight+=h.weight;v.compatibleJointMass+=joint[s][i];});
 Object.values(counts).forEach(v=>{v.publicConditionalShare=v.compatibleJointMass/total;});
 assert.equal(Object.values(counts).reduce((v,c)=>v+c.compatibleJointMass,0),total);
 return {seat:s===0?'SB':'BB',groups:counts};
});
const out={status:'exact_current_made_hand_composition_under_authored_user_roots_not_terminal_equity_or_policy',
 inputFingerprint:r.inputFingerprint,requestSHA256:crypto.createHash('sha256').update(raw).digest('hex'),flop:r.context.flop,compatiblePairs:pairs,jointMass:total,summary,
 meaning:'Public marginal under both user-chart roots conditioned on board and no collision; not a known-private-hand posterior.',
 conclusionsNotEstablished:['Exact original course ranges','Action frequencies','Reason for betting a particular holding','Course simplification loss','Turn or river equity','NL50 suitability'],appChanged:false};
fs.writeFileSync(dir+'sb-bb-qqq-structural-profile.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out));
