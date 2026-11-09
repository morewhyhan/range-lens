// Separate full-range course-connected reference request. Does not replace A72.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {DECK,RANKS,SUITS,card} from '../src/poker.js';
import {bbMap} from '../src/preflop.js';
const dir='research/nevir-system/',rangeRaw=fs.readFileSync('src/data/ranges.json'),charts=JSON.parse(rangeRaw),flop=['Qs','Qh','Qd'];
assert.equal(bbMap.SB[3],'小盲紧');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const originalSHA=sha(fs.readFileSync(dir+'reference-request-btn-bb-a72.json'));
function cls(ids){const h=ids.map(card).sort((a,b)=>b.rank-a.rank);return h.map(c=>RANKS[c.rank-2]).join('')+(h[0].rank===h[1].rank?'':h[0].suit===h[1].suit?'s':'o');}
function compile(id,action){
 const c=charts.find(c=>c.id===id);assert.ok(c);assert.equal(Object.keys(c.hands).length,169);
 const classWeights=Object.fromEntries(Object.entries(c.hands).map(([h,e])=>{assert.ok(Math.abs(Object.values(e.action).reduce((s,w)=>s+w,0)-1)<1e-12);const w=e.action[action]??0;assert.ok([0,.5,1].includes(w));return[h,w];}));
 const rootHands=[],all=[];
 for(let i=0;i<DECK.length;i++)for(let j=i+1;j<DECK.length;j++){
  const hole=[DECK[i].id,DECK[j].id],hand=cls(hole),weight=classWeights[hand];
  if(weight){all.push({hole,hand,weight});if(!hole.some(c=>flop.includes(c)))rootHands.push({hole,hand,weight});}
 }
 let physical=0,mass=0;
 for(const [h,w]of Object.entries(classWeights)){if(!w)continue;const a=RANKS.indexOf(h[0])+2,b=RANKS.indexOf(h[1])+2,na=4-flop.filter(c=>card(c).rank===a).length,nb=4-flop.filter(c=>card(c).rank===b).length,same=SUITS.filter(s=>!flop.includes(h[0]+s)&&!flop.includes(h[1]+s)).length;const n=a===b?na*(na-1)/2:h.endsWith('s')?same:na*nb-same;physical+=n;mass+=n*w;}
 assert.equal(rootHands.length,physical);assert.equal(rootHands.reduce((s,h)=>s+h.weight,0),mass);
 return {id,action,source:c.source,classWeights,rootHands,rangeStringDraft:Object.entries(classWeights).filter(([,w])=>w>0).map(([h,w])=>h+':'+w).join(','),summary:{positivePreflopHands:all.length,preflopMass:all.reduce((s,h)=>s+h.weight,0),positiveAfterFlop:physical,massAfterFlop:mass}};
}
const oop=compile('open-SB','raise'),ip=compile('bb-小盲紧','call');let compatiblePairs=0,jointMass=0;
for(const a of oop.rootHands)for(const b of ip.rootHands)if(!a.hole.some(c=>b.hole.includes(c))){compatiblePairs++;jointMass+=a.weight*b.weight;}
const original=fs.readFileSync('C:/Users/why/Desktop/笔记 Nevir/2.7-不利位置单次加注底池_中文笔记.md');
assert.ok(original.toString('utf8').includes('部分牌面（如QQQ）'));
const output={status:'separate_full_range_reference_request_not_solved',id:'REF_SB_BB_QQQ_100_3BB_zero_rake_v1',
 source:{rangesSHA256:sha(rangeRaw),mappingSHA256:sha(fs.readFileSync('src/preflop.js')),courseFile:'C:/Users/why/Desktop/笔记 Nevir/2.7-不利位置单次加注底池_中文笔记.md',courseSHA256:sha(original),courseLines:[8,13,14],courseClaim:'QQQ used as a blind-versus-blind high-frequency cbet example; no exact full source configuration recovered.'},
 originalA72:{file:'reference-request-btn-bb-a72.json',sha256:originalSHA,preserved:true,stillRequired:true},
 context:{playersAtDeal:6,postflopPlayers:2,initialEffectiveBB:100,oopSeat:'SB',ipSeat:'BB',openToBB:3,preflop:'UTG/HJ/CO/BTN fold; SB raises to3; BB calls',flop,turn:null,river:null,firstActor:'SB',startingPotBB:6,eachStackBB:97,foldedStacksBB:400,conditionTime:'Before SB first flop action; no action forced.'},
 ranges:{oop,ip},jointPrior:{compatiblePairs,unnormalizedMass:jointMass,definition:'Product of literal user-chart weights, conditioned on flop and distinct holdings; no bunching.'},
 moneyUnits:{unitsPerBB:100,startingPot:600,effectiveStack:9700,foldedStacks:40000,totalTableUnits:60000},
 researchAssumptions:{rakeRate:0,rakeCap:0,foldedCardModel:'No bunching',configurationIdentity:'Author research with user simplified roots; not reconstructed course solver settings or target NL50 rake.'},
 requestedTree:{bothPlayers:{flopBets:['33%','67%','all-in'],turnBets:['75%','all-in'],riverBets:['75%','all-in'],raises:['2.5x','all-in']},turnDonk:'default declared menu',riverDonk:'default declared menu',mergeThreshold:0,forceAllinThreshold:0,addAllinThreshold:0},
 engineRevision:'9d1509fe5077d019825f833eed04b16d342dfda1',solve:{started:false,achievedMetric:null,stoppingReason:null},
 purpose:'A distinct needed OOP SRP course case with both raiser and caller roots, two flop bet sizes and all future streets preserved. Not a replacement or reduced version of the original A72 request.',
 release:{preciseActionGrading:false,fullCourseValidation:false,NL50Benchmark:false,learnerTrials:0}};
assert.equal(600+9700*2+40000,60000);
output.inputFingerprint=sha(JSON.stringify({source:output.source,context:output.context,ranges:{oop:oop.classWeights,ip:ip.classWeights},money:output.moneyUnits,assumptions:output.researchAssumptions,tree:output.requestedTree,engine:output.engineRevision}));
assert.equal(sha(fs.readFileSync(dir+'reference-request-btn-bb-a72.json')),originalSHA);
fs.writeFileSync(dir+'reference-request-sb-bb-qqq.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,oop:oop.summary,ip:ip.summary,compatiblePairs,jointMass,solveStarted:false,originalA72Preserved:true}));
