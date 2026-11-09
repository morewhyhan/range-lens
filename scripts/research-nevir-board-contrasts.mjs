import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {DECK,card,draws,evaluate} from '../src/poker.js';

// Research content only. Physical possibilities are never converted into strategy weights.
const dir='research/nevir-system';
const imported=JSON.parse(fs.readFileSync('src/data/sources.json','utf8'));
const sheet=imported.postflop.find(s=>s.name==='牌面分支与原因');
const sourceRows=Array.from({length:13},(_,i)=>'D'+String(i+1).padStart(2,'0')).map(id=>{
 const row=sheet.rows.find(r=>r.values.B?.startsWith(id));assert.ok(row);
 return {id,sheet:sheet.name,row:row.row,fields:row.values};
});
const note='C:/Users/why/Desktop/笔记 Nevir/2.2-有利位置3bet底池—第一部分_中文笔记.md';
const noteText=fs.readFileSync(note,'utf8');
const boardDefs=[{id:'T72r',cards:['Ts','7h','2d']},{id:'T72tt',cards:['Ts','7s','2d']},{id:'T82r',cards:['Ts','8h','2d']},{id:'T98r',cards:['Ts','9h','8d']}];
const windows=Array.from({length:10},(_,i)=>Array.from({length:5},(_,j)=>i+j+1));
// Independent rank-window membership, without evaluate/straightHigh/draws.
function hasStraight(ids){const rs=new Set(ids.map(id=>card(id).rank));if(rs.has(14))rs.add(1);return windows.some(w=>w.every(r=>rs.has(r)));}
function rankWindowOuts(ids){if(hasStraight(ids))return[];return Array.from({length:13},(_,i)=>i+2).filter(r=>hasStraight([...ids,DECK.find(c=>c.rank===r).id]));}
function cls(ids){const rs=ids.map(id=>card(id).rank).sort((a,b)=>b-a);return rs.map(r=>'23456789TJQKA'[r-2]).join('');}
function facts(board,hole){
 const b=board.map(card),h=hole.map(card),d=draws(h,b);
 return{board,hole,madeValue:evaluate([...h,...b]).value,straightMade:d.madeStraight,straightOutRanks:d.straightRanks,straightType:d.straightType,flushOutCards:d.flushOuts.map(c=>c.id),backdoorFlushSuits:d.backdoorFlush};
}
const boards=boardDefs.map(def=>{
 const available=DECK.filter(c=>!def.cards.includes(c.id)),straightClasses=new Set(),drawClasses=new Set();
 let made=0,direct=0,flush=0;
 for(let i=0;i<available.length;i++)for(let j=i+1;j<available.length;j++){
  const hole=[available[i].id,available[j].id],f=facts(def.cards,hole),all=[...def.cards,...hole];
  assert.equal(f.straightMade,hasStraight(all));assert.deepEqual(f.straightOutRanks,rankWindowOuts(all));
  const suitCounts={};for(const id of all)suitCounts[id[1]]=(suitCounts[id[1]]||0)+1;
  const expectedFD=Object.values(suitCounts).includes(4)?9:0;
  assert.equal(f.flushOutCards.length,expectedFD);
  if(f.straightMade){made++;straightClasses.add(cls(hole));}
  if(f.straightOutRanks.length){direct++;drawClasses.add(cls(hole));}
  if(f.flushOutCards.length)flush++;
 }
 return{...def,physicalHoldings:1176,madeStraightHoldings:made,madeStraightClasses:[...straightClasses].sort(),directStraightDrawHoldings:direct,directStraightDrawClasses:[...drawClasses].sort(),directFlushDrawHoldings:flush};
});
assert.equal(boards[0].madeStraightHoldings,0);assert.equal(boards[2].madeStraightHoldings,0);
assert.deepEqual(boards[3].madeStraightClasses,['76','J7','QJ']);assert.equal(boards[3].madeStraightHoldings,48);
assert.equal(boards[0].directFlushDrawHoldings,0);assert.equal(boards[1].directFlushDrawHoldings,55);
const pairDefs=[
 {id:'BC01',source:'D05',hole:['As','Qs'],before:'T72r',after:'T72tt',changed:'board7 suit h→s',prompt:'这手AQ从需要连来两张黑桃，变成下一张黑桃就成花了吗？'},
 {id:'BC02',source:'D06',hole:['Js','9c'],before:'T72r',after:'T82r',changed:'board7h→8h',prompt:'J9下一张来哪些点数能成顺？变化前后分别点出。'},
 {id:'BC03',source:'D06',hole:['9s','8c'],before:'T72r',after:'T82r',changed:'board7h→8h',prompt:'原来的T72真的没有两头顺听吗？先看98，再看新牌面。'},
 {id:'BC04',source:'D07',hole:['Qs','Jc'],before:'T82r',after:'T98r',changed:'board8h→9h and2d→8d; two rank fields',prompt:'QJ是还需要一张牌，还是已经成顺？不要把两处改动说成一次发牌。'}
];
const teacher=pairDefs.map(p=>({...p,beforeFacts:facts(boardDefs.find(b=>b.id===p.before).cards,p.hole),afterFacts:facts(boardDefs.find(b=>b.id===p.after).cards,p.hole),strategyActionAnswer:null,answerScope:'physical facts only; source main size is not this hole combination action'}));
assert.equal(teacher[0].beforeFacts.backdoorFlushSuits[0],'s');assert.equal(teacher[0].afterFacts.flushOutCards.length,9);
assert.deepEqual(teacher[1].beforeFacts.straightOutRanks,[8]);assert.deepEqual(teacher[1].afterFacts.straightOutRanks,[7,12]);
assert.deepEqual(teacher[2].beforeFacts.straightOutRanks,[6,11]);assert.equal(teacher[3].afterFacts.madeValue[0],4);
// Authored physical examples, not recovered original diagrams or new strategy prescriptions.
const roleDefinitions=[
 ['RC01','D01','As 7h 2d','As Kh 2d','Kc Qc','Kc Qc',[0,14,13,12,7,2],[1,13,14,12,2]],
 ['RC02','D01','As 7h 2d','As Kh 2d','Ac Kc','Ac Kc',[1,14,13,7,2],[2,14,13,2]],
 ['RC03','D02','As 7h 2d','As 5h 4d','3c 2c','3c 2c',[1,2,14,7,3],[4,5]],
 ['RC04','D02','As 7h 2d','As 9h 8d','Js Tc','Js Tc',[0,14,11,10,7,2],[0,14,11,10,9,8]],
 ['RC05','D03','Ks 5h 2d','Qs 5h 2d','Ac Kc','Ac Kc',[1,13,14,5,2],[0,14,13,12,5,2]],
 ['RC06','D03','Ks 5h 2d','Qs 5h 2d','Ac Qc','Ac Qc',[0,14,13,12,5,2],[1,12,14,5,2]],
 ['RC07','D04','Ks 5h 2d','Ks Qh Jd','Ac Tc','Ac Tc',[0,14,13,10,5,2],[4,14]],
 ['RC08','D04','Ks 5h 2d','Ks Qh Jd','Qc Jc','Qc Jc',[0,13,12,11,5,2],[2,12,11,13]],
 ['RC09','D04','Ks 5h 2d','Ks Qh Jd','Ac Ad','Ac Ad',[1,14,13,5,2],[1,14,13,12,11]],
 ['RC10','D08','8s 4h 2d','4s 5h 6d','7c 8c','7c 8c',[1,8,7,4,2],[4,8]],
 ['RC11','D09','4s 5h 6d','9s 8h 7d','7c 7h','7c 7h',[1,7,6,5,4],[3,7,9,8]],
 ['RC12','D09','4s 5h 6d','9s 8h 7d','8c 8d','8c 8d',[1,8,6,5,4],[3,8,9,7]],
 ['RC13','D09','4s 5h 6d','9s 8h 7d','6c 6h','6c 6h',[3,6,5,4],[1,6,9,8,7]],
 ['RC14','D10','Ts 2h 2d','Ts Th 5d','Jc Tc','Jc Tc',[2,10,2,11],[3,10,11,5]],
 ['RC15','D11','Qs Qh 2d','Qs Qh Qd','8c 8h','8c 8h',[2,12,8,2],[6,12,8]],
 ['RC16','D11','Qs Qh 2d','Qs Qh Qd','Qc Jc','Qc Jc',[3,12,11,2],[7,12,11]],
 ['RC17','D12','2s 5s 8s','2s 5s 8s','Ac Ad','As Ad',[1,14,8,5,2],[1,14,8,5,2]],
 ['RC18','D13','2s 5s 8s','2s 5s 8s','As Js','Qs Js',[5,14,11,8,5,2],[5,12,11,8,5,2]]
];
const rolePairs=roleDefinitions.map(([id,source,b0,b1,h0,h1,v0,v1])=>{
 const beforeFacts=facts(b0.split(' '),h0.split(' ')),afterFacts=facts(b1.split(' '),h1.split(' '));
 assert.deepEqual(beforeFacts.madeValue,v0,id+' before golden');assert.deepEqual(afterFacts.madeValue,v1,id+' after golden');
 return{id,source,beforeFacts,afterFacts,changes:{boardRemoved:beforeFacts.board.filter(c=>!afterFacts.board.includes(c)),boardAdded:afterFacts.board.filter(c=>!beforeFacts.board.includes(c)),holeRemoved:beforeFacts.hole.filter(c=>!afterFacts.hole.includes(c)),holeAdded:afterFacts.hole.filter(c=>!beforeFacts.hole.includes(c))},strategyActionAnswer:null,scope:'Authored physical diagnostic; complete five-card golden vectors do not certify source policy.'};
});
assert.deepEqual(rolePairs[3].afterFacts.straightOutRanks,[7,12]);
assert.deepEqual(rolePairs[10].beforeFacts.straightOutRanks,[3,8]);
assert.equal(rolePairs[16].beforeFacts.flushOutCards.length,0);assert.equal(rolePairs[16].afterFacts.flushOutCards.length,9);
assert.equal(rolePairs[17].beforeFacts.madeValue[0],rolePairs[17].afterFacts.madeValue[0]);
const coveredSourceFamilies=[...new Set([...teacher,...rolePairs].map(p=>p.source))].sort();assert.equal(coveredSourceFamilies.length,13);
const evidence={status:'source_condition_contrasts_and_physical_facts_not_complete_policy_or_learner_result',source:{note,sha256:crypto.createHash('sha256').update(noteText).digest('hex'),sections:['3.4','3.7','3.8'],rows:sourceRows,precision:'Original note uses66%/2/3 forT72r; imported D05/D06 use67. No silent numeric normalization.'},scope:'All legal physical holdings, before action weighting; suit assignments authored for illustration. Not opponent range frequencies, equity or action EV.',boards,pairs:teacher,independentChecks:{boards:4,holdings:4704,method:'Independent rank windows and suit counts compared with current evaluator draw facts'}};
fs.writeFileSync(`${dir}/board-contrast-evidence.json`,JSON.stringify(evidence,null,2)+'\n');
const roleEvidence={status:'physical_reading_diagnostics_not_pure_action_policy',sourceRows,coveredSourceFamilies,sourceProvenance:'Imported row annotations, not a fresh semantic review of every cited original paragraph. Authored card assignments are explicit.',pairs:rolePairs,goldenChecks:36};
fs.writeFileSync(`${dir}/board-role-contrast-evidence.json`,JSON.stringify(roleEvidence,null,2)+'\n');
fs.writeFileSync(`${dir}/board-role-contrast-prompts.json`,JSON.stringify({status:'public_reading_diagnostics_not_frozen_holdout',prompt:'两边分别是什么当前牌型？选出组成牌型的牌；再指出直接听牌关系。这里不考下注动作。',optionsIncludeUnknown:true,pairs:rolePairs.map(p=>({id:p.id,beforeBoard:p.beforeFacts.board,afterBoard:p.afterFacts.board,beforeHole:p.beforeFacts.hole,afterHole:p.afterFacts.hole})),presentation:'Alternative flop or hole scenarios, never concatenated as real card history.'},null,2)+'\n');
fs.writeFileSync(`${dir}/board-contrast-prompts.json`,JSON.stringify({status:'public_physical_contrast_practice_not_frozen_holdout',presentation:'One pair in the same restored decision; after-board is an alternative scenario, never a legal turn replacing flop.',pairs:teacher.map(p=>({id:p.id,hole:p.hole,beforeBoard:p.beforeFacts.board,afterBoard:p.afterFacts.board,prompt:p.prompt})),unknownCountsAsError:true},null,2)+'\n');
console.log(JSON.stringify({ok:true,boards,pairedTasks:teacher.length,additionalRolePairs:rolePairs.length,coveredSourceFamilies,goldenFiveCardChecks:36,independentChecks:evidence.independentChecks},null,2));
