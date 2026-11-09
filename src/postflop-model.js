export const RANKS='AKQJT98765432'.split('');
export const splitHand=hand=>hand.match(/.{2}/g);
export function classOf(hand){const[a,b]=splitHand(hand);const r=[a[0],b[0]].sort((x,y)=>RANKS.indexOf(x)-RANKS.indexOf(y));return r.join('')+(a[0]===b[0]?'':a[1]===b[1]?'s':'o');}
export function labelAction(a){if(a==='Check')return '过牌';if(a==='Call')return '跟注';if(a==='Fold')return '弃牌';const m=/^(Bet|Raise|AllIn)\((\d+)\)$/.exec(a);return m?`${{Bet:'下注',Raise:'加注到',AllIn:'全下至'}[m[1]]} ${(Number(m[2])/100).toFixed(2)} BB`:a;}
export function compatible(a,b){return !splitHand(a).some(c=>splitHand(b).includes(c));}
export function publicMass(node,weights=node.rawWeights){
 const holes=node.orderedHands.map(hs=>hs.map(splitHand));const joint=weights.map(ws=>ws.map(()=>0));let total=0;
 for(let i=0;i<holes[0].length;i++)for(let j=0;j<holes[1].length;j++){
  if(holes[0][i].some(c=>holes[1][j].includes(c)))continue;
  const w=weights[0][i]*weights[1][j];joint[0][i]+=w;joint[1][j]+=w;total+=w;
 }return {joint,total};
}
export function fixedHandOpponent(node,hero,hand,weights=node.rawWeights){
 const opponent=hero^1;const mass=node.orderedHands[opponent].map((h,i)=>compatible(h,hand)?weights[opponent][i]:0);const total=mass.reduce((a,b)=>a+b,0);
 return {weights:mass,total};
}
export function mixFor(node,side,index){if(node.actor!==side||!node.actionEV||index<0||node.rawWeights[side][index]<=0||node.compatibleMassWeights?.[side]?.[index]===0)return [];const n=node.orderedHands[side].length;return node.actions.map((action,a)=>({action,index:a,frequency:node.strategyActionMajor[a*n+index],ev:node.actionEV[a*n+index]/100}));}
export function afterAction(node,a){
 if(node.actor===null||!Number.isInteger(a)||a<0||a>=node.actions.length)throw new Error('无效动作');
 const raw=node.rawWeights.map(ws=>ws.slice()),n=raw[node.actor].length;
 raw[node.actor]=raw[node.actor].map((w,i)=>w*node.strategyActionMajor[a*n+i]);return raw;
}
export function drawWeighted(values,rng=Math.random){const total=values.reduce((s,w)=>s+w,0);if(!(total>0))throw new Error('没有可抽取的组合');let target=rng()*total;for(let i=0;i<values.length;i++){target-=values[i];if(target<0)return i;}return values.findLastIndex(x=>x>0);}
export function dealPair(node,hero,rng=Math.random,heroHand=null){
 const view=publicMass(node);const hi=heroHand===null?drawWeighted(view.joint[hero],rng):node.orderedHands[hero].indexOf(heroHand);
 if(hi<0||!(view.joint[hero][hi]>0))throw new Error('指定底牌不在当前可达范围中');
 const hand=node.orderedHands[hero][hi];const opp=fixedHandOpponent(node,hero,hand);const oi=drawWeighted(opp.weights,rng);
 return {hero:hand,opponent:node.orderedHands[hero^1][oi]};
}
export function gradeAction(node,hero,hand,a,errorBB){
 const i=node.orderedHands[hero].indexOf(hand),mix=mixFor(node,hero,i);if(!mix.length||!mix[a])throw new Error('缺少动作EV');
 const best=Math.max(...mix.map(x=>x.ev)),loss=Math.max(0,best-mix[a].ev);
 // A training acceptance band, not a theorem that global exploitability bounds each hand's EV error.
 const toleranceBB=Math.max(.02,errorBB*2);return {loss,best,toleranceBB,correct:mix[a].frequency>=.01||loss<=toleranceBB,mix,referenceFrequency:mix[a].frequency};
}
export function aggregate(node,side,weights){const result={};node.orderedHands[side].forEach((h,i)=>{const key=classOf(h);(result[key]??=[]).push({hand:h,index:i,weight:weights[i]});});return result;}
