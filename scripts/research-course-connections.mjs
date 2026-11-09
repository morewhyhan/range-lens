import fs from 'node:fs';
import assert from 'node:assert/strict';
import {flopRules,turnRules,riverRules,allRules} from '../src/rules.js';

const permute=a=>a.length?a.flatMap((v,i)=>permute(a.filter((_,n)=>n!==i)).map(p=>[v,...p])):[[]];
const permutations=permute(['s','h','d','c']);
function canonical(cards){return permutations.map(p=>{const map=Object.fromEntries(p.map((s,i)=>[s,i]));return cards.map((c,i)=>(i<3?'F':i===3?'T':'R')+c.slice(0,-1)+map[c.slice(-1)]).sort().join(' ');}).sort()[0];}
assert.equal(canonical(['As','7h','2d','9c']),canonical(['2d','As','7h','9c']));
assert.equal(canonical(['As','7h','2d','9c']),canonical(['Ah','7d','2c','9s']));
assert.notEqual(canonical(['As','7h','2d','9c']),canonical(['As','7h','9c','2d']));
const candidates=[];
for(const child of [...turnRules,...riverRules]){
 const parents=child.street==='turn'?flopRules:turnRules,n=child.street==='turn'?3:4;
 const matching=parents.filter(p=>!p.pending&&p.scenario===child.scenario&&canonical(p.board)===canonical(child.board.slice(0,n)));
 const checks=matching.map(parent=>{
  const cautions=[];
  if(child.beforeSize!==undefined&&parent.size!==child.beforeSize)cautions.push(parent.size===undefined?'前驱没有明确主尺寸':'前驱主尺寸与后序要求不同');
  if(child.line==='xraise'&&!/过牌加注/.test(parent.direction||''))cautions.push('后序要求过牌加注，但前驱没有该明确线路');
  if(child.line==='xx')cautions.push('后序要求双方过牌；主尺寸或下注方向不能自动提供该前序');
  if(child.condition)cautions.push('须保留后序自己的条件，不能沿用其他节点人群假设');
  if(parent.condition)cautions.push('须确认前驱条件与后续相容');
  if(/花色未给|配色用作图示/.test(parent.text||''))cautions.push('原文花色并未完整固定');
  if(child.street==='river')cautions.push('需另核对明确的转牌行动及对手响应，不能仅凭牌张连接');
  return {parent:parent.id,parentSource:parent.source,parentAction:parent.direction||parent.size||null,checksRequired:cautions.length?cautions:['仍须核对双方实际动作、范围、金额和手牌任务'],status:'same_board_candidate_not_validated_strategy_edge'};
 });
 candidates.push({child:child.id,childSource:child.source,scenario:child.scenario,board:child.board,required:{beforeSize:child.beforeSize??null,line:child.line??null,condition:child.condition??null},importedParentCandidates:checks,status:matching.length?'requires_semantic_and_ledger_validation':'no_matching_imported_parent_not_proof_source_missing'});
}
const result={scope:'按场景、无序翻牌三张、固定后街身份及全24种花色置换检查导入节点的候选连接，不能证明完整线路正确，也不将未导入原笔记例子视为不存在。',nodes:allRules.length,continuationNodes:candidates.length,matchingImportedParentNodes:candidates.filter(c=>c.importedParentCandidates.length).length,unmatchedImportedParentNodes:candidates.filter(c=>!c.importedParentCandidates.length).length,candidates};
fs.writeFileSync('research/nevir-system/course-connections.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,candidates:candidates.map(c=>({child:c.child,parents:c.importedParentCandidates.map(p=>p.parent)}))},null,2));
