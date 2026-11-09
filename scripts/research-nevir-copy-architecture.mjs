import fs from 'node:fs';
const d=JSON.parse(fs.readFileSync('research/nevir-system/first-pass-copy-deck.json','utf8'));
const expected=['A1','A2','A3','A4','A5','A6','A7','A8'];
if(!d.rules.microcopyMustNameShowActionHandoff||!d.rules.p2CanNestBoardThenHand) throw new Error('microcopy rules missing');
if(JSON.stringify(d.architectureMicrocopy.map(x=>x.id))!==JSON.stringify(expected)) throw new Error('microcopy node order mismatch');
for(const x of d.architectureMicrocopy){
  for(const key of ['parent','show','learnerAction','handoff','plainTerm','technicalTerm']) if(!x[key]) throw new Error(`${x.id} missing ${key}`);
}
if(d.architectureMicrocopy.filter(x=>x.parent==='p2_board').length!==2) throw new Error('p2 must contain board then hand nested nodes');
if(d.rules.oneQuestion!==true||d.rules.onePrimaryAction!==true) throw new Error('one question/action rule missing');
console.log(JSON.stringify({ok:true,status:d.currentStatus.paperContract?'paper_copy_contract_not_trialed':'unknown',nodes:d.architectureMicrocopy.length,p2Nested:d.architectureMicrocopy.filter(x=>x.parent==='p2_board').map(x=>x.id),runtimeImplemented:d.currentStatus.runtimeImplemented}));
