// Declarative author specification, NOT an implemented strategy-to-course compiler.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const dir='research/nevir-system/',units=JSON.parse(fs.readFileSync(dir+'learning-unit-readiness.json'));
// selector relation, learner operation, valid contrast, forbidden inference
const specs={
 '1.1':['对手更差成牌继续且实际支付；连同更强继续部分重算','点出会付款的具体候选，再比较过牌与下注','改变差牌继续政策，保持其它声明输入','差牌会跟就一定应下注'],
 '1.2':['基准继续中存在反超路径；比较其退出与继续的整条收益','标出反超的实体跑牌，再看两种动作后果','对照对手退出与继续的明确政策','能赶走差牌就自动有正总收益'],
 '1.3':['存在当前领先于自己的候选会弃；完整动作EV仍需核对','点出被赶走的赢家，并比较继续成本','保持牌钱，改变该类候选的实际弃牌政策','存在弃牌收益就适合诈唬'],
 '1.4':['存在改善路径及未改善终点；动作含完整后续','先分改善后赢或输，再选有依据动作','相同当前牌力，变化后续改善或承压条件','有听牌就应下注'],
 '1.5':['过牌有正摊牌机会；下注改变被继续范围和后续','先看过牌结果，再比较下注是否增收','改变较差牌是否继续，重算双方路线','有摊牌价值就永远过牌'],
 '1.6':['强成牌在过牌与下注路线中的付款和风险可比较','点出先过后谁可能主动支付','改变对手过后下注政策，保留完整后继','强牌适合慢打是固定手牌属性'],
 '1.7':['给定完整比较域内所有进攻不优于替代动作','比较实际EV并说明菜单边界','改变关键回应条件，检验是否仍放弃进攻','没有本节点好进攻就整手必弃'],
 '1.8':['相同根条件，至少两个实际不同下注尺寸及后继齐备','比较各尺寸赶走谁、留下谁、以后怎样','共同动作树内比较，不删尺寸后冒充原比较','某尺寸是唯一下注选项就最优'],
 '2.1':['当前下注范围中有自己能赢的取值部分；未来完整','区分自己能赢的取值牌与诈唬，再比较弃跟加','改变取值部分质量，保留完整参考','能赢部分取值牌就必须加注'],
 '2.2':['获胜主要来自对手未改善或诈唬部分；份额与价格完整','点出实际能赢谁，再算跟注与其它选择','改变明确诈唬组成而非只换玩家标签','抓诈只需看是否有一对'],
 '2.3':['改善、反向改善、未来收费与自己的回应均可计算','点出干净与脏改善，再比较当前选择','同样听牌名，改变对手继续范围或后续收费','补张比例等于完整跟注收益'],
 '2.4':['当前领先和落后改善路径共同存在，终点互斥计数','分出已经能赢、改善才赢和改善仍输的结果','保持当前牌面，改变候选组成','当前胜率加听牌胜率可直接相加'],
 '2.5':['加注后有更差继续支付，也有弃或再加的完整分支','看差牌付款以后，合并全部回应','改变差牌继续或再加政策','加注能被差牌跟就一定优于跟'],
 '2.6':['加注有更好牌弃，所有继续与反击终点可评估','先看弃、跟、再加三支，再选动作','同牌钱改变该类牌退出的条件','对手总体过弃足以确定每手加注'],
 '2.7':['弃跟加按同一当前基点评估，完整菜单中的继续均不优','先核待补与当前范围，再比较所有被支持选择','改变价格或范围后重新判断','低权益数字本身就能判弃'],
 '3.1':['真实加到总额与自己本街已投可得','点出待补而非对方总额','同加到额、不同自己已投；或同待补、不同池','加到30等于再多投30'],
 '3.2':['先前价值下注之后，观察加注并筛选新范围','重画当前加注范围，再比较弃跟再加','相同自己牌，改变已观察加注的条件政策','原来是价值牌所以现在自动继续'],
 '3.3':['被加后仍有改善或承压分支，价格与后续齐备','核干净补张、未来收费和再加风险','同听牌改变加注范围或有效后手','听牌名称能代替价格与后续'],
 '3.4':['再加后差牌仍支付，全部回应及新增金额齐备','点出继续付钱的差牌，并计算再加与跟注','改变差牌面对再加是否继续','强牌永远再加到最大'],
 '3.5':['实体移除改变当前加注范围及其回应，所有再加后继齐备','点具体被移除的价值与弃牌候选，再算行动','持牌组合或给定回应对照；变化因素逐项披露','有A或同花阻挡就必须诈唬'],
 '3.6':['有效筹码、最小加注、全下及行动权有真实规则','选择当前合法按钮与金额','足额与不足额全下、是否重开行动分别验证','还有筹码就永远能再加'],
 '4.1':['按实际跟注概率更新双方联合质量与状态','在同坐标图中标出留下部分','同下注下不同明确跟注政策','跟注意味着强牌全部退出'],
 '4.2':['实际两次过牌的概率与正支持历史完整','沿两次观察筛选，指出仍可保留的强牌','不同过牌政策；保持与改变均需例证','过牌就排除所有强牌'],
 '4.3':['自己的完整行动政策不同，观察者视角明确','比较自己公开范围与已知底牌后的对手范围','相同已知牌下自己动作不凭空新增对手信息','自己点按钮就让两边候选都减少'],
 '4.4':['不同真实历史各有对应根、政策和当前条件','从各自前序追到当前范围再比较','同当前牌钱但不同历史；不借用另一线后验','当前牌钱相同就参考身份相同'],
 '4.5':['观察事件可合法重放，街与终局转换明确','移动筹码一次，确认谁行动或结算','下注未回应、轮闭合、全下跑完分别检查','执行按钮点击即自动发下一街'],
 '4.6':['行动前信息、给定参考与本次随机结果分别冻结','区分这次输赢与动作前比较','同策略不同终点；不同策略可碰巧同结果','赢了就证明之前正确'],
 '5.1':['新牌后自己最佳五张改变，当前范围和价格仍保留','点出新最佳五张，再重回比较','改善却仍输与改善后领先都要保留','自己改善就必加大下注'],
 '5.2':['先前留下的候选在新牌后逐实体重评','点出对手哪些仍可能改善','新牌相同但前序范围不同','所有可能手牌都在当前范围'],
 '5.3':['现成牌、直接听牌和后门按当前街重算','分清成牌、听牌和已失去机会','同花色标签但实体张数不同；成牌兼听牌不抹去','听牌完成就必获胜'],
 '5.4':['公共牌配对后的最佳五张和候选逐项重算','点出配对如何改变两边具体关系','同样公共牌配对但所留候选不同','配对对所有手牌影响相同'],
 '5.5':['更高新牌对具体两方手牌和范围的影响可计算','指出谁的相对位置变了','高牌改变与高牌不改当前胜负均保留','高牌天然总利于加注者'],
 '5.6':['被称空白的牌仍经实体移除、改善和机会概率检查','检验哪项没变、哪项实际改变','近似空白与实质变化，以及不改动作的变化','空白就原样复制前街策略'],
 '5.7':['给定新牌的合法配对与机会模型明确','在具体花色格移除冲突组合并重归一','质量减少与占比上升区分；视角保持','按格名删除就完成新牌更新'],
 '5.8':['河牌已发，无下一张；下注是否结束另判','确认未来改善结束，再看当前谁行动','未回应、全下跟完、弃牌结算分别检查','发河牌就自动摊牌']
};
assert.equal(Object.keys(specs).length,35);assert.deepEqual(Object.keys(specs).sort(),units.units.map(u=>u.id).sort());
const factualOnly=new Set(['3.1','3.6','4.5','4.6','5.1','5.3','5.4','5.5','5.6','5.7','5.8']);
const contracts=units.units.map(u=>{
 const [selectRelation,learnerOperation,contrastContract,forbiddenInference]=specs[u.id];
 return {id:u.id,label:u.label,parent:u.parent,selectRelation,learnerOperation,contrastContract,forbiddenInference,
  selectorResult:'Candidate relation requiring author/reference checks; not an exclusive hand class and not an action answer.',
  prerequisiteForFactQuestion:['Legal exact cards and current public state','Declared learner perspective and required observed history','Independent physical/legal computation appropriate to the question'],
  prerequisiteForStrategyQuestion:['Complete matched configuration and raw reference','Explicit course-policy version and compared candidate menu','Positive support or explicitly separate counterfactual policy completion','Current action values with common payoff origin and declared continuation','No answer-bearing help if claimed independent'],
  standaloneMechanicalFocusIdentified:factualOnly.has(u.id),factQuestionRule:'Any unit may contain a fact question if its inputs are independently sufficient; label it as facts, not as optimal strategy.',factPassDoesNotImplyActionPass:true,
  leafAccounting:'Opponent folds / own folds / showdown win / tie / loss are mutually exclusive; compute all actual investments and refunds once.',
  feedback:'Point to the specific current difference and restore the full parent question/reference. Correct source-rule execution is not independent optimal strategy proof.',
  generationImplementationReady:false,fullTargetReferenceReady:u.fullMatchingTargetPolicyVerified,learnerVerified:false};
});
assert.ok(contracts.every(c=>c.parent&&c.selectRelation&&c.contrastContract&&!c.generationImplementationReady));
const output={status:'declarative35_unit_reference_to_curriculum_contract_not_generated_course',sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(dir+'learning-unit-readiness.json')).digest('hex'),
 compilerStages:['Validate exact reference/configuration and raw supported nodes','Compile a separately named course policy with unresolved branches visible','Re-evaluate policy and all compared deviations before using its ranges/answers','Select candidate relations and useful controlled comparisons','Build one demonstration, one partial completion, then exposure-separated independent use','Attach only to the current four-step parent; restore full state on return','Publish only the question domain whose required inputs passed'],
 dataObjects:{referenceSpec:['game configuration','ranges','action tree','solver version','raw strategy and EV','supported successors'],coursePolicy:['explicit source rule','allowed actions','frequency transform','continuation policy','recomputed value and range outputs'],rangeSnapshot:['owner','viewpoint','known cards','public board','full history','input fingerprint','per-hand raw mass','action probability','unnormalized mass','normalization denominator','parent snapshot','change reason','successor boundary'],lessonFrame:['frame id','parent and return target','status','visible facts','question kind','answer set','help state','range snapshots','explanation','successors']},
 policyTransforms:{visual_only:'Hide or progressively reveal information; strategy identity remains unchanged.',frequency_quantization:'Map mixed frequencies to an explicit discrete policy and recompute affected ancestors.',menu_restriction:'Remove actions only with a new policy evaluation and a declared continuation.',route_packaging:'Reorder help and independent practice without changing the underlying policy; mark demonstrated steps as assisted.'},
 frameStatuses:['fact','demonstration','course_policy','reference_policy','not_open'],
 rangeUpdateFormula:'q_after(h,a)=q_before(h)*p(a|h,node); normalize by the total branch mass. For unknown opponents, apply the action probabilities to legal joint private-hand pairs before marginalizing.',
 sequenceContract:'First pass follows one parent route: identify board and hand strength, compare ranges, choose current action, update pot and ranges, deal next street, act again, then settle. Child explanations open on demand and return to the exact parent snapshot; 35 units are coverage checks, not a flat learner menu.',
 publicationChecks:{
  sourceQuality:'Saved strategy, raw numeric/export consistency and actual convergence are separate checks; no global metric is a per-action EV tolerance.',
  natureSampling:'Use supported joint private pairs followed by uniform physical cards, or the matching conditional chance law; do not replace weighted-range conditioning with uniform public-card sampling.',
  perTaskScope:'Distinguish physical fact, explicit course prescription, single-step strategic proposal, given demonstration, and actually committed continuous play.',
  continuousClosure:'Every accepted committed action and supported future card requires a matched continuation/reference or a separately validated query path. Selected node exports alone are not a complete trainer.',
  zeroReach:'A legal deviation with zero reference support is not learner illegality and its reported zero EV is not a usable answer; require an explicit counterfactual completion or suspend strategic grading.',
  packaging:'Keep full author references separate from compiled lesson packets; document runtime memory and reference identity for any full-tree query service. No learner-facing solver settings or database are implied.',
  currentCounterexample:'sb-bb-qqq-export-closure.json',implementationReady:false},
 contracts,
 responseToInsufficientInput:{factQuestion:'Allow only if its mechanical inputs are independently sufficient.',courseRuleQuestion:'Allow only under the explicit sourced adopted rule and precision.',optimalActionQuestion:'Do not publish without matched complete strategy evidence.',mechanismCauseClaim:'Frequency/EV correlation alone is insufficient; require a declared intervention or restrict wording to observed relation.',missingContinuation:'Stop this route strategy grading or explicitly enter teaching; do not invent an opponent response or count the missing author reference as a learner error.'},
 nonGoals:['No new35-tile home screen','No invented missing policies','No backend learner database','No new training questions from this specification alone','No automatic identification of unique strategic cause from a solver frequency'],
 counts:{unitsSpecified:35,implementedSelectors:0,newGeneratedQuestions:0,fullTargetReferences:contracts.filter(c=>c.fullTargetReferenceReady).length,learnerTrials:0},appChanged:false};
fs.writeFileSync(dir+'reference-curriculum-contract.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,...output.counts}));
