import { DECK, RANKS, SUITS, card, pick, shuffle, deal, suitVariant, evaluate, compare, draws, boardClass, boardTexture, possibleBoardStraight, holeFromClass, rankLabel, SUIT_LABEL, HAND_NAMES, potOdds } from './poker.js';
import { preflopQuestion } from './preflop.js';
import { SCENARIOS, activeRules, CATEGORY_OPTIONS, branches } from './rules.js';
import { POSTFLOP_LESSON_PACKAGE } from './postflop-registry.js';
export const MODULES=[
  {id:'ranking',section:'reading',label:'牌力排序'},
  {id:'open',section:'preflop',label:'开池范围'}, {id:'threebet',section:'preflop',label:'3bet范围'}, {id:'bb',section:'preflop',label:'大盲防守'},
  {id:'board',section:'reading',label:'牌面六类'}, {id:'texture',section:'reading',label:'花色与对子'}, {id:'straight',section:'reading',label:'顺子／顺听'}, {id:'flush',section:'reading',label:'同花／花听'}, {id:'made',section:'reading',label:'当前牌力'}, {id:'showdown',section:'reading',label:'摊牌比大小'}, {id:'branch',section:'reading',label:'牌面变化'},
  {id:'scenario',section:'postflop',label:'情境识别'}, {id:'flop',section:'postflop',label:'翻牌专项'}, {id:'turn',section:'postflop',label:'转牌专项'}, {id:'river',section:'postflop',label:'河牌专项'}, {id:'exploit',section:'postflop',label:'条件剥削'},
  {id:'mixed',section:'combined',label:'综合随机'}, {id:'sequence',section:'combined',label:'连续路线'},
];
export const DEFAULTS={section:'preflop',module:'open',position:'all',size:'all',chart:'all',sampling:'custom',edgeRatio:50,mixed:true,boundary:true,changes:true,scenario:'all',category:'all',unit:'all',task:'all',readingType:'all',street:'all',mixPre:true,mixReading:true,mixPost:true};
export function readingTypesFor(settings) {
  if(settings.module==='straight')return settings.category==='P'&&settings.street==='all'?['两头顺','卡顺','无直接顺听']:['已成顺','两头顺','卡顺','双卡顺','无直接顺听'];
  if(settings.module==='flush')return settings.street==='turn'?['已成同花','直接同花听牌','没有同花或花听']:settings.category==='M'?['已成同花','直接同花听牌','后门同花']:settings.category==='all'?['已成同花','直接同花听牌','后门同花','没有同花或花听']:['直接同花听牌','后门同花','没有同花或花听'];
  if(settings.module==='showdown')return ['你赢','对手赢','平分'];
  if(settings.module==='made') {
    if(settings.street!=='all'||settings.category==='all')return HAND_NAMES;
    return settings.category==='P'?['一对','两对','三条','葫芦','四条']:settings.category==='M'?['高牌','一对','两对','三条','顺子','同花','同花顺']:['高牌','一对','两对','三条','顺子'];
  }
  return [];
}
const option=(id,label=id)=>({id:String(id),label});
const cardText=c=>rankLabel(c.rank)+SUIT_LABEL[c.suit];
const numericOptions=(value,values,suffix)=>[...new Set([...values,value])].sort((a,b)=>a-b).map(v=>option(v,v+suffix));
function boardDeal(settings,rng) {
  // Uniform categories when mixed; constrained generation, not a finite set of hand-written examples.
  const category=settings.category==='all'?pick(['M','P','A','KQ','JT','L'],rng):settings.category;
  let ranks;
  if(category==='P') {
    const pair=pick([...RANKS],rng),other=pick([...RANKS].filter(r=>r!==pair),rng);
    ranks=rng()<.15?[pair,pair,pair]:shuffle([pair,pair,other],rng);
  } else {
    const high=category==='M'?pick([...RANKS].slice(2),rng):category==='A'?'A':category==='KQ'?pick(['K','Q'],rng):category==='JT'?pick(['J','T'],rng):pick(['4','5','6','7','8','9'],rng);
    const below=[...RANKS].filter(r=>RANKS.indexOf(r)<RANKS.indexOf(high));
    ranks=shuffle([high,...shuffle(below,rng).slice(0,2)],rng);
  }
  let suits;
  if(category==='M') suits=Array(3).fill(pick(SUITS,rng));
  else if(category==='P') {
    const colors=shuffle(SUITS,rng);suits=colors.slice(0,3);
    if(new Set(ranks).size===2 && rng()<.5) {
      const solo=ranks.findIndex(r=>ranks.filter(x=>x===r).length===1);
      suits[solo]=suits[(solo+1)%3];
    }
  }
  else suits=rng()<.5?shuffle(SUITS,rng).slice(0,3):(()=>{const s=shuffle(SUITS,rng);return shuffle([s[0],s[0],s[1]],rng);})();
  return ranks.map((r,i)=>card(r+suits[i]));
}
function baseReading(title,board,hole=[],opponentHole=[]) {
  return {kind:'reading',title,subtitle:'看清牌的结构，再选择答案。',board,hole,opponentHole,source:'牌型、顺子与同花规则 · 程序枚举计算',position:'你',tags:[]};
}
function chooseFiltered(settings,rng,predicate,max=3500) {
  for(let i=0;i<max;i++) {
    let board=boardDeal(settings,rng);
    if(settings.street==='turn') board=[...board,...deal(1,board,rng)];
    if(settings.street==='river') board=[...board,...deal(2,board,rng)];
    const hole=deal(2,board,rng),d=draws(hole,board);
    if(predicate({board,hole,d})) return {board,hole,d};
  }
  throw new Error('这个筛选下没有生成到合适局面，请换一个筛选。');
}
export function readingQuestion(settings,rng=Math.random) {
  if(settings.module==='board') {
    const board=boardDeal(settings,rng),answer=boardClass(board);
    return {...baseReading('这个翻牌属于哪一大类？',board),options:CATEGORY_OPTIONS,correct:answer,answer:CATEGORY_OPTIONS.find(o=>o.id===answer).label,explanation:`按表格顺序检查：三同花 → 对子／三条面 → A高 → K/Q高 → J/T高 → 9高及以下。当前是${CATEGORY_OPTIONS.find(o=>o.id===answer).label}；${boardTexture(board)}。三同花优先，不因为含A再归A高。`,source:'翻后策略 · 00 从这里查 · D15:D20'};
  }
  if(settings.module==='texture') {
    const board=boardDeal(settings,rng),answer=boardTexture(board);
    return {...baseReading('这张翻牌的花色或配对结构是？',board),options:['彩虹','两同花','三同花','低点成对','高点成对','三条公共牌'].map(x=>option(x)),correct:answer,answer,explanation:`三个点数为${board.map(c=>rankLabel(c.rank)).join('、')}，花色为${board.map(c=>SUIT_LABEL[c.suit]).join('、')}。${answer.includes('成对')?'比较成对点数和单张点数的高低。':answer==='三条公共牌'?'三张公共牌点数相同。':'按不同花色的个数判定：三种为彩虹，两种为两同花，一种为三同花。'}因此是${answer}。`};
  }
  if(settings.module==='branch') return branchQuestion(settings,rng);
  if(settings.module==='showdown') return showdownQuestion(settings,rng);
  if(settings.module==='made') {
    const allowed=settings.readingType==='all'?null:settings.readingType;
    const {board,hole}=chooseFiltered(settings,rng,({board,hole})=>!allowed || evaluate([...board,...hole]).name===allowed);
    const result=evaluate([...board,...hole]);
    return {...baseReading('你现在最好的五张牌是什么牌型？',board,hole),options:HAND_NAMES.map(n=>option(n)),correct:result.name,answer:result.name,explanation:`从${board.length+2}张可用牌中选出最佳五张：${result.cards.map(cardText).join(' ')}。结果是${result.name}。公共牌也属于你的可用牌，不能只看两张底牌。`,best:result.cards};
  }
  if(settings.module==='straight') {
    const possible=readingTypesFor(settings);
    const wanted=settings.readingType==='all'?pick(possible,rng):settings.readingType;
    const {board,hole,d}=chooseFiltered(settings,rng,({d})=>d.straightType===wanted);
    const outs=d.straightOuts.map(cardText).join(' ');
    return {...baseReading('你有没有顺子，或者直接顺子听牌？',board,hole),options:['已成顺','两头顺','卡顺','双卡顺','无直接顺听'].map(x=>option(x)),correct:d.straightType,answer:d.straightType,explanation:d.madeStraight?`五个连续点数已经成立：${d.straightCards.map(cardText).join(' ')}。A只可在A2345或TJQKA中使用，不能绕着连接。本题只识别顺子结构；若另有同花等更大牌，最终牌型要另外比较。`:d.straightRanks.length?`来${d.straightRanks.map(rankLabel).join('或')}可以组成顺子；未出现的实体补牌为：${outs}，共${d.straightOuts.length}张。${d.straightType==='双卡顺'?'两个补牌点数不满足同一段四连张的两端，因此是双卡顺。':''}这里数的是能形成顺子的补牌，并不保证每张都让你赢对手。`:'枚举所有未出现的下一张牌，没有任何一张能直接组成五个连续点数。后门顺需要再来两张牌，属于另一种改善。',outCards:d.straightOuts};
  }
  if(settings.module==='flush') {
    const possible=readingTypesFor(settings);
    const wanted=settings.readingType==='all'?pick(possible,rng):settings.readingType;
    const label=d=>d.madeFlush?'已成同花':d.flushOuts.length?'直接同花听牌':d.backdoorFlush.length?'后门同花':'没有同花或花听';
    const {board,hole,d}=chooseFiltered(settings,rng,({d})=>label(d)===wanted);
    const answer=label(d);
    return {...baseReading('你当前的同花结构是什么？',board,hole),options:['已成同花','直接同花听牌','后门同花','没有同花或花听'].map(x=>option(x)),correct:answer,answer,explanation:d.madeFlush?'可用牌中已有至少五张同花色牌，已经成花；仍要比较同花大小。':d.flushOuts.length?`合计四张${SUIT_LABEL[d.flushSuit]}，还差一张。未出现的${SUIT_LABEL[d.flushSuit]}共${d.flushOuts.length}张：${d.flushOuts.map(cardText).join(' ')}。` : d.backdoorFlush.length?`翻牌时合计三张${d.backdoorFlush.map(s=>SUIT_LABEL[s]).join('或')}，必须转牌和河牌都来对应花色才成花，这是后门，不是直接花听。`:'可用牌中没有五张同花色，也没有四张同花色；翻牌时也没有三张同花色的后门结构。',outCards:d.flushOuts};
  }
  throw new Error('未知读牌练习');
}
export function showdownQuestion(settings,rng=Math.random) {
  let board,hole,opponentHole,a,b,winner;
  const desired=settings.readingType==='all'?pick(['你赢','对手赢','平分'],rng):settings.readingType;
  for(let i=0;i<5000;i++) {
    const cards=deal(9,[],rng);board=cards.slice(0,5);hole=cards.slice(5,7);opponentHole=cards.slice(7,9);
    if(settings.category!=='all' && boardClass(board.slice(0,3))!==settings.category) continue;
    a=evaluate([...board,...hole]);b=evaluate([...board,...opponentHole]); const cmp=compare(a,b);winner=cmp>0?'你赢':cmp<0?'对手赢':'平分';
    if(winner===desired) break;
  }
  if(winner!==desired) throw new Error('该筛选下没有生成到合适的摊牌，请更换筛选。');
  const diff=a.value.findIndex((v,i)=>v!==b.value[i]);
  return {...baseReading('双方摊牌，谁的五张牌更大？',board,hole,opponentHole),options:['你赢','对手赢','平分'].map(x=>option(x)),correct:winner,answer:winner,explanation:`你：${a.name}（${a.cards.map(cardText).join(' ')}）。对手：${b.name}（${b.cards.map(cardText).join(' ')}）。${winner==='平分'?'双方最佳五张的牌型与所有比较点数相同，平分底池，花色不分大小。':diff===0?'先比较牌型等级。':'牌型相同，按该牌型的主点数，再逐张比较踢脚牌；第一个不同点数决定胜负。'}结果：${winner}。`,best:a.cards,opponentBest:b.cards};
}
const branchSpecs={
  D01:{left:['As','7h','2d'],right:['As','Kh','2d'],hole:['Kc','Qd'],type:'made'},D02:{left:['As','7h','2d'],right:['As','5h','4d'],hole:['3c','2h'],type:'made'},D03:{left:['Ks','5h','2d'],right:['Qs','5h','2d'],hole:['Ac','Kd'],type:'made'},D04:{left:['Ks','5h','2d'],right:['Ks','Qh','Jd'],hole:['Ac','Td'],type:'made'},
  D05:{left:['Ts','7h','2d'],right:['Ts','7h','2s'],hole:['As','Qs'],type:'flush'},D06:{left:['Ts','7h','2d'],right:['Ts','8h','2d'],hole:['Jc','9h'],type:'straight'},D07:{left:['Ts','8h','2d'],right:['Ts','9h','8d'],hole:['Jc','Qh'],type:'straight'},D08:{left:['8s','4h','2d'],right:['4s','5h','6d'],hole:['7c','8h'],type:'made'},D09:{left:['4s','5h','6d'],right:['9s','8h','7d'],hole:['7c','7h'],type:'made'},D10:{left:['Ts','2h','2d'],right:['Ts','Th','5d'],hole:['Jc','Td'],type:'made'},D11:{left:['Qs','Qh','2d'],right:['Qs','Qh','Qd'],hole:['8c','8h'],type:'made'},
  D12:{left:['2s','5s','8s'],right:['2s','5s','8s'],hole:['Ah','Ad'],rightHole:['As','Ad'],type:'flush'},D13:{left:['2s','5s','8s'],right:['2s','5s','8s'],hole:['As','Ks'],rightHole:['Qs','Js'],type:'compare'},
};
function branchQuestion(settings,rng) {
  const source=pick(branches.filter(b=>settings.unit==='all' || settings.unit===b.id),rng),spec=branchSpecs[source.id];
  // The two panels are separate deals; a card can occur in both panels.
  const perm=shuffle(SUITS,rng),map=Object.fromEntries(SUITS.map((s,i)=>[s,perm[i]]));
  const change=xs=>xs.map(id=>card(id[0]+map[id[1]]));
  const left=change(spec.left),right=change(spec.right),hole=change(spec.hole),rh=change(spec.rightHole||spec.hole);
  let answer,options,title;
  if(spec.type==='made') {answer=evaluate([...right,...rh]).name;options=HAND_NAMES.map(x=>option(x));title='变化之后，右边这手牌是什么牌型？';}
  else if(spec.type==='straight') {answer=draws(rh,right).straightType;options=['已成顺','两头顺','卡顺','双卡顺','无直接顺听'].map(x=>option(x));title='变化之后，右边的顺子结构是什么？';}
  else if(spec.type==='flush') {const d=draws(rh,right);answer=d.madeFlush?'已成同花':d.flushOuts.length?'直接同花听牌':d.backdoorFlush.length?'后门同花':'无花听';options=['已成同花','直接同花听牌','后门同花','无花听'].map(x=>option(x));title='变化之后，右边的同花结构是什么？';}
  else {const cmp=compare(evaluate([...left,...hole]),evaluate([...right,...rh]));answer=cmp>0?'左边更大':cmp<0?'右边更大':'一样大';options=['左边更大','右边更大','一样大'].map(x=>option(x));title='同一公共牌，两手同花谁更大？';}
  const words={s:'黑桃',h:'红桃',d:'方片',c:'梅花'},translations=Object.fromEntries(SUITS.flatMap(s=>[[SUIT_LABEL[s],SUIT_LABEL[map[s]]],[words[s],words[map[s]]]]));
  return {...baseReading(title,right,rh),leftBoard:left,leftHole:hole,options,correct:answer,answer,subtitle:source.title,explanation:(source.text+'\n'+source.reason).replace(/♠|♥|♦|♣|黑桃|红桃|方片|梅花/g,t=>translations[t]),source:source.source,unit:source.id};
}
export function scenarioQuestion(settings,rng=Math.random) {
  const [id,s]=pick(Object.entries(SCENARIOS).filter(([id])=>id!=='earlyBTN' && (settings.scenario==='all' || id===settings.scenario)),rng);
  return {kind:'scenario',title:'根据刚才的经过，你处于哪个情境？',subtitle:'判断底池类型，以及翻后谁先行动。',board:[],hole:[],history:s.history,position:s.position,opponent:s.opponent,hideScenario:true,options:Object.entries(SCENARIOS).filter(([id])=>id!=='earlyBTN').map(([id,s])=>option(id,s.name)),correct:id,answer:s.name,explanation:`${s.history.join(' → ')}。${id.includes('3')?'你是翻前3bet方，双方进入3bet底池。':'你是开池方，对手跟注，进入单加注底池。'}${id.startsWith('ip')?'对手翻后先行动，你有位置。':'你翻后先行动，没有位置。'}`,source:'翻后策略 · 00 从这里查 · D8:D11'};
}
export function ruleTasks(rule) {
  const tasks=[];
  if(rule.size) tasks.push('size');
  if(rule.direction) tasks.push('action');
  if(rule.frequency) tasks.push('frequency');
  if(rule.hands?.length) tasks.push('hand');
  if(rule.task==='odds') tasks.push('odds');
  return tasks;
}
export const TASK_NAMES={size:'下注尺度',action:'执行路线',frequency:'范围频率',hand:'具体手牌',odds:'跟注赔率'};
export function eligibleRules(settings) {
  return activeRules.filter(r=>(settings.module==='exploit'?r.exploit:r.street===settings.module && !r.exploit) && (settings.scenario==='all' || settings.scenario===r.scenario) && (settings.category==='all' || settings.category===r.category) && (settings.unit==='all' || settings.unit===r.id) && (settings.task==='all' || ruleTasks(r).includes(settings.task)) && ruleTasks(r).length);
}
function historyFor(rule) {
  const s=SCENARIOS[rule.scenario];
  if(rule.street==='flop') return s.history;
  const start=s.history.slice(0,3);
  if(rule.line==='xx') return [...start,'翻牌：双方过牌','转牌轮到你'];
  if(rule.line==='xraise') return [...start,'翻牌：你过牌，BTN下注，你过牌加注，BTN跟注','转牌轮到你'];
  if(rule.street==='turn') return [...start,`翻牌：你下注${rule.beforeSize}%底池，对手跟注`,s.position==='BTN'?'转牌：对手过牌':'转牌轮到你'];
  if(rule.id==='R06') return [...start,'翻牌：你下注，对手跟注','转牌：你下注，对手跟注','河牌轮到你'];
  if(rule.id==='R07') return [...start,'翻牌：小注被跟','转牌：超池被跟','河牌：对手过牌'];
  if(rule.id==='R05') return [...start,'前序：进入资料中的河牌示例','河牌：你价值下注，对手加注'];
  return [...start,'前序：进入资料中的河牌示例',rule.id==='R04'?'河牌：对手下注':rule.id==='R08'?'前面有一街双方过牌，河牌轮到你':'河牌：对手过牌'];
}
export function strategyQuestion(settings,rng=Math.random,forceRule,forceTask,forceSuitMap) {
  const rule=forceRule || pick(eligibleRules(settings),rng);
  const task=forceTask || (settings.task==='all'?pick(ruleTasks(rule),rng):settings.task);
  const canonical=rule.board.map(card);
  let board=canonical;
  if(rule.turnRanks) {const r=pick(rule.turnRanks,rng);const next=pick(DECK.filter(c=>rankLabel(c.rank)===r && !canonical.slice(0,3).some(d=>d.id===c.id)),rng);board=[...canonical.slice(0,3),next];}
  let hole=rule.hole?.map(card)||[], hand;
  if(task==='hand') {hand=pick(rule.hands,rng);hole=hand.cards?.map(card)||holeFromClass(hand.hand,board,rng);}
  const permutation=shuffle(SUITS,rng),suitMap=forceSuitMap||Object.fromEntries(SUITS.map((s,i)=>[s,permutation[i]]));
  const change=xs=>xs.map(c=>card(rankLabel(c.rank)+suitMap[c.suit]));
  hole=change(hole);board=change(board);
  const suitWords={s:'黑桃',h:'红桃',d:'方片',c:'梅花'};
  const wordsMap=Object.fromEntries(SUITS.flatMap(s=>[[SUIT_LABEL[s],SUIT_LABEL[suitMap[s]]],[suitWords[s],suitWords[suitMap[s]]]]));
  const adaptText=text=>(text||'').replace(/♠|♥|♦|♣|黑桃|红桃|方片|梅花/g,t=>wordsMap[t]);
  const s=SCENARIOS[rule.scenario];
  const title=rule.street!=='flop'?`${board.slice(0,3).map(c=>rankLabel(c.rank)).join('')} → ${board.slice(3).map(cardText).join(' → ')}`:adaptText(rule.title);
  const lessonNode=POSTFLOP_LESSON_PACKAGE.nodes[rule.id]||null;
  const base={kind:'strategy',street:rule.street,ruleId:rule.id,task,board,hole,scenario:rule.scenario,position:s.position,opponent:s.opponent,history:historyFor(rule),subtitle:`${s.name} · ${title}`,condition:rule.condition||'',source:rule.source,sourceText:rule.text,sourceReason:rule.reason,explanation:adaptText([rule.convention,rule.text,rule.reason].filter(Boolean).join('\n')),image:rule.image,tags:rule.exploit?['条件剥削']:[],evidenceKind:lessonNode?.evidenceKind||'closed',gtoBinding:lessonNode?.gtoBinding||null,rangeContract:lessonNode?.range||null,successorContract:lessonNode?.successor||null,rule};
  if(task==='size') return {...base,title:`按这条路线下注时，主尺寸是多少？`,options:numericOptions(rule.size,[25,33,40,50,67,75,100,125],'%底池'),correct:String(rule.size),answer:rule.size+'%底池'};
  if(task==='frequency') return {...base,title:`表格里这个局面的${rule.frequency.action}频率是多少？`,options:numericOptions(rule.frequency.value,[20,40,50,55,80,100],'%'),correct:String(rule.frequency.value),answer:rule.frequency.action+' '+rule.frequency.value+'%',explanation:`这里的${rule.frequency.value}%是${rule.frequency.action}的范围频率，不是下注尺寸。\n`+base.explanation};
  if(task==='hand') return {...base,title:'按表格归类，这手牌进入哪个执行分支？',options:[...new Set(rule.hands.map(h=>h.action))].length>1?[...new Set(rule.hands.map(h=>h.action))].map(x=>option(x)):[option(hand.action),option('更多过牌'),option('任何两张都下注')].filter((o,i,a)=>a.findIndex(x=>x.id===o.id)===i),correct:hand.action,answer:hand.action,explanation:`${hand.hand || hand.cards.join(' ')}：${hand.kind}。本题判断资料中的执行分支；“更多过牌”不等于另造100%过牌频率，“候选”不等于每次必下。\n`+base.explanation};
  if(task==='odds') return oddsQuestion(base,rng);
  const alternatives={
    I12:['高频小注','强牌与听牌大注','中等频率下注'],O07:['直接高频持续下注','过牌后只跟注','过牌后整体弃牌'],O08:['高频小注','大部分手牌下注','先整体过牌'],P02:['先整体过牌','少量大注','只用口袋对子下注'],P03:['先整体过牌','只用强牌下注','减少持续下注'],P06:['高频大注','全范围小注','选择性中注'],P08:['照SB–BB扩大范围CB','高频小注','只有空气牌下注'],
    T02:['减少第二枪，下注偏小','先整体过牌','维持翻牌小注'],T03:['较大第二枪','小注继续','全范围超池'],T04:['全范围第二枪','维持翻牌频率','高频超池'],T05:['较大第二枪','保持翻牌频率与尺寸','全范围超池'],T06:['较大第二枪','继续高频中注','全范围超池'],T07:['按小注尺寸继续','只采用半池下注','所有手牌过牌'],T08:['持续大注第二枪','小注全范围继续','空白转牌直接全下'],T09:['继续整体过牌','只在改善时下注','减少延迟下注'],T10:['继续整体过牌','减少转牌下注','直接套用3bet底池路线'],
    R01:['过牌保留摊牌','诈唬下注','慢玩，不收价值'],R02:['薄价值下注','把QQ转成诈唬','大注赶走Kx'],R03:['错过听牌就继续诈唬','用87做价值下注','按前街投入继续开枪'],R05:['沿用价值下注结论自动跟','两对自动全下','直接把对手视为空气'],R06:['机械三枪继续诈唬','只根据reg标签增加诈唬','转牌被跟后自动超池'],R07:['延续转牌再超池','把河牌7当空白牌','只根据翻牌跟注认定封顶'],R08:['因为前面有过牌就整体下注','减少施压，不看对手倾向','沿用三枪线的跟注范围'],
  };
  const distractors=alternatives[rule.id]||['先整体过牌','高频小注','较大第二枪'];
  const options=shuffle([...new Set([rule.direction,...distractors])],rng).map(x=>option(x));
  return {...base,title:'在给定前提下，表格要求怎么执行？',options,correct:rule.direction,answer:rule.direction};
}
function oddsQuestion(base,rng) {
  const fractions=[.2,.25,1/3,.4],f=pick(fractions,rng),total=pick([80,120,160,180],rng),call=Math.round(total*f),pot=total-call;
  const answer=String(Math.round(potOdds(pot,call)*10000)/100);
  const vals=[...new Set([Number(answer),Math.round(call/pot*10000)/100,50,Math.round(Number(answer)/2*100)/100])].sort((a,b)=>a-b);
  return {...base,title:'跟注所需的最低胜率是多少？',subtitle:`当前底池 ${pot}BB（含对手刚下注的钱），你还需跟 ${call}BB。`,options:vals.map(v=>option(v,v+'%')),correct:answer,answer:answer+'%',explanation:`所需胜率 = 还需跟注金额 ÷（当前底池 + 还需跟注金额）= ${call} ÷ (${pot} + ${call}) = ${answer}%。底池已包含对手下注，不能再加一次。这只回答价格门槛，资料没有给对手范围，因此不自动判跟注或弃牌。`,source:'翻后策略 · 06 河牌路线 · B20:D24'};
}
// Only source-supported transitions; no invented river follows an arbitrary flop decision.
export const ROUTES=[
  {id:'line1',label:'IP 3bet · 小注后空白转牌',ids:['I05','T01'],note:'翻牌改用KT5：T01明确给出了KT5的B33前序。'},
  {id:'line2',label:'IP 3bet · 大注后转牌变化',ids:['T02','T03','T04']},
  {id:'line3',label:'IP SRP · 超池后河牌变化',ids:['T07','R07']},
  {id:'line4',label:'OOP 3bet · 过牌加注后转牌',ids:['O07','T08']},
  {id:'line5',label:'河牌 · 读牌与执行',ids:['R01','R02','R03','R05']},
];
export function sequenceQuestions(settings,rng=Math.random) {
  const route=pick(ROUTES.filter(r=>settings.unit==='all'||r.id===settings.unit),rng);
  const permutation=shuffle(SUITS,rng),suitMap=Object.fromEntries(SUITS.map((s,i)=>[s,permutation[i]]));
  let questions=[];
  if(route.id==='line1') {
    const turn=activeRules.find(r=>r.id==='T01');
    const flop={...turn,id:'T01-前序',street:'flop',board:turn.board.slice(0,3),title:'KT5 · 小注前序',size:33,direction:undefined,convention:'转牌路线T01明确给出此翻牌B33的前序。',beforeSize:undefined};
    questions=[strategyQuestion({...settings,task:'all'},rng,flop,'size',suitMap),strategyQuestion({...settings,task:'all'},rng,turn,'size',suitMap)];
  } else if(route.id==='line2') {
    const turn=pick(activeRules.filter(r=>['T02','T03','T04'].includes(r.id)),rng);
    const flop={...turn,id:turn.id+'-前序',street:'flop',board:turn.board.slice(0,3),title:'962 · 大注前序',size:67,direction:undefined,turnRanks:undefined,convention:'转牌路线明确给出962翻牌B67的前序。'};
    questions=[strategyQuestion({...settings,task:'all'},rng,flop,'size',suitMap),strategyQuestion({...settings,task:'all'},rng,turn,'action',suitMap)];
  } else if(route.id==='line5') {
    const rule=pick(activeRules.filter(r=>route.ids.includes(r.id)),rng),action=strategyQuestion({...settings,task:'all'},rng,rule,'action',suitMap);
    const e=evaluate([...action.board,...action.hole]);
    questions=[{...action,kind:'reading',title:'先读牌：你河牌的最佳牌型是什么？',options:HAND_NAMES.map(x=>option(x)),correct:e.name,answer:e.name,explanation:`最佳五张：${e.cards.map(cardText).join(' ')}，${e.name}。`,best:e.cards},action];
  } else questions=route.ids.map(id=>strategyQuestion({...settings,task:'all'},rng,activeRules.find(r=>r.id===id),'action',suitMap));
  questions=questions.map((q,i)=>({...q,route:route.label,step:i+1,steps:questions.length}));
  return questions;
}
export function generateQuestion(settings,rng=Math.random) {
  if(settings.module==='ranking') {
    const order=settings.orderDirection==='descending'?[...HAND_NAMES].reverse():[...HAND_NAMES];
    return {kind:'order',title:settings.orderDirection==='descending'?'从强到弱，依次点击牌型':'从弱到强，依次点击牌型',subtitle:'点击全部九种牌型，完成一轮排序。',board:[],hole:[],options:shuffle(HAND_NAMES,rng).map(x=>option(x)),order,correct:order[0],answer:order.join(' → '),explanation:'高牌 < 一对 < 两对 < 三条 < 顺子 < 同花 < 葫芦 < 四条 < 同花顺。皇家同花顺属于最高的同花顺。比较同一牌型时，再比较牌点和踢脚。',source:'德州扑克标准牌型大小顺序'};
  }
  if(['open','threebet','bb'].includes(settings.module)) return preflopQuestion(settings,rng);
  if(MODULES.find(m=>m.id===settings.module)?.section==='reading') return readingQuestion(settings,rng);
  if(settings.module==='scenario') return scenarioQuestion(settings,rng);
  if(['flop','turn','river','exploit'].includes(settings.module)) return strategyQuestion(settings,rng);
  if(settings.module==='mixed') {
    const modules=[];
    if(settings.mixPre) modules.push('open','threebet','bb');
    if(settings.mixReading) modules.push('board','texture','straight','flush','made','showdown','branch');
    if(settings.mixPost) {
      if(settings.scenario!=='earlyBTN')modules.push('scenario');
      for(const m of ['flop','turn','river'])if(eligibleRules({...settings,module:m,unit:'all',task:'all'}).length)modules.push(m);
    }
    const module=pick(modules,rng);
    // Mixed scenario/category selectors apply only to their relevant tasks.
    const reset={...settings,module,unit:'all',task:'all',readingType:'all',position:'all',size:'all',street:'all'};
    if(['open','threebet','bb'].includes(module)) return preflopQuestion(reset,rng);
    if(module==='scenario') return scenarioQuestion(reset,rng);
    if(['flop','turn','river'].includes(module)) {
      if(!eligibleRules(reset).length) return readingQuestion({...reset,module:'board'},rng);
      return strategyQuestion(reset,rng);
    }
    return readingQuestion(reset,rng);
  }
  throw new Error('请选择练习类型');
}
