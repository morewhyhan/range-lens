import fs from 'node:fs';
import assert from 'node:assert/strict';
import {DECK,RANKS,card,assertCards,evaluate,compare,draws} from '../src/poker.js';
import charts from '../src/data/ranges.json' with {type:'json'};

// Generic flop facts, then a source-limited policy lookup. The fact classifier never chooses an action.
const dir='research/nevir-system',board=['Js','9d','5d'],ownChart=charts.find(c=>c.id==='open-BTN');
const claims=JSON.parse(fs.readFileSync(`${dir}/source-claims.json`,'utf8'));
assert.equal(claims.reviews.find(r=>r.id==='R38').claim.frequency,0);
assert.equal(claims.reviews.find(r=>r.id==='R39').claim.frequency,null);
assert.equal(claims.reviews.find(r=>r.id==='R40').status,'requires_source_resolution');
assert.deepEqual(claims.reviews.find(r=>r.id==='R31').claim.ruleBranches.map(r=>r.betFrequency),[100,0]);
const context={players:6,activeSeats:['BTN','BB'],initialEffectiveBB:100,potType:'single_raised',heroSeat:'BTN',villainSeat:'BB',actor:'BTN',observedFlopAction:'BB check',toCallBB:0,sourceVersion:'J95_base_66',suitAssignment:'Author representative with J as singleton suit and9/5 the shared suit; not recovered original diagram',priorRole:'Only preflop positive-opening eligibility is used; not a full action-conditioned current range.'};
function cls(hole){const a=hole.map(card).sort((a,b)=>b.rank-a.rank);return a.map(c=>RANKS[c.rank-2]).join('')+(a[0].rank===a[1].rank?'':a[0].suit===a[1].suit?'s':'o');}
function facts(holeIds,boardIds){
 assert.equal(boardIds.length,3);assert.equal(holeIds.length,2);
 const hole=holeIds.map(card),b=boardIds.map(card);assertCards([...hole,...b]);
 const value=evaluate([...hole,...b]),bs=b.map(c=>c.rank).sort((a,b)=>b-a),unpaired=new Set(bs).size===3;
 const pocket=hole[0].rank===hole[1].rank;
 let role=['high_card','one_pair','two_pair','trips','straight','flush','full_house','quads','straight_flush'][value.value[0]],pairRank=null,kickerRank=null;
 if(value.value[0]===1){
  pairRank=value.value[1];
  if(!unpaired)role='board_pair_only';
  else if(pocket){const r=hole[0].rank;role=r>bs[0]?'pocket_above_board':r>bs[1]?'pocket_between_top_middle':r>bs[2]?'pocket_between_middle_bottom':'pocket_below_board';}
  else{role=['top_pair','middle_pair','bottom_pair'][bs.indexOf(pairRank)];kickerRank=hole.find(c=>c.rank!==pairRank).rank;}
 }
 if(value.value[0]===3)role=pocket&&b.some(c=>c.rank===hole[0].rank)?'set':new Set(bs).size===1?'board_trips':'trips';
 const d=draws(hole,b),direct=d.straightOuts.length>0||d.flushOuts.length>0;
 return{hole:holeIds,board:boardIds,handClass:cls(holeIds),madeCategory:value.name,madeValue:value.value,madeRole:role,pairRank,kickerRank,draw:{straightType:d.straightType,nominalStraightOuts:d.straightOuts.map(c=>c.id),nominalFlushOuts:d.flushOuts.map(c=>c.id),backdoorFlushSuits:d.backdoorFlush,hasDirectDraw:direct,madeAndDirect:value.value[0]>=1&&direct},scope:'Current five-card category plus nominal draw facts, not action EV or clean winning outs.'};
}
const available=DECK.filter(c=>!board.includes(c.id)),all=[];
for(let i=0;i<available.length;i++)for(let j=i+1;j<available.length;j++)all.push(facts([available[i].id,available[j].id],board));
const roleCounts={};for(const r of all)roleCounts[r.madeRole]=(roleCounts[r.madeRole]||0)+1;
assert.equal(all.length,1176);
assert.deepEqual(roleCounts,{pocket_below_board:18,high_card:720,bottom_pair:120,pocket_between_middle_bottom:18,middle_pair:120,top_pair:120,set:9,two_pair:27,pocket_between_top_middle:6,pocket_above_board:18});
const drawCounts={straight:all.filter(r=>r.draw.nominalStraightOuts.length).length,flush:all.filter(r=>r.draw.nominalFlushOuts.length).length,both:all.filter(r=>r.draw.nominalStraightOuts.length&&r.draw.nominalFlushOuts.length).length,madeAndDirect:all.filter(r=>r.draw.madeAndDirect).length};
assert.deepEqual(drawCounts,{straight:144,flush:55,both:9,madeAndDirect:10});
function resolve(hole,b,ctx=context){
 try{assert.equal(hole.length,2);assert.equal(b.length,3);assertCards([...hole,...b].map(card));}catch{return{status:'reject',reason:'invalid_physical_input'};}
 if(ctx.heroSeat!=='BTN'||ctx.villainSeat!=='BB'||ctx.potType!=='single_raised'||ctx.players!==6||ctx.activeSeats.length!==2||!ctx.activeSeats.includes('BTN')||!ctx.activeSeats.includes('BB')||ctx.initialEffectiveBB!==100)return{status:'reject',reason:'different_context'};
 if(ctx.actor!=='BTN'||ctx.observedFlopAction!=='BB check'||ctx.toCallBB!==0||ctx.sourceVersion!=='J95_base_66')return{status:'reject',reason:'different_node_or_version'};
 const ordered=[...b].sort((a,c)=>card(c).rank-card(a).rank);
 if(ordered.map(c=>c[0]).join('')!=='J95'||ordered[0][1]===ordered[1][1]||ordered[1][1]!==ordered[2][1])return{status:'reject',reason:'outside_declared_source_representative'};
 const f=facts(hole,b);
 if(f.madeRole!=='top_pair'||f.pairRank!==11)return{status:'reject',reason:'not_current_single_top_pair_J'};
 if(f.kickerRank>7)return{status:'reject',reason:'not_compiled_as_pure_weak_pair_action'};
 if(f.draw.hasDirectDraw)return{status:'reject',reason:'direct_draw_needs_separate_reference'};
 if(!(ownChart.hands[f.handClass]?.action.raise>0))return{status:'reject',reason:'outside_selected_preflop_prior'};
 return{status:'stated_course_subset',action:'check',betFrequency:0,sourceReview:'R38'};
}
const canonical=all.filter(r=>resolve(r.hole,board).status==='stated_course_subset');assert.equal(canonical.length,6);
function perms(xs){return xs.length?xs.flatMap((x,i)=>perms(xs.filter((_,j)=>i!==j)).map(t=>[x,...t])):[[]];}
const suitNames=['s','h','d','c'],uniqueWeak=new Map();
for(const p of perms(suitNames))for(const r of canonical){
 const map=id=>id[0]+p[suitNames.indexOf(id[1])],b=board.map(map),hole=r.hole.map(map),answer=resolve(hole,b);
 assert.equal(answer.status,'stated_course_subset');const key=b.join('')+'|'+[...hole].sort().join('');
 uniqueWeak.set(key,{board:b,hole,handClass:cls(hole),preflopRaiseWeight:ownChart.hands[cls(hole)].action.raise,answer});
}
const weakCases=[...uniqueWeak.values()].map((c,i)=>({id:'WJ'+String(i+1).padStart(3,'0'),...c}));assert.equal(weakCases.length,72);
const diagnosticSpecs=[
 ['plain_J7',['Jc','7c'],board,'top_pair'],['two_pair_J5',['Jc','5c'],board,'two_pair'],['set_99',['9s','9c'],board,'set'],['J7_flush_draw',['Jd','7d'],board,'top_pair'],
 ['J8',['Jc','8c'],board,'top_pair'],['AJ',['Ac','Jh'],board,'top_pair'],['QQ',['Qs','Qc'],board,'pocket_above_board'],['TT',['Ts','Tc'],board,'pocket_between_top_middle'],['77',['7s','7c'],board,'pocket_between_middle_bottom'],
 ['monotone_flush',['Ks','Qs'],['As','8s','5s'],'flush'],['paired_trips',['Kc','Qc'],['Ks','Kh','2d'],'trips'],['board_pair',['Ac','Qc'],['Ks','Kh','2d'],'board_pair_only'],['board_trips',['Ac','Kc'],['Qs','Qh','Qd'],'board_trips'],
 ['quads',['Qc','Ac'],['Qs','Qh','Qd'],'quads'],['full_house',['Kc','2c'],['Ks','Kh','2d'],'full_house'],['straight_plus_draw',['Ts','9s'],['8s','7s','6d'],'straight'],['straight_flush',['Ts','9s'],['8s','7s','6s'],'straight_flush'],['low_overpair',['As','Ac'],['7s','4h','3d'],'pocket_above_board']
];
const diagnostics=diagnosticSpecs.map(([id,h,b,role])=>{const f=facts(h,b);assert.equal(f.madeRole,role);return{id,...f};});
const suitDiagnostics=[facts(['Kd','7c'],board),facts(['Kd','7d'],board),facts(['Kd','7c'],['Jd','9h','5h']),facts(['Kd','7d'],['Jd','9h','5h'])];
assert.deepEqual(suitDiagnostics.map(f=>[f.draw.nominalFlushOuts.length,f.draw.backdoorFlushSuits.includes('d')]),[[0,true],[9,false],[0,false],[0,true]]);
const guardSpecs=[
 ['J5',['Jc','5c'],{},'not_current_single_top_pair_J'],['J9',['Jc','9c'],{},'not_current_single_top_pair_J'],['99',['9s','9c'],{},'not_current_single_top_pair_J'],['77',['7s','7c'],{},'not_current_single_top_pair_J'],
 ['J7_direct',['Jd','7d'],{},'direct_draw_needs_separate_reference'],['J8',['Jc','8c'],{},'not_compiled_as_pure_weak_pair_action'],['AJ',['Ac','Jh'],{},'not_compiled_as_pure_weak_pair_action'],['J3s',['Jc','3c'],{},'outside_selected_preflop_prior'],
 ['facing_bet',['Jc','7c'],{observedFlopAction:'BB bet',toCallBB:2},'different_node_or_version'],['3bet',['Jc','7c'],{potType:'three_bet'},'different_context'],['adjusted',['Jc','7c'],{sourceVersion:'population_adjusted'},'different_node_or_version'],['duplicate_card',['Js','7c'],{},'invalid_physical_input']
];
const guards=guardSpecs.map(([id,h,patch,reason])=>{const result=resolve(h,board,{...context,...patch});assert.deepEqual(result,{status:'reject',reason});return{id,hole:h,patch,reason,result};});
const wrongBoardResult=resolve(['Jc','7c'],['As','7h','2d']);assert.deepEqual(wrongBoardResult,{status:'reject',reason:'outside_declared_source_representative'});
guards.push({id:'different_board',hole:['Jc','7c'],board:['As','7h','2d'],reason:'outside_declared_source_representative',result:wrongBoardResult});

// Mix only source-supported action cases. Never promote J8/AJ preferences to pure actions.
const a72=JSON.parse(fs.readFileSync(`${dir}/course-prescription-evidence.json`,'utf8'));
const t85Board=['Th','8d','5c'],q7=[];
assert.ok(ownChart.hands.Q7s.action.raise>0);
for(const p of perms(suitNames))for(const suit of suitNames){
 const map=id=>id[0]+p[suitNames.indexOf(id[1])],b=t85Board.map(map),hole=['Q'+suit,'7'+suit].map(map),f=facts(hole,b),bet=f.draw.backdoorFlushSuits.length>0;
 q7.push({board:b,hole,answer:{status:'stated_course_subset',action:bet?'bet':'check',betFrequency:bet?100:0,sourceReview:'R31'}});
}
assert.equal(new Set(q7.map(c=>c.board.join('')+'|'+c.hole.join(''))).size,96);
const mixed=[
 ...a72.cases.filter(c=>c.profile==='baseline').map(c=>({family:'A72_base',origin:c.id,board:c.board,hole:c.hole,answer:{...c.answer,action:c.answer.action==='bet_small'?'bet':c.answer.action},sourceSize:'approximately_one_third'})),
 ...q7.map((c,i)=>({family:'T85_Q7s',origin:'Q7_'+i,...c,sourceSize:'source_66_percent_not_imported_67'})),
 ...weakCases.map(c=>({family:'J95_weak_pair',origin:c.id,board:c.board,hole:c.hole,answer:c.answer,sourceSize:'source_66_percent_if_betting_not_an_action_instruction'}))
].map((c,i)=>({id:'MX'+String(i+1).padStart(4,'0'),...c}));
assert.equal(mixed.length,648);
const mixedCounts={};for(const c of mixed){const key=c.family+':'+c.answer.action;mixedCounts[key]=(mixedCounts[key]||0)+1;}
assert.deepEqual(mixedCounts,{'A72_base:bet':96,'A72_base:check':384,'T85_Q7s:bet':72,'T85_Q7s:check':24,'J95_weak_pair:check':72});
const comparisons=[
 {hero:['Jc','8c'],villain:['Jh','7h']},{hero:['Jc','5c'],villain:['Jh','8h']},{hero:['9s','9c'],villain:['Jh','8h']}
].map(c=>{assertCards([...board,...c.hero,...c.villain].map(card));return{...c,comparison:compare(evaluate([...board,...c.hero].map(card)),evaluate([...board,...c.villain].map(card)))};});
assert.ok(comparisons.every(c=>c.comparison===1));
const tasks=[
 ['H01','read.cards','先分无对、一对、两对及以上','1176事实域，不对应1176道战略题'],['H02','read.cards','点出哪两张或哪三张形成当前牌型','J5是两对，99是三条'],['H03','read.cards','看成对的牌来自哪里，再看另一张','口袋对子和顶对不能混'],['H04','read.cards','在成牌层上另加直接听牌标记','J7同样一对，带花听另列'],
 ['H05','compare.unopened','执行已经编译的弱顶对子集简化','只在匹配节点判过牌'],['H06','compare.unopened','J8/AJ的原文方向保留其精度','不生成100%纯动作答案'],['H07','read.cards','核对方片是直接听花还是后门','缺完整花色的动作题不发布'],['H08','compare.unopened','在三个来源情境中自行调用规则','隐藏章节标题，保留必要牌和基础版本'],['H09','update.response','从原处完成动作，再等待真实回应','本街结束才进入更新']
].map(([id,parent,action,criterion])=>({id,parent,action,criterion,unknownCountsAsError:true}));
const out={status:'generic_flop_facts_and_source_limited_J95_subset_not_full_strategy',context,canonicalBoard:board,allPhysicalHoldings:all,roleCounts,drawCounts,weakCases,diagnostics,suitDiagnostics,guards,comparisons,sourceReviews:['R38','R39','R40'].map(id=>{const r=claims.reviews.find(r=>r.id===id);assert.ok(r);return r;}),tasks,release:{physicalFlopFacts:true,weakTopPairCourseSubset:true,allJxPureActionChart:false,diamondBluffRule:false,learnerTrials:0,NL50Verified:false}};
fs.writeFileSync(`${dir}/j95-hand-role-evidence.json`,JSON.stringify(out,null,2));
const mixedOut={status:'three_source_family_retrieval_not_frozen_transfer_test',context:a72.context,cases:mixed,counts:mixedCounts,administration:{answerScope:'adopted_source_simplifications',hideFamilyNameBeforeAnswer:true,showBasicVersion:true,doNotInferRealDealFrequency:true,selectFamiliesBeforeWithinFamilyCases:true,notUnseenHoldout:true,noLearnerPersistence:true,unknownCountsAsError:true},sourceBoundary:'J95 weak-pair rule is a conservative subset; J8/AJ preferences and diamond ambiguity are not converted to pure actions. Physical suit variants do not add independent source families.'};
fs.writeFileSync(`${dir}/mixed-course-prescription-evidence.json`,JSON.stringify(mixedOut,null,2));
fs.writeFileSync(`${dir}/mixed-course-prescription-prompts.json`,JSON.stringify({status:mixedOut.status,context:a72.context,task:{prompt:'使用已学过的本例基础简化，现在选择什么？',options:['过牌','下注','我不知道'],precision:'按明确来源规则执行，不是独立GTO求解'},cases:mixed.map(({id,board,hole})=>({id,board,hole})),administration:mixedOut.administration},null,2));
console.log(JSON.stringify({physicalFlopHoldings:all.length,roleCounts,drawCounts,weakCourseCases:weakCases.length,diagnosticStates:diagnostics.length,suitDiagnostics:4,guards:guards.length,mixedCases:mixed.length,mixedCounts,status:out.status},null,2));
