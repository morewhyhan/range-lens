import fs from 'node:fs';
import assert from 'node:assert/strict';
const dir='research/nevir-system';
const source='../nevir-plain/12_五种实战情况的原理细分与练习规格.md';
const text=fs.readFileSync(`${dir}/${source}`,'utf8');
const originals=[...text.matchAll(/^\| ([1-5]\.\d+) ([^|]+)\|/gm)].map(m=>({id:m[1],label:m[2].trim()}));assert.equal(originals.length,35);
// Highest *local* supplied material. M is a finite specified model, F is physical/ledger facts,
// D is design/conditional discussion only. None is a complete target-policy or learner pass.
const definitions=[
 ['1.1','先能比较五张，分清当前池和新增投入','先点出较差而愿意跟的一组，再移动它支付的钱','M','size-comparison-evidence.json','examples/valueLarge','补匹配真实范围、后续与完整动作菜单'],
 ['1.2','先分当前领先与未来可能反超','点出会反超的实际跑牌，再比较退出或继续','M','active-plan-models.json','protection','已有17帧局部保护跟练；仍缺完整目标策略、撤提示迁移和真人结果'],
 ['1.3','先会当前胜负及弃牌/被跟互斥收益','先指出本来赢自己且会退出的候选','M','size-comparison-evidence.json','examples/foldsBetterAndWins','有限河牌模型不能代表所有前街诈唬'],
 ['1.4','先区别后门、直接听牌与干净补张','分别点出过牌、被跟、被加后还保留什么机会','M','active-plan-models.json','weak','已有17帧主动弱牌局部跟练；仍缺完整目标策略、撤提示迁移和真人结果'],
 ['1.5','先会过牌基点与当前摊牌强弱','同一手比较差牌付款还是全部退出','M','size-comparison-evidence.json','examples/checkBetter','A72 KQ仅补一条课程规则，仍缺跨情境完整策略'],
 ['1.6','先明白先行动过牌仍可能面对下注','固定强牌，比较直接下注与诱发弱牌投入','M','value-trap-tree-evidence.json','profiles','已有河牌强牌有限树，仍缺前街风险及匹配目标策略'],
 ['1.7','先列完整被比较菜单与不投入基点','把所有候选分支合起来看是否值得继续投入','M','size-comparison-evidence.json','examples/checkBetter','补更广的牌力和后续；未取得参考的动作不能自动排除'],
 ['1.8','先会一个尺寸与过牌的互斥收益','只改金额及对应响应，再比较差额','M','size-comparison-evidence.json','exhaustiveFamily','4095权重模型不是4095个真实策略节点'],
 ['2.1','先知道下注范围中谁是取值、自己能赢谁','把可赢价值与可赢诈唬分开，再比较跟和加','M','value-trap-tree-evidence.json','profiles','三条9能赢77/AK而输KK的有限比较已补，仍缺完整范围与其他情境'],
 ['2.2','先能摆对待补与跟后池，找可赢下注牌','固定价格改变诈唬份量，再固定范围改价格','M','defense-tree-evidence.json','profiles','补更多价格与匹配下注参考，不能从牌型推诈唬比例'],
 ['2.3','先会补张、失效补张和当前价格','先看成花仍输，再打开未来承压分支','M','defense-tree-evidence.json','holdings','有限44张跑牌比较尚不覆盖所有听牌和未来菜单'],
 ['2.4','先保留当前赢面和未来改善两个字段','点当前可赢与当前落后两组，合并去重后的终局份额，再比较全下跟弃','M','made-plus-draw-evidence.json','comparison','已有Jd7d给定转牌全下模型和14帧局部跟练；仍缺非全下未来菜单、目标范围及独立迁移'],
 ['2.5','先会价格及加注后的弃/跟/再加','固定强牌，看差牌跟加与只继续下注的差异','M','value-trap-tree-evidence.json','profiles','已补受限价值树而非借听花模型，仍需匹配参考及更广菜单'],
 ['2.6','先识别更好牌及加注后所有回应','只改对加注的弃牌分支，重新比较','M','defense-tree-evidence.json','profiles','模型只覆盖给定半诈唬树，不自动适用小注或任意人群'],
 ['2.7','先会弃牌未来增量为零及其他选择','把跟/加所有后续计完，允许直接弃牌','M','defense-tree-evidence.json','profiles','须接匹配防守参考，不把一个模型的弃牌推广'],
 ['3.1','先分已下、加到与还需补','在原筹码上摆出新的待补与跟后池','M','defense-tree-evidence.json','profiles','还需覆盖其他金额与合法再加状态，价格本身不定策略'],
 ['3.2','先把原下注范围切换为加注范围','保留原差牌付款者作对照，再看谁真正加注','M','value-trap-tree-evidence.json','profiles','已补KK/77加注比例变化的三条9比较，真实加注范围与其他牌力仍缺'],
 ['3.3','先会听牌真实胜出与新价格','把再加后的未来和剩余投入重新展开','M','defense-tree-evidence.json','profiles','既有AsQs分支仍属一套限制树，其他尺寸和组合待补'],
 ['3.4','先能比较跟注与再加的完整回应','看更差牌是否仍付钱，是否失去后续诈唬','M','value-trap-tree-evidence.json','profiles','已补77继续或弃牌的受限再加比较，仍缺完整目标策略'],
 ['3.5','先看新的弃牌目标与有利/不利移除','分别点被移除的继续牌与弃牌，再算整条再加线','M','bluff-reraise-model.json','rows','已有21帧局部跟练和给定再加区间比较；仍缺目标匹配范围、真实响应与独立迁移'],
 ['3.6','先读本街投入、有效后手和行动是否重开','只点合法菜单；区分自己全下仍待回应','F','first-pass-structure-packet.json',null,'14卡不等于通用规则引擎，不足额全下等完整边界待实现验证'],
 ['4.1','先有原范围及该次跟注的依据','按实际响应留下候选，保留慢打可能','M','history-contrast-evidence.json','paths','作者给定回应可复算，仍缺匹配真实逐手响应'],
 ['4.2','先区别过牌与弃牌，知道谁还行动','不删除所有弱牌，按有依据的过牌概率更新','M','history-contrast-evidence.json','paths','不能由一次过牌推演模型中的具体百分比'],
 ['4.3','先明白自己范围与当前实体手牌不同','两边分别保留实际走该线的候选','M','self-range-outcome-evidence.json','selfRange/versions','已有两版合法联合配对和实际手牌条件化；仍缺完整双方范围与真实响应'],
 ['4.4','先保留真实历史及相应响应','同牌钱换历史，重新筛选并比较','M','history-contrast-evidence.json','paths','有限同价异序例不覆盖所有尺寸/加注路线'],
 ['4.5','先会当前投入和本街关闭条件','筹码进池、后手减少、移动行动者','F','first-hand-lesson-packet.json','frames','固定脚本正确不等于通用金额引擎和界面通过'],
 ['4.6','先看到动作前的完整可能分支','并排比较决策前EV与某一次赢输，不倒推','M','self-range-outcome-evidence.json','outcomes/cases','已有四条答后示例与动作前判断分离，仍缺真人理解与陌生迁移验证'],
 ['5.1','先会最佳五张与当前改善','只亮出新加入最佳五张的实体牌','F','turn-transfer-evidence.json','pairs','自己的成牌改善不等于策略或相对权益必改善'],
 ['5.2','先继承前序候选，再处理新牌','只在实际留下的候选里看改善','M','turn-transfer-evidence.json','teachingModel','明示模型不是目标玩家后验或全部后街参考'],
 ['5.3','先区分直接听牌、成牌与补成仍输','分别点成顺/成花者及仍在听者','F','turn-transfer-evidence.json','pairs','相关源路线花色有绑定差异，不能搬用精确动作'],
 ['5.4','先会三条、葫芦、四条与共享公共牌','公共牌成对后重新拼五张','F','turn-transfer-evidence.json','pairs','需匹配真实候选与响应才能判断行动'],
 ['5.5','先能对双方具体底牌重新配对','同一高牌让某组降级、另一组配到','F','turn-transfer-evidence.json','pairs','不能生成高牌必利于进攻方的规则'],
 ['5.6','先知道空白是相对哪些候选而言','先指出没变的关系，再带回历史与价格','M','history-contrast-evidence.json','paths','同最终牌钱模型仅作历史机制对照，不是通用空白牌策略'],
 ['5.7','先区别实体冲突与行动筛选','含新牌的组合划除，其余继承权重','F','turn-transfer-evidence.json','physicalFacts','不把物理删除自动称为确定策略或任意后验'],
 ['5.8','先确认是河牌且仍可能有行动','关闭未来补牌理由，转向当前胜负与付款/退出','F','blocker-teaching-evidence.json','riverMissedHeartExample','同花移除例不补全河牌所有动作参考']
];
assert.equal(definitions.length,35);assert.equal(new Set(definitions.map(r=>r[0])).size,35);
const parents={'1':'compare.unopened','2':'compare.bet','3':'compare.raise','4':'update.response','5':'update.card'};
const flow=JSON.parse(fs.readFileSync(`${dir}/flow-spec.json`,'utf8'));
const rows=definitions.map(([id,prerequisite,firstOperation,localMaterial,evidence,pointer,gap])=>{
 const original=originals.find(r=>r.id===id);assert.ok(original);const parent=parents[id[0]];assert.ok(flow.nodes.some(n=>n.id===parent));
 if(evidence){let obj=JSON.parse(fs.readFileSync(`${dir}/${evidence}`,'utf8'));if(pointer)for(const p of pointer.split('/')){assert.ok(obj&&p in obj,id+' missing evidence '+pointer);obj=obj[p];}}
 return{...original,parent,prerequisite,firstOperation,localMaterial,evidence,pointer,gap,returnRule:'Return to the same current decision snapshot; update tasks return to the resulting legal next state.',fullMatchingTargetPolicyVerified:false,learnerTrialVerified:false};
});
assert.deepEqual(rows.map(r=>r.id),originals.map(r=>r.id));
const counts=Object.fromEntries(['M','F','D'].map(k=>[k,rows.filter(r=>r.localMaterial===k).length]));
const out={status:'author_unit_readiness_audit_not_curriculum_completion',source,legend:{M:'已有明示有限模型，仅支持局部比较',F:'已有实体牌/账本事实，不能当完整策略',D:'现阶段仅设计或有条件方向，未取得该能力的完整比较练习'},counts,units:rows,missingComparisonPriorities:rows.filter(r=>r.localMaterial==='D').map(r=>r.id),limitations:['Prerequisites are supplied or taught inside the current decision, not a compulsory pre-course checklist.','Labels describe local materials, not complete teaching sequences, heldout transfer or target-policy coverage.','All35 target and learner checks remain unverified; no app or learner records changed.']};
fs.writeFileSync(`${dir}/learning-unit-readiness.json`,JSON.stringify(out,null,2)+'\n');
const header='# 35项怎样接回实际学习：逐项可执行性审计\n\n2026年10月20日。总入口：[统一总纲](../../翻后教学系统_统一总纲.md)。这是作者后台检查表，不是用户首页，也不是35项已教会的证明。\n\n## 怎样读这份表\n\n“开始前需要”表示当前操作必须有的输入或帮助，不要求用户先考完一套基础课。示范可由老师给足；独立检查再逐步收掉答案帮助。第一次整手仍先走全貌，局部能力在实际停点里打开。更新项从首次导览就出现，绝非学完主动、跟注和加注之后才学更新。\n\nM＝已有明确有限模型，F＝已有实体牌或账本事实，D＝目前主要是设计或方向。M不表示完整策略，也不表示比F更接近真实学习成功；不同身份分别核验。\n\n## 逐项接回同一个当前决定\n\n';
let body=header;
const groups={1:'无人下注时',2:'面对下注时',3:'面对加注时',4:'收到回应后',5:'新牌出现后'};
for(const [g,title]of Object.entries(groups)){
 body+=`### ${title}\n\n| 内容 | 开始前给足什么 | 第一小步让用户做什么 | 现有材料 | 仍缺什么 |\n|---|---|---|---|---|\n`;
 for(const r of rows.filter(r=>r.id[0]===g))body+=`| ${r.id} ${r.label} | ${r.prerequisite} | ${r.firstOperation} | ${r.localMaterial}${r.evidence?`：[数据](${r.evidence})`:''} | ${r.gap} |\n`;
 body+='\n';
}
body+=`## 本次审计改变了什么\n\n35项均挂到同一四步主线内的父层；局部材料身份为M ${counts.M}项、F ${counts.F}项、D ${counts.D}项。这个分组不代表已经补齐教学序列或全面策略。数据位置逐项核对，尚无真实学习者结果。\n\n优先补完整比较的项目是${out.missingComparisonPriorities.join('、')}。强牌先过、能赢部分价值牌时的跟加、原价值牌面对加注和价值再加，现已另补有限价值树；不是把听牌模型改名。这五项仍缺完整目标策略。自己的范围更新与结果不倒推，继续优先补完整操作材料。详见[强牌比较链](27_强牌怎样从过牌比较走到价值加注.md)。\n\n## 顺序推进不是把这35行顺着做完\n\n同一当前决定里，先保留必要牌、钱与历史；只打开当前困难的一项，做完回原决定。先学河牌无未来行动的简单比较，再逐层加入未来街；若示范先展示多街，则由老师给足尚未学会的输入。加注菜单和金额合法性必须在该动作出现前处理，不等到编号3.6才第一次讲。\n\n一次决定可涉及多个项，不能每项各判一次正确再相加。用户做动作后，根据实际回应更新；新牌出现后重新进入当前决定。互斥分支从原快照回看，不拼成真实历史。独立题正确自动继续、错误解析与可选原位补教沿用[错后合同](23_怎样检验真的教会了_顺序试读与迁移合同.md)。\n\n## 这张表还不证明什么\n\n没有为35项补出匹配的NL50全动作策略，没有冻结跨族未见题，没有执行真人试读。对应列全部保持未验证。仅补链接或把D改名不能使它就绪；下一轮必须产生该关系的完整输入、比较、执行与返回材料，随后再按[分级验收](04_正确性与NL50验收方案.md)检查。\n\n机器可读审计见[逐项记录](learning-unit-readiness.json)，生成及位置检查命令为\`node scripts/research-nevir-unit-readiness.mjs\`。脚本检查35项身份、父层和文件字段存在，不证明字段里的策略足够或教学有效。\n`;
if(!out.missingComparisonPriorities.length)body=body.replace('优先补完整比较的项目是。','35项均已有局部数值或事实素材；D项为0不表示课程、完整目标策略或真实学习通过。');
body=body.replace('自己的范围更新与结果不倒推，继续优先补完整操作材料。','自己的范围更新与结果不倒推已补[具体模型与操作](28_自己的范围怎样更新与结果怎样回看.md)；下一重点应补匹配策略和完整教学序列，不能继续靠增加局部模型冒充全面完成。');
const documentPath=`${dir}/26_35项怎样接回学习_逐项可执行性审计.md`;
const existing=fs.existsSync(documentPath)?fs.readFileSync(documentPath,'utf8'):'';
const manualAt=existing.indexOf('## 10月21日补审：');
if(manualAt>=0)body+='\n'+existing.slice(manualAt);
fs.writeFileSync(documentPath,body);
console.log(JSON.stringify({ok:true,units:rows.length,counts,priority:out.missingComparisonPriorities,status:out.status},null,2));
