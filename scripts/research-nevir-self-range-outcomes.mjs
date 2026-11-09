import fs from 'node:fs';
import assert from 'node:assert/strict';
import {DECK,card,assertCards,evaluate,compare} from '../src/poker.js';
const dir='research/nevir-system',flop=['As','7h','2d'],turn='Qh',actualHero=['Qc','3c'];
const charts=JSON.parse(fs.readFileSync('src/data/ranges.json','utf8')),ownChart=charts.find(c=>c.id==='open-BTN');
for(const cls of ['KQs','KQo','Q3s'])assert.equal(ownChart.hands[cls].action.raise,1);
const own=[];for(const k of DECK.filter(c=>c.rank===13))for(const q of DECK.filter(c=>c.rank===12))own.push({cls:'KQ',hole:[k.id,q.id],mass:1});
for(const q of DECK.filter(c=>c.rank===12))own.push({cls:'Q3s',hole:[q.id,'3'+q.suit],mass:1});
assert.equal(own.length,20);
const other=[{id:'AT',hole:['Ah','Tc'],mass:4,call:1},{id:'QT',hole:['Qh','Td'],mass:3,call:.5},{id:'76',hole:['7c','6c'],mass:2,call:.5},{id:'KJ',hole:['Kd','Jh'],mass:1,call:.25}];
const legal=ids=>new Set(ids).size===ids.length;
const prior=[];for(const a of own)for(const b of other)if(legal([...flop,...a.hole,...b.hole])){assertCards([...flop,...a.hole,...b.hole].map(card));prior.push({ownClass:a.cls,ownHole:a.hole,otherId:b.id,otherHole:b.hole,mass:a.mass*b.mass,call:b.call});}
const sum=rows=>rows.reduce((s,r)=>s+r.mass,0),same=(a,b)=>a.slice().sort().join(' ')==b.slice().sort().join(' ');
assert.equal(prior.length,20*4-5-4);assert.equal(sum(prior),181);
function marginal(rows,key){const out={};for(const r of rows){const id=typeof key==='function'?key(r):r[key];out[id]=(out[id]||0)+r.mass;}return out;}
function normalized(rows,key){return Object.fromEntries(Object.entries(marginal(rows,key)).map(([k,v])=>[k,v/sum(rows)]));}
function productInvalidMass(rows){
 const a=marginal(rows,r=>r.ownHole.slice().sort().join(' ')),b=marginal(rows,'otherId');let bad=0;
 for(const [hole,x]of Object.entries(a))for(const [id,y]of Object.entries(b))if(!legal([...flop,...hole.split(' '),...other.find(h=>h.id===id).hole]))bad+=x*y/(sum(rows)**2);
 return bad;
}
const versions=['selective','wide'].map(id=>{
 const bet=prior.map(r=>({...r,mass:r.mass*(id==='wide'||r.ownClass==='Q3s'?1:0)})).filter(r=>r.mass>0);
 const called=bet.map(r=>({...r,mass:r.mass*r.call}));
 const survivors=called.filter(r=>![...r.ownHole,...r.otherHole].includes(turn));
 const dealt=survivors.map(r=>({...r,mass:r.mass/45}));
 const current=called.filter(r=>same(r.ownHole,actualHero)),currentTurn=survivors.filter(r=>same(r.ownHole,actualHero));
 const p=normalized(current,'otherId'),q=normalized(currentTurn,'otherId');
 for(const [k,n]of Object.entries({AT:16,QT:6,'76':4,KJ:1}))assert.ok(Math.abs(p[k]-n/27)<1e-12);
 for(const [k,n]of Object.entries({AT:16,'76':4,KJ:1}))assert.ok(Math.abs(q[k]-n/21)<1e-12);assert.equal(q.QT,undefined);
 assert.ok(productInvalidMass(called)>0);
 const expected=id==='selective'?[37,25.5,15.75]:[181,126.5,78];[bet,called,survivors].forEach((r,i)=>assert.equal(sum(r),expected[i]));
 const money={afterPreflop:{pot:5.5,hero:97.5,villain:97.5},afterBetAndCall:{pot:9.16,hero:95.67,villain:95.67},size:'1.83BB fixed for this author model, approximately one third; not exact1/3 or a new course optimum'};
 for(const m of [money.afterPreflop,money.afterBetAndCall])assert.ok(Math.abs(m.pot+m.hero+m.villain+399.5-600)<1e-10);
 return{id,ownBetPolicy:id==='selective'?'OnlyQ3s bets':'BothKQ andQ3s bet; only within this restricted20-hand teaching population',bet,called,turnSurvivors:survivors,dealtChanceWeighted:dealt,summary:{priorDisplayMass:sum(prior)*4,betDisplayMass:sum(bet)*4,calledDisplayMass:sum(called)*4,turnSurvivorDisplayMass:sum(survivors)*4,ownAfterCall:marginal(called,'ownClass'),ownAfterTurn:marginal(survivors,'ownClass'),otherAfterCall:normalized(called,'otherId'),currentActualHeroAfterCall:p,currentActualHeroAfterTurn:q,invalidPairProbabilityIfMarginalsMultiplied:productInvalidMass(called),turnProbability:sum(dealt)/sum(called)},money};
});
assert.equal(versions[0].summary.ownAfterCall.KQ,undefined);assert.equal(versions[1].summary.ownAfterCall.KQ,101);
assert.equal(versions[1].summary.ownAfterTurn.KQ,62.25);assert.equal(versions[1].summary.ownAfterTurn.Q3s,15.75);
assert.deepEqual(versions[0].summary.currentActualHeroAfterCall,versions[1].summary.currentActualHeroAfterCall);
assert.deepEqual(versions[0].summary.currentActualHeroAfterTurn,versions[1].summary.currentActualHeroAfterTurn);
const model=JSON.parse(fs.readFileSync(`${dir}/value-trap-tree-evidence.json`,'utf8')),profile=model.profiles.find(p=>p.id==='induces'),root=profile.nodes.find(n=>n.id==='river_start');
const valueByAction=Object.fromEntries(root.actions.map(a=>[a.action,a.evFromRiverRootBB]));
const cases=[
 {id:'O01',action:'check',actual:'KK',expectedNet:-83,events:['hero check','villain bet17.5','hero raise45','villain jam83','hero call38']},
 {id:'O02',action:'check',actual:'77',expectedNet:118,events:['hero check','villain bet17.5','hero raise45','villain jam83','hero call38']},
 {id:'O03',action:'bet17.5',actual:'AK',expectedNet:52.5,events:['hero bet17.5','villain call17.5']},
 {id:'O04',action:'bet17.5',actual:'QT',expectedNet:35,events:['hero bet17.5','villain fold']}
].map(c=>{
 const h=model.holdings.find(h=>h.id===c.actual);assert.ok(h);assertCards([...model.context.board,...model.context.hero,...h.hole].map(card));
 const share=compare(evaluate([...model.context.board,...model.context.hero].map(card)),evaluate([...model.context.board,...h.hole].map(card)))>0?1:0;
 const contribution=c.action==='check'?83:17.5;
 const net=c.actual==='QT'?35:share*(35+contribution)-(1-share)*contribution;
 assert.equal(net,c.expectedNet);assert.equal((83+net)+(201-(83+net))+399,600);
 const policyGrade=c.action===root.best,loss=valueByAction[root.best]-valueByAction[c.action];assert.ok(Math.abs(loss-(policyGrade?0:12.625))<1e-10);
 return{...c,actualHole:h.hole,realizedNetBB:net,decisionEVBB:valueByAction[c.action],decisionBestInGivenMenu:policyGrade,localExpectedLossBB:loss,revealRule:'Actual holding hidden until after first decision and reference grade; these four outcomes are selected demonstrations, not a random frequency sample.'};
});
assert.ok(cases.some(c=>c.decisionBestInGivenMenu&&c.realizedNetBB<0));assert.ok(cases.some(c=>!c.decisionBestInGivenMenu&&c.realizedNetBB>0));
const out={status:'joint_self_range_and_outcome_teaching_models_not_target_policy_or_learner_results',selfRange:{flop,turn,actualHero,own,other,prior,versions,scope:'Own range is the collection of possible hands across this line, not uncertainty for a player about their actual visible cards. Joint prior is explicitly defined by independent raw proposals then physical compatibility conditioning, not asserted as a real postflop distribution.',source:'Nevir2.4 opening discussion motivates carrying both ranges; all opponent masses, responses and narrow two-class policies here are author inputs.',chance:'Given both hidden hands and flop,45 unseen legal turn cards; Qh likelihood is1/45 for compatible pairs and0 for pairs containingQh.',ownChartEligibility:'open-BTN KQs,KQo,Q3s all100%; only eligibility checked, no complete user BB policy or full hero strategy inferred',displayMassScale:4},outcomes:{reference:'value-trap-tree-evidence.json profiles/induces',rootEVByAction:valueByAction,cases,scope:'Decision grade holds the pre-decision model fixed. A realized loss alone does not prove the choice was right or wrong. Four selected outcomes cannot be averaged as EV or bb/100.'},release:{appChanged:false,learnerTrials:0,completeTargetStrategy:false}};
fs.writeFileSync(`${dir}/self-range-outcome-evidence.json`,JSON.stringify(out,null,2)+'\n');
const prompts={status:'public_author_demo_not_frozen_holdout',selfRange:{flop,turn,actualHero,own,other,jointPriorDefinition:'mass=own.mass×other.mass for physically compatible pairs, zero otherwise; normalize after the observed actions. Fixed turn likelihood1/45 when compatible.',versions:versions.map(v=>({id:v.id,ownBetPolicy:v.ownBetPolicy})),tasks:['只执行自己的下注筛选，先不动对手','再执行题设跟注筛选，比较两边留下什么','Qh发出后划掉双方冲突底牌','回到实际Qc3c这一行，不把整批范围平均当当前手牌赢面']},outcomes:{context:model.context,profileInputs:{weights:profile.weights,weakBet:profile.weakBet,airBet:profile.airBet,fold77ToHeroJam:profile.fold77ToHeroJam},policy:model.opponentPolicy,menu:model.treeScope,sequence:['按给定模型作决定','先按动作前信息显示比较结果','再播放所选合法分支并亮牌','判断一次输赢能否更改刚才的依据'],interpretationOptions:['仍按动作前信息与参考比较','输就是选错','赢就是选对','我不知道']},administration:'Show one stage at a time; later reveals and evidence file are teacher-side. All unknown answers on valid questions count as wrong; no persistence.'};
fs.writeFileSync(`${dir}/self-range-outcome-prompts.json`,JSON.stringify(prompts,null,2)+'\n');
console.log(JSON.stringify({ok:true,jointPriorPairs:prior.length,selfRange:versions.map(v=>({id:v.id,...v.summary})),outcomeCases:cases.map(c=>({id:c.id,best:c.decisionBestInGivenMenu,realized:c.realizedNetBB,expectedLoss:c.localExpectedLossBB})),status:out.status},null,2));
