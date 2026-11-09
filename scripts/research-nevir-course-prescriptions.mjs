import fs from 'node:fs';
import assert from 'node:assert/strict';
import {DECK,RANKS,card,assertCards,evaluate,compare,straightHigh,draws} from '../src/poker.js';
import charts from '../src/data/ranges.json' with {type:'json'};

// Compile stated course prescriptions. Never infer a solver policy from card counts.
const dir='research/nevir-system';
const claims=JSON.parse(fs.readFileSync(`${dir}/source-claims.json`,'utf8'));
const ownChart=charts.find(c=>c.id==='open-BTN'),bbChart=charts.find(c=>c.id==='bb-普通中');
const canonicalBoard=['As','7h','2d'],suits=['s','h','d','c'];
const claimById=id=>{const r=claims.reviews.find(r=>r.id===id);assert.ok(r);return r;};
assert.equal(claimById('R06').claim.frequency,0);assert.equal(claimById('R07').claim.frequency,100);
assert.equal(claimById('R37').claim.executionStatus,'stated_rule_application_only');
function handClass(ids){
 const cs=ids.map(card).sort((a,b)=>b.rank-a.rank);
 return cs.map(c=>RANKS[c.rank-2]).join('')+(cs[0].rank===cs[1].rank?'':cs[0].suit===cs[1].suit?'s':'o');
}
const context={players:6,activeSeats:['BTN','BB'],initialEffectiveBB:100,anteBB:0,street:'flop',potType:'single_raised',openToBB:2.5,heroSeat:'BTN',villainSeat:'BB',preflop:'UTG/HJ/CO fold; BTN open to2.5; SB fold; BB call',observedFlopAction:'BB check',actor:'BTN',toCallBB:0,money:{potBB:5.5,heroStackBB:97.5,villainStackBB:97.5,foldedStacksBB:399.5},sourceDepth:'The cited2.1 paragraph does not specify a full solver configuration;6max/100BB are declared training conditions, not recovered solver metadata.'};
const profiles={
 baseline:{label:'原文基础简化',sourceReviews:['R06','R07'],assumptions:['使用原文调整之前的基础简化','不附加后段过弃/少XR调整'],precision:'stated_course_action_rule',rawSolverClaim:false},
 adjusted:{label:'原文后段调整简化',sourceReviews:['R37'],assumptions:['题设明确采用原文的弃牌偏多、过牌加注偏少假设','采用该段最后给出的范围小注简化','不依据当前级别或玩家称呼自行推断'],precision:'adopted_conditional_course_simplification',rawSolverClaim:false}
};
function resolve(input){
 try{assertCards([...input.board,...input.hole].map(card));}catch{return{status:'reject',reason:'invalid_physical_cards'};}
 if(input.players!==6||!Array.isArray(input.activeSeats)||input.activeSeats.length!==2||!['BTN','BB'].every(s=>input.activeSeats.includes(s))||input.heroSeat!=='BTN'||input.villainSeat!=='BB'||input.initialEffectiveBB!==100||input.anteBB!==0||input.potType!=='single_raised'||input.openToBB!==2.5||input.street!=='flop')return{status:'reject',reason:'different_position_or_pot_context'};
 if(Object.keys(context.money).some(k=>input.money?.[k]!==context.money[k]))return{status:'reject',reason:'different_current_ledger'};
 if(input.actor!=='BTN'||input.observedFlopAction!=='BB check'||input.toCallBB!==0)return{status:'reject',reason:'not_this_free_action_node'};
 if(input.board.length!==3||[...input.board.map(id=>id[0])].sort().join('')!=='27A'||new Set(input.board.map(id=>id[1])).size!==3)return{status:'reject',reason:'outside_source_board'};
 const cls=handClass(input.hole);if(!(ownChart.hands[cls]?.action.raise>0))return{status:'reject',reason:'outside_chosen_preflop_prior_not_illegal_poker_hand'};
 if(!profiles[input.profile])return{status:'reject',reason:'version_not_declared'};
 if(input.profile==='adjusted')return{status:'course_rule',action:'bet_small',betFrequency:100,sourceReview:'R37'};
 if(cls.startsWith('KQ'))return{status:'course_rule',action:'check',betFrequency:0,sourceReview:'R06'};
 if(cls.startsWith('Q3'))return{status:'course_rule',action:'bet_small',betFrequency:100,sourceReview:'R07'};
 return{status:'reject',reason:'baseline_hand_not_compiled_not_a_fold_rule'};
}
function perms(xs){return xs.length?xs.flatMap((x,i)=>perms(xs.filter((_,j)=>i!==j)).map(t=>[x,...t])):[[]];}
const canonicalHoles=[];
for(let i=0;i<DECK.length;i++)for(let j=i+1;j<DECK.length;j++){
 const ids=[DECK[i].id,DECK[j].id],cls=handClass(ids);
 if(['KQs','KQo','Q3s'].includes(cls)&&ownChart.hands[cls].action.raise>0)canonicalHoles.push(ids);
}
assert.equal(canonicalHoles.length,20);
const cases=[];let sequence=1;
for(const permutation of perms(suits)){
 const map=id=>id[0]+permutation[suits.indexOf(id[1])];
 for(const hole of canonicalHoles)for(const profile of Object.keys(profiles)){
  const input={...context,board:canonicalBoard.map(map),hole:hole.map(map),profile};
  const answer=resolve(input);assert.equal(answer.status,'course_rule');
  cases.push({id:'CP'+String(sequence++).padStart(4,'0'),profile,board:input.board,hole:input.hole,handClass:handClass(input.hole),answer});
 }
}
assert.equal(cases.length,960);
const keys=cases.map(c=>[c.profile,c.board.join(''),[...c.hole].sort().join('')].join('|'));
assert.equal(new Set(keys).size,960);
const counts={};for(const c of cases){const key=c.profile+':'+c.answer.action;counts[key]=(counts[key]||0)+1;}
assert.deepEqual(counts,{'baseline:check':384,'adjusted:bet_small':480,'baseline:bet_small':96});

function rawRunoutFacts(hole){
 const available=DECK.filter(c=>![...canonicalBoard,...hole].includes(c.id));
 let total=0,straight=0,flush=0,both=0;
 for(let i=0;i<available.length;i++)for(let j=i+1;j<available.length;j++){
  total++;const cs=[...canonicalBoard,...hole].map(card).concat(available[i],available[j]);
  const st=straightHigh(cs)>0,fl=suits.some(s=>cs.filter(c=>c.suit===s).length>=5);
  if(st)straight++;if(fl)flush++;if(st&&fl)both++;
 }
 return{hole,total,straight,flush,both,union:straight+flush-both,immediateDraw:draws(hole.map(card),canonicalBoard.map(card)),scope:'Physical unordered two-card runout counts under own known cards only. Not the action-conditioned runout probability, winning equity, or action EV.'};
}
const runouts=[['Kc','Qc'],['Qc','3c'],['Kh','Qh'],['Qh','3h']].map(rawRunoutFacts).map(r=>({...r,immediateDraw:{backdoorFlush:r.immediateDraw.backdoorFlush,straightOuts:r.immediateDraw.straightOuts.map(c=>c.id),flushOuts:r.immediateDraw.flushOuts.map(c=>c.id)}}));
assert.deepEqual(runouts.map(r=>[r.total,r.straight,r.flush,r.both,r.union]),[[1081,16,0,0,16],[1081,16,0,0,16],[1081,16,45,1,60],[1081,16,45,1,60]]);
const target=['Qd','Tc'];
const targetComparisons=[['Kc','Qc'],['Qc','3c']].map(hole=>{
 assertCards([...canonicalBoard,...hole,...target].map(card));
 const hv=evaluate([...canonicalBoard,...hole].map(card)),tv=evaluate([...canonicalBoard,...target].map(card));
 const targetClass=handClass(target),targetRaw=bbChart.hands[targetClass].action.call;
 return{hole,target,heroBest:hv.value,targetBest:tv.value,comparison:compare(hv,tv),targetPriorCallMassPerCombo:targetRaw,scope:'Current five-card ordering and preflop eligibility only. No claim this target always folds or remains at this weight after BB checks.'};
});
assert.deepEqual(targetComparisons.map(c=>c.comparison),[1,-1]);assert.ok(targetComparisons.every(c=>c.targetPriorCallMassPerCombo===.5));
const guards=[
 {id:'Q3o',patch:{hole:['Qc','3d']},reason:'outside_chosen_preflop_prior_not_illegal_poker_hand'},
 {id:'wrong_position',patch:{heroSeat:'BB',villainSeat:'BTN'},reason:'different_position_or_pot_context'},
 {id:'three_way',patch:{activeSeats:['BTN','SB','BB']},reason:'different_position_or_pot_context'},
 {id:'facing_bet',patch:{observedFlopAction:'BB bet',toCallBB:2},reason:'not_this_free_action_node'},
 {id:'two_tone',patch:{board:['As','7s','2d']},reason:'outside_source_board'},
 {id:'different_ranks',patch:{board:['As','8h','3d'],hole:['Kc','Qc']},reason:'outside_source_board'},
 {id:'uncompiled_hand',patch:{hole:['Jc','Tc']},reason:'baseline_hand_not_compiled_not_a_fold_rule'},
 {id:'no_version',patch:{profile:null},reason:'version_not_declared'},
 {id:'different_depth',patch:{initialEffectiveBB:200},reason:'different_position_or_pot_context'},
 {id:'different_pot_type',patch:{potType:'three_bet'},reason:'different_position_or_pot_context'},
 {id:'different_open_size',patch:{openToBB:3},reason:'different_position_or_pot_context'},
 {id:'different_ledger',patch:{money:{potBB:6,heroStackBB:97.5,villainStackBB:97.5,foldedStacksBB:399.5}},reason:'different_current_ledger'}
].map(g=>{
 const input={...context,board:canonicalBoard,hole:['Kc','Qc'],profile:'baseline',...g.patch},result=resolve(input);
 assert.deepEqual(result,{status:'reject',reason:g.reason});return{...g,input,result};
});
assert.equal(resolve({...context,activeSeats:['BB','BTN'],money:{foldedStacksBB:399.5,villainStackBB:97.5,heroStackBB:97.5,potBB:5.5},board:canonicalBoard,hole:['Kc','Qc'],profile:'baseline'}).action,'check');
// Integer teaching chips;1BB=50 chips, not a claim about any platform's currency/rake.
const unitBB=50,startingPot=275,active=4875,folded=19975,small=Math.round(startingPot/3);
assert.equal(small,92);
const money={chipsPerBB:unitBB,initialChipsPerSeat:5000,sourceSize:'approximately one third pot',rounding:'Nearest whole teaching chip; half-up. No equivalence to a raw solver size claimed.',betChips:small,betBB:small/unitBB,actualPotFraction:small/startingPot,start:{potBB:5.5,heroStackBB:97.5,villainStackBB:97.5},branches:[
 {id:'hero_check',pot:startingPot,hero:active,villain:active,next:'street_closed'},
 {id:'hero_bet_wait',pot:startingPot+small,hero:active-small,villain:active,next:'wait_for_BB'},
 {id:'BB_call',pot:startingPot+2*small,hero:active-small,villain:active-small,next:'street_closed'},
 {id:'BB_fold',pot:0,hero:active-small+small+startingPot,villain:active,next:'settled',returnedUncalled:small,matchedPotAward:startingPot}
].map(r=>{assert.equal(r.pot+r.hero+r.villain+folded,30000);return{...r,potBB:r.pot/unitBB,heroStackBB:r.hero/unitBB,villainStackBB:r.villain/unitBB};}),rake:'none in the arithmetic example; not the source solver net pot',opponentResponses:'Observed author branch examples, not generated response probabilities or always-fold predictions'};
const tasks=[
 ['P01','read.context','确认当前是BTN对BB单加注底池，BB已过牌','context','先匹配情境，不能用另一个位置的规则'],
 ['P02','read.cards','对照QTo，点出当前领先与落后','targetComparisons','KQ当前领先，Q3当前落后；不等于未来权益'],
 ['P03','read.cards','找出两手各自成顺需要的两张','runouts','JT可让KQ成顺；45可让Q3成顺'],
 ['P04','compare.unopened','按基础版本为KQ选择过牌','baseline/KQ','这是原文简化执行，不是独立求解证明'],
 ['P05','compare.unopened','按同一版本为Q3s选择小注','baseline/Q3s','Q3s即使没有后门同花，也不由该标签单独决定动作'],
 ['P06','compare.unopened','两手都有后门同花时，再按规则作答','runouts/hearts','有后门不是覆盖所有具体规则的下注按钮'],
 ['P07','compare.unopened','只改变采用的课程版本，重新比较KQ动作','adjusted/KQ','调整版与基础版分开；不能从NL10或某类玩家称呼自动切换'],
 ['P08','execute.amount','执行给定小注92个教学筹码','money','显示约1/3；离散取整另记，不称原图精确EV最优尺度'],
 ['P09','update.response','分别看BB跟与弃，保留真实分支','money','跟后9.18；弃则退1.84再结算5.5；下注不保证弃牌'],
 ['P10','update.card','一轮结束后回到原主线的更新层','context','本单项完成不等于整手终局；下一街需要匹配的教学输入']
].map(([id,parent,action,evidence,criterion])=>({id,parent,action,evidence,criterion,unknownCountsAsError:true}));
const output={status:'compiled_stated_course_prescriptions_not_verified_GTO_or_NL50_policy',context,profiles,sourceReviews:['R06','R07','R37'].map(id=>claimById(id)),scope:{baselineCompiledClasses:['KQs','KQo','Q3s'],adjustedRule:'Source final range-bet simplification applies to eligible hands when expressly adopted; practice bank focuses on contrast families, not a huge always-bet quiz.',sourceAudience:'The note discusses NL5–NL25; this is not evidence of NL50 validity.',simplifiedOwnRangeCompatibility:'User BTN chart selects these three classes at100%; Q3o is excluded from this ordinary dealing domain. Full original source ranges and response policies are not recovered.',countsAre:'960 unique physical/profile variants of one A72 source family, not960 independent strategic situations.'},cases,counts,runouts,targetComparisons,guards,money,tasks,administration:{unknownCountsAsError:true,profileVisibleBeforeAnswer:true,noProfileSelectionFromStakeLabel:true,deterministicAnswers:true,answerSource:'stated_course_prescription',notUnseenHoldout:true,noLearnerPersistence:true},release:{courseRuleExecution:true,cardFacts:true,rawSolverFrequency:false,fullRangeBestResponse:false,preciseStrategyFirstHand:false,learnerTrials:0,NL50Verified:false}};
fs.writeFileSync(`${dir}/course-prescription-evidence.json`,JSON.stringify(output,null,2));
const publicCases=cases.map(({id,profile,board,hole})=>({id,profile,board,hole}));
fs.writeFileSync(`${dir}/course-prescription-prompts.json`,JSON.stringify({status:output.status,context,profiles:Object.fromEntries(Object.entries(profiles).map(([id,p])=>[id,{label:p.label,assumptions:p.assumptions}])),task:{prompt:'按本题采用的课程简化，现在选择什么？',options:['过牌','小注约1/3','我不知道'],scope:'课程规则执行；不是自行求解最佳动作。'},cases:publicCases,administration:output.administration},null,2));
console.log(JSON.stringify({status:output.status,cases:cases.length,counts,physicalRunouts:runouts.map(r=>({hole:r.hole,straight:r.straight,flush:r.flush,both:r.both,union:r.union})),currentComparisons:targetComparisons.map(c=>c.comparison),preflightGuards:guards.length,betBB:money.betBB,tasks:tasks.length},null,2));
