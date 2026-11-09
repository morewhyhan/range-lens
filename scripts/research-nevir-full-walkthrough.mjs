import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {card,assertCards,evaluate,compare} from '../src/poker.js';

const sourceUrl='https://app.gtowizard.com/solutions?board=Ah9c2h7s4d&cussol_id=4ed7caa0-8447-4b2b-9348-697f4d8279a2&custree_id=8d398892-575c-45f0-9f37-bb826916b21d&depth=100&flop_actions=R4.2-C&gametype=Cash6m500zGeneral3betV2&gmff_depth=100&gmff_favorite=false&gmff_opening_size=gto&gmff_rake=NL500&gmff_type=general&gmfft_sort_key=0&gmfft_sort_order=desc&gmfs_solution_tab=ai_sols&history_spot=11&preflop_actions=F-F-F-R2.5-R10-F-C&ref=blog.gtowizard.com&soltab=strategy&solution_type=gwiz&stratab=strategy&turn_actions=R22.05-C';
const q=new URL(sourceUrl).searchParams;
assert.equal(q.get('board'),'Ah9c2h7s4d');assert.equal(q.get('gmff_rake'),'NL500');assert.equal(q.get('depth'),'100');
assert.equal(q.get('preflop_actions'),'F-F-F-R2.5-R10-F-C');assert.equal(q.get('flop_actions'),'R4.2-C');assert.equal(q.get('turn_actions'),'R22.05-C');
const seats=['UTG','HJ','CO','BTN','SB','BB'];
let stacks=Object.fromEntries(seats.map(s=>[s,10000])),pot=0,street='preflop',paid=Object.fromEntries(seats.map(s=>[s,0]));
const rows=[];
const snap=()=>({street,potBB:pot/100,stacksBB:Object.fromEntries(seats.map(s=>[s,stacks[s]/100])),streetPaidBB:Object.fromEntries(seats.map(s=>[s,paid[s]/100]))});
function record(id,actor,action,to=null,origin='public_link_history'){
 const before=snap();let added=0;
 if(to!==null){assert.ok(Number.isInteger(to)&&to>=paid[actor]);added=to-paid[actor];assert.ok(added<=stacks[actor]);stacks[actor]-=added;paid[actor]+=added;pot+=added;}
 assert.equal(Object.values(stacks).reduce((a,b)=>a+b,0)+pot,60000);
 rows.push({id,actor,action,addedBB:added/100,origin,before,after:snap()});
}
function next(s){street=s;paid=Object.fromEntries(seats.map(s=>[s,0]));}
record('post_sb','SB','post',50,'rule_gross_ledger');record('post_bb','BB','post',100,'rule_gross_ledger');
record('pf01','UTG','fold');record('pf02','HJ','fold');record('pf03','CO','fold');record('pf04','BTN','raise_to',250);
record('pf05','SB','raise_to',1000);record('pf06','BB','fold');record('pf07','BTN','call_to',1000);
assert.equal(pot,2100);assert.equal(stacks.SB,9000);assert.equal(stacks.BTN,9000);
next('flop');record('f01','SB','bet',420);record('f02','BTN','call_to',420);
assert.equal(pot,2940);assert.equal(stacks.SB,8580);
next('turn');record('t01','SB','bet',2205);record('t02','BTN','call_to',2205);
assert.equal(pot,7350);assert.equal(stacks.SB,6375);
next('river');record('r01','SB','allin',6375,'article_river_large_size_plus_ledger');
const beforeResponse=snap();record('r02','BTN','call_to',6375,'author_selected_legal_response_not_source_combo_policy');
assert.equal(pot,20100);assert.equal(stacks.SB,0);assert.equal(stacks.BTN,0);
const board=['Ah','9c','2h','7s','4d'],hero=['Ac','Qd'],villain=['Ad','Js'];
assertCards([...board,...hero,...villain].map(card));
const comparisons=[3,4,5].map(n=>({street:['flop','turn','river'][n-3],winner:compare(evaluate([...board.slice(0,n),...hero].map(card)),evaluate([...board.slice(0,n),...villain].map(card)))>0?'SB':'not_SB',heroCategory:evaluate([...board.slice(0,n),...hero].map(card)).name}));
assert.ok(comparisons.every(c=>c.winner==='SB'&&c.heroCategory==='一对'));
const showdownPayout={grossPotBB:201,SBReceivesBB:201,netFromHandStartBB:101,rakeBB:null,scope:'Gross pre-rake arithmetic only; illustrative chosen showdown, not source opponent policy or net solver payout.'};
// Fold alternative: uncalled river bet is returned, matched pot awarded once.
const riverStart=rows.find(r=>r.id==='r01').before;
const foldPayout={uncalledReturnedBB:63.75,matchedPotAwardBB:73.5,SBEndingBB:137.25,BTNEndingBB:63.75,BBEndingBB:99,otherThreeEndingBB:300,grossHandProfitSB:37.25};
assert.equal(foldPayout.uncalledReturnedBB+foldPayout.matchedPotAwardBB,foldPayout.SBEndingBB);
assert.equal(foldPayout.SBEndingBB+foldPayout.BTNEndingBB+foldPayout.BBEndingBB+foldPayout.otherThreeEndingBB,600);
assert.equal(beforeResponse.potBB,137.25);assert.equal(beforeResponse.stacksBB.BTN,63.75);
const visualFile='research/nevir-system/source-river-chart-visual-review.json',visualBytes=fs.readFileSync(visualFile),visualReview=JSON.parse(visualBytes);
assert.equal(visualReview.originalChartsInspected,2);assert.equal(visualReview.perComboFrequenciesObtained,false);
const out={
 status:'complete_gross_ledger_and_structure_candidate_not_complete_strategy_lesson',
 reference:{article:'https://blog.gtowizard.com/dominate-the-river-in-3-bet-pots-oop/',solutionLink:sourceUrl,checkedOn:'2026-10-21',origin:'Public caption/link and actual inspection of two original static river charts; raw per-combo solver output unavailable.',sourceConfig:'NL500; six-player cash; 100BB',boardFromLink:board,conflict:'Prose differs in suits. Original chart color partitions support the link two-tone flop and flush-completing alternate river; no exact suit glyph transcription or per-combo policy claim.',visualReview:{file:'source-river-chart-visual-review.json',sha256:crypto.createHash('sha256').update(visualBytes).digest('hex'),originalChartsInspected:2}},
 selectedHands:{hero,villain,origin:'Author-selected legal cards for reading/showdown tasks only; no source claim about exact combination frequencies.'},
 ledger:{unit:'integer hundredths of a BB internally',rake:'Gross pot before rake; no net-rake claim',rows,riverSPR:riverStart.stacksBB.SB/riverStart.potBB,riverJamPotFraction:63.75/73.5,showdownPayout,foldPayout},
 currentHandComparisons:comparisons,
 grading:{facts:'Cards, street, actors, legal observed amounts, gross pot/stacks, price, action/terminal route.',strategy:'Not enabled for all combo decisions. Public action history does not prove best action at every prior node.',NL50:'Not a matching NL50 baseline.'},
 pending:['Exact per-combo policies/EVs and complete alternatives on each street','Matching user course and target configuration','Learner trial of the scripted first walkthrough']
};
fs.writeFileSync('research/nevir-system/full-walkthrough-reference.json',JSON.stringify(out,null,2));
console.log(JSON.stringify({status:out.status,sourceConfig:out.reference.sourceConfig,rows:rows.length,streetStarts:{flop:rows.find(r=>r.id==='f01').before,turn:rows.find(r=>r.id==='t01').before,river:rows.find(r=>r.id==='r01').before},showdownPayout,foldPayout,currentHandComparisons:comparisons,pending:out.pending},null,2));
