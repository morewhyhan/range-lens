import fs from 'node:fs';
import assert from 'node:assert/strict';
import {DECK,card,assertCards,evaluate,compare} from '../src/poker.js';

// Author-specified finite best-response study. Not a Nash solve or a course policy.
const dir='research/nevir-system';
const board=['Ks','7s','2d','3d'],hero=['As','Qs'];
const initial={potIncludingBetBB:31.5,heroStackBB:90,villainStackBB:79.5,foldedStacksBB:399,toCallBB:10.5};
const context={players:6,startingEffectiveBB:100,heroSeat:'SB',villainSeat:'BTN',board,heroHole:hero,rake:'none',history:['UTG/HJ/CO fold; BTN opens to 2.5; SB raises to 10; BB folds; BTN calls','Flop Ks 7s 2d: SB checks, BTN checks','Turn 3d: SB checks, BTN bets 10.5 into 21'],state:initial,origin:'Legal observed history, not asserted optimal. All opponent weights below are GIVEN at this current decision, not inferred from a complete preflop or flop policy.'};
const holdings=[{id:'KK',hole:['Kh','Kd']},{id:'KJ',hole:['Kc','Jc']},{id:'JT',hole:['Js','Ts']}].map(h=>{
 assertCards([...board,...hero,...h.hole].map(card));
 const rivers=DECK.filter(c=>![...board,...hero,...h.hole].includes(c.id)).map(c=>{
  const own=evaluate([...board,c.id,...hero].map(card)),other=evaluate([...board,c.id,...h.hole].map(card));
  const result=compare(own,other);return{river:c.id,share:result>0?1:result<0?0:.5,heroBest:own.value,villainBest:other.value};
 });
 assert.equal(rivers.length,44);
 const wins=rivers.filter(r=>r.share===1).map(r=>r.river),ties=rivers.filter(r=>r.share===.5).map(r=>r.river),losses=rivers.filter(r=>r.share===0).map(r=>r.river);
 return{...h,rivers,wins,ties,losses,equity:(wins.length+ties.length/2)/44};
});
assert.deepEqual(holdings.map(h=>[h.wins.length,h.ties.length,h.losses.length]),[[7,0,37],[12,0,32],[38,0,6]]);

// Fixed opponent policy uses only own holding and public river. It does not read hero's cards.
function riverBetProbability(holdingId,river){
 const r=card(river);
 if(holdingId==='KK')return r.suit!=='s'||[2,3].includes(r.rank)?1:0;
 if(holdingId==='KJ')return r.suit==='s'||r.rank===14?0:1;
 if(holdingId==='JT')return 1;
 throw new Error('Unknown holding');
}
let terminalBalancesChecked=0;
function terminal(heroStack,villainStack){
 assert.ok(heroStack>=0&&villainStack>=0);
 assert.ok(Math.abs(heroStack+villainStack+399-600)<1e-10);terminalBalancesChecked++;
 return heroStack-initial.heroStackBB;
}

function riverContinuation(rootWeights,responseLikelihood,invested){
 const rootMass=rootWeights.reduce((a,b)=>a+b,0),pot=21+2*invested,stack=90-invested,bet=pot/2;
 assert.ok(bet<=stack);
 const informationSets=new Map();let checkEV=0,checkdownEV=0,clairvoyantEV=0,branchProbability=0;
 for(let i=0;i<holdings.length;i++){
  const h=holdings[i],mass=rootWeights[i]*responseLikelihood[i];branchProbability+=mass/rootMass;
  for(const r of h.rivers){
   const p=mass/(rootMass*44);if(!p)continue;
   const betProbability=riverBetProbability(h.id,r.river);
   const showdown=terminal(stack+pot*r.share,stack+pot*(1-r.share));
   // If hero folds to the river bet, villain gets the unmatched bet back.
   const folded=terminal(stack,stack-bet+bet+pot);
   const called=terminal(stack-bet+(pot+2*bet)*r.share,stack-bet+(pot+2*bet)*(1-r.share));
   checkEV+=p*(1-betProbability)*showdown;checkdownEV+=p*showdown;
   clairvoyantEV+=p*((1-betProbability)*showdown+betProbability*Math.max(folded,called));
   const state=informationSets.get(r.river)||{river:r.river,dealJointProbability:0,betJointProbability:0,betWinMass:0,foldEVContribution:0,callEVContribution:0,checkEVContribution:0,betHiddenMass:{}};
   state.dealJointProbability+=p;state.betJointProbability+=p*betProbability;
   state.betWinMass+=p*betProbability*r.share;
   state.foldEVContribution+=p*betProbability*folded;state.callEVContribution+=p*betProbability*called;
   state.checkEVContribution+=p*(1-betProbability)*showdown;
   if(betProbability)state.betHiddenMass[h.id]=(state.betHiddenMass[h.id]||0)+p*betProbability;
   informationSets.set(r.river,state);
  }
 }
 const states=[...informationSets.values()].map(s=>{
  const mass=s.betJointProbability;
  const chosen=!mass?null:Math.abs(s.callEVContribution-s.foldEVContribution)<1e-12?'tie':s.callEVContribution>s.foldEVContribution?'call':'fold';
  const posterior=mass?Object.fromEntries(Object.entries(s.betHiddenMass).map(([id,p])=>[id,p/mass])):{};
  return{...s,posteriorOnObservedBet:posterior,equityOnObservedBet:mass?s.betWinMass/mass:null,riverCallIncrementEVBB:mass?(s.callEVContribution-s.foldEVContribution)/mass:null,chosen,chosenEVContribution:Math.max(s.foldEVContribution,s.callEVContribution)};
 });
 const ev=checkEV+states.reduce((s,r)=>s+r.chosenEVContribution,0),gap=clairvoyantEV-ev;
 assert.ok(gap>=-1e-10);
 return{potBB:pot,eachStackBB:stack,opponentRiverBetBB:bet,turnInvestedBB:invested,branchProbability,evMeaning:'EV fields are probability-weighted contributions from the original turn decision. conditionalEVBB divides by this branch probability; zero-probability branches have no conditional EV.',conditionalEVBB:branchProbability?ev/branchProbability:null,checkdownEVBB:checkdownEV,evBB:ev,clairvoyantEVBB:clairvoyantEV,forbiddenInformationAdvantageBB:Math.max(0,gap),informationSets:states};
}

const profiles=[
 {id:'pressure',weights:[4,16,1],smallResponse:[{fold:0,call:0,jam:1},{fold:0,call:0,jam:1},{fold:0,call:0,jam:1}],jamCall:[1,1,1],changes:'Baseline finite response model'},
 {id:'more_bluffs',weights:[4,16,4],smallResponse:[{fold:0,call:0,jam:1},{fold:0,call:0,jam:1},{fold:0,call:0,jam:1}],jamCall:[1,1,1],changes:'Only current betting-range weights change'},
 {id:'fold_to_raise',weights:[4,16,1],smallResponse:[{fold:0,call:0,jam:1},{fold:.5,call:.5,jam:0},{fold:0,call:0,jam:1}],jamCall:[1,1,1],changes:'Only response to raise-to-30 changes'},
 {id:'fold_to_shove',weights:[4,16,1],smallResponse:[{fold:0,call:0,jam:1},{fold:0,call:0,jam:1},{fold:0,call:0,jam:1}],jamCall:[1,0,0],changes:'Only response to shove changes'}
].map(profile=>{
 const total=profile.weights.reduce((a,b)=>a+b,0);
 for(const r of profile.smallResponse)assert.equal(r.fold+r.call+r.jam,1);
 const equity=holdings.reduce((s,h,i)=>s+profile.weights[i]*h.equity/total,0);
 const flat=riverContinuation(profile.weights,[1,1,1],10.5);
 const smallCalled=riverContinuation(profile.weights,profile.smallResponse.map(r=>r.call),30);
 const smallFoldProbability=profile.smallResponse.reduce((s,r,i)=>s+profile.weights[i]*r.fold/total,0);
 const jamMass=profile.smallResponse.reduce((s,r,i)=>s+profile.weights[i]*r.jam,0);
 const jamEquity=jamMass?profile.smallResponse.reduce((s,r,i)=>s+profile.weights[i]*r.jam*holdings[i].equity,0)/jamMass:null;
 const jamFold=terminal(60,0+60+81),jamCallEV=jamMass?201*jamEquity-90:null;
 const heroReraiseDecision=jamMass?(jamCallEV>jamFold?'call':jamCallEV<jamFold?'fold':'tie'):null;
 const small=smallFoldProbability*terminal(60+19.5+42,79.5)+smallCalled.evBB+(jamMass/total)*(jamMass?Math.max(jamFold,jamCallEV):0);
 let shove=0;
 for(let i=0;i<holdings.length;i++){
  const h=holdings[i],p=profile.weights[i]/total;
  shove+=p*(1-profile.jamCall[i])*terminal(0+79.5+42,79.5);
  for(const r of h.rivers)shove+=p*profile.jamCall[i]/44*terminal(201*r.share,201*(1-r.share));
 }
 const fold=terminal(90,79.5+10.5+21);
 const actions=[{id:'fold',evBB:fold},{id:'call',evBB:flat.evBB},{id:'raise_to_30',evBB:small},{id:'jam_to_90',evBB:shove}];
 const best=Math.max(...actions.map(a=>a.evBB));
 return{...profile,totalWeight:total,showdownEquity:equity,immediateCallPrice:1/4,freeShowdownCallEVBB:42*equity-10.5,flatContinuation:flat,smallRaise:{foldProbability:smallFoldProbability,callContinuation:smallCalled,jamProbability:jamMass/total,jamPosterior:jamMass?Object.fromEntries(holdings.map((h,i)=>[h.id,profile.weights[i]*profile.smallResponse[i].jam/jamMass])):{},equityFacingJam:jamEquity,potFacingJamBB:141,toCallJamBB:60,callPriceFacingJam:60/201,foldFromTurnDecisionEVBB:jamFold,callFromTurnDecisionEVBB:jamCallEV,heroReraiseDecision},actions,best:actions.filter(a=>Math.abs(a.evBB-best)<1e-10).map(a=>a.id)};
});
assert.deepEqual(profiles.map(p=>p.best),[['fold'],['call'],['raise_to_30'],['jam_to_90']]);
const baseline=profiles[0];
assert.ok(Math.abs(baseline.freeShowdownCallEVBB-27/22)<1e-12);
assert.ok(Math.abs(baseline.flatContinuation.evBB+7/44)<1e-12);
assert.ok(Math.abs(baseline.flatContinuation.clairvoyantEVBB-23/11)<1e-12);
assert.ok(Math.abs(baseline.flatContinuation.forbiddenInformationAdvantageBB-9/4)<1e-12);
assert.ok(Math.abs(profiles[2].smallRaise.equityFacingJam-.3)<1e-12);

const sourceClaims=JSON.parse(fs.readFileSync(`${dir}/source-claims.json`,'utf8'));
const sourceLinks=[['N5-L13','原文较大下注的不同响应假设；不由尺寸单独反解范围'],['N5-L14','被再加后失去权益的风险；不生成所有好听牌禁止XR'],['N5-L22','加注被跟后还要更新并继续；过牌不是自动弃牌'],['N7-L25','所述人群下注偏强时区分价值与诈唬XR；不补造跟注表'],['N7-L27','所述过度下注/面对加注过弃的不同假设；不由身份自动确认']].map(([fragment,limit])=>{
 const f=sourceClaims.fragments.find(f=>f.id===fragment);assert.ok(f);return{fragment,source:f.source,limit,fullPolicyProvided:false};
});
const tasks=[
 ['D01','read.context','复原轮到自己及当前可选动作','context','没有免费过牌；30是总额、不是再加30'],
 ['D02','read.money','点出已经付出与这次要补的筹码','context','眼前31.5含对手10.5；跟后42，价格25%'],
 ['D03','read.cards','把可能补花的牌与真正获胜的牌分开','holdings/KK','2s/3s成花仍输葫芦，不能算干净补牌'],
 ['D04','read.range','同一手牌对三组候选分别比较','holdings','KK/KJ/JT权益不同；不能把一组当整个范围'],
 ['D05','compare.bet','检查跟注之后是否直接摊牌','profiles/pressure','27.92%原始权益并不足以支持本未来树中的跟注'],
 ['D06','compare.bet','河牌未中花时重看当前下注范围','profiles/pressure/4c','同一可见下注只用一个决定，不按隐藏底牌分别选'],
 ['D07','compare.raise','把加注的弃/跟/再加三个回应补全','profiles/fold_to_raise','不能漏掉再加，或把被跟当作免费摊牌'],
 ['D08','compare.raise','面对再加，重新算待补与当前范围','profiles/fold_to_raise','补60，价格60/201；本模型30%支持跟，相对当前弃牌多0.3BB'],
 ['D09','compare.bet','只改变一项响应，重做选择','profiles','四个模型分别有弃、跟、加到30、全下最优；仅限此树'],
 ['D10','update.response','执行之后保留所走分支的范围和账本','context','退还未匹配投入；下一街继承实际回应'],
 ['D11','compare.raise','核对课程调整所需条件','sourceLinks','资料条件与模型计算分别取证，不把作者响应称原课数据']
].map(([id,parent,action,evidence,criterion])=>({id,parent,action,evidence,criterion,unknownCountsAsError:true,release:'author_contract_not_unseen_learner_test'}));
const out={status:'complete_author_finite_tree_not_Nash_or_NL50_reference',context,holdings,opponentRiverPolicy:{KK:'Bet unless river is a spade other than 2s/3s',KJ:'Check on any spade or Ace, otherwise bet',JT:'Always bet',size:'Half pot on the river following a turn call or raise-call; amounts remain within stacks',information:'Only own holding, public river and observed history; policy does not inspect hero hole cards'},treeScope:{turnActions:['fold','call','raise_to_30','jam_to_90'],riverHero:'Always check first, then fold or call a bet; no river raise or lead evaluated',turnReraise:'Only opponent jam and hero fold/call',notFullGame:'Other legal turn raise sizes, river leads and river raises are omitted from this teaching tree. These omissions are explicit task restrictions, not poker rules. No exploitability or equilibrium claim.'},profiles,sourceLinks,tasks,terminalBalancesChecked,release:{mechanismComparison:true,coursePolicy:false,completeDefenseReference:false,learnerTrials:0,NL50Verified:false}};
fs.writeFileSync(`${dir}/defense-tree-evidence.json`,JSON.stringify(out,null,2));
console.log(JSON.stringify({status:out.status,runoutsPerHolding:44,outcomes:holdings.map(h=>({id:h.id,wins:h.wins.length,ties:h.ties.length,losses:h.losses.length})),profiles:profiles.map(p=>({id:p.id,rawEquity:p.showdownEquity,freeShowdownEV:p.freeShowdownCallEVBB,actions:p.actions,best:p.best})),baselineInformationLeak:{wrongEV:baseline.flatContinuation.clairvoyantEVBB,correctEV:baseline.flatContinuation.evBB,gap:baseline.flatContinuation.forbiddenInformationAdvantageBB},terminalBalancesChecked,tasks:tasks.length},null,2));
