import {card,DECK,RANKS,HAND_NAMES,BOARD_NAMES,deal,pick,shuffle,evaluate,compare,draws,assertCards,boardClass,rankLabel,suitVariant} from './poker.js';
import {SCENARIOS,allRules,activeRules,branches} from './rules.js';
import {DEFAULTS,readingQuestion,strategyQuestion,ruleTasks} from './questions.js';
import {COURSE_CASES,courseQuestion,makeRiverModel,riverEV,bestActions,updateRange,format,percent} from './learning.js';

export {format,percent,riverEV,bestActions,updateRange};
const cs=s=>s.split(' ').map(card);
const options=items=>items.map(x=>Array.isArray(x)?{id:String(x[0]),label:x[1]}:{id:String(x),label:String(x)});
const result=(a,b)=>compare(evaluate(a),evaluate(b));
const relation=n=>n>0?'你赢':n<0?'对手赢':'平分';
const rule=id=>activeRules.find(r=>r.id===id);
const skill=(id,title,group,principle,look,variants,course=[])=>({id,title,group,principle,look,variants,course});

export const SKILLS=[
 skill('01','认清局面','看清眼前','先确认谁行动、有没有待跟金额，再讨论策略。3bet是再加注，不是三个人。','看座位和最后一次动作。',['actor','pot-type','legal','check-next'],['O07:action','P06:action','P08:action']),
 skill('02','谁的五张更大','看清眼前','从底牌和公共牌里选最好的五张。先比牌型，再比主点数和踢脚。','点出决定结果的五张牌。',['best-five','showdown','kicker','board-tie','ranking'],[]),
 skill('03','找顺子和听牌','看清眼前','补成顺或花，不等于一定获胜。后门还需要两张，直接听牌只差一张。','先找能补成的牌，再检查对手是否更大。',['straight-outs','flush-outs','backdoor','dirty-outs','overlap'],[]),
 skill('04','看懂牌面变化','看清眼前','六类只是入口；要指出哪一手牌怎样改善，不能只说干或湿。','对照前后牌张，找真正改变的关系。',['category','branch','structure'],['I08:size','I09:size','I13:size','I10:size']),
 skill('05','对手可能有什么','看懂决定','范围是当前信息下的可能性。合法、符合题设和出现频率是三个问题。','先排除撞牌，再按已给证据筛选。',['legal-range','evidence','weights','unknown'],[]),
 skill('06','一手强与整体强','看懂决定','我这手牌领先、整个范围常赢、最强一端占优，是三个不同判断。','分别比较每手牌与整体权重。',['relative','weighted-equity','top-vs-average','changed-weight'],['I11:hand:0','I11:hand:2']),
 skill('07','过牌会发生什么','看懂决定','后行动且对手已过牌，可以关闭本街；先过牌仍要等对手行动。','过牌后，下一件事究竟是什么？',['check-next','river-check','oop-check','street-change'],['I12:action','P06:action']),
 skill('08','下注的钱从哪来','看懂决定','和过牌比较：差牌付款、好牌退出，以及未来反超机会，分别带来什么。','点出实际付款或退出的对象。',['pay','fold','no-gain','deny','delta'],['R01:action','R02:action','R03:action']),
 skill('09','给手牌分配任务','看懂决定','同一牌面里，价值、改善候选和保留摊牌的任务不同；候选不是必下。','先读对手牌，再看课程怎样归类。',['hand-role','size-frequency','candidate','hand-change'],['I11:hand:0','I11:hand:2','S05:hand:0','S05:hand:3','S05:hand:4','S07:hand:1','S08:hand:1']),
 skill('10','为什么用这个尺寸','看懂决定','尺寸同时改变谁继续、付多少、输时多付多少；必须比较全部分支。','观察同一组牌怎样回应不同金额。',['size-best','response-flip','no-flip','weight-change','course-contrast'],['I08:size','I09:size','I13:size','S05:size']),
 skill('11','面对下注和加注','看懂决定','对手已经下注，问题就变成跟、弃或加；面对加注要重看加注范围。','看待补金额，以及原路线还适不适用。',['legal','raise-price','evidence-present','evidence-absent','raise-range'],['O07:action','R05:action']),
 skill('12','行动后还剩哪些牌','看懂决定','拿着某手牌时会这样行动的概率，决定这次行动以后还剩多少这种牌。','旧权重乘行动概率，保留可能慢打的强牌。',['retain','posterior','slowplay','raise-posterior'],['T07:action','R05:action']),
 skill('13','转牌改变了谁','走到后街','先保留上街留下的牌，再看新牌让谁改善。自己的牌没变，相对强弱也会变。','先预测，再翻开新牌核对最佳五张。',['turn-fact','four-flush','remaining-range','turn-relative'],['T05:action','T06:action']),
 skill('14','转牌要带着前序','走到后街','小注被跟、大注被跟、过牌加注被跟，留下的情况不一样；不能只背高牌打。','把当前新牌放回前一街的完整路线。',['turn-course','history-match','high-low','delayed'],['T01:size','T02:action','T03:action','T04:action','T08:action','T09:action','T10:action']),
 skill('15','河牌为什么再下注','走到后街','河牌没有下一张牌；看谁愿付钱、谁肯退出，并和过牌及失败成本比较。','牌不变，只改对手回应，看决定怎样变。',['river-value','river-no-value','river-bluff','river-response','blocker'],['R01:action','R02:action','R03:action','R06:action','R08:action']),
 skill('16','河牌跟注值不值','走到后街','价格给出要求，范围给出实际权益。算对价格仍不等于知道应该跟。','先点还要补多少钱，再比较给定范围。',['locate-price','call-price','call-decision','raise-price','missing-range','tie-call'],['R04:odds','R05:action']),
 skill('17','什么时候调整打法','走到后街','调整必须带条件。玩家标签和一两次观察不能提供完整回应概率。','找支撑调整的证据，再看撤掉证据会怎样。',['exploit-condition','missing-evidence','sensitivity','insufficient-change'],['O07:action','S02:size','S03:size','T07:action','T09:action','R08:action']),
 skill('18','把判断接成行动','连续使用','每步继承同一手牌的历史、钱和剩余可能性。资料到哪里，片段就练到哪里。','先单独判断，熟悉后只做当前行动。',['connected','state-money','route-boundary','course-execution'],[]),
];
for(const s of SKILLS)s.variants.push('contrast');
export const GROUPS=[...new Set(SKILLS.map(s=>s.group))];
export const skillInfo=id=>SKILLS.find(s=>s.id===id);
export const SOURCE_CATALOG=[...branches.map(b=>({...b,kind:'branch',pending:false})),...allRules.map(r=>({...r,kind:'course'}))];
export const AUTHORITY={cards:'看牌判断',model:'给定条件实验',course:'按课程',convention:'课程训练取值',conditional:'条件调整',principle:'原理示例'};
const PHASES=[['demo','看一遍'],['guided','动手补一步'],['contrast','只改一个条件'],['contrast','检查反例'],['independent','自己判断'],['independent','换个例子'],['course','用到课程'],['independent','再检查一次']];
export function lessonPlan(id){
 const s=skillInfo(id);if(!s)throw new Error('未知学习单元');
 return PHASES.map(([phase,label],i)=>({phase:phase==='course'&&!s.course.length?'application':phase,label:phase==='course'&&!s.course.length?'放回具体牌局':label,variant:s.variants[i%s.variants.length],serial:i}));
}
export function sourceCases(id,filter={}){
 const ids=new Set(skillInfo(id)?.course.map(x=>x.split(':')[0]));
 return COURSE_CASES.filter(c=>{const r=rule(c.ruleId);return (!filter.node||filter.node==='all'||c.ruleId===filter.node)&&(!filter.scenario||filter.scenario==='all'||r.scenario===filter.scenario)&&(!filter.category||filter.category==='all'||r.category===filter.category)&&(!filter.task||filter.task==='all'||c.task===filter.task)&&(filter.all||ids.has(c.ruleId));});
}
function base(title,answer,choices,detail,extra={}){
 return {title,correct:String(answer),options:options(choices),explanation:detail,board:[],hole:[],history:[],groups:[],authority:'cards',source:'标准扑克牌规则与合法行动',...extra};
}
function chooseSet(title,expected,choices,detail,extra={}){
 return {...base(title,'__set__',choices,detail,extra),interaction:'set',expected:expected.map(String),answer:expected.length?expected.map(x=>choices.find(c=>(Array.isArray(c)?String(c[0]):String(c))===String(x))).map(c=>Array.isArray(c)?c[1]:c).join('、'):'没有符合项'};
}
function numeric(title,value,unit,detail,extra={}){
 const v=Number(value.toFixed(2));return base(title,v,[v,v+10,Math.max(0,v-10),v+5].filter((n,i,a)=>a.indexOf(n)===i).map(n=>[n,format(n)+unit]),detail,extra);
}
function mapped(parts,rng){const flat=parts.flatMap(a=>cs(a)),all=suitVariant(flat,rng);let offset=0;return parts.map(a=>{const len=cs(a).length,b=all.slice(offset,offset+len);offset+=len;return b;});}
function contextQuestion(v,{pool,rng,serial=0}){
 const ids=Object.keys(SCENARIOS),id=ids[(serial+(pool==='test'?2:0))%ids.length],s=SCENARIOS[id],faced=v==='legal'&&(serial%2===0),ip=id.startsWith('ip');
 const board=deal(3,[],rng),history=[...s.history];
 if(faced)history.push(ip?'你下注，对手加注':'你过牌，对手下注');
 const extra={board,scenario:id,position:s.position,opponent:s.opponent,history,hideContext:true,family:`context:${v}:${id}:${faced}`,focus:'依次看翻前加注过程与最后一次动作。',remedy:'01'};
 if(v==='pot-type')return base('这手牌进入什么底池？',id.includes('3')?'3':'single',[['3','3bet底池'],['single','单加注底池'],['multi','三人底池']],`${s.history.join(' → ')}。${id.includes('3')?'出现再加注，所以是3bet；进入翻后仍只有两人。':'只有开池与跟注，没有再加注。'}`,extra);
 if(v==='legal')return base('此刻哪些行动是合法的？',faced?'facing':'free',[['facing','弃牌、跟注或合法加注'],['free','过牌或下注'],['any','任何时候都能过牌']],faced?'对手下注尚未跟齐，不能用过牌跳过待补金额。':'尚无人下注，可以过牌或主动下注。加注要先有人下注。',{...extra,amountOwed:faced?5:0});
 if(v==='check-next')return checkQuestion('check-next',{pool,rng,serial});
 const passes=serial%2===1;
 if(passes){if(ip){extra.board=[...board,...deal(1,board,rng)];extra.history=[...history,'翻牌你下注，对手跟注','发出转牌'];}else extra.history=[...history,'你过牌'];}
 return base('最后一个动作结束，现在轮到谁？',passes?s.opponent:s.position,[[s.position,`你 · ${s.position}`],[s.opponent,`对手 · ${s.opponent}`],['deal','直接发下一张牌']],passes?ip?'前一街结束后，新一街仍由较早位置的对手先行动。':'你先过牌，将行动交给后位对手，本街还没有结束。':ip?'对手已经过牌，你后行动。先前翻前3bet或开池，不改变这一轮的顺序。':'你在翻后先行动，还没有轮到后位的对手。',extra);
}

const BEST_CASES={train:[['As Kd Qh Js Tc','2c 3d'],['Ts 2h 2d','Jc Td'],['Qs Qh Qd','8c 8h'],['Ks 7h 2d 3c 9s','Ac Kd']],test:[['9s 8h 7d 6c 5s','Ac Qd'],['Jh Jd 4s','Jc Th'],['5s 5h 5d','9c 9h'],['Qs 8h 3d 2c Ts','Ac Qd']]};
function cardsQuestion(v,{pool,rng,serial=0}){
 if(v==='ranking')return {...base('从弱到强，依次点击九种牌型','__order__',shuffle(HAND_NAMES,rng),'高牌＜一对＜两对＜三条＜顺子＜同花＜葫芦＜四条＜同花顺。皇家同花顺属于同花顺。'),interaction:'order',expected:HAND_NAMES,answer:HAND_NAMES.join(' → '),family:'rank-order'};
 if(v==='showdown'){
  const q=readingQuestion({...DEFAULTS,module:'showdown',street:pool==='test'?'river':'turn'},rng);
  return {...q,groups:[],opponentHole:q.opponentHole,authority:'cards',family:`showdown:${q.best?.name||q.best?.length}:${q.correct}`,remedy:'02',focus:'先比较双方牌型，再找第一个不同的点数。'};
 }
 if(v==='kicker'){
  const [board,hole,opp]=mapped(pool==='train'?['Ks 7h 2d 3c 9s','Ac Kd','Kh Qd']:['Qs 8h 3d 2c Ts','Ac Qd','Qh Jd'],rng);
  const a=evaluate([...board,...hole]),b=evaluate([...board,...opp]);
  return base('同样是一对，决定谁赢的是哪一项？','kicker',[['kicker','同牌型之后比较踢脚'],['suit','比较花色大小'],['same','一对相同就平分']],`你：${a.name}；对手：${b.name}。第一张不同的踢脚决定大小，花色不分等级。`,{board,hole,opponentHole:opp,best:a.cards,opponentBest:b.cards,family:`kicker:${board[0].rank}`,remedy:'02'});
 }
 const row=BEST_CASES[pool][v==='board-tie'?0:serial%BEST_CASES[pool].length];
 let [board,hole]=mapped(row,rng);
 if(pool==='test'&&v!=='board-tie'){board=deal(serial%2?5:4,[],rng);hole=deal(2,board,rng);}
 const best=evaluate([...board,...hole]);
 return {...base('点出你能组成的最佳五张牌','__five__',[],`最佳牌型是${best.name}。可以用零、一或两张底牌；等价最佳五张都接受。`,{board,hole,best:best.cards,focus:'先找能组成的最高牌型，再保留最好的踢脚。',remedy:'02',family:`best:${pool}:${serial%BEST_CASES[pool].length}`}),interaction:'five',selectionCards:[...board,...hole],answer:best.name};
}

const DRAW_CASES={train:[['Ts 7h 2d','Jc 9h'],['Ts 8h 2d','Jc 9h'],['Qs Td 5s','Js 9s'],['As 5h 9d','3c 2h']],test:[['Qs 9h 3d','Jc Th'],['Js 8h 2d','Tc 9h'],['Js Td 4s','Qs 9s'],['4s 5h 9d','Ac 2h']]};
function drawsQuestion(v,{pool,rng,serial=0}){
 if(v==='dirty-outs'){
  const [board,hole,opp]=mapped(pool==='train'?['Js 7s 2d 3c','As Qs','7h 7d']:['Ts 6s 3d 4c','As Ks','6h 6d'],rng),known=[...board,...hole,...opp],remaining=DECK.filter(c=>!known.some(k=>k.id===c.id));
  const winners=remaining.filter(c=>result([...hole,...board,c],[...opp,...board,c])>0),flush=remaining.filter(c=>[...hole,...board,c].filter(x=>x.suit===hole[0].suit).length>=5);
  const dirty=flush.find(c=>!winners.some(w=>w.id===c.id)),a=evaluate([...board,...hole,dirty]),b=evaluate([...board,...opp,dirty]);
  return numeric('这些已知牌下，真正让你河牌获胜的牌有几张？',winners.length,'张',`剩余${remaining.length}张合法牌；${flush.length}张能成花，但不全能赢。逐张枚举双方最佳五张，真正获胜${winners.length}张。`,{board,hole,opponentHole:opp,outCards:winners,dirtyExample:{river:dirty,hero:a.cards,opponent:b.cards,heroName:a.name,opponentName:b.name},authority:'cards',family:`dirty:${pool}`,remedy:'03',focus:'对手也可能同时变葫芦；改善和获胜分开看。',evidence:{remaining:remaining.length,winners:winners.map(c=>c.id),flushes:flush.map(c=>c.id)}});
 }
 const row=DRAW_CASES[pool][serial%DRAW_CASES[pool].length];let [board,hole]=mapped(row,rng);
 if(pool==='test'&&v==='straight-outs'){
  for(let attempt=0;attempt<500;attempt++){const b=deal(3,[],rng),h=deal(2,b,rng),d=draws(h,b);if(!d.madeStraight&&d.straightOuts.length>0){board=b;hole=h;break;}}
 }
 if(v==='backdoor') [board,hole]=mapped(pool==='train'?['Ts 7h 2d','As Qs']:['Js 8h 3d','Ks Qs'],rng);
 if(v==='flush-outs') [board,hole]=mapped(pool==='train'?['Ts 7s 2d','As Qs']:['Js 8s 3d','Ks Qs'],rng);
 const d=draws(hole,board),extra={board,hole,family:`draw:${v}:${pool}:${serial%DRAW_CASES[pool].length}`,remedy:'03'};
 if(v==='backdoor')return base('要用这个花色成花，还需要后面几张都合适？','two',[['one','只差一张'],['two','转牌和河牌两张都需要'],['made','已经成花']],`这个花色现在合计只有3张；成花需要5张，所以还需要连续两张。`,{...extra,focus:'先数这个花色一共有几张。'});
 const outs=v==='flush-outs'?d.flushOuts:v==='overlap'?[...new Map([...d.flushOuts,...d.straightOuts].map(c=>[c.id,c])).values()]:d.straightOuts;
 if(v==='overlap')return numeric('下一张成顺或成花的合法牌，去掉重复后一共有几张？',outs.length,'张',`顺听${d.straightOuts.length}张，花听${d.flushOuts.length}张，重复的只能算一次。并集共${outs.length}张；不保证一定获胜。`,{...extra,outCards:outs,focus:'相同的一张牌不能在两组里重复计数。'});
 if(v==='flush-outs')return numeric('能在下一张直接成花的合法牌有几张？',outs.length,'张',`已知牌里有4张对应花色；牌堆中剩${outs.length}张。这里没指定对手底牌，不能再当作已知移除。`,{...extra,outCards:outs});
 const ranks=[...new Set(outs.map(c=>rankLabel(c.rank)))];
 return chooseSet('下一张哪些点数能让你组成顺子？',ranks,[...RANKS],`合法顺子补牌点数：${ranks.join('、')||'无'}。共有${outs.length}张实体牌；成顺不保证赢。`,{...extra,outCards:outs,focus:'A可以作A2345低端，不能绕成QKA23。'});
}

function boardQuestion(v,cfg){
 if(v==='category'){
  const board=deal(3,[],cfg.rng),id=boardClass(board);
  return base('这块翻牌先进入哪一个大类？',id,Object.entries(BOARD_NAMES),`先查三同花，再查对子/三条，其余按最高牌分。当前为${BOARD_NAMES[id]}；这只是查找入口，不直接决定下注。`,{board,family:`class:${id}`,remedy:'04'});
 }
 const b=branches[(cfg.serial+(cfg.pool==='test'?6:0))%branches.length];
 const q=readingQuestion({...DEFAULTS,module:'branch',unit:b.id},cfg.rng);
 return {...q,authority:'cards',family:`branch:${b.id}`,sourceId:b.id,focus:'两边是独立对照牌局。先找改变，再看右边具体成牌或听牌。',remedy:'04'};
}

function checkQuestion(v,{pool,rng,serial=0}){
 const ip=v==='river-check'||v==='check-next'&&serial%2===0,river=v==='river-check'||v==='street-change'&&serial%3===0,n=river?5:serial%3===1?4:3;
 const board=deal(n,[],rng),hole=deal(2,board,rng),s=ip?'ipSRP':'oopSRP';
 const answer=!ip?'opponent':n===5?'showdown':n===4?'river':'turn';
 return base('你现在过牌，接下来会发生什么？',answer,[['opponent','仍轮到对手，他可以下注或过牌'],['showdown','本轮结束，摊牌比较'],['turn','本轮结束，发转牌'],['river','本轮结束，发河牌']],!ip?'你先过牌只是把行动交给对手；后续若面对下注，需要另作决定。':n===5?'你后行动，对手已过牌，你再过牌就摊牌。':'对手已过牌，你后行动也过牌，本街结束。新牌的策略还需重新判断。',{board,hole,scenario:s,history:ip?['BTN开池，BB跟注','当前街：BB已经过牌','现在轮到你']:['SB开池，BB跟注','当前街：轮到你先行动'],family:`check:${ip}:${n}`,authority:'cards',focus:'看最后一次动作是否已由对手完成。',remedy:'07'});
}

function rangeQuestion(v,{pool,rng,serial=0}){
 const m=makeRiverModel({pool,variant:serial%4,weights:pool==='train'?[.4,.4,.2]:pick([[.2,.3,.5],[.1,.5,.4],[.5,.2,.3],[.3,.6,.1]],rng),rng}),{board,hole}=m;
 const groups=m.groups.map(g=>({...g,calls:undefined}));
 if(v==='legal-range'){
  const bad=[board[0],deal(1,[...board,...hole],rng)[0]],candidates=[{id:'X',label:'候选X',cards:bad,weight:null},...groups.slice(0,2).map(g=>({...g,weight:null}))];
  return chooseSet('哪些候选仅凭实体牌，就能确定不可能存在？',['X'],candidates.map(g=>[g.id,g.label]),'X使用了已经摆在公共牌中的同一张实体牌，确定不合法。其它组合目前合法，不代表已经知道出现频率。',{board,hole,groups:candidates,allowConflictingCandidates:true,authority:'cards',family:`legal-range:${pool}:${serial%4}`,remedy:'05'});
 }
 if(v==='evidence'||v==='unknown')return base('还缺什么，才能把这些“可能的牌”算成精确整体权益？','weight',[['weight','每种相容可能性的权重或明确分布'],['suit','只需要给花色排一个大小'],['equal','不缺，出现的例子自动各占一样多']],`合法候选不等于等概率候选。${v==='evidence'?'翻前进入和后续行动可提供筛选依据；本资料没有每条线路的完整范围。':'不能从展示了三手牌，得出真实对手各拿三分之一。'}`,{board,hole,groups:groups.map(g=>({...g,weight:null})),family:`missing-weights:${pool}`,focus:'先分清合法存在与出现多常见。',remedy:'05'});
 const total=groups.reduce((s,g)=>s+g.weight*g.equity,0);
 return numeric('按题目明确给定的权重，直接摊牌权益是多少？',total*100,'%',`逐组比较后，你的摊牌份额按出现比例加权，合计${percent(total)}。比例由题目设定，不是从三张示例牌自动推断。`,{board,hole,groups,authority:'model',family:`weighted:${pool}:${serial%4}`,remedy:'06'});
}

function advantageQuestion(v,cfg){
 if(v==='top-vs-average'){
  const [board,a1,a2,b1,b2]=mapped(cfg.pool==='train'?['Ks 7h 2d 3c 9s','Ac Ad','Qc Qd','Kh Kd','Jc Jd']:['Qs 8h 3d 2c Ts','Ac Ad','Jc Jd','Qh Qd','9c 9d'],cfg.rng);
  const heroRange=[{id:'A1',cards:a1,weight:.5},{id:'A2',cards:a2,weight:.5}],oppRange=[{id:'B1',cards:b1,weight:.1},{id:'B2',cards:b2,weight:.9}];
  const equity=heroRange.reduce((sum,a)=>sum+a.weight*oppRange.reduce((s,b)=>{const c=result([...board,...a.cards],[...board,...b.cards]);return s+b.weight*(c>0?1:c<0?0:.5);},0),0);
  const tops=[...heroRange.map(g=>({...g,side:'A'})),...oppRange.map(g=>({...g,side:'B'}))].sort((a,b)=>-result([...board,...a.cards],[...board,...b.cards]));
  return base('哪句话同时描述了整体和最强那手？','split',[['split',`甲整体权益${percent(equity)}，最强那手却在乙`],['same','甲整体常赢，所以最强那手一定在甲'],['top','乙有最强牌，所以乙整体一定常赢']],`按全部合法组合加权，甲权益${percent(equity)}；当前最强牌属于${tops[0].side==='B'?'乙':'甲'}。平均优势与最强一端可分离。`,{board,heroRange,groups:oppRange.map(g=>({...g,label:'乙 · '+g.id})),authority:'model',family:`advantage-split:${cfg.pool}`,focus:'分别点开甲与乙，比较最强手，再看权重。',remedy:'06'});
 }
 const m=makeRiverModel({pool:cfg.pool,variant:cfg.serial%4,weights:v==='changed-weight'?[.2,.2,.6]:cfg.pool==='test'?pick([[.3,.4,.3],[.2,.2,.6],[.4,.5,.1],[.2,.3,.5]],cfg.rng):[.4,.4,.2],rng:cfg.rng});
 if(v==='relative')return base('哪组在当前摊牌中击败你？','C',m.groups.map(g=>[g.id,g.label]),'你的牌击败A、B，输给C。单手关系先按最佳五张核对，再谈整体比例。',{board:m.board,hole:m.hole,groups:m.groups.map(g=>({...g,calls:undefined})),authority:'cards',family:`relative:${cfg.pool}:${m.variant}`,remedy:'02'});
 const e=m.groups.reduce((s,g)=>s+g.weight*g.equity,0);
 return numeric('这个完整教学范围下，你的摊牌权益是多少？',e*100,'%',`按每组的胜负和平分份额乘以权重，合计${percent(e)}。${v==='changed-weight'?'C组更常出现，牌不变，平均结果也会变。':'这不是下注频率，也不直接决定动作。'}`,{board:m.board,hole:m.hole,groups:m.groups.map(g=>({...g,calls:undefined})),authority:'model',family:`equity:${v}:${cfg.pool}:${m.variant}`,remedy:'06'});
}

function modelWithProfile(profile,cfg,weights){return makeRiverModel({profile,pool:cfg.pool,variant:cfg.serial%4,pot:cfg.pool==='train'?10:pick([12,16,24,30],cfg.rng),weights:weights||pick([[.4,.4,.2],[.5,.3,.2],[.3,.5,.2]],cfg.rng),rng:cfg.rng});}
function modelExtra(m){return {board:m.board,hole:m.hole,groups:m.groups,model:m,scenario:'ipSRP',history:['你在BTN开池，BB跟注','已经到河牌，BB过牌','现在你可以过牌或下注'],premise:m.boundary+' '+m.note,authority:'model',source:'手册07—10、15：有限河牌模型；由全部分支加权计算',family:`river:${m.pool}:${m.variant}:${m.profile}:${m.groups.map(g=>g.weight).join(',')}`,remedy:'08'};}
function computedModelQuestion(m,title='在给定条件下，哪个动作的平均结果最高？'){
 const best=bestActions(m),values=['check','small','large'].map(a=>riverEV(m,a));
 return {...base(title,best[0],[['check','过牌'],['small',`下注 ${format(m.bets.small)} BB`],['large',`下注 ${format(m.bets.large)} BB`]],`从当前决策点计算：过牌${format(values[0].value)}，下注${format(m.bets.small)}得${format(values[1].value)}，下注${format(m.bets.large)}得${format(values[2].value)} BB。比较所有付款、弃牌和输时成本。`,modelExtra(m)),accepted:best,focus:'先切换动作观察谁会跟、谁会弃；回答后再看总收益。'};
}
function betQuestion(v,cfg){
 if(v==='deny'){
  const [board,hole,opp,future]=mapped(cfg.pool==='train'?['Ts 7h 2d','Ac Ad','Kh Qh','Kd Qc']:['Js 8h 3d','Ac Ad','Kh Qh','Kd Qc'],cfg.rng);
  const remaining=DECK.filter(c=>![...board,...hole,...opp].some(k=>k.id===c.id));
  const improve=remaining.filter(c=>result([...board,c,...hole],[...board,c,...opp])<0);
  return base('如果对手现在弃牌，他会失去什么？','future',[['future','继续发牌后反超的机会'],['none','因为当前落后，未来也绝不可能赢'],['proof','这证明我们任何大小下注都划算']],`对手当前落后，但示意转河牌让KQ成为两对并反超AA。弃牌会关闭这些分支；是否值得下注，还须比较成本和回应。`,{board,hole,opponentHole:opp,futureBoard:[...board,...future],outCards:improve,authority:'cards',family:`deny:${cfg.pool}`,focus:'现在领先，不等于发完牌后永远领先。',remedy:'03'});
 }
 const profile=v==='fold'?'bluffOften':v==='no-gain'?'noValue':v==='river-bluff'?(cfg.serial%2?'bluffRare':'bluffOften'):v==='river-no-value'?'noValue':'sticky';
 const m=modelWithProfile(profile,cfg);
 if(cfg.pool==='train'&&['pay','fold','no-gain'].includes(v)){
  const g=m.groups[v==='pay'?1:0],pay=v==='pay',fold=v==='fold',B=m.bets.small;
  return base('只看这一手对手牌，下注相对过牌改变了什么？',pay?'pay':fold?'fold':'same',[["pay",`它比我差，跟注后多付我${format(B)} BB`],["fold",`它比我好，弃牌后我拿到原底池${format(m.pot)} BB`],["same",'它本来就输给我，弃牌没有带来新增收入']],pay?'直接摊牌本来就赢；对手跟注时，新增加的是他投入的钱，不是把我自己的下注也算利润。':fold?'过牌摊牌我会输；题设让这手更好牌弃掉，我才获得原底池。这里只演示一个结果。':'河牌没有新牌。本来就输给我的牌退出，不会比直接摊牌多给钱。',{board:m.board,hole:m.hole,opponentHole:g.cards,groups:[],money:{pot:m.pot,bet:B,kind:'delta'},authority:'model',premise:`先只看一个明牌结果；题设对手${pay?'确定跟注':'确定弃牌'}。河牌有位置，对手已过牌；无加注和抽水。不用这一个结果代替整个范围的决定。`,family:`single-outcome:${v}`,focus:'先比较谁大，再看实际移动了谁的钱。',remedy:'08'});
 }
 if(['river-value','river-no-value','river-bluff','river-response'].includes(v))return computedModelQuestion(m);
 if(v==='delta'){
  const g=m.groups[cfg.serial%3],B=m.bets.small,delta=g.equity===1?B:g.equity===0?-B:0;
  return numeric('只看这一组确定跟注的牌：相比过牌，下注多得到多少？',delta,' BB',`这组${g.equity===1?'比你差，新增付款是对手的下注':g.equity===0?'比你好，损失的是你新增的下注':'与你平分，双方新增投入互相抵消'}。收益变化${format(delta)} BB。这里只比较一个结果，不代表全部范围最优。`,{...modelExtra(m),groups:[{...g,weight:1,calls:{small:1,large:1}}],model:undefined,premise:`只比较展示的一个对手组合；它确定跟${format(B)} BB；河牌过牌直接摊牌，无加注无抽水。`,family:`delta:${g.equity}:${cfg.pool}`,money:{kind:'delta',pot:m.pot,bet:B}});
 }
 const correct=profile==='noValue'?'none':profile.startsWith('bluff')?'fold':'pay';
 return base('下注如果有新增收益，主要从哪种回应得到？',correct,[['pay','比我差的牌愿意跟注付款'],['fold','比我好的牌肯弃牌'],['none','两者都没有，下注增加损失']],correct==='pay'?'B组比你差且会跟注，能带来新增付款；还必须同时计入输给C的成本。':correct==='fold'?'你在摊牌中落后，收益来自领先你的牌退出；被跟注时的新损失也要计算。':'差牌退出没有增加河牌收入；强牌跟注会增加损失，过牌保留原有摊牌收益。',{...modelExtra(m),focus:'看每组实际强弱与跟弃条件，别只看自己的牌型。'});
}
function sizeQuestion(v,cfg){
 if(v==='course-contrast')return courseTask(pick(['I08:size','I09:size','I13:size','S05:size'],cfg.rng),cfg.rng);
 const weights=v==='no-flip'?[.7,.1,.2]:v==='weight-change'?(cfg.serial%2?[.2,.2,.6]:[.2,.7,.1]):[.4,.4,.2];
 const before=modelWithProfile('sensitive',cfg,weights);
 if(v==='size-best'||v==='weight-change')return {...computedModelQuestion(before),remedy:'10'};
 const after={...before,profile:'sticky',name:'只让B组也跟大注',note:'牌、底池与权重不变，只改变B组面对大注的回应。',groups:before.groups.map(g=>({...g,calls:{...g.calls,large:g.id==='B'?1:g.calls.large}}))};
 const oldBest=bestActions(before),newBest=bestActions(after),same=oldBest.join()===newBest.join();
 return {...computedModelQuestion(after,'只改变B组也跟大注，现在哪个选择最好？'),beforeModel:before,model:after,comparison:{before:oldBest,after:newBest},explanation:`原条件：${['check','small','large'].map(a=>format(riverEV(before,a).value)).join(' / ')}。改变后：${['check','small','large'].map(a=>format(riverEV(after,a).value)).join(' / ')} BB。${same?'B组虽然多付钱，幅度仍不足以改变最佳选择。':'只改付款意愿，最佳动作发生变化。'}不能只见条件变化就机械换按钮。`,family:`contrast:${cfg.pool}:${v}:${weights.join(',')}`,remedy:'10'};
}

function courseTask(id,rng){
 const q=courseQuestion(id,rng),r=q.rule;
 const convention=Boolean(r.convention||['I04','I05','O03'].includes(r.id));
 const principle=r.text?.includes('【原理补充】');
 return {...q,title:principle&&q.ruleTask==='action'?'按原表原理示例，这些条件支持哪个判断方向？':q.title,answer:q.ruleTask==='frequency'?'约'+q.answer:q.answer,options:q.ruleTask==='frequency'?q.options.map(o=>({...o,label:'约'+o.label})):q.options,authority:principle?'principle':r.exploit?'conditional':convention?'convention':'course',sourceId:r.id,family:'course:'+q.courseId,remedy:r.street==='turn'?'14':r.street==='river'?'15':'09',focus:q.ruleTask==='hand'?'按本节点手牌任务作答；候选与更多过牌保留原文精度。':q.ruleTask==='frequency'?'这里问原资料的近似范围频率，不是下注尺寸或逐手频率。':'先核对前序与条件，再执行当前资料。'};
}
function handQuestion(v,cfg){
 if(v==='size-frequency'){
  const freq=cfg.serial%2===0;
  return base(freq?'“约80%过牌”描述的是什么？':'“下注67%底池”描述的是什么？',freq?'frequency':'size',[['frequency','整个范围的行动频率'],['size','这次下注的大小'],['single','这手牌必定这么行动']],freq?'范围频率不是每手各有80%的过牌率，也不是下80%底池。':'主尺寸说明下注时下多少，不能据此判断每一手都应该下注。',{authority:'course',source:'O08的范围频率；I08的主尺寸',family:`size-frequency:${freq}`,remedy:'09'});
 }
 if(v==='candidate')return base('课程说“KQ可进入67%下注端”，能确定什么？','candidate',[['candidate','它是该条件下的下注候选'],['always','它每次都必须下注'],['freq','它的下注频率恰好67%']], '“可进入”保留候选资格；67是下注大小。原资料没有给这手牌的精确混合频率。',{authority:'course',source:'S07 / S08 具体手牌任务',family:'candidate-precision',remedy:'09'});
 if(v==='hand-change'){
  const m=modelWithProfile('sticky',cfg),strong=cfg.serial%2===0;
  if(!strong){
   const avail=DECK.filter(c=>![...m.board,...m.groups.flatMap(g=>g.cards)].some(k=>k.id===c.id));let found;
   for(const a of avail){for(const b of avail){if(a.id===b.id||a.rank!==b.rank)continue;const h=[a,b];if(m.groups.map(g=>result([...m.board,...h],[...m.board,...g.cards])).join(',')==='1,-1,-1'){found=h;break;}}if(found)break;}
   if(!found)throw new Error('未找到中间手牌');m.hole=found;m.groups=m.groups.map(g=>({...g,equity:result([...m.board,...found],[...m.board,...g.cards])>0?1:0}));
  }
  return {...computedModelQuestion(m),family:`hand-change:${strong}:${cfg.pool}:${m.variant}`,remedy:'09'};
 }
 return courseTask(pick(skillInfo('09').course,cfg.rng),cfg.rng);
}

function facingQuestion(v,cfg){
 if(v==='legal')return contextQuestion('legal',{...cfg,serial:cfg.serial*2});
 if(v==='raise-price')return priceQuestion(v,cfg);
 if(v==='raise-range')return courseTask('R05:action',cfg.rng);
 const present=v==='evidence-present';
 const r=rule('O07');return base('这条过牌加注调整，现在有充分的适用依据吗？',present?'yes':'missing',[['yes','有：弱牌小注，而且面对加注过弃'],['missing','还缺这条线路上的回应证据'],['always','只要小注，就一定可以扩大加注']],present?'题设同时明确提供O07需要的两项条件，可以按该课程方向考虑X/R；不补未给的逐手范围。':'仅观察到小注，不知道弱牌是否小注、面对加注是否过弃，不能直接套O07调整。',{board:r.board.map(card),scenario:'oop3',history:['BTN开池，SB 3bet，BTN跟注','你过牌，BTN小注'],premise:present?r.condition:'未知对手，只知道这一次下注偏小。',authority:present?'conditional':'model',source:r.source,family:`exploit-evidence:${present}`,remedy:'17',focus:'要有行为条件，不能只看这次金额偏小。'});
}

function posteriorQuestion(v,cfg){
 const m=makeRiverModel({pool:cfg.pool,variant:cfg.serial%4,rng:cfg.rng});
 const slow=v==='slowplay',action=v==='raise-posterior'?'raise':'call';
 const ps=cfg.pool==='train'?[[1,0,0],[0,1,0],[0,slow?1:.5,slow?0:.5]]:[[.6,.3,.1],[.2,.7,.1],[0,slow?.8:.2,slow?.2:.8]];
 const weights=cfg.pool==='train'?[.4,.4,.2]:[.2,.5,.3];
 const groups=m.groups.map((g,i)=>({...g,calls:undefined,weight:weights[i],responses:{fold:ps[i][0],call:ps[i][1],raise:ps[i][2]}}));
 const posterior=updateRange(groups,action),extra={board:m.board,hole:m.hole,groups,posterior,rangeAction:action,authority:'model',source:'N4范围筛选；N6慢打边界；条件概率计算',premise:`各组及响应构成完整教学模型。已观察到对手${action==='call'?'跟注':'加注'}；只问筛选结果，不判断你的后续动作。`,family:`posterior:${cfg.pool}:${v}`,remedy:'12',focus:'每组旧权重乘采取这次行动的概率，之后重新归一化。'};
 if(v==='retain')return chooseSet('观察到跟注后，哪些组仍有可能留下？',posterior.filter(g=>g.posterior>0).map(g=>g.id),groups.map(g=>[g.id,g.label]),'行动概率大于0的相容组合仍然可能留下；强牌也可能慢打跟注。',{...extra,answer:undefined});
 if(v==='slowplay')return numeric('强牌都慢打跟注时，跟注范围里C组占多少？',posterior[2].posterior*100,'%',`C组旧权重${percent(groups[2].weight)} × 跟注${percent(groups[2].responses.call)}，再除以本次跟注总概率，得到${percent(posterior[2].posterior)}。不是“跟注就没有强牌”。`,extra);
 const largest=Math.max(...posterior.map(g=>g.posterior)),leaders=posterior.filter(g=>Math.abs(g.posterior-largest)<1e-9).map(g=>g.id);
 return chooseSet('观察到这次行动后，哪组占比最高？并列时都选。',leaders,groups.map(g=>[g.id,g.label]),posterior.map(g=>`${g.label}现在占${percent(g.posterior)}`).join('；')+'。比较更新后的比例，不是原始比例。',extra);
}

const TURN_CASES={train:[['9s 6h 2d','Ah Ac','8s 5s','Jc','7d'],['Js Th 2d','Ah Ac','Kh Qh','5c','9d'],['Ks Ts 5d','Ah Ac','Qs Js','2c','9s'],['Ks Ts 5s','Ah Ac','As Qh','2h','9s']],test:[['Ts 7h 3d','Ah Ac','9s 8s','2c','6d'],['Qh Jh 4d','As Ac','Ts 9s','2c','8d'],['9s 8h 2d','Ah Ac','Js Ts','3c','Qc'],['Js 6s 2d','Ah Ac','Ks Qs','3h','8s']]};
function turnQuestion(v,cfg){
 const i=v==='four-flush'?3:cfg.serial%4,row=v==='four-flush'&&cfg.pool==='test'?['Qs 9s 4s','Ah Ac','Ks Jh','2h','7s']:TURN_CASES[cfg.pool][i];
 const [flop,hole,opp,a,b]=mapped(row,cfg.rng),left=[...flop,...a],right=[...flop,...b];
 if(v==='remaining-range'){
  const [flop,hole,a,b,c,turn]=mapped(cfg.pool==='train'?['9s 6h 2d','Ah Ac','Kh Qh','8s 5s','9h 9d','7d']:['Ts 7h 3d','Ah Ac','Kh Qh','9s 8s','Th Td','6d'],cfg.rng);
  const prior=[a,b,c].map((cards,i)=>({id:['A','B','C'][i],label:['A组','B组','C组'][i],cards,weight:[.4,.4,.2][i],responses:{call:[.2,1,.5][i],fold:[.8,0,.5][i],raise:0}}));
  const post=updateRange(prior,'call'),board=[...flop,...turn];
  const groups=post.map(g=>({...g,weight:g.posterior})),improved=groups.filter(g=>evaluate([...board,...g.cards]).value[0]>evaluate([...flop,...g.cards]).value[0]).map(g=>g.id);
  return chooseSet('翻牌跟注以后发出转牌：留下的哪些组牌型改善了？',improved,groups.map(g=>[g.id,g.label]),`先由翻牌跟注更新比例，再检查转牌。改善的组：${improved.map(id=>id+'组').join('、')||'无'}。已弃掉的情形不会下一街重新出现。`,{board,hole,leftBoard:flop,leftHole:hole,groups,priorGroups:prior,authority:'model',source:'N4范围筛选与转牌；手册13',family:`turn-range:${cfg.pool}`,focus:'左边保留上一街；按更新后范围逐手比较。',remedy:'13'});
 }
 const before=evaluate([...left,...opp]),after=evaluate([...right,...opp]),cmp=result([...right,...hole],[...right,...opp]);
 if(v==='turn-relative')return base('右侧新转牌出现后，双方谁更大？',relation(cmp),['你赢','对手赢','平分'],`你：${evaluate([...right,...hole]).name}；对手：${after.name}。自己的牌看似没变，也必须和改善后的对手重新比较。`,{board:right,hole,leftBoard:left,leftHole:hole,opponentHole:opp,best:evaluate([...right,...hole]).cards,opponentBest:after.cards,authority:'cards',family:`turn-relative:${cfg.pool}:${i}`,remedy:'02'});
 return base('只更换转牌：右边对手现在组成什么牌型？',after.name,HAND_NAMES,`左边对手为${before.name}，右边为${after.name}。先确认这项变化；没有完整策略资料时，不由成牌变化直接推出最优下注。`,{board:right,hole,leftBoard:left,leftHole:hole,opponentHole:opp,best:after.cards,family:`turn-fact:${cfg.pool}:${i}`,source:i===3&&cfg.pool==='train'?'T06四同花结构；按牌张枚举':'转牌牌张事实；N4；手册13',focus:'两边只是替代转牌，不是连续发两张。',remedy:'13'});
}

function historyQuestion(v,cfg){
 if(v==='turn-course')return courseTask(pick(['T01:size','T02:action','T03:action','T04:action','T08:action'],cfg.rng),cfg.rng);
 if(v==='delayed')return courseTask(pick(['T09:action','T10:action'],cfg.rng),cfg.rng);
 const low=cfg.serial%2===0,route=low?'T01':'T03',r=rule(route);
 if(v==='history-match')return base('要调用这个转牌节点，最不能省略的是哪项前情？','history',[['history','翻牌用什么尺寸、双方怎样回应'],['height','只看转牌点数高不高'],['suit','只看自己的底牌颜色']],`本例${low?'KT5翻牌B33被跟后转2，可挑选较大第二枪。':'962翻牌B67被跟后，指定低转牌按简化路线过牌。'}前街不同，不能只用“低牌”合并策略。`,{board:r.board.map(card),scenario:r.scenario,history:[`翻牌下注${r.beforeSize}%底池，对手跟注`,'转牌对手过牌'],authority:'course',source:r.source,family:`history-match:${route}`,remedy:'14'});
 return base('“所有低转牌都过牌”能覆盖这两条课程路线吗？','no',[['no','不能：KT5小注线与962大注线要分别处理'],['yes','能：只看转牌高低就够'],['any','前街投过钱，转牌都必须继续']], 'KT5小注后转2可以有较大第二枪；962大注后某些低转牌简化过牌。具体例子已经说明总口诀漏掉了前序。',{board:r.board.map(card),scenario:r.scenario,authority:'course',source:'N4具体例；T01与T03',family:`high-low:${route}`,remedy:'14'});
}

function priceQuestion(v,cfg){
 const P=cfg.pool==='train'?20:pick([12,24,32,40],cfg.rng),B=P*(cfg.serial%2?.5:1),raise=v==='raise-price',C=raise?P*1.5:B,Pnow=raise?P+P*.5+P*2:P+B;
 const money={pot:P,bet:raise?P*.5:B,opponentTotal:raise?P*2:B,call:C,current:Pnow,final:Pnow+C,kind:raise?'raise':'call'};
 if(v==='locate-price')return {...base('直接点金额：哪一笔是你现在还需要补的钱？','call',[['base','原底池'],['bet','对手已投入'],['call','你还需要补']],`当前底池已含对手下注，是${format(Pnow)} BB；你尚需付${format(C)} BB。跟注后总底池才是${format(Pnow+C)} BB，不能把对手的钱重复算。`,{money,authority:'cards',family:`locate-price:${cfg.pool}:${P}:${B}`,remedy:'16'}),interaction:'money'};
 if(v==='missing-range')return base('价格算出来后，还需要什么才能判断跟注是否有利？','range',[['range','对当前下注或加注范围的实际权益'],['auto','只要下注小就自动跟'],['past','以前投进去的钱越多越应该跟']],`价格是${percent(C/(Pnow+C))}的权益要求。它没有提供对手当前范围；不能自动产生跟弃答案。`,{money,authority:'model',source:'R04价格边界；R05重估加注范围',family:`missing-call-range:${raise}`,remedy:'16'});
 if(v==='call-price'||v==='raise-price')return numeric('跟注终结行动时，保本权益至少是多少？',C/(Pnow+C)*100,'%',`当前已有${format(Pnow)} BB，还要补${format(C)} BB，跟后${format(Pnow+C)} BB。门槛＝${format(C)}÷${format(Pnow+C)}。${raise?'对手是加到总额，不是再加同样金额。':'价格不等于你的实际胜率。'}`,{money,authority:'model',premise:'河牌，只比较跟注与弃牌；无抽水，跟注终结行动。',family:`price:${v}:${cfg.pool}:${P}:${B}`,remedy:'16',focus:'对手投入已在当前底池中；待补金额只加一次。'});
 let m,groups,board,hole;
 if(v==='tie-call'){
  [board,hole]=mapped(cfg.pool==='train'?['As Ks Qs Js Ts','2c 3d']:['9s 8h 7d 6c 5s','2c 3d'],cfg.rng);
  const opp=deal(2,[...board,...hole],cfg.rng),diff=result([...board,...hole],[...board,...opp]);
  groups=[{id:'A',label:'已知对手',cards:opp,weight:1,equity:diff>0?1:diff<0?0:.5}];
 }else{
  m=makeRiverModel({pool:cfg.pool,variant:cfg.serial%4,weights:cfg.serial%2?[.2,.2,.6]:[.1,.1,.8],rng:cfg.rng});board=m.board;hole=m.hole;groups=m.groups.map(g=>({...g,calls:undefined}));
 }
 const e=groups.reduce((s,g)=>s+g.weight*g.equity,0),ev=e*(Pnow+C)-C;
 return {...base('只比较跟与弃，按完整给定范围应怎样选？',ev>=0?'call':'fold',[['call','跟注'],['fold','弃牌']],`计入平分后的权益${percent(e)}；跟注平均净收益＝${percent(e)}×${format(Pnow+C)}−${format(C)}＝${format(ev)} BB，弃牌为0。${v==='tie-call'?'平分也有底池份额，不能当作输。':''}`,{board,hole,groups,money,premise:'河牌，范围和权重已完整给定；只比较跟与弃，无抽水，跟注终结行动。本题不求最优加注。',authority:'model',family:`call-decision:${v}:${cfg.pool}:${cfg.serial%2}`,remedy:'16',focus:'价格要求和实际权益放在一起比较。'}),accepted:Math.abs(ev)<1e-9?['call','fold']:undefined};
}

function adjustmentQuestion(v,cfg){
 if(v==='exploit-condition')return facingQuestion('evidence-present',cfg);
 if(v==='missing-evidence')return facingQuestion('evidence-absent',cfg);
 if(v==='insufficient-change')return sizeQuestion('no-flip',cfg);
 const bounds=cfg.serial%2?[.4,.5]:[.2,.4],P=cfg.pool==='train'?20:24,B=P/2,lo=bounds[0]*P-(1-bounds[0])*B,hi=bounds[1]*P-(1-bounds[1])*B,positive=lo>0;
 return base('只知道这个弃牌率区间，能确定下注优于过牌吗？',positive?'yes':'unknown',[['yes','能：整个给定区间内都优于过牌'],['unknown','不能：收益可能为正，也可能为负'],['label','只要对手是普通玩家就能确定']],`弃牌率从${percent(bounds[0])}到${percent(bounds[1])}，下注平均结果从${format(lo)}到${format(hi)} BB。${positive?'整个区间都大于过牌的0。':'跨过0，现有信息不能确定方向。'}这些概率是题设，不是玩家标签推出的。`,{money:{pot:P,bet:B,kind:'bluff'},premise:`河牌，过牌无摊牌价值，被跟必输；无加注无抽水。对手弃牌率只知道${percent(bounds[0])}—${percent(bounds[1])}。`,authority:'model',family:`sensitivity:${cfg.pool}:${bounds.join(',')}`,remedy:'17',focus:'不确定输入不一定让答案不确定；检查结果是否跨过比较起点。'});
}

export function createRoute(id='small',rng=Math.random){
 if(id==='model')return modelRoute(rng);
 const perm=shuffle(['s','h','d','c'],rng),map=Object.fromEntries(['s','h','d','c'].map((s,i)=>[s,perm[i]]));
 const get=(r,task)=>{const q=strategyQuestion({...DEFAULTS,module:r.street},rng,r,task,map);return {...q,premise:[q.condition,r.convention?'使用学习阶段已选定的课程训练值，原区间和取值在答后解析中核对。':'','本片段不指定具体底牌，只练课程明确的范围方向或主尺寸；金额用于说明筹码变化。'].filter(Boolean).join(' '),authority:r.exploit?'conditional':r.convention?'convention':'course',sourceId:r.id.replace('-前序',''),family:`route:${id}:${r.id}:${task}`,focus:'历史和底池继承同一手牌；本题只练资料支持的当前任务。',remedy:'18'};};
 let questions;
 if(id==='small'){
  const t=rule('T01'),f={...t,id:'T01-前序',street:'flop',board:t.board.slice(0,3),beforeSize:undefined,size:33,direction:undefined,convention:'T01明确记录的翻牌B33前序。'};
  questions=[get(f,'size'),get(t,'size')];
  questions[0].stateMoney={pot:20,hero:90.75,opponent:90.75,caption:'CO与BTN各投入9.25，另有盲注1.5；这里只演示账本。'};
  questions[1].stateMoney={pot:33.2,hero:84.15,opponent:84.15,caption:'翻牌双方各投入6.6，底池增加13.2。'};
  questions[1].routeEnd='本片段止于T01明确的转牌尺寸。未提供相容河牌处方，不继续编造第三枪。';
 }else if(id==='overbet'){
  questions=[get(rule('T07'),'action'),get(rule('R07'),'action')];
  questions[0].stateMoney={pot:10,hero:95.25,opponent:95.25,caption:'翻牌底池6，双方各投2后到转牌；这里练原资料的方向。'};
  questions[1].stateMoney={pot:35,hero:82.75,opponent:82.75,caption:'演示采用训练约定125%，双方各投12.5；不是课程给出的唯一尺寸。'};
  questions[1].routeEnd='河牌更连接，重估留下的组合。资料没有精确最终动作，本片段到此结束。';
  questions[1].premise+=' 继承的条件：强牌倾向快玩、后街对大注过弃；超池被跟后也不能断定没有强牌。';
 }else if(id==='xraise'){
  questions=[get(rule('O07'),'action'),get(rule('T08'),'action')];
  questions[0].stateMoney={pot:21,hero:90,opponent:90,caption:'BTN与SB各投入10，BB弃掉1。金额仅为筹码过程示意。'};
  questions[1].stateMoney={pot:61,hero:70,opponent:70,caption:'示意：BTN下6，SB加到20，BTN补14；底池共增加40。不判断此加注额最优。'};
  questions[1].routeEnd='先更多过牌不等于面对后续下注必须弃牌；后续防守缺资料，片段结束。';
 }else throw new Error('未知连续片段');
 const labels={small:'小注以后挑第二枪',overbet:'超池被跟以后重估',xraise:'过牌加注被跟以后'};
 return questions.map((q,i)=>({...q,routeId:id,routeTitle:labels[id],routeStep:i+1,routeSteps:questions.length,source:q.source,history:q.history||[],board:q.board||[],hole:q.hole||[],groups:[],route:true}));
}
function modelRoute(rng){
 const [flop,hole,a,b,c,t,r]=mapped(['9s 6h 2d','Ah Ac','Kh Qh','8s 5s','9h 9d','7d','3c'],rng);
 const prior=[a,b,c].map((cards,i)=>({id:['A','B','C'][i],label:['A组','B组','C组'][i],cards,weight:[.4,.4,.2][i],responses:{fold:[.8,0,0][i],call:[.2,1,.5][i],raise:[0,0,.5][i]}}));
 const posterior=updateRange(prior,'call'),groups=posterior.map(g=>({id:g.id,label:g.label,cards:g.cards,weight:g.posterior})),turn=[...flop,...t],river=[...turn,...r];
 const baseHistory=['BTN开到2.75，BB跟注，SB弃掉0.5','翻牌底池6，你下注2，BB跟注'];
 const first=chooseSet('观察到跟注后，哪组占比最高？',['B'],prior.map(g=>[g.id,g.label]),posterior.map(g=>`${g.label}更新后占${percent(g.posterior)}`).join('；')+'。下面会带着这些比例进入转牌。',{board:flop,hole,groups:prior,posterior,rangeAction:'call'});
 const improved=groups.filter(g=>evaluate([...turn,...g.cards]).value[0]>evaluate([...flop,...g.cards]).value[0]).map(g=>g.id);
 const second=chooseSet('同一手牌到转牌：哪些留下的组牌型改善了？',improved,groups.map(g=>[g.id,g.label]),'B组成为顺子；A组仍未成对，C组仍为三条。你的AA仍是一对，相对处境却改变了。',{board:turn,hole,leftBoard:flop,leftHole:hole,groups,priorGroups:prior});
 const model={pot:10,bets:{small:5,large:10},board:river,hole,groups:groups.map(g=>({...g,equity:result([...river,...hole],[...river,...g.cards])>0?1:0,calls:{small:g.id==='A'?0:1,large:g.id==='A'?0:1}})),note:'A组面对下注都弃；B、C组都跟。权重完整继承翻牌跟注后的筛选。',boundary:'河牌，BB已过牌；无再加注、无抽水，过牌直接摊牌。',profile:'route-model',pool:'route',variant:0};
 const third=computedModelQuestion(model,'到河牌了，按完整给定的回应应怎样行动？');
 const stages=[first,second,third];
 return stages.map((q,i)=>({...q,authority:'model',source:'手册12—18：完整给定的连续教学模型，不是新增课程GTO节点',family:`route:model:${i}`,scenario:'ipSRP',history:i===0?baseHistory:i===1?[...baseHistory,'BB转牌过牌']: [...baseHistory,'转牌双方过牌','河牌BB过牌'],premise:[q.premise,'所有候选、权重、响应均为题设；翻牌下注2用于演示，不评判其最优。',i===1?'本模型所有组合在转牌双方过牌这条路径上的概率均为100%，因此不会再筛掉任何组。':'',''].filter(Boolean).join(' '),stateMoney:{pot:10,hero:95.25,opponent:95.25,caption:'翻牌各投2后底池10；后续给定的过牌不改变筹码。'},route:true,routeId:'model',routeTitle:'筛选→转牌→河牌决定',routeStep:i+1,routeSteps:3,routeEnd:i===2?'已经用同一手牌、同一权重与同一账本完成了给定模型。这个结果不外推到未知真实对手。':undefined,remedy:i===0?'12':i===1?'13':'15'}));
}
export const ROUTE_CHOICES=[['small','小注以后挑第二枪'],['overbet','超池被跟以后重估'],['xraise','过牌加注被跟以后'],['model','筛选→转牌→河牌决定（给定模型）']];
function executionQuestion(v,cfg){
 if(v==='connected')return createRoute(ROUTE_CHOICES[cfg.serial%3][0],cfg.rng)[0];
 if(v==='course-execution')return courseTask(pick(COURSE_CASES,cfg.rng).id,cfg.rng);
 if(v==='state-money'){
  const P=cfg.pool==='train'?6:8,B=P/3;
  return numeric('这一街双方各投入所示金额，下一街底池是多少？',P+2*B,' BB',`原底池${P}，你新投${format(B)}，对手也投${format(B)}，合计${format(P+2*B)}。每人后手同时减少各自投入。金额只教状态，不是下注建议。`,{money:{pot:P,bet:B,call:B,current:P+B,final:P+2*B,kind:'ledger'},authority:'cards',source:'筹码守恒；手册18',family:`ledger:${P}`,remedy:'18'});
 }
 return base('走到资料未覆盖的下一分支，训练器应该怎样继续？','stop',[['stop','保留当前状态，说明边界并结束片段'],['copy','套用相似牌面的答案继续'],['reset','清空前序，重新抽一个题当作同一手']], '连续性必须继承历史与条件。有依据的片段可以练熟；缺失的下一步不能由相似图片或另一节点拼出来。',{authority:'course',source:'T08/R07的适用边界；手册18',family:'route-boundary',remedy:'18'});
}

function contrastTask(id,cfg){
 let q,before,after;
 const alternate=cfg.serial%2===1;
 if(id==='01'||id==='07'){
  q=checkQuestion(id==='01'?'check-next':'oop-check',{...cfg,serial:id==='01'?2:cfg.serial});
  before=id==='01'?'对手刚过牌，现在轮到你，本街尚未结束。':'同样牌张与给定候选：对手先过牌，你再过牌就关闭本街。';after=id==='01'?'只增加你的过牌动作：按当前街道发下一张或摊牌。':'只改变行动顺序：你先过牌，对手仍能行动。';
 }else if(id==='02'){
  const [board,old,hole,opp]=mapped(alternate?['Ks 7h 2d 3c 9s','Ac Kd','Ah Kd','Kh Qd']:['Ks 7h 2d 3c 9s','Ac Kd','Jc Kd','Kh Qd'],cfg.rng);
  const cmp=result([...board,...hole],[...board,...opp]);q=base('只改你的这一张底牌，右边现在谁更大？',relation(cmp),['你赢','对手赢','平分'],alternate?'A踢脚的实体花色改变，但大小关系不变。':'A踢脚变J踢脚；对手Q踢脚现在更大。先比同牌型，再比较第一个不同点数。',{board,hole,leftBoard:board,leftHole:old,opponentHole:opp,best:evaluate([...board,...hole]).cards,opponentBest:evaluate([...board,...opp]).cards,family:`kicker-contrast:${alternate}`,remedy:'02'});
  before='一对K，A踢脚；对手一对K，Q踢脚。';after=alternate?'只把A的花色换掉，点数和胜负保持。':'只把自己的A换成J，重新比较。';
 }else if(id==='03'||id==='04'){
  const b=id==='03'?(alternate?'D06':'D05'):(alternate?'D03':'D07');const raw=readingQuestion({...DEFAULTS,module:'branch',unit:b},cfg.rng);q={...raw,authority:'cards',sourceId:b,family:'branch:'+b,remedy:id};before='保留左侧的公共牌和底牌。';after='只检查画面上改变的关系；先读出右侧事实，不猜未给策略。';
 }else if(id==='05'){
  q=rangeQuestion('legal-range',cfg);const taken=[...q.board,...q.hole,...q.groups.flatMap(g=>g.cards)],replacement=deal(1,taken,cfg.rng)[0];q.beforeGroups=q.groups.map((g,i)=>i===0?{...g,cards:[replacement,g.cards[1]]}:g);before='所有候选都与已知牌不冲突。';after='只把一个候选的一张牌换成了已经公开的实体牌。';
 }else if(id==='06'){
  q=advantageQuestion('changed-weight',cfg);q.beforeGroups=q.groups.map((g,i)=>({...g,weight:[.4,.4,.2][i]}));before='这些具体牌中，你赢的两组总共占80%。';after='牌张都没变，强牌组变为60%，其余各20%。';
 }else if(id==='08'){
  const m=modelWithProfile('sticky',cfg),g={...m.groups[1],weight:1,calls:{small:0,large:0}};q=base('只让这手更差牌改成弃牌，相比过牌还有新增收入吗？','same',[['same','没有：本来直接摊牌也赢它'],['extra','有：赢回自己的下注也算新增利润'],['deny','河牌还能阻止它下一张反超']], '前后都能拿到原底池。差别是它不再付新增下注；河牌没有未来发牌。这里只看一个明确结果。',{board:m.board,hole:m.hole,groups:[g],beforeGroups:[{...g,calls:{small:1,large:1}}],authority:'model',premise:'只看这一手明示候选；河牌，对手已过牌，过牌直接摊牌，无加注无抽水。',family:'pay-vs-fold',remedy:'08'});before='它比你差，愿意跟下注付款。';after='只改变回应：同样的差牌现在弃牌。';
 }else if(id==='09'){
  q=courseTask(alternate?'I11:hand:1':'I11:hand:2',cfg.rng);q.leftBoard=q.board;q.leftHole=deal(2,q.board,cfg.rng);
  const aces=DECK.filter(c=>c.rank===14&&!q.board.some(b=>b.id===c.id));q.leftHole=aces.slice(0,2);before='相同的842彩虹、IP 3bet，先看AA的价值任务。';after=alternate?'只把AA换成KK，仍是资料明确的价值端。':'只把AA换成77，课程更多保留摊牌。';q.seenAlso=['course:I11:hand:0'];
 }else if(id==='10')return sizeQuestion(alternate?'no-flip':'response-flip',cfg);
 else if(id==='11'){
  q=facingQuestion(alternate?'evidence-present':'evidence-absent',cfg);before='同样T83、同样小注；先给出弱牌小注和对加注过弃的证据。';after=alternate?'两项证据仍然成立，可以调用该课程方向。':'只撤掉行为证据，不能靠小注本身推出过牌加注调整。';
 }else if(id==='12'){
  q=posteriorQuestion('slowplay',cfg);q.beforeGroups=q.groups.map((g,i)=>i===2?{...g,responses:{fold:0,call:.5,raise:.5}}:g);before='强牌组一半跟注、一半加注。';after='只把强牌组改成更多慢打；原权重与其它组回应保留。';
 }else if(id==='13')return turnQuestion(alternate?'four-flush':'turn-relative',cfg);
 else if(id==='14'){
  q=historyQuestion('high-low',cfg);before='KT5，小注被跟，转牌2：课程允许挑选较大第二枪。';after='962，大注被跟，指定低转牌：课程简化过牌。两条前序不同，不能只用高低概括。';
 }else if(id==='15'){
  const m=modelWithProfile('sticky',cfg,[.4,.4,.2]),n={...m,profile:'adjusted',note:'只改变B组付款概率，其它条件保持。',groups:m.groups.map((g,i)=>i===1?{...g,calls:{small:alternate?.8:0,large:alternate?.8:0}}:g)};
  q={...computedModelQuestion(n,'只改变差牌的付款意愿，现在哪个行动更好？'),beforeModel:m,changeLabel:'B组',family:`river-contrast:${alternate}:${cfg.pool}`,remedy:'15'};before='B组是较差牌，两种尺寸都跟。';after=alternate?'它现在跟80%；变化未必足以改变最佳动作。':'它现在不付款，但较强牌照样跟。';
 }else if(id==='16'){
  const m=modelWithProfile('sensitive',cfg),groups=m.groups.map((g,i)=>({...g,calls:undefined,weight:(alternate?[.25,.25,.5]:[.2,.2,.6])[i]})),P=20,B=10,e=groups.reduce((s,g)=>s+g.weight*g.equity,0),ev=e*40-10;
  q=base('价格没变，只改范围比例；跟注还是弃牌？',ev>=0?'call':'fold',[['call','跟注'],['fold','弃牌']],`门槛仍为25%，给定权益现在是${percent(e)}，跟注EV=${format(ev)} BB。价格不能替你提供实际权益。`,{board:m.board,hole:m.hole,groups,beforeGroups:groups.map((g,i)=>({...g,weight:(alternate?[.2,.2,.6]:[.1,.1,.8])[i]})),money:{pot:P,bet:B,call:B,current:30,final:40,kind:'call'},authority:'model',premise:'河牌，只比较跟与弃；范围完整给定，无抽水，跟注终结行动。',family:`price-range-contrast:${alternate}:${cfg.pool}`,remedy:'16'});before=alternate?'权益40%，跟注比弃牌好。':'权益20%，低于25%要求。';after=alternate?'权益变50%，正确选择不变。':'权益变40%，价格不变，正确选择却变了。';
 }else if(id==='17'){
  q=adjustmentQuestion('sensitivity',cfg);before='只知道弃牌率20%—40%，收益跨过0。';after=alternate?'证据把区间收窄到40%—50%，本模型方向才稳定。':'仍只有20%—40%，换一个玩家标签也不能补出概率。';
 }else{
  q=executionQuestion('state-money',cfg);before=`这一街前的底池${q.money.pot} BB。`;after=`双方各新增${format(q.money.bet)} BB；钱和历史都要带到下一步。`;
 }
 return {...q,contrastBefore:before,contrastAfter:after,comparisonLabel:q.beforeGroups?'看改变后的候选':q.comparisonLabel};
}
function generate(id,v,cfg){
 if(v==='contrast')return contrastTask(id,cfg);
 if(id==='01')return contextQuestion(v,cfg);
 if(id==='02')return cardsQuestion(v,cfg);
 if(id==='03')return drawsQuestion(v,cfg);
 if(id==='04')return boardQuestion(v,cfg);
 if(id==='05')return rangeQuestion(v,cfg);
 if(id==='06')return advantageQuestion(v,cfg);
 if(id==='07')return checkQuestion(v,cfg);
 if(id==='08')return betQuestion(v,cfg);
 if(id==='09')return handQuestion(v,cfg);
 if(id==='10')return sizeQuestion(v,cfg);
 if(id==='11')return facingQuestion(v,cfg);
 if(id==='12')return posteriorQuestion(v,cfg);
 if(id==='13')return turnQuestion(v,cfg);
 if(id==='14')return historyQuestion(v,cfg);
 if(id==='15')return v==='blocker'?rangeQuestion('legal-range',cfg):betQuestion(v,cfg);
 if(id==='16')return priceQuestion(v,cfg);
 if(id==='17')return adjustmentQuestion(v,cfg);
 if(id==='18')return executionQuestion(v,cfg);
 throw new Error('未知学习能力');
}

// Canonical suit renaming means changing colours alone never creates a new test identity.
export function instanceKey(q){
 if(q.courseId)return 'course:'+q.courseId;if(q.sourceId?.startsWith('D'))return 'branch:'+q.sourceId;
 const suits=new Map();const encode=c=>{if(!suits.has(c.suit))suits.set(c.suit,suits.size);return rankLabel(c.rank)+suits.get(c.suit);};
 const state=[q.board||[],q.hole||[],q.opponentHole||[],q.leftBoard||[]].map(a=>a.map(encode).join('')).join('/');
 const groups=[...(q.model?.groups||q.groups||[])].map(g=>[g.cards.map(encode).sort().join(''),g.weight,g.calls,g.responses]).sort((a,b)=>a[0].localeCompare(b[0]));
 return JSON.stringify([q.board.length?null:q.family,state,groups,q.money,q.history]);
}
function relabelGroups(q,rng){
 if(q.route||!q.groups?.length||q.heroRange||q.groups.length>3)return q;
 const names=shuffle(['A','B','C'],rng),map=Object.fromEntries(q.groups.map((g,i)=>[g.id,names[i]]));
 const text=s=>typeof s==='string'?s.replace(/([ABCX])组|候选([ABCX])/g,(m,a,b)=>a?`${map[a]||a}组`:`候选${map[b]||b}`):s;
 const change=g=>({...g,id:map[g.id]||g.id,label:g.label?.startsWith('候选')?'候选'+(map[g.id]||g.id):(map[g.id]||g.id)+'组'});
 const updateModel=m=>m?{...m,groups:m.groups.map(change),note:text(m.note),name:text(m.name)}:m;
 return {...q,changeLabel:map.B?map.B+'组':undefined,groups:q.groups.map(change),beforeGroups:q.beforeGroups?.map(change),posterior:q.posterior?.map(change),priorGroups:q.priorGroups?.map(change),model:updateModel(q.model),beforeModel:updateModel(q.beforeModel),correct:map[q.correct]||q.correct,accepted:q.accepted?.map(id=>map[id]||id),expected:q.expected?.map(id=>map[id]||id),options:q.options.map(o=>({id:map[o.id]||o.id,label:text(o.label)})),answer:text(q.answer),title:text(q.title),explanation:text(q.explanation),premise:text(q.premise),focus:text(q.focus),contrastBefore:text(q.contrastBefore),contrastAfter:text(q.contrastAfter)};
}
export function prepareQuestion(raw,{skillId='18',phase='independent',variant='',pool='test',rng=Math.random}={}){
 const q=relabelGroups({board:[],hole:[],history:[],groups:[],interaction:'choice',...raw,skillId,phase,variant,pool},rng);
 q.options=shuffle(q.options||[],rng);
 q.authorityLabel=AUTHORITY[q.authority]||AUTHORITY.cards;
 q.answer=q.answer||q.expected?.map(id=>q.options.find(o=>o.id===id)?.label||id).join('、')||q.options.find(o=>o.id===q.correct)?.label;
 q.accepted=q.accepted||[q.correct];q.familyKey=q.family;q.instanceKey=instanceKey(q);
 q.seenAlso=[...(q.seenAlso||[]),...(q.beforeModel?[instanceKey({...q,model:q.beforeModel,groups:q.beforeModel.groups})]:[]),...(q.beforeGroups?[instanceKey({...q,groups:q.beforeGroups})]:[])];
 if(q.beforeGroups&&q.rangeAction)q.beforePosterior=updateRange(q.beforeGroups,q.rangeAction);
 q.prompt=skillInfo(skillId).look;
 validateTask(q);return q;
}
export function createLessonQuestion(id,index=0,rng=Math.random){
 const spec=lessonPlan(id)[index];if(!spec)throw new Error('学习步骤越界');
 const s=skillInfo(id),cfg={pool:spec.phase==='independent'?'test':'train',rng,serial:spec.serial};
 let q;
 if(spec.phase==='course'&&s.course.length)q=courseTask(s.course[index%s.course.length],rng);
 else q=generate(id,spec.phase==='contrast'?'contrast':spec.variant,cfg);
 return prepareQuestion(q,{skillId:id,phase:spec.phase,variant:spec.variant,pool:cfg.pool,rng});
}
export function createPracticeQuestion(id,{rng=Math.random,serial=0,variant='all',filter={},seen=new Set()}={}){
 const s=skillInfo(id);if(!s)throw new Error('未知能力');
 const courseFilter=filter.node&&filter.node!=='all'||filter.scenario&&filter.scenario!=='all'||filter.category&&filter.category!=='all'||filter.task&&filter.task!=='all';
 let last;
 for(let attempt=0;attempt<80;attempt++){
  const cfg={pool:'test',rng,serial:serial+attempt};let raw;
  if(filter.branchNode){
   if(!branches.some(b=>b.id===filter.branchNode))throw new Error('未知牌面对照分支');
   const b=readingQuestion({...DEFAULTS,module:'branch',unit:filter.branchNode},rng);
   raw={...b,authority:'cards',sourceId:b.unit,family:'branch:'+b.unit,remedy:'04'};
  }else if(courseFilter||variant==='course'){
   const cases=sourceCases(id,{...filter,all:filter.all||id==='18'});if(!cases.length)throw new Error('这个筛选没有有依据的课程任务，请更换筛选。');raw=courseTask(cases[(serial+attempt)%cases.length].id,rng);
  }else{
   const v=variant==='all'?s.variants[(serial+attempt)%s.variants.length]:variant;
   raw=generate(id,v,cfg);
  }
  last=prepareQuestion(raw,{skillId:id,variant:variant==='all'?s.variants[(serial+attempt)%s.variants.length]:variant,rng});
  if(!seen.has(last.instanceKey))return {...last,isReview:false};
 }
 return {...last,isReview:true};
}
export function gradeTask(q,value){
 if(value==='__unknown__')return false;
 if(q.interaction==='set')return Array.isArray(value)&&new Set(value).size===q.expected.length&&q.expected.every(id=>value.includes(id));
 if(q.interaction==='order')return Array.isArray(value)&&value.length===q.expected.length&&value.every((id,i)=>id===q.expected[i]);
 if(q.interaction==='five'){
  if(!Array.isArray(value)||new Set(value).size!==5)return false;
  const selected=value.map(id=>q.selectionCards.find(c=>c.id===id));if(selected.some(c=>!c))return false;
  return compare(evaluate(selected),evaluate([...q.board,...q.hole]))===0;
 }
 return q.accepted.includes(value);
}
export function validateTask(q){
 assertCards([...(q.board||[]),...(q.hole||[]),...(q.opponentHole||[])]);
 if(q.leftBoard)assertCards([...q.leftBoard,...(q.leftHole||q.hole)]);
 if(q.groups?.length&&!q.allowConflictingCandidates)for(const g of q.groups)assertCards([...q.board,...q.hole,...g.cards]);
 if(q.heroRange)for(const a of q.heroRange)for(const b of q.groups)assertCards([...q.board,...a.cards,...b.cards]);
 if(!q.title||!q.explanation||!q.source||!q.family)throw new Error('教学任务缺少依据或解释');
 if(new Set(q.options.map(o=>o.id)).size!==q.options.length)throw new Error('答案选项重复');
 if(q.interaction==='choice'&&(!q.options.some(o=>o.id===q.correct)||q.accepted.some(id=>!q.options.some(o=>o.id===id))))throw new Error('答案不在选项中');
 if(q.interaction==='set'&&q.expected.some(id=>!q.options.some(o=>o.id===id)))throw new Error('点选目标缺少可见选项');
 if(q.sourceId){const r=allRules.find(r=>r.id===q.sourceId);if(r?.pending)throw new Error('待补节点禁止生成策略');}
 if(q.model){
  const m=q.model;if(m.board.length!==5||Math.abs(m.groups.reduce((s,g)=>s+g.weight,0)-1)>1e-8)throw new Error('数学模型不完整');
  for(const g of m.groups){const cmp=result([...m.board,...m.hole],[...m.board,...g.cards]);if(g.equity!==(cmp>0?1:cmp<0?0:.5))throw new Error('模型权益与牌张不相符');if(Object.values(g.calls).some(c=>c<0||c>1))throw new Error('回应概率错误');}
 }
 return true;
}
export function scoreKey({skillId,mode,variant='all',filter={}}){return JSON.stringify([skillId,mode,variant,filter.scenario||'all',filter.category||'all',filter.node||'all',filter.branchNode||'all',filter.task||'all',filter.all||false]);}
export function increment(scores,key,ok){const prev=scores[key]||{right:0,wrong:0};return {...scores,[key]:{right:prev.right+Number(ok),wrong:prev.wrong+Number(!ok)}};}
