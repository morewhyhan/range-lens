import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {allRules,branches} from '../src/rules.js';
import {card,DECK,assertCards,evaluate,compare,draws} from '../src/poker.js';

const output=path.resolve('research/nevir-plain');
fs.mkdirSync(output,{recursive:true});
const previousAudit=fs.existsSync(path.join(output,'source-audit.json'))?JSON.parse(fs.readFileSync(path.join(output,'source-audit.json'),'utf8')):null;
const input='C:/Users/why/Desktop/笔记 Nevir';
const sources=fs.readdirSync(input).filter(n=>/^2\.[1-7]-/.test(n)&&n.endsWith('.md')).sort().map(name=>{
 const file=path.join(input,name),body=fs.readFileSync(file,'utf8'),lines=body.split(/\r?\n/);
 const starts=lines.flatMap((line,i)=>line.startsWith('### ')?[{title:line.slice(4).trim(),startLine:i+1}]:[]);
 const sections=starts.map((s,i)=>({...s,endLine:i+1<starts.length?starts[i+1].startLine-1:lines.findIndex((l,n)=>n>=s.startLine&&l.startsWith('## 4.'))+0||lines.length}));
 return {name,path:file,sha256:crypto.createHash('sha256').update(body).digest('hex'),lines:lines.length,sections};
});
assert.equal(sources.length,7);assert.equal(sources.reduce((n,s)=>n+s.sections.length,0),52);
if(previousAudit)for(const source of sources)assert.equal(source.sha256,previousAudit.sources.find(s=>s.name===source.name)?.sha256,'Original source changed: '+source.name);
const nodes=allRules.map(r=>({id:r.id,street:r.street,scenario:r.scenario,source:r.source,sourceKind:r.text.match(/【(.+?)】/)?.[1],rawClaim:r.text,reason:r.reason,
 typedFacts:{board:r.board,size:r.size??null,frequency:r.frequency??null,direction:r.direction??null,handExamples:r.hands??[],condition:r.condition??'',convention:r.convention??''},
 limitation:r.pending?'待补，不能提供精确战略答案':'仅能依各条来源命题支持的精度出题；本记录不是完整逐手策略表'}));
const summary={sourceFiles:7,sections:52,comparisonBranches:branches.length,strategyNodes:nodes.length,pending:nodes.filter(r=>r.sourceKind==='资料待补').map(r=>r.id),sourceKinds:{},typedFlopHandExamples:[]};
for(const n of nodes){summary.sourceKinds[n.sourceKind]=(summary.sourceKinds[n.sourceKind]||0)+1;if(n.street==='flop'&&n.typedFacts.handExamples.length)summary.typedFlopHandExamples.push({id:n.id,count:n.typedFacts.handExamples.length});}
assert.equal(nodes.length,58);assert.equal(branches.length,13);
fs.writeFileSync(path.join(output,'source-audit.json'),JSON.stringify({note:'只读来源与当前导入字段审计；字段缺失不等于原始笔记没有相关文字。不是重新求解或新增战略答案。',sources,summary,comparisonBranches:branches,nodes},null,2));

const cs=s=>s.split(' ').map(card);
const cases=[];
function check(name,actual,expected){assert.deepEqual(actual,expected);cases.push({name,actual,expected});}
function combinations(cards){const pairs=[];for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++)pairs.push([cards[i],cards[j]]);return pairs;}
const board=cs('Ts 8h 5d'),hero=cs('Ac 4c');assertCards([...board,...hero]);
const at=known=>combinations(DECK.filter(c=>!known.some(k=>k.id===c.id))).filter(p=>p.some(c=>c.rank===14)&&p.some(c=>c.rank===10)).length;
check('T85：仅已知公共牌时AT物理组合',at(board),12);
check('再已知自己Ac4c后AT物理组合',at([...board,...hero]),9);
const backdoor=draws(cs('Qh 7h'),cs('Ts 8h 5d'));
const noBackdoor=draws(cs('Qs 7s'),cs('Th 8c 5d'));
check('三张同花色构成后门',backdoor.backdoorFlush.includes('h'),true);
check('合计仅两张该花色无后门花',noBackdoor.backdoorFlush.length,0);
const draw=draws(cs('Js 9s'),cs('Qs Th 5s'));
check('QT5上J9的顺子补牌点数',draw.straightRanks.slice().sort((a,b)=>a-b),[8,13]);
check('直接花听补张',draw.flushOuts.length,9);
check('顺子实体补张',draw.straightOuts.length,8);
check('顺子与花听去重完成补张',new Set([...draw.flushOuts,...draw.straightOuts].map(c=>c.id)).size,15);
const river=cs('Ks 7h 2d 3c 9h'),qq=cs('Qs Qc');
const groups=[{cards:cs('6s 6h'),weight:.4,calls:[0,0]},{cards:cs('Js Jd'),weight:.4,calls:[1,0]},{cards:cs('Kh Kd'),weight:.2,calls:[1,1]}];
for(const g of groups)assertCards([...river,...qq,...g.cards]);
function ev(b,changed=false){return groups.reduce((sum,g,i)=>{const c=b===0?0:changed&&i===1&&b===10?1:g.calls[b===5?0:1],cmp=compare(evaluate([...river,...qq]),evaluate([...river,...g.cards])),e=cmp>0?1:cmp<0?0:.5;return sum+g.weight*(b===0?e*10:(1-c)*10+c*(e*(10+b)-(1-e)*b));},0);}
check('给定河牌模型：过牌、小注、大注',[ev(0),ev(5),ev(10)],[8,9,6]);
check('仅改变JJ面对大注跟注：总收益',ev(10,true),10);
const mass=[.4*.2,.4*1,.2*.5],sum=mass.reduce((a,b)=>a+b,0);
check('跟注后权重总和',Math.round(mass.map(v=>v/sum).reduce((a,b)=>a+b,0)*1e12)/1e12,1);
check('跟注后后验百分比',mass.map(v=>Math.round(v/sum*10000)/100),[13.79,68.97,17.24]);
check('20底池面对10跟注门槛',10/(20+10+10),.25);
check('河牌零权益5BB诈唬、底池10、弃牌一半',.5*10-.5*5,2.5);
check('河牌零权益5BB诈唬、底池10、仅弃两成',.2*10-.8*5,-2);
check('842的AA大于77',Math.sign(compare(evaluate(cs('8s 4h 2d Ac Ah')),evaluate(cs('8s 4h 2d 7c 7d')))),1);
check('QT5的TT是三条',evaluate(cs('Qs Th 5s Tc Td')).name,'三条');
check('986上T7成顺',evaluate(cs('9s 8h 6s Tc 7d')).name,'顺子');
check('986上75成顺',evaluate(cs('9s 8h 6s 7c 5d')).name,'顺子');
fs.writeFileSync(path.join(output,'math-checks.json'),JSON.stringify({ok:true,scope:'白话研究中的牌张与完整题设算例；不验证课程节点最优策略',cases},null,2));
const documents=fs.readdirSync(output).filter(n=>n.endsWith('.md')).sort();
let localLinks=0;
for(const name of documents){
 const body=fs.readFileSync(path.join(output,name),'utf8');
 assert.equal((body.match(/^```/gm)||[]).length%2,0,'Unclosed code fence: '+name);
 assert.ok(!body.includes('undefined'),'Unresolved content: '+name);
 for(const m of body.matchAll(/\]\(([^)]+)\)/g)){
  const target=m[1].replace(/^<|>$/g,'');if(/^https?:/.test(target)||target.startsWith('#'))continue;
  assert.ok(fs.existsSync(path.resolve(output,target.split('#')[0])),'Missing link: '+name+' '+target);localLinks++;
 }
}
const mapped=[];
for(let i=0;i<7;i++){
 const name=documents.find(n=>n.startsWith('0'+(i+1)+'_'));if(!name)continue;
 const body=fs.readFileSync(path.join(output,name),'utf8');
 const rows=body.split('\n').filter(l=>/^\| 3\.\d+ \|/.test(l));
 if(i!==3){assert.equal(rows.length,sources[i].sections.length,'Incomplete section review '+name);sources[i].sections.forEach((s,n)=>assert.ok(rows.some(r=>r.startsWith('| 3.'+(n+1)+' |'))));}
 else for(const label of ['翻牌范围下注带来的问题','理论上的转牌策略','实际对手行为与调整','翻牌1/3后的策略','翻牌大尺寸后的策略','简化策略与最后建议'])assert.ok(body.includes('| '+label+' |'));
 mapped.push({source:sources[i].name,document:name,sections:sources[i].sections.length});
}
assert.equal(mapped.length,7);
const validation={ok:true,documents,sectionReviews:mapped,localLinks,sourceHashesMatchPreviousAudit:previousAudit?true:null,mathChecks:cases.length,scope:'文档结构、来源哈希、逐节覆盖、链接与例题计算；不是实际学习效果验证'};
fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify(validation,null,2));
console.log(JSON.stringify({summary,mathChecks:cases.length,documentChecks:validation,ok:true},null,2));
