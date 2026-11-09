import fs from 'node:fs';
import assert from 'node:assert/strict';
import {card,assertCards,evaluate,compare} from '../src/poker.js';
const dir='research/nevir-system',board=['Ks','9h','2d','3c','7h'],hero=['9c','9d'];
const holdings=[['KK',['Kc','Kd'],[3,13,9,7]],['77',['7c','7d'],[3,7,13,9]],['AK',['Ac','Kh'],[1,13,14,9,7]],['QQ',['Qc','Qd'],[1,12,13,9,7]],['QT',['Qh','Tc'],[0,13,12,10,9,7]]].map(([id,hole,golden])=>{
 assertCards([...board,...hero,...hole].map(card));const own=evaluate([...board,...hero].map(card)),other=evaluate([...board,...hole].map(card));assert.deepEqual(own.value,[3,9,13,7]);assert.deepEqual(other.value,golden);return{id,hole,heroShare:compare(own,other)>0?1:0};
});
assert.deepEqual(holdings.map(h=>h.heroShare),[0,1,1,1,1]);
const specs=[
 {id:'passive',weights:[1,2,3,1,3],weakBet:0,airBet:0,fold77ToHeroJam:false,rootGolden:[39.8,45.925],best:'bet17.5'},
 {id:'induces',weights:[1,2,3,1,3],weakBet:1,airBet:1,fold77ToHeroJam:false,rootGolden:[58.55,45.925],best:'check'},
 {id:'worse_folds_to_jam',weights:[1,2,3,1,3],weakBet:1,airBet:1,fold77ToHeroJam:true,rootGolden:[58.55,42.125],best:'check'},
 {id:'strong_raise',weights:[8,2,3,1,3],weakBet:1,airBet:1,fold77ToHeroJam:false,rootGolden:[315/17,131.25/17],best:'check'}
];
const total=x=>x.reduce((a,b)=>a+b,0);let terminalChecks=0;
const start={pot:35,heroStack:83,villainStack:83,heroPut:0,villainPut:0,minRaise:1};
function put(st,who,to,kind){
 const s=structuredClone(st),mine=who+'Put',other=(who==='hero'?'villain':'hero')+'Put',stack=who+'Stack';
 assert.ok(to>=s[mine]&&to<=83);const delta=to-s[mine];
 if(kind==='call')assert.equal(to,s[other]);else{assert.ok(to>s[other]);const increment=to-s[other];assert.ok(increment>=s.minRaise||to===83);s.minRaise=increment;}
 s[stack]-=delta;s.pot+=delta;s[mine]=to;assert.equal(s.heroStack+s.villainStack+s.pot+399,600);return s;
}
function terminal(m,s,folded=null){
 let result=0;
 for(let i=0;i<m.length;i++){
  let own=s.heroStack,other=s.villainStack,pot=s.pot;
  if(folded){const winner=folded==='hero'?'villain':'hero',excess=Math.max(0,s[winner+'Put']-s[folded+'Put']);pot-=excess;if(winner==='hero')own+=excess+pot;else other+=excess+pot;}
  else{assert.equal(s.heroPut,s.villainPut);own+=pot*holdings[i].heroShare;other+=pot*(1-holdings[i].heroShare);}
  assert.equal(own+other+399,600);assert.ok(own>=0&&other>=0);terminalChecks++;result+=m[i]*(own-83);
 }
 return result;
}
const profiles=specs.map(spec=>{
 const nodes=[];
 function heroNode(id,m,s,options){
  const mass=total(m);if(!mass)return 0;
  const values=options.map(([action,run])=>({action,evMass:run()}));const best=values.reduce((a,b)=>b.evMass>a.evMass+1e-10?b:a);
  const baseline=-s.heroPut;
  nodes.push({id,observedMass:mass,posterior:Object.fromEntries(holdings.map((h,i)=>[h.id,m[i]/mass])),state:s,actions:values.map(a=>({action:a.action,evFromRiverRootBB:a.evMass/mass,relativeToCurrentFoldBB:s.heroPut<s.villainPut?a.evMass/mass-baseline:null})),best:best.action,scope:'One common action for this public history; no separate optimum per hidden holding. Relative-fold figures appear only when fold is in the current menu.'});return best.evMass;
 }
 function opp(m,policy,branches){
  const grouped={};holdings.forEach((h,i)=>{const ps=policy(h.id);assert.ok(Math.abs(total(Object.values(ps))-1)<1e-12);for(const[a,p]of Object.entries(ps)){assert.ok(p>=0&&p<=1);(grouped[a]??=m.map(()=>0))[i]+=m[i]*p;}});
  assert.ok(Math.abs(total(Object.values(grouped).map(total))-total(m))<1e-10);
  return Object.entries(grouped).reduce((sum,[a,weights])=>sum+(total(weights)?branches[a](weights):0),0);
 }
 function faceJam(m,s){return heroNode('after_xraise_villain_jam',m,s,[['fold',()=>terminal(m,s,'hero')],['call38',()=>terminal(m,put(s,'hero',83,'call'))]]);}
 function heroJam(m,s){
  const jam=put(s,'hero',83,'raise');
  return opp(m,id=>({call:id==='KK'||id==='77'&&!spec.fold77ToHeroJam?1:0,fold:id==='KK'||id==='77'&&!spec.fold77ToHeroJam?0:1}),{call:w=>terminal(w,put(jam,'villain',83,'call')),fold:w=>terminal(w,jam,'villain')});
 }
 function faceLeadRaise(m,s){return heroNode('after_lead_villain_raise45',m,s,[['fold',()=>terminal(m,s,'hero')],['call27.5',()=>terminal(m,put(s,'hero',45,'call'))],['jam83',()=>heroJam(m,s)]]);}
 function faceBet(m,s){return heroNode('after_check_villain_bet17.5',m,s,[
  ['fold',()=>terminal(m,s,'hero')],['call17.5',()=>terminal(m,put(s,'hero',17.5,'call'))],
  ['raise45',()=>{const r=put(s,'hero',45,'raise');return opp(m,id=>id==='KK'||id==='77'?{jam:1}:id==='AK'?{call:1}:{fold:1},{jam:w=>faceJam(w,put(r,'villain',83,'raise')),call:w=>terminal(w,put(r,'villain',45,'call')),fold:w=>terminal(w,r,'villain')});}],
  ['jam83',()=>heroJam(m,s)]
 ]);}
 const root=heroNode('river_start',spec.weights,start,[
  ['check',()=>opp(spec.weights,id=>{const p=id==='KK'||id==='77'?1:id==='AK'?spec.weakBet:id==='QT'?spec.airBet:0;return{bet:p,check:1-p};},{bet:w=>faceBet(w,put(start,'villain',17.5,'bet')),check:w=>terminal(w,start)})],
  ['bet17.5',()=>{const b=put(start,'hero',17.5,'bet');return opp(spec.weights,id=>id==='KK'||id==='77'?{raise:1}:id==='AK'?{call:1}:id==='QQ'?{call:.5,fold:.5}:{fold:1},{raise:w=>faceLeadRaise(w,put(b,'villain',45,'raise')),call:w=>terminal(w,put(b,'villain',17.5,'call')),fold:w=>terminal(w,b,'villain')});}]
 ]);
 const node=nodes.find(n=>n.id==='river_start');node.actions.forEach((a,i)=>assert.ok(Math.abs(a.evFromRiverRootBB-spec.rootGolden[i])<1e-10,spec.id+' root golden'));
 assert.equal(node.best,spec.best);
 const lead=nodes.find(n=>n.id==='after_lead_villain_raise45');
 assert.equal(lead.best,spec.id==='worse_folds_to_jam'?'call27.5':spec.id==='strong_raise'?'fold':'jam83');
 const facing=nodes.find(n=>n.id==='after_check_villain_bet17.5');assert.equal(facing.best,spec.id==='strong_raise'?'call17.5':'raise45');
 const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10);
 if(spec.id==='induces'){
  [0,402.5/9,550.5/9,52].forEach((v,i)=>close(facing.actions[i].evFromRiverRootBB,v));
  close(lead.actions[1].evFromRiverRootBB,115/3);close(lead.actions[2].evFromRiverRootBB,51);
  const jamNode=nodes.find(n=>n.id==='after_xraise_villain_jam');assert.equal(jamNode.state.pot,163);assert.equal(83-jamNode.state.heroPut,38);
 }
 if(spec.id==='worse_folds_to_jam'){close(lead.actions[1].evFromRiverRootBB,115/3);close(lead.actions[2].evFromRiverRootBB,77/3);}
 if(spec.id==='strong_raise'){close(lead.actions[1].relativeToCurrentFoldBB,-2.5);assert.equal(lead.state.pot,97.5);}
 return{...spec,rootEVBB:root/total(spec.weights),nodes};
});
const out={status:'finite_value_and_trap_teaching_tree_not_Nash_or_NL50_policy',context:{players:6,initialBB:100,heroSeat:'SB',villainSeat:'BTN',board,hero,history:['BTN opens2.5; SB raises to10; BB folds; BTN calls; other seats folded','Flop Ks9h2d: SB bets7; BTN calls7','Turn3c: SB checks; BTN checks','River7h: SB to act'],start,rake:'none',priorScope:'Given current river masses; not recovered from a complete preflop/flop/turn policy.'},holdings,profiles,opponentPolicy:{afterHeroCheck:'KK/77 bet17.5; AK uses weakBet; QT uses airBet; QQ checks',afterHeroBet17_5:'KK/77 raise to45; AK calls; QQ calls half and folds half; QT folds',afterHeroCheckRaise45:'KK/77 jam83; AK calls; QQ/QT fold',afterHeroJam83:'KK calls;77 calls unless profile explicitly folds77ToHeroJam; other hands fold',information:'Only own holding and public history; no access to hero hidden cards'},treeScope:{heroRoot:['check','bet17.5'],afterVillainBet:['fold','call17.5','raise45','jam83'],afterVillainRaise:['fold','call27.5','jam83'],afterVillainJam:['fold','call38'],omitted:'All other legal sizes and opponent responses are omitted. Optimality is only against the declared fixed policies in this menu, not full-game equilibrium.'},terminalChecks,sourceBoundary:{localNote:'Nevir2.7§3.5 supplies conditional slow-play direction, none of these hands/masses/frequencies/EVs',externalMechanismSources:['https://blog.gtowizard.com/slow-playing/','https://blog.gtowizard.com/river-refinements-when-your-opponent-wont-check-raise/'],externalConfiguration:'Second article uses40BB MTT for its worked experiment; no frequencies transferred to this100BB cash model.'},release:{authorMechanism:true,completeTargetPolicy:false,learnerTrial:false}};
fs.writeFileSync(`${dir}/value-trap-tree-evidence.json`,JSON.stringify(out,null,2)+'\n');
const prompts={status:'public_complete_given_model_tasks_not_frozen_holdout',context:out.context,holdings:holdings.map(({heroShare,...h})=>h),profiles:specs.map(({rootGolden,best,...s})=>s),opponentPolicy:out.opponentPolicy,menu:out.treeScope,tasks:['原位比较直接下注与先过牌','对手下注后分清能赢的价值牌与诈唬，再比较跟加','自己的价值下注被加到45后，重新看范围与价格','只改变77面对全下的回应，比较跟与再加'],unknownCountsAsError:true,persistence:'none; research packets only'};
fs.writeFileSync(`${dir}/value-trap-tree-prompts.json`,JSON.stringify(prompts,null,2)+'\n');
console.log(JSON.stringify({ok:true,profiles:profiles.map(p=>({id:p.id,actions:p.nodes.find(n=>n.id==='river_start').actions,best:p.best,afterLeadRaise:p.nodes.find(n=>n.id==='after_lead_villain_raise45').best})),terminalChecks,status:out.status},null,2));
