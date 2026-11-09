import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {DECK,card,assertCards,draws} from '../src/poker.js';
import {turnRules} from '../src/rules.js';
const dir='research/nevir-system';
const registry=JSON.parse(fs.readFileSync(`${dir}/source-claims.json`,'utf8'));
const sourceData=JSON.parse(fs.readFileSync('src/data/sources.json','utf8'));
const turnSheet=sourceData.postflop.find(s=>s.name==='05 转牌路线');
const permute=a=>a.length?a.flatMap((v,i)=>permute(a.filter((_,n)=>n!==i)).map(p=>[v,...p])):[[]];
const maps=permute(['s','h','d','c']).map(p=>Object.fromEntries(['s','h','d','c'].map((s,i)=>[s,p[i]])));
const sortedFlop=ids=>ids.slice(0,3).slice().sort().join(' ');
function equivalent(a,b){return maps.some(m=>{const ids=a.map(c=>c[0]+m[c[1]]);return sortedFlop(ids)===sortedFlop(b)&&ids[3]===b[3];});}
function counts(board){
 assertCards(board.map(card));const available=DECK.filter(c=>!board.includes(c.id));let fd=0,made=0,total=0;
 for(let i=0;i<available.length;i++)for(let j=i+1;j<available.length;j++){
  const hole=[available[i],available[j]],d=draws(hole,board.map(card));total++;if(d.flushOuts.length)fd++;if(d.madeFlush)made++;
 }
 const suitCounts=['s','h','d','c'].map(s=>board.filter(c=>c[1]===s).length);
 const expectedFD=suitCounts.includes(4)?39*38/2:suitCounts.includes(3)?10*38:suitCounts.includes(2)?11*10/2:0;
 const expectedMade=suitCounts.includes(4)?1128-39*38/2:suitCounts.includes(3)?10*9/2:0;
 assert.equal(total,1128);assert.equal(fd,expectedFD);assert.equal(made,expectedMade);
 return{legalPhysicalHoldings:total,nominalNextCardFlushCompletionHoldings:fd,currentMadeFlushHoldings:made};
}
const definitions=[
 {id:'T01',fragments:['N4-L26'],original:['Ks','Th','5c','2d'],equivalent:false,witness:{sourceHole:['Ad','Qd'],importedHole:['Ad','Qd'],sourceFD:0,importedFD:9}},
 {id:'T02',fragments:['N4-L36','N4-L37'],original:['9d','6s','2c','Jc'],equivalent:false,witness:{sourceHole:['Ac','Qc'],importedHole:['Ac','Qc'],sourceFD:9,importedFD:0}},
 {id:'T04',fragments:['N4-L36','N4-L38'],original:['9d','6s','2c','2d'],equivalent:false,witness:{sourceHole:['Ad','Qd'],importedHole:['As','Qs'],sourceFD:9,importedFD:0,scope:'Hero suits renamed consistently with the unique flop correspondence; the imported turn breaks that correspondence.'}},
 {id:'T05',fragments:['N4-L33'],original:['Jh','Ts','2d','9d'],equivalent:true},
 {id:'T06',fragments:['N4-L32'],original:['Ks','Ts','5s','9s'],equivalent:true}
];
const cases=definitions.map(d=>{
 const imported=turnRules.find(r=>r.id===d.id),row=turnSheet.rows.find(r=>r.values.B?.startsWith(d.id+'\n'));assert.ok(imported&&row);
 const fragments=d.fragments.map(id=>{const f=registry.fragments.find(f=>f.id===id);assert.ok(f);const raw=fs.readFileSync(f.source.file,'utf8');assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),f.source.sha256);assert.equal(raw.split(/\r?\n/)[f.source.line-1].trim(),f.text);return f;});
 const eq=equivalent(d.original,imported.board);assert.equal(eq,d.equivalent);
 const sourceCounts=counts(d.original),importedCounts=counts(imported.board);
 let witness=null;if(d.witness){const w=d.witness;assertCards([...d.original,...w.sourceHole].map(card));assertCards([...imported.board,...w.importedHole].map(card));const sourceOuts=draws(w.sourceHole.map(card),d.original.map(card)).flushOuts.map(c=>c.id),importedOuts=draws(w.importedHole.map(card),imported.board.map(card)).flushOuts.map(c=>c.id);assert.equal(sourceOuts.length,w.sourceFD);assert.equal(importedOuts.length,w.importedFD);witness={...w,sourceOuts,importedOuts};}
 return{id:d.id,sourceFragments:fragments,originalBoard:d.original,importedBoard:imported.board,importedRow:{sheet:turnSheet.name,row:row.row,fields:row.values},globallySuitEquivalent:eq,sourceCounts,importedCounts,witness,strategyRelease:eq?'physical_board_correspondence_only_other_conditions_still_required':'quarantine_exact_source_policy_transfer_suit_relation_not_equivalent'};
});
const f=registry.fragments.find(f=>f.id==='N4-L29');assert.ok(f);
let rejected=false;try{assertCards(['As','7h','2d','2d'].map(card));}catch{rejected=true;}assert.equal(rejected,true);
const out={status:'source_to_imported_route_physical_audit_not_strategy_completion',cases,literalDuplicate:{fragment:f,board:['As','7h','2d','2d'],legal:false,rejectedByCardCheck:rejected,handling:'Do not silently change a suit and claim recovered original strategy.'},counts:{explicitOriginalExamples:5,nonEquivalent:3,equivalent:2,illegalLiteralExample:1,physicalStateEnumerations:11280},limits:['Only five explicitly specified source boards were compared, not all18 continuation nodes.','No fixed hero cards or action-conditioned ranges in the all-holdings counts.','Physical suit equivalence does not validate beforeSize, position, action frequencies, hand policy or whole-hand strategy.','Original user files and application data were not edited.','Current source diagram assignments might have been illustrative; they still cannot be inherited as exact policies without a matched reference.']};
fs.writeFileSync(`${dir}/route-source-suit-audit.json`,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({ok:true,...out.counts,rows:cases.map(c=>({id:c.id,equivalent:c.globallySuitEquivalent,sourceFD:c.sourceCounts.nominalNextCardFlushCompletionHoldings,importedFD:c.importedCounts.nominalNextCardFlushCompletionHoldings})),status:out.status},null,2));
