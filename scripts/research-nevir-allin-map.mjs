import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const dir='research/nevir-system/',read=f=>JSON.parse(fs.readFileSync(dir+f,'utf8'));
const value=read('value-trap-tree-evidence.json'),defense=read('defense-tree-evidence.json');
const checks=value.profiles.map(p=>{
 const n=p.nodes.find(n=>n.id==='after_xraise_villain_jam');assert.equal(n.state.villainStack,0);
 const C=n.state.villainPut-n.state.heroPut,P=n.state.pot,q=n.posterior['77'];assert.equal(C,38);
 const ev=q*(P+C)-C,reference=n.actions.find(a=>a.action==='call38').evFromRiverRootBB+n.state.heroPut;
 assert.ok(Math.abs(ev-reference)<1e-8);
 return {sourceProfile:p.id,currentPot:P,toCall:C,equityShare:q,price:C/(P+C),currentCallEV:ev,referenceEV:reference};
});
const p=defense.profiles.find(p=>p.id==='fold_to_raise'),e=p.smallRaise.equityFacingJam;
const turn={currentPot:141,toCall:60,equityShare:e,price:60/201,currentCallEV:e*201-60,referenceEV:p.smallRaise.callFromTurnDecisionEVBB+30};
assert.ok(Math.abs(turn.currentCallEV-turn.referenceEV)<1e-8);
const negative=defense.profiles.find(p=>p.id==='pressure');
assert.ok(negative.showdownEquity>.25&&negative.flatContinuation.evBB<0);
const out={ok:true,status:'exact_closed_allin_comparison_map_not_full_postflop_policy',prerequisites:['heads_up_no_other_live_players','opponent_allin','call_closes_all_betting','known_conditional_equity_including_ties','no_rake_in_this_formula','exclude_uncalled_excess_from_contested_pot'],
 formula:'callEV = equityShare * (contestedCurrentPot + toCall) - toCall; foldEV =0',riverSourceChecks:checks,uniqueRiverEquityCases:new Set(checks.map(c=>c.equityShare)).size,turnSourceCheck:turn,
 rejectedNonAllin:{currentRawEquity:negative.showdownEquity,immediatePrice:.25,actualCallEV:negative.flatContinuation.evBB,reason:'Future betting remains; the allin map is not a complete action reference.'},
 displayCase:{...checks[0],hero:value.context.hero,board:value.context.board,winningCandidate:'77',losingCandidate:'KK',givenWeights:{KK:1,77:2}},
 sourceHashes:Object.fromEntries(['value-trap-tree-evidence.json','defense-tree-evidence.json'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(dir+f)).digest('hex')])),
 completePostflopCoverage:false,realLearners:0,NL50Verified:false};
fs.writeFileSync(dir+'allin-map-evidence.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({ok:true,riverSourceChecks:checks.length,uniqueRiverCases:out.uniqueRiverEquityCases,turnSourceCheck:true,nonAllinRejected:true}));
