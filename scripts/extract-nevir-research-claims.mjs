import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const dir=path.resolve('research/nevir-system'),audit=JSON.parse(fs.readFileSync('research/nevir-plain/source-audit.json','utf8'));
const fragments=[];
for(const [index,source]of audit.sources.entries()){
 const body=fs.readFileSync(source.path,'utf8');assert.equal(crypto.createHash('sha256').update(body).digest('hex'),source.sha256);
 let section='文件信息';const lines=body.split(/\r?\n/);
 for(let i=0;i<lines.length;i++){
  const text=lines[i].trim();if(/^#{1,3}\s/.test(text)){section=text.replace(/^#+\s/,'');continue;}
  if(!text)continue;
  const flags=[];
  if(/永远|所有|总是|100%|不可能|任何手牌|必须/.test(text))flags.push('绝对表述需核定作用范围');
  if(/百分|\d+%/.test(text))flags.push('需区分动作频率与尺寸及数据身份');
  if(/对手|玩家|人群|鱼|常规/.test(text))flags.push('可能包含对手假设或人群判断');
  if(/顺|同花|两对|三条|葫芦|权益/.test(text))flags.push('可能需牌张或概率复算');
  fragments.push({id:`N${index+1}-L${i+1}`,source:{file:source.path,line:i+1,section,sha256:source.sha256},text,flags,status:'source_fragment_not_strategy_answer'});
 }
}
const specs=[
 ['N2','例子：8-4-2彩虹','842中等牌更多过牌',{board:'842 rainbow',hands:['66','77','A4'],conclusion:'更多过牌',precision:'preference',frequency:null},'该段明确含A4；此前结构化手牌仅列66/77，不能把未导入等同原文未写'],
 ['N2','例子：K-Q-2彩虹','KQ2中等牌小注空间',{board:'KQ2 rainbow',hands:['AQ','JJ'],conclusion:'可用小尺寸下注；该例25%',precision:'candidate_with_size',frequency:null},'不推所有花色的求解频率，不自动变成全范围或纯动作'],
 ['N2','例如，干燥的K高牌面','K52的AQ/JJ小注例',{board:'K52 rainbow',hands:['AQ','JJ'],conclusion:'有小注空间；本例25%',precision:'candidate_with_size',frequency:null},'逐手频率未给；段落中的所有付款候选需逐手验证，不整体继承'],
 ['N1','所有两手高牌（KQ、KJ等）','T85两高张进攻候选',{board:'T85 rainbow',hands:['KQ','KJ'],conclusion:'强烈倾向下注的候选',precision:'preference',frequency:null},'不补造完整手牌范围或逐手混合比例'],
 ['N1','A高牌也强烈想下注','T85的A4理由',{board:'T85 rainbow',hands:['A4'],conclusion:'下注候选，需综合移除、改善与回应',precision:'candidate',frequency:null},'物理移除可复算；对手响应是课程讨论，不是普遍事实'],
 ['N1','简化规则：手持KQ永远不下注','A72的KQ执行简化',{board:'A72 rainbow',hands:['KQ'],conclusion:'该段简化为过牌',precision:'explicit_course_simplification',frequency:0},'限定为调整前的该课程简化，不当成所有对手的唯一最优'],
 ['N1','简化规则：手持KQ永远不下注','A72的Q3执行简化',{board:'A72 rainbow',hands:['Q3'],conclusion:'该段简化为下注，主尺寸约1/3',precision:'explicit_course_simplification',frequency:100},'不与随后基于对手偏差的扩大版本混用'],
 ['N1','所有KQ、K10等卡顺牌喜欢下注','J95的卡顺候选',{board:'J95 two-tone; complete original suit assignment not recovered',hands:['KQ','KT'],conclusion:'下注候选',precision:'preference',frequency:null},'牌张结构可核验，不能给其他未列组合补答案'],
 ['N1','所有KQ、K10等卡顺牌喜欢下注','J95的AJ取值',{board:'J95 two-tone; complete original suit assignment not recovered',hands:['AJo'],conclusion:'主要价值下注，原文同时保留偶尔过牌',precision:'preference',frequency:null},'同一段有“总是”和“偶尔过牌”，不擅自升级为100%'],
 ['N4','作者给出一个简单易行的策略','转牌高低牌总结作用范围',{board:null,hands:[],conclusion:'与前段小注后空白低牌例存在范围冲突',precision:'unresolved_scope',frequency:null},'不能作为通用可执行规则，需回原视频或设置核实'],
 ['N2','9-6-2彩虹（低连接干燥）','962彩虹的课程主尺寸',{board:'962 rainbow',hands:[],conclusion:'主要较大下注约67%',precision:'main_size',size:67,frequency:null},'可补转牌962路线的具体翻牌尺寸来源，但未给完整选牌'],
 ['N2','J-10-2（高牌连接）','JT2的课程小注',{board:'JT2, exact suit context not fully stated in this bullet',hands:[],conclusion:'主要小注25%，范围下注方向',precision:'main_size',size:25,frequency:null},'不能与导入T05固定33%前序静默当成完全同一版本'],
 ['N2','10-10-5彩虹（对子牌面）','TT5彩虹的课程主尺寸',{board:'TT5 rainbow',hands:[],conclusion:'40%底池',precision:'main_size',size:40,frequency:null},'不补整张选牌与频率'],
 ['N2','10-6-2带同花听牌','T62两同花的课程主尺寸',{board:'T62 two-tone',hands:[],conclusion:'40%底池',precision:'main_size',size:40,frequency:null},'牌面特征与场景保留，不外推所有T高两同花'],
 ['N2','10-6-2彩虹','T62彩虹的课程主尺寸',{board:'T62 rainbow',hands:[],conclusion:'67%底池',precision:'main_size',size:67,frequency:null},'可与两同花作尺寸对照，不等于已给逐手动作'],
 ['N2','2-5-8（单调牌面）','258单色的课程主尺寸',{board:'258 monotone',hands:[],conclusion:'25%底池',precision:'main_size',size:25,frequency:null},'未列完整动作频率，不变为单色全打'],
 ['N2','10-9-5彩虹','T95彩虹的课程主尺寸',{board:'T95 rainbow',hands:[],conclusion:'40%底池',precision:'main_size',size:40,frequency:null},'原段的单手50%权益说法缺完整条件，不能作为该尺寸的数学证明'],
 ['N4','在大多数空白牌（如K♠ T♥ 5♣','KT52的小注后继续方向',{board:'Ks Th 5c / 2d',hands:[],conclusion:'该小注前序章节给出高频大尺寸第二枪方向',precision:'preference',frequency:null},'需匹配前序与对手假设；不给任意手牌填纯动作，也不沿用有冲突的高低牌总口诀'],
 ['N4','同样，Q♠ T♥ 5♠翻牌','QT52的小注后继续方向',{board:'Qs Th 5s / 2d',hands:[],conclusion:'该段将同样的空白牌继续方向用于QT5两同花',precision:'preference',frequency:null},'不与单加注底池QT5的75%翻牌策略混成同一条线'],
 ['N4','数据验证：K♠ T♠ 5♠','单色翻牌后第四张同花色与空白对照',{board:'Ks Ts 5s / 9s versus 8c',hands:[],conclusion:'原文报告9s约40%较小下注；8c约66%较大下注',precision:'reported_range_frequencies',frequency:null,rangeBranches:[{turn:'9s',betFrequency:40,size:'small_unspecified'},{turn:'8c',betFrequency:66,size:'large_unspecified'}]},'翻牌已经单色，9s是第四张黑桃；不把总频率当逐手概率，不声称已取得原解算设置'],
 ['N4','另一例：J♥ T♠ 2♦翻牌','JT2转牌9与5的对照',{board:'Jh Ts 2d / 9d versus 5c',hands:[],conclusion:'原文报告9d约40%小注，5c高频大注',precision:'reported_range_frequencies',frequency:null,rangeBranches:[{turn:'9d',betFrequency:40,size:'small_unspecified'},{turn:'5c',betFrequency:null,size:'large_unspecified'}]},'9d改变可成顺组合；总频率与手牌动作不同，翻牌25/33版本冲突仍需核实'],
 ['N5','设置：按钮下注1/3底池（8bb）','T83过牌加注的条件锁定模型',{board:'T83 rainbow',hands:['66'],conclusion:'在所述BTN过弃调整模型中，给出22BB过牌加注并扩到任意手牌的结果',precision:'conditional_model_report',frequency:100,executionStatus:'requires_matched_model'},'8BB约为三分之一意味着例中池约24BB，不能接到另一个21BB前序；完整范围与锁定参数未取得，不开放任意发牌100%XR题'],
 ['N5','当被跟注后怎么办？','T83加注被跟后的过牌方向',{board:'T83 rainbow / brick',hands:[],conclusion:'该分支描述被跟后在空白转牌回到过牌；K转牌另有激进讨论',precision:'conditional_preference',frequency:null,executionStatus:'requires_matched_model'},'同段100%与K例应分支处理，尚无完整实体转牌和逐手处方，不把过牌自动变成弃牌'],
 ['N6','这种“价值下小，诈唬下大”的双尺度策略可能','对特定常规玩家的双尺度候选',{board:null,hands:['AA','J7o'],conclusion:'在所述常规玩家小注加注偏高、大注仍过弃假设下，讨论价值小注/诈唬大注的可能策略',precision:'conditional_candidate',frequency:null,sizeExamples:[33,70]},'原文为可能策略，不是所有常规玩家处方；没有花色/牌面/参考时不生成逐手唯一答案'],
 ['N7','河牌线路数据（紧弱玩家和鱼）','第三枪与其他河牌线路的对手差异',{board:null,hands:[],conclusion:'原文将紧弱/娱乐玩家对第三枪的反应与其他线路、常规玩家作区别',precision:'conditional_population_report',frequency:null},'人群历史统计不是已知当前对手；不能由过弃百分数反解逐组合响应或自动三枪'],
 ['N7','可以价值过牌加注，但绝不可诈唬','紧弱与娱乐玩家下注后的XR调整',{board:null,hands:[],conclusion:'在该章节对手下注范围偏强的假设下，减少/避免诈唬XR，价值XR另判断',precision:'conditional_course_adjustment',frequency:null},'不与3bet底池T83的锁定模型混用；价值门槛、逐手频率和跟注选择仍未由此给齐'],
 ['N4','举例：小盲对关煞位的3bet底池','SB对CO示例的行动顺序冲突',{board:'Ts 2s 2d / 7d',hands:[],conclusion:'若座位如文中所述，SB翻后先动，CO不可能在SB行动前领先下注；也不可能SB对CO拥有位置',precision:'unresolved_scope',frequency:null},'需回原视频确定座位/行为身份；不通过交换座位默默修复为课程原例'],
 ['N5','最大的错误是过牌-跟注','禁止所有过牌跟注的总结不能生成防守表',{board:null,hands:[],conclusion:'条件剥削总结未给完整防守范围，不能排除所有合法XC',precision:'unresolved_scope',frequency:null},'需完整匹配策略及对手响应，不把一句概括升级为任意手牌X/R或X/F'],
 ['N6','他不可能持有顺子（如T7、75）','快玩倾向不足以删除慢打强牌',{board:'986 two-tone',hands:['T7','75'],conclusion:'大概率快玩不推出跟注概率为0；该绝对删除缺依据',precision:'unresolved_scope',frequency:null},'T7/75在986可成顺，问题是响应推断；没有各组慢打参数就保留未定，不将其删除'],
 ['N7','说明他可能已经弃掉了弱牌','翻牌过牌没有发生弃牌',{board:null,hands:[],conclusion:'当前过牌动作不等于本轮弃牌；范围弱化或强牌减少需分别依据前序与下注策略',precision:'unresolved_scope',frequency:null},'不从过牌动画中自动删除弱牌，也不据此断言强端归零'],
 ['N1','同花手牌：更倾向于下注','T85的Q7s后门简化',{board:'T85 rainbow, source suit relationship: hearts backdoor present; spades absent',hands:['Q7s'],conclusion:'该段以有后门同花下注、无后门同花过牌来简化Q7s选择',precision:'explicit_course_simplification',frequency:null,ruleBranches:[{condition:'source-described Q7s with backdoor flush',betFrequency:100},{condition:'source-described Q7s without backdoor flush',betFrequency:0}],executionStatus:'stated_rule_application_only'},'限于该66%单加注底池选牌示例；原图未取得，不恢复全实体求解频率，不扩成任意手牌或任意牌面有后门就下注'],
 ['N2','在10高且连接性弱的干燥牌面上','T72彩虹的较大主尺寸',{board:'T72 rainbow',hands:[],conclusion:'该有利位置3bet课程例采用约2/3的较大主尺寸',precision:'approximate_main_size',frequency:null,sizeApproximatePercent:66},'近似主尺寸不是任意手牌下注100%；训练若统一为67需标为执行取值，不冒称原文求解唯一精确数'],
 ['N2','但一旦牌面变得有连接性或带同花听牌','T高连接与花色的尺寸对照',{board:'T98 versus T82 rainbow versus T72 rainbow/two-tone',hands:[],conclusion:'原文以连接与花色变化对照25、40及约66的主尺寸',precision:'main_size_comparison',frequency:null,branches:[{board:'T98',size:25},{board:'T82 rainbow',size:40},{board:'T72 rainbow',sizeApproximatePercent:66},{board:'T72 two-tone',sizeApproximatePercent:40}]},'按课程具体例子匹配，不能数出有花听就推所有牌面40；第三张花色未明确的例子不擅自恢复原图'],
 ['N2','例子：10-5-2彩虹','T52的AA大注付款对象',{board:'T52 rainbow',hands:['AA'],conclusion:'该段用75%大注仍有较差牌继续来解释取值空间',precision:'conditional_mechanism_example',frequency:null,size:75},'未给完整响应与权益，不把所有列出的JTx/99/88/A5s统一成同一频率，也不由此求任意尺寸最优'],
 ['N2','例子：J-9-8带同花听牌','J98听花的AA小注讨论',{board:'J98 two-tone',hands:['AA'],conclusion:'该段讨论小注25以保留较弱继续对象',precision:'conditional_mechanism_example',frequency:null,size:25},'55%等单手权益仍缺花色及完整条件；这一解释是该例讨论，不是“被跟权益降低则不准大注”的通用证明'],
 ['N2','**第二个问题：如果我下大注并得到跟注','被跟权益下降不足以单独否决大注',{board:null,hands:[],conclusion:'该自问帮助观察继续范围，但不能仅据被跟权益下降推出大注EV更低',precision:'unresolved_scope',frequency:null,blockingReason:'insufficient_general_decision_rule',counterexample:{file:'size-comparison-evidence.json',pointer:'/examples/equityFallsButLargeWins'}},'完整给定模型可同时出现被跟权益5/7降至2/3、大注EV从小注9.5提高到10；不据此断言原视频具体例子错误，但禁止将概括写成全局if/then']
];
specs.push(['N1','所以对A72彩虹面，你可以用1/3底池下注整个范围','A72调整后采用范围小注的课程简化',{board:'A72 rainbow',hands:[],conclusion:'在该段过弃与过少过牌加注假设下，结尾允许采用约1/3范围下注简化',precision:'explicit_conditional_course_simplification',frequency:100,frequencyScope:'adopted_final_course_simplification_not_reported_solver_combo_frequency',reportedSolverFrequency:'near_100_not_exact',executionStatus:'stated_rule_application_only'},'须明确采用后段条件与简化版本；不覆盖基础版KQ过牌规则，不将接近100的模型报告改称真实每个组合纯下注，更不凭级别或玩家称呼自动应用']);
specs.push(['N1','对于J7，处于中间','J95弱顶对过牌简化的受限子集',{board:'J95 two-tone, original complete suit assignment unavailable',hands:['J7 and lower kicker within one-pair J'],conclusion:'采用该段基础简化；编译单对J、另一张不高于7且无直接顺/花听牌的子集为过牌',precision:'explicit_course_simplification_subset',frequency:0,executionStatus:'stated_rule_application_only',authorRestriction:'Require current top pair J and no direct draw; do not classify J5 two pair or99 set by kicker threshold'},'原文未逐项列明这些排除条件；这是为避免扩大短句而保守取出的执行子集，不声称恢复完整弱顶对或组合听牌策略']);
specs.push(['N1','对于J7，处于中间','J95的J8价值下注方向',{board:'J95 two-tone',hands:['J8'],conclusion:'该段将J8列在价值下注一侧',precision:'preference',frequency:null},'不把价值端描述推成真实100%逐组合频率；AJ同段保留偶尔过牌，也不因踢脚顺序给所有更高J补纯动作']);
specs.push(['N1','看诈唬牌：K7、K8','J95方片后门措辞需要完整花色与同花身份',{board:'J95 two-tone',hands:['K7','K8'],conclusion:'仅凭有方片不能恢复完整实体手牌与后门/直接听花关系，暂不发布这些组合的精确动作',precision:'unresolved_scope',frequency:null,blockingReason:'incomplete_suit_and_suitedness_metadata',counterexample:{file:'j95-hand-role-evidence.json',pointer:'/suitDiagnostics'}},'两张方片公共牌上，一张方片底牌与两张方片底牌分别是后门和直接听花；原图未取得，不据此认定原讲师错误']);
specs.push(['N1','对2（如22）作为诈唬过牌-加注','A72的22诈唬标签需要核实',{board:'A72 rainbow',hands:['22'],conclusion:'22在该翻牌已成暗三条，原句不得编成弱一对转诈唬样本；具体行动和原讲师意图仍需参考',precision:'unresolved_scope',frequency:null,blockingReason:'made_hand_role_label_conflicts_with_literal_board',counterexample:{file:'a72-course-comparison-request.json',pointer:'/physicalReview/22'}},'三种合法22实体组合都由独立点数计数及五张评估核对为三条；不据此推导22必须加注，也不将笔记措辞问题归咎原视频']);
specs.push(['N5','当对手下注50%底池时','OOP3bet面对不同下注尺度的条件报告',{board:null,hands:[],conclusion:'该段报告半池下注分支更强、再加更多，相对于小注倾向减少XR；仅保留该统计条件下的比较方向',precision:'conditional_population_report',frequency:null,actorRole:'last_preflop_raiser_after_check',executionStatus:'requires_matched_response_model'},'不把半池这一数字直接编成所有牌面弃牌或禁止XR的规则；不把历史群体统计当当前对手策略']);
specs.push(['N5','即便对手下注1/3并遭遇过牌-加注','A8与A4的被再加代价对照',{board:'T52; exact suits not specified',hands:['A8s','A4s'],conclusion:'原文用再加压力下损失的改善机会解释不同XR候选；支持比较后续代价，不给统一纯动作',precision:'conditional_preference',frequency:null,actorRole:'last_preflop_raiser_after_check',executionStatus:'requires_matched_response_model'},'需具体花色、范围、金额与再加后的政策；不能只按A高或卡顺名称判跟弃加，也不能把A4从所有XR里永久删除']);
specs.push(['N7','当小盲过牌，大盲下注，小盲再过牌加注时','盲对盲SRP的XR少弃统计条件',{board:null,hands:[],conclusion:'该段报告其统计样本中面对XR少弃，并按先前下注尺度区分；不与3bet过弃报告混成一条规则',precision:'conditional_population_report',frequency:null,actorRole:'SB_opener_after_check',executionStatus:'requires_matched_response_model'},'未取得当前数据库或逐手策略；不把总体少弃等同每个候选必跟，更不覆盖后文另述常规玩家条件']);
specs.push(['N7','常规玩家（regs）会思考更多','SRP过度刺探与XR过弃的调整条件',{board:null,hands:[],conclusion:'后文单列常规玩家在SB过牌后过度下注、面对XR过弃的条件，支持与前段总体或其他人群分版本',precision:'conditional_course_adjustment',frequency:null,actorRole:'SB_opener_after_check',executionStatus:'requires_matched_response_model'},'玩家称呼不直接生成动作概率；只有具体题设或匹配参考支持相应回应时才能用于精确比较，不补出完整手牌表']);
const reviews=specs.map(([note,needle,title,claim,limit],i)=>{
 const found=fragments.filter(f=>f.id.startsWith(note+'-')&&f.text.includes(needle));assert.equal(found.length,1,'Ambiguous source '+title);
 return {id:'R'+String(i+1).padStart(2,'0'),title,fragment:found[0].id,source:found[0].source,claim,limit,status:claim.precision==='unresolved_scope'?'requires_source_resolution':'reviewed_text_entailment_only',notProven:'No new solver validation, full-range completion, human learning outcome or NL50 performance'};
});
const output={scope:'逐行来源句段与首批人工语义复核。flags是检索提示，不是正确性判定；未审核句段不直接进入判分。',sourceFiles:audit.sources.length,sourceSections:audit.sources.reduce((n,s)=>n+s.sections.length,0),fragments,reviews,summary:{fragments:fragments.length,absoluteScopeFlags:fragments.filter(f=>f.flags.includes('绝对表述需核定作用范围')).length,reviewedTextClaims:reviews.filter(r=>r.status==='reviewed_text_entailment_only').length,unresolvedReviewedClaims:reviews.filter(r=>r.status==='requires_source_resolution').length}};
fs.writeFileSync(path.join(dir,'source-claims.json'),JSON.stringify(output,null,2));
console.log(JSON.stringify(output.summary,null,2));
