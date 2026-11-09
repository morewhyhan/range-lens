import {card,shuffle,pick,deal,evaluate,compare,draws,assertCards,suitVariant,potOdds} from './poker.js';
import {activeRules,SCENARIOS} from './rules.js';
import {DEFAULTS,readingQuestion,strategyQuestion,ruleTasks} from './questions.js';

// Card facts, complete mathematical models and course rules are distinct
// authorities. A model optimum must never become an invented GTO prescription.
export const CHAPTERS=[
 {id:'basics',title:'看清牌与钱',question:'牌型、补牌和跟注价格，分别告诉你什么？',principle:'先确认事实，再讨论策略。价格门槛不等于已经知道应该跟注。',source:'标准牌型与底池赔率；笔记 2.1'},
 {id:'range',title:'对手可能有什么',question:'同一手一对，面对不同的一组牌，处境为什么不同？',principle:'和对手所有可能的牌按权重比较；不要只盯最吓人的一手牌。',source:'笔记 2.2 · 3.7；明确加权模型'},
 {id:'purpose',title:'下注得到什么',question:'下这一注，究竟向谁收钱、让谁弃牌？',principle:'下注要比较它与过牌的结果。差牌跟注、好牌弃牌，是两种不同的收益。',source:'笔记 2.1、2.6；简化表 R01—R03'},
 {id:'size',title:'为什么用这个尺寸',question:'多赶走一些牌，为什么反而可能得到更少？',principle:'同时看谁继续、谁退出，以及每种结果赚或亏多少。尺寸和手牌构成一起考虑。',source:'笔记 2.2 · 3.4—3.8；明确收益模型'},
 {id:'hands',title:'哪些牌使用这个策略',question:'同一个牌面，为什么AA下注，77却更常过牌？',principle:'先区分整范围的主尺寸与具体手牌的任务。手牌名称不能代替行动条件。',source:'笔记 2.2 · 3.7；原表明确手牌任务'},
 {id:'position',title:'位置与反击',question:'同样点过牌，为什么一边能发牌，另一边还要作答？',principle:'位置改变行动顺序和后续分支；换底池时，范围也变了，不能只归因于位置。',source:'笔记 2.5、2.7；行动规则'},
 {id:'response',title:'行动后还剩什么',question:'对手跟注以后，为什么不能直接认定他没有强牌？',principle:'旧权重乘以持这手牌采取该行动的概率，再重新归一化。慢玩会保留强牌。',source:'笔记 2.3、2.4、2.6；条件概率模型'},
 {id:'turn',title:'转牌重新判断',question:'先看上一街留下谁，再看新牌帮助谁。',principle:'同一张转牌在不同范围、不同前序中意义不同。不能只背“高牌打、低牌停”。',source:'笔记 2.4；简化表 T01—T10、R05—R08'},
 {id:'execution',title:'落实到课程打法',question:'收起教学辅助，只看牌局信息，完成真正的动作选择。',principle:'认场景 → 看双方 → 找目的与回应 → 执行当前资料明确的规则。',source:'原表全部可执行节点；条件调整单独给出前提'},
];
export const PHASES=['建立关系','改变条件','分清边界','独立检验','课程执行'];
export const format=n=>Number(n.toFixed(2)).toString();
export const percent=n=>format(n*100)+'%';
const cards=s=>s.split(' ').map(card);
const opts=xs=>xs.map(([id,label])=>({id:String(id),label}));
const rule=id=>activeRules.find(r=>r.id===id);
const stageLabels={intro:'建立关系',contrast:'改变条件',boundary:'分清边界',transfer:'独立检验',course:'课程执行'};
const authorityText={cards:'牌张计算',model:'条件明确的数学实验',course:'课程明确规则'};
function chain(condition,change,result){return {condition,change,result};}
function numeric(value,unit,other){return opts([...new Set([value,...other])].map(v=>[v,format(v)+unit]));}
function finish(q,rng){
 const out={scenario:'ipSRP',board:[],hole:[],groups:[],history:[],...q};
 out.options=shuffle(out.options,rng);out.answer=out.options.find(o=>o.id===out.correct)?.label;out.authorityLabel=authorityText[out.authority];
 validateQuestion(out);return out;
}

// All three groups form the entire finite river model. These are explicit
// probability weights, not estimated preflop combo counts or player statistics.
const RIVER_BOARDS={
 train:[['Ks 7h 2d 3c 9s','Qh Qc',['6h 6c','Jh Jd','Kh Kd']],['Qs 8h 3d 2c Ts','Jh Jc',['5h 5c','9h 9d','Qh Qd']],['As 9h 4d 2c 6s','Kh Kc',['7h 7c','Qh Qd','Ah Ad']],['Js 6h 2d 3c Ts','9h 9c',['4h 4c','8h 8d','Jh Jd']]],
 test:[['Ts 8h 3d 2c Ks','Qh Qc',['6h 6c','Jh Jd','Kh Kd']],['9h 5s 2c 4d Jc','Th Td',['6h 6c','8h 8d','Jh Jd']],['Qh 6s 3c 8d 2h','Jh Jc',['5h 5c','9h 9d','Qd Qc']],['Ah Ts 8s 3d 2c','Kh Kc',['6h 6c','Qh Qd','Ac Ad']]],
};
const PROFILES={
 sensitive:{name:'部分差牌只愿跟小注',response:[[0,0],[1,0],[1,1]],note:'A组两种下注都弃；B组跟小注、弃大注；C组两种都跟。'},
 sticky:{name:'只改变B组：大注也跟',response:[[0,0],[1,1],[1,1]],note:'A、C组保持原来的回应；B组现在也跟大注。'},
 noValue:{name:'差牌不付钱，好牌不弃',response:[[0,0],[0,0],[1,1]],note:'A、B组面对任一下注都弃；C组两种都跟。'},
 bluffOften:{name:'好牌会大量弃牌',bluff:true,response:[[.3,.2],[.3,.2],[.3,.2]],note:'各组面对小注跟30%、弃70%；面对大注跟20%、弃80%。'},
 bluffRare:{name:'好牌很少弃牌',bluff:true,response:[[.9,.85],[.9,.85],[.9,.85]],note:'各组面对小注弃10%；面对大注弃15%。其余跟注。'},
};
export const MODEL_PROFILES=Object.keys(PROFILES);
export function riverEV(model,action){
 const bet=action==='check'?0:model.bets[action];if(action!=='check'&&!(bet>0))throw new Error('缺少下注额');
 const contributions=model.groups.map(g=>{
  const call=action==='check'?1:g.calls[action],fold=action==='check'?0:1-call;
  const net=action==='check'?g.equity*model.pot:g.equity*(model.pot+2*bet)-bet;
  return {...g,call,fold,net,contribution:g.weight*(fold*model.pot+call*net),foldGain:g.weight*fold*model.pot,showdownGain:g.weight*call*net};
 });
 return {action,bet,value:contributions.reduce((n,g)=>n+g.contribution,0),contributions};
}
export function bestActions(model){const values=['check','small','large'].map(a=>riverEV(model,a)),max=Math.max(...values.map(a=>a.value));return values.filter(v=>Math.abs(v.value-max)<1e-8).map(v=>v.action);}
export function makeRiverModel({profile='sensitive',pool='train',variant=0,pot=10,weights=[.4,.4,.2],rng=Math.random}={}){
 const p=PROFILES[profile];if(!p)throw new Error('未知回应模型');
 const t=RIVER_BOARDS[pool][variant%RIVER_BOARDS[pool].length];let board=cards(t[0]),hole=cards(t[1]),groupCards=t[2].map(cards);
 if(p.bluff){
  let found=false;
  for(let i=0;i<2000;i++){const candidate=deal(2,[...board,...groupCards.flat()],rng);if(groupCards.every(cs=>compare(evaluate([...board,...candidate]),evaluate([...board,...cs]))<0)){hole=candidate;found=true;break;}}
  if(!found)throw new Error('未生成到零摊牌胜率的模型手牌');
 }
 const all=suitVariant([...board,...hole,...groupCards.flat()],rng);board=all.slice(0,5);hole=all.slice(5,7);groupCards=groupCards.map((_,i)=>all.slice(7+i*2,9+i*2));
 const mine=evaluate([...board,...hole]);
 const groups=groupCards.map((cs,i)=>{const diff=compare(mine,evaluate([...board,...cs]));return {id:['A','B','C'][i],label:['A组','B组','C组'][i],cards:cs,weight:weights[i],equity:diff>0?1:diff<0?0:.5,calls:{small:p.response[i][0],large:p.response[i][1]}};});
 const model={profile,name:p.name,note:p.note,pot,bets:{small:pot/2,large:pot},board,hole,groups,boundary:'河牌；对手已过牌；只允许过牌或下注；对手只能跟注或弃牌；过牌直接摊牌；无抽水。模型权重和回应为给定条件。',pool,variant};validateModel(model);return model;
}
export function validateModel(m){
 assertCards([...m.board,...m.hole,...m.groups.flatMap(g=>g.cards)]);
 if(m.board.length!==5||m.pot<=0||Math.abs(m.groups.reduce((s,g)=>s+g.weight,0)-1)>1e-8)throw new Error('模型条件不完整');
 for(const g of m.groups){if(g.weight<0||Object.values(g.calls).some(p=>p<0||p>1))throw new Error('非法概率');const diff=compare(evaluate([...m.board,...m.hole]),evaluate([...m.board,...g.cards]));if(g.equity!==(diff>0?1:diff<0?0:.5))throw new Error('模型牌力与实际牌不符');}
}
export function updateRange(groups,action){
 if(groups.some(g=>!Number.isFinite(g.weight)||g.weight<0||!Number.isFinite(g.responses[action])||g.responses[action]<0||g.responses[action]>1))throw new Error('非法范围权重或行动概率');
 const mass=groups.map(g=>({...g,mass:g.weight*g.responses[action]})),total=mass.reduce((s,g)=>s+g.mass,0);
 if(total<=0)throw new Error('此行动在模型中不会发生');return mass.map(g=>({...g,posterior:g.mass/total}));
}
function actionOptions(m){return opts([['check','过牌'],['small',`下注 ${format(m.bets.small)} BB`],['large',`下注 ${format(m.bets.large)} BB`]]);}
function modelReason(m){
 if(m.profile==='sensitive')return chain('B组比你差，只愿跟小注。','大注失去这组付款，同时输给C组时付得更多。','把每组结果按权重合计，再与过牌比较；这个模型中小注最好。');
 if(m.profile==='sticky')return chain('B组仍然比你差，但现在也愿跟大注。','大注能向B组多收钱；承担的额外损失也同时计入。','本题加权结果以大注最高。不是所有对手都这样付钱。');
 if(m.profile==='noValue')return chain('差牌不跟，好牌不弃。','下注没有新增差牌付款，却会在输给好牌时多付钱。','本模型中过牌的平均结果更高。');
 if(m.profile==='bluffOften')return chain('你的牌落后于所有模型组合；对手会大量弃牌。','收益来自原本领先你的牌退出，不来自被跟注时获胜。',`计算弃牌收益与被跟注损失后，${bestActions(m)[0]==='large'?'大注':'小注'}收益更高。`);
 return chain('你的牌没有摊牌胜率；对手很少弃牌。','弃牌收益不足以弥补被跟注损失。','过牌不再投入，比两种负收益下注更好。');
}
function modelQuestion(topic,spec,pool,rng){
 const weights=pool==='test'?pick([[.5,.3,.2],[.3,.5,.2]],rng):[.4,.4,.2];
 const m=makeRiverModel({profile:spec.profile||'sensitive',pool,variant:spec.variant??Math.floor(rng()*4),pot:pool==='test'?pick([12,16,24,30],rng):10,weights,rng});
 let q={topic,authority:'model',model:m,board:m.board,hole:m.hole,groups:m.groups,history:['你在BTN开池','BB跟注','已经到河牌，BB过牌'],premise:m.note,source:'条件完整的有限河牌模型 · 程序按各分支加权计算',family:`river:${m.profile}:${pool}:${m.variant}`,title:'在给定的模型中，哪个选择的平均结果最高？',options:actionOptions(m),correct:bestActions(m)[0],chain:modelReason(m),visual:'river'};
 if(spec.query==='reason'){
  const correct=m.profile==='sticky'?'pay':m.profile==='bluffOften'?'fold':m.profile==='bluffRare'?'cost':m.profile==='noValue'?'check':'price';
  q={...q,title:'决定当前选择的关键关系是哪一项？',options:opts([['pay','差牌也愿意跟大注，多收的钱超过增加的损失'],['fold','主要收益来自领先我的牌弃牌'],['cost','好牌弃得太少，新增投入得不到补偿'],['check','差牌不付款，好牌不退出，过牌保留原有收益'],['price','大注赶走了愿付小注的差牌，同时增加输时的成本']]),correct};
 }
 if(spec.query==='equity'){
  const e=m.groups.reduce((s,g)=>s+g.weight*g.equity,0),n=Number((e*100).toFixed(2));
  q={...q,visual:'range',title:'面对这整个加权范围，直接摊牌时你的胜率是多少？',options:numeric(n,'%', [20,40,60,80].filter(v=>v!==n)),correct:String(n),chain:chain('每组手牌和比例都已给出。','将赢、输、平分的结果按权重合计，而不是只看最强的一组。',`直接摊牌胜率为${percent(e)}。这不是某个翻牌的下注频率。`)};
 }
 if(spec.query==='relative')q={...q,visual:'range',title:'哪一组牌目前领先于你？',options:opts(m.groups.map(g=>[g.id,g.label])),correct:m.groups.find(g=>g.equity===0).id,chain:chain('先从公共牌和底牌选出双方最佳五张。','你的牌型名称不变，但面对不同底牌的胜负不同。','点开解析中的牌组，可以核对实际牌型；策略还需要所有牌组的权重。')};
 if(spec.query==='purpose')q={...q,title:'在这些回应条件下，下注新增的收益主要从哪里来？',options:opts([['pay','比我差的牌跟注，向它们收取新增投入'],['fold','比我好的牌弃牌，我拿走原底池'],['none','没有这两种新增收益，下注反而增加输时的投入']]),correct:m.profile.startsWith('bluff')?'fold':m.profile==='noValue'?'none':'pay',chain:modelReason(m)};
 if(spec.query==='contrast'){
  const changed={...m,profile:'sticky',name:PROFILES.sticky.name,note:PROFILES.sticky.note,groups:m.groups.map(g=>({...g,calls:{...g.calls,large:g.id==='B'?1:g.calls.large}}))};validateModel(changed);
  q={...q,title:'只让B组也跟大注：原来的最佳选择会怎样变化？',comparison:changed,options:opts([['large','从小注变为大注'],['small','仍然选择小注'],['check','改为过牌']]),correct:bestActions(changed)[0],chain:chain('牌、底池和权重都不变；只改B组面对大注的回应。','原本被大注赶走的差牌，现在会多付钱。','重新计算后，大注收益超过小注。观察结论变化是由哪一个条件造成的。')};
 }
 return q;
}
function basicsQuestion(spec,pool,rng){
 if(['odds','threshold'].includes(spec.query)){
  const pot=pick(pool==='test'?[12,18,24,30]:[10,20],rng),fraction=pick(spec.query==='odds'?[.25,.5,1]:[.5,1,1.5],rng),bet=pot*fraction;
  const v=Number(((spec.query==='odds'?potOdds(pot+bet,bet):bet/(pot+bet))*100).toFixed(2));
  return {topic:'basics',authority:'model',visual:'money',money:{pot,bet,kind:spec.query},board:[],hole:[],family:`money:${spec.query}:${pool}:${fraction}`,title:spec.query==='odds'?'河牌面对这笔下注，跟注需要的盈亏平衡胜率是多少？':'没有摊牌胜率的纯诈唬，至少需要对手弃牌多少才不亏？',premise:'河牌，无抽水、无后续加注。价格门槛只比较跟注与弃牌，或诈唬与不再投入。',options:numeric(v,'%', [20,25,33.33,50,60].filter(n=>n!==v)),correct:String(v),source:'底池与投入的加权收益公式',chain:spec.query==='odds'?chain(`下注前底池${pot} BB，对手下注${bet} BB。`,`跟注还需${bet} BB，最终底池为${pot+2*bet} BB。`,`门槛=${bet}÷${pot+2*bet}=${v}%。还需要知道对范围的胜率，才能判断跟注。`):chain(`下注${bet} BB，争取原底池${pot} BB。`,'弃牌时赢原底池；被跟注时损失本次下注。',`门槛=${bet}÷(${pot}+${bet})=${v}%。不等于已经求出最佳尺寸。`)};
 }
 const module=spec.query==='outs'?'straight':'showdown',q=readingQuestion({...DEFAULTS,module,category:'all',readingType:'all',street:'turn'},rng);
 return {...q,topic:'basics',authority:'cards',visual:'cards',family:`facts:${module}:${pool}`,chain:chain('公共牌和双方底牌是可枚举的事实。','先选最佳五张，或检查还能补成顺子的实体牌。',q.explanation),groups:q.opponentHole?.length?[{id:'对手',label:'对手已知底牌',cards:q.opponentHole,weight:1}]:[],outs:q.outCards||q.outs};
}
function rangeQuestion(spec,pool,rng){
 const q=modelQuestion('range',{...spec,profile:'sensitive',query:spec.query||'equity'},pool,rng);
 if(spec.query==='weighted'){
  q.visual='range';q.comparison={...q.model,note:'C组从20%提高到60%；A、B组各为20%。牌张不变。',groups:q.model.groups.map(g=>({...g,weight:g.id==='C'?.6:.2}))};q.title='牌张不变，只把C组权重提高到60%：你的摊牌胜率如何变化？';
  const before=q.model.groups.reduce((s,g)=>s+g.weight*g.equity,0);
  q.options=opts([['down',`从${percent(before)}降到40%`],['same',`仍是${percent(before)}`],['up','升到100%']]);q.correct='down';
  q.chain=chain('这些仍然是同样三组牌，强弱关系没有改变。','更强的C组现在更常出现，不能把三组等权处理。','你赢的两组加起来只占40%。最强牌的存在与它出现的比例是两回事。');
 }
 return q;
}
function handModelQuestion(spec,pool,rng){
 const m=makeRiverModel({profile:'sticky',pool,variant:pool==='train'?0:spec.index%4,rng});
 if(spec.query==='middle'){
  const available=deal(52,[...m.board,...m.groups.flatMap(g=>g.cards)],rng);
  outer:for(const a of available)for(const b of available){
   if(a.id===b.id||a.rank!==b.rank)continue;
   const mine=evaluate([...m.board,a,b]);
   if(compare(mine,evaluate([...m.board,...m.groups[0].cards]))>0&&compare(mine,evaluate([...m.board,...m.groups[1].cards]))<0){m.hole=[a,b];break outer;}
  }
  const mine=evaluate([...m.board,...m.hole]);m.groups=m.groups.map(g=>{const d=compare(mine,evaluate([...m.board,...g.cards]));return {...g,equity:d>0?1:d<0?0:.5};});
 }
 validateModel(m);
 return {topic:'hands',authority:'model',visual:'river',board:m.board,hole:m.hole,groups:m.groups,model:m,premise:m.note,family:`hand-role:${spec.query}:${pool}:${m.variant}`,title:'牌面与对手回应保持给定：这手牌的最佳选择是什么？',options:actionOptions(m),correct:bestActions(m)[0],source:'固定对手有限范围与回应的河牌实验；不作为翻牌GTO规则',chain:chain('牌面和对手三组牌的回应固定。',spec.query==='middle'?'你只赢A组，但B、C组都会跟注并击败你。':'你赢A、B组，B组愿意用较差牌跟两种尺寸。',`将全部结果加权后，${bestActions(m)[0]==='check'?'过牌保留已有摊牌收益':'下注能从差牌获得额外价值'}。有一对，不等于每种一对都做相同行动。`)};
}
const RANGE_RESPONSES={fast:[[.8,.2,0],[.5,.4,.1],[0,.2,.8]],slow:[[.8,.2,0],[.5,.4,.1],[0,.8,.2]],partial:[[.6,.3,.1],[.3,.6,.1],[0,.4,.6]],holdout:[[.7,.2,.1],[.2,.5,.3],[0,.5,.5]]};
function responseQuestion(spec,pool,rng){
 const m=makeRiverModel({pool,variant:spec.variant??Math.floor(rng()*4),weights:pool==='test'?pick([[.5,.3,.2],[.3,.5,.2],[.2,.3,.5]],rng):[.4,.4,.2],rng}),behavior=spec.behavior||'fast',p=RANGE_RESPONSES[behavior];
 const groups=m.groups.map((g,i)=>({...g,responses:{fold:p[i][0],call:p[i][1],raise:p[i][2]}})),action=spec.action||'call',posterior=updateRange(groups,action),strong=posterior[2].posterior;
 const largest=Math.max(...posterior.map(g=>g.posterior)),leaders=posterior.filter(g=>Math.abs(g.posterior-largest)<1e-8).map(g=>g.id),leaderId=leaders.join('+');
 let q={topic:'response',authority:'model',visual:'posterior',board:m.board,hole:m.hole,groups,posterior,rangeAction:action,rangeBehavior:behavior,history:['河牌，你下注','对手'+{call:'跟注',raise:'加注',fold:'弃牌'}[action]],premise:'模型给出了每组在你下注之后的弃牌、跟注、加注概率。观察到行动后，计算他仍持有各组牌的概率；本题不判断你该如何回应。',family:`update:${behavior}:${action}:${pool}`,title:`观察到对手${{call:'跟注',raise:'加注',fold:'弃牌'}[action]}后，哪组牌最常出现在他的范围中？`,options:opts(groups.map(g=>[g.id,g.label])),correct:posterior.reduce((a,b)=>a.posterior>b.posterior?a:b).id,source:'条件概率：旧权重 × 行动概率，归一化；笔记 2.4、2.6 的适用前提',chain:chain('各组原权重和行动概率均已明确给出。','先乘出产生本次行动的权重，再除以本次行动总概率。',`行动后C组占${percent(strong)}。跟注不等于没有强牌：还要看强牌有多少概率选择跟注。`)};
 q.title=`观察到对手${{call:'跟注',raise:'加注',fold:'弃牌'}[action]}后，哪些牌组占比最高？`;
 q.options=opts([...groups.map(g=>[g.id,g.label+'独占最高']),...(leaders.length>1?[[leaderId,leaders.map(id=>id+'组').join('、')+'并列最高']]:[])]);q.correct=leaderId;
 if(spec.query==='slow'){
  const slowGroups=groups.map((g,i)=>({...g,responses:{fold:RANGE_RESPONSES.slow[i][0],call:RANGE_RESPONSES.slow[i][1],raise:RANGE_RESPONSES.slow[i][2]}}));
  q.comparisonGroups=slowGroups;q.title='只把强牌从“多加注”改为“多跟注”：跟注范围里强牌会怎样变化？';q.options=opts([['up','比例提高'],['same','比例不变'],['down','比例降低']]);q.correct='up';
  q.chain=chain('只有C组的加注与跟注概率交换；牌张和初始权重不变。','更多强牌走进跟注分支，不能在跟注后直接删掉它们。',`C组从${percent(strong)}提高到${percent(updateRange(slowGroups,'call')[2].posterior)}。`);
 }
 if(spec.query==='percent'){const n=Number((strong*100).toFixed(2));q.title='这个行动之后，强牌C组的条件概率是多少？';q.options=numeric(n,'%', [20,30,50,70]);q.correct=String(n);}
 return q;
}
const TURN_FACTS={train:[['9s 6h 2d','Ah Ac','8s 5s','Jc','7d'],['Js Th 2d','Ah Ac','Kh Qh','5c','9d'],['Ks Ts 5d','Ah Ac','Qs Js','2c','9s'],['Qs 8s 3d','Ah Ac','Ks Js','2h','5s']],test:[['Ts 7h 3d','Ah Ac','9s 8s','2c','6d'],['Qh Jh 4d','As Ac','Ts 9s','2c','8d'],['9s 8h 2d','Ah Ac','Js Ts','3c','Qc'],['Js 6s 2d','Ah Ac','Ks Qs','3h','8s']]};
function turnFactQuestion(spec,pool,rng){
 const i=spec.variant??Math.floor(rng()*4),t=TURN_FACTS[pool][i%4],mapped=suitVariant([...cards(t[0]),...cards(t[1]),...cards(t[2]),card(t[3]),card(t[4])],rng);
 const board=mapped.slice(0,3),hole=mapped.slice(3,5),opp=mapped.slice(5,7),left=[...board,mapped[7]],right=[...board,mapped[8]];
 const before=evaluate([...board,...opp]),a=evaluate([...left,...opp]),b=evaluate([...right,...opp]),isBetter=compare(b,a)>0,straight=draws(opp,board).straightOuts.some(c=>c.id===mapped[8].id);
 return {topic:'turn',authority:'cards',visual:'turn',board:left,hole,comparisonBoard:right,groups:[{id:'O',label:'已知对手牌 · 学习发牌效果',cards:opp,weight:1}],family:`turn-fact:${pool}:${i}`,title:'这两张转牌中，哪一张让对手完成顺子或同花？',premise:'先把对手底牌翻开，只练新牌带来的实际变化。完成听牌并不能单独决定你的策略。',options:opts([['left','左边的转牌'],['right','右边的转牌'],['both','两张都完成']]),correct:isBetter?'right':'left',source:'最佳五张与补牌的枚举计算；笔记 2.4 的牌面变化',chain:chain(`翻牌时对手是${before.name}。`,`${left.at(-1).id}后为${a.name}；${right.at(-1).id}后为${b.name}。`,`${straight?'连续五个点数构成顺子':'五张同一花色构成同花'}。之后还要看这种组合在剩余范围中占多少，以及你走了什么前序。`)};
}
function turnRangeQuestion(pool,rng){
 const t=pool==='train'?['9s 6h 2d','Ah Ac',['8s 5s','9h 9d','7h 7c'],'Jc','7d']:['Ts 7h 3d','Ah Ac',['9s 8s','Th Td','6h 6c'],'2c','6d'];
 const all=suitVariant([...cards(t[0]),...cards(t[1]),...t[2].flatMap(cards),card(t[3]),card(t[4])],rng);
 const flop=all.slice(0,3),hole=all.slice(3,5),left=[...flop,all[11]],right=[...flop,all[12]];
 const weights=pool==='train'?[.4,.2,.4]:pick([[.3,.3,.4],[.5,.2,.3]],rng);
 const prior=t[2].map((_,i)=>({id:['A','B','C'][i],label:['A组','B组','C组'][i],cards:all.slice(5+i*2,7+i*2),weight:weights[i],responses:{call:[.5,.8,.4][i],fold:1-[.5,.8,.4][i],raise:0}}));
 const posterior=updateRange(prior,'call'),groups=posterior.map(g=>({...g,weight:g.posterior,priorWeight:g.weight}));
 const losing=board=>groups.reduce((s,g)=>s+g.weight*(compare(evaluate([...board,...hole]),evaluate([...board,...g.cards]))<0?1:0),0);
 const a=losing(left),b=losing(right);
 return {topic:'turn',authority:'model',visual:'turn',board:left,comparisonBoard:right,hole,groups,priorGroups:prior,family:`turn-range:${pool}`,history:['翻牌：你下注','对手按给定概率跟注','保留这个跟注范围，比较两张转牌'],title:'同一个跟注范围，哪张转牌让“击败你的牌”占比更高？',premise:'三组构成完整教学范围。先用原权重×跟注概率更新，再分别发牌；不据此规定真实牌局的下注尺寸。',options:opts([['left','左边'],['right','右边'],['same','两边一样']]),correct:a<b?'right':a>b?'left':'same',source:'行动条件概率 + 最佳五张枚举；笔记2.4范围筛选与转牌变化',chain:chain('对手先按给定概率跟注，剩余范围与翻牌前不同。','新牌只在这个剩余范围里比较，不能把已弃掉的牌重新放回来。',`你落后的权重：左边${percent(a)}，右边${percent(b)}。看见一手成顺只是入口；还要看它和其他强牌的比例。`)};
}
function positionQuestion(spec,pool,rng){
 const scenario=spec.scenario||pick(pool==='test'?['ip3','oop3','ipSRP','oopSRP','earlyBTN']:['ip3','oop3','ipSRP','oopSRP'],rng),ctx=SCENARIOS[scenario],ip=scenario.startsWith('ip'),board=deal(3,[],rng),hole=deal(2,board,rng);
 let q={topic:'position',authority:'cards',visual:'position',scenario,board,hole,history:ctx.history,family:`position:${spec.query}:${scenario}:${pool}`,premise:'只根据已给出的行动顺序判断；本题不由位置推导下注尺度。',source:'翻前行动记录与翻后行动顺序；笔记 2.5、2.7',title:'现在属于哪个座位组合、底池和行动顺序？',options:opts(Object.entries(SCENARIOS).map(([id,s])=>[id,`你${s.position}对${s.opponent} · ${id.startsWith('ip')?'后':'先'}行动 · ${id.endsWith('3')?'3bet':'单加注'}底池`])),correct:scenario,chain:chain(ctx.history.slice(0,3).join(' → '),`${ctx.history.some(h=>h.includes('3bet'))?'翻前发生再加注，是3bet底池。':'翻前只有一次加注和跟注，是单加注底池。'}你在翻后${ip?'后':'先'}行动。`,ctx.name)};
 if(spec.query==='check'){q.title='轮到你时选择过牌：这一街能立即结束吗？';q.options=opts([['end','能：双方已经过牌，直接发下一张'],['opponent','不能：对手仍有一次行动机会']]);q.correct=ip?'end':'opponent';q.branch=ip?['对手先过牌','你过牌','双方过牌，发下一张']:['你先过牌','对手仍可过牌或下注','若他下注，你还需跟注、加注或弃牌'];q.chain=chain('牌张与范围保持给定；这里只研究行动顺序。',ip?'对手已经先过牌，你的过牌关闭这一街。':'你过牌只把行动交给对手，没有关闭这一街。','位置改变能否免费见下一张牌，以及你作决定前能看到的信息；并不改变实际牌型。');}
 if(spec.query==='raise'){q.title='对手下注后你加注，他又再加注：原来只算跟注/弃牌的模型还够用吗？';q.options=opts([['branch','不够：必须加入再加注及之后回应的成本'],['same','够用：把所有继续都按原来的跟注成本算']]);q.correct='branch';q.branch=['你过牌','对手下注','你加注','对手再加注','需要新决策'];q.chain=chain('原模型只有跟注与弃牌，没有再加注。','对手反击会改变你的额外投入，也可能迫使你放弃仍有胜率的牌。','先补全行动树再比较收益。不能直接套原来河牌无加注实验的数值。');}
 return q;
}
const BOUNDARIES={
 'missing-range':{title:'只知道“我有顶对”，能否确定面对对手的胜率？',choices:[['range','还需要对手可能的牌及各自权重'],['name','先查顶对这个牌型的固定胜率'],['size','只要再知道我准备下多大就够了']],correct:'range',condition:'同样的顶对，可能面对差顶对，也可能面对两对、三条。',change:'牌型名称固定，不意味着对任何范围都同样强。',result:'缺少对手范围时，不能输出一个可信的精确胜率。'},
 'size-frequency':{title:'资料说这个牌面主尺寸67%，能否推出每手牌都下注67%？',choices:[['hands','不能：还要区分哪些牌下注、哪些过牌，以及频率'],['same','可以：主尺寸就是所有底牌的唯一动作'],['half','不能：所以应当自动改成全部50%下注']],correct:'hands',condition:'尺寸描述“下多大”；手牌分配描述“谁下注”；频率描述“多常下注”。',change:'一个数字不能代替另外两个问题。',result:'具体手牌只按课程明确列出的任务执行；不自动补齐其余组合。'},
 'draw-purpose':{title:'翻牌让一手有胜率的差牌弃牌，与你河牌让好牌弃牌，区别是什么？',choices:[['deny','前者剥夺未来反超机会；后者让原本输的牌直接赢底池'],['value','两者都是差牌跟注付钱带来的价值'],['same','两者都只需要知道当前牌型，不必考虑后续']],correct:'deny',condition:'翻牌后还有两张牌；河牌没有后续发牌。',change:'现在落后的牌在翻牌仍可能反超；河牌落后不会再改善。',result:'剥夺权益是一种效果，但还要把弃掉的是谁、成本和未来行动一起比较，才能决定是否值得。'},
 'wet-size':{title:'T72两同花在课程里用40%，新的两同花牌面也能直接用40%吗？',choices:[['context','先比较底池、双方范围、手牌构成和回应；查这个节点是否有明确规则'],['suits','可以，花色结构相同就应该用相同尺寸'],['protect','不可以，改成有听牌一律大注']],correct:'context',condition:'花色相同只说明一部分结构相同。',change:'点数连接性、位置、范围和对手回应仍可能不同。',result:'数学实验解释机制，不能凭它生成未记录的新牌面精确GTO尺寸。'},
 'cap':{title:'对手跟注后，可否认定他没有最强的牌？',choices:[['behavior','先看强牌多大概率加注、跟注或慢玩'],['call','可以，最强牌总会加注'],['pot','只要底池够大，就可以排除最强牌']],correct:'behavior',condition:'跟注本身是一个动作，强牌也可能采取这个动作。',change:'若强牌经常慢玩，跟注范围仍会保留强牌。',result:'“封顶”的判断依赖行为依据，不是看到跟注就成立。'},
 'turn-route':{title:'转牌来低牌，是否就按“所有低牌都过牌”执行？',choices:[['route','先核对翻牌尺寸、保留范围和具体路线'],['rank','是，点数已经决定了整范围动作'],['high','否，只要自己仍是超对就继续大注']],correct:'route',condition:'笔记2.4不同段落讨论了不同翻牌前序。',change:'小注或大注筛选的范围不同，低牌对它们的作用也不同。',result:'只按资料明确的分支出执行题；冲突总结不合并成通用口诀。'},
 'position-range':{title:'把BTN对CO改成SB对BTN后，策略变了，能全归因于位置吗？',choices:[['two','不能：行动顺序变了，双方翻前范围也可能变了'],['one','能：公共牌一样，唯一变量就是位置'],['none','不能：位置和范围都不会影响收益']],correct:'two',condition:'这次对照同时换了座位和双方翻前角色。',change:'一个对比中有两个可能影响策略的因素。',result:'首次学习位置先固定范围，再比较顺序；综合决策时两个都要识别。'},
 'opponent':{title:'资料中的加注不足、弃牌过多打法，面对未知对手怎么用？',choices:[['evidence','先确认当前节点所要求的行为依据'],['label','只要把他标成普通玩家，就套全部调整'],['auto','用模型给的概率作为这位对手的真实概率']],correct:'evidence',condition:'课程调整有明确的对手偏差前提。',change:'未知对手未必符合该前提；教学概率是人为给定条件。',result:'有充分依据才在指定路线使用调整；不能把一个实验直接当真实对手统计。'},
};
function boundaryQuestion(topic,id){const b=BOUNDARIES[id];return {topic,authority:'model',visual:'boundary',family:`boundary:${id}`,title:b.title,options:opts(b.choices),correct:b.correct,source:CHAPTERS.find(c=>c.id===topic).source,chain:chain(b.condition,b.change,b.result),boundaryId:id,premise:'辨别规则成立所需的条件。这里不要求猜一个资料没有给出的精确动作。'};}

// Stable case identities split course examples from held-out verification.
export const COURSE_CASES=activeRules.flatMap(r=>ruleTasks(r).flatMap(task=>task==='hand'?r.hands.map((h,i)=>({id:`${r.id}:hand:${i}`,ruleId:r.id,task,handIndex:i})): [{id:`${r.id}:${task}`,ruleId:r.id,task}]));
export function courseQuestion(spec,rng=Math.random){
 const c=typeof spec==='string'?COURSE_CASES.find(c=>c.id===spec):spec;if(!c)throw new Error('未覆盖的课程任务');
 const original=rule(c.ruleId),r=c.task==='hand'?{...original,hands:[original.hands[c.handIndex]]}:original;
 const q=strategyQuestion({...DEFAULTS,module:r.street,scenario:'all'},rng,r,c.task),relationship=r.reason?q.explanation.split('\n').slice(-r.reason.split('\n').length).join('\n').replace(/【[^】]+】/g,'').trim():'按当前节点明确规定的任务执行，不能外推其他手牌或牌面。';
 if(c.task==='hand')q.options=opts([...new Set([...original.hands.map(h=>h.action),'更多过牌',`下注${original.size||50}%底池`,original.size===67?'下注25%底池':'下注67%底池'])].map(a=>[a,a]));
 const execute=c.task==='hand'?`${q.answer}。${original.hands[c.handIndex].kind}；“候选”不等于每次必下，“更多过牌”不新增100%的频率。`:c.task==='frequency'?`${original.frequency.action}频率${original.frequency.value}%，不是下注尺度。`:`当前节点规定：${q.answer}。${q.convention||''}`;
 return {...q,topic:'execution',authority:'course',visual:'course',family:`course:${c.id}`,courseId:c.id,premise:[q.condition,q.convention].filter(Boolean).join(' '),chain:chain([SCENARIOS[r.scenario].name,q.lineText,r.condition].filter(Boolean).join('；'),relationship,execute),sourceId:r.id,ruleTask:c.task,rule:original};
}
// Entries represent different relationships, not cosmetically shuffled cards.
const plans={
 basics:[['intro','fact','showdown'],['intro','fact','outs'],['intro','fact','odds'],['contrast','fact','odds'],['intro','fact','threshold'],['boundary','boundary','missing-range'],['boundary','boundary','draw-purpose'],['transfer','fact','showdown'],['transfer','fact','outs'],['transfer','fact','odds']],
 range:[['intro','range','relative'],['intro','range','equity'],['contrast','range','weighted'],['intro','range','equity'],['boundary','boundary','missing-range'],['contrast','range','weighted'],['transfer','range','equity'],['transfer','range','weighted']],
 purpose:[['intro','river','purpose','sensitive'],['intro','river','purpose','bluffOften'],['contrast','river','purpose','noValue'],['contrast','river','best','bluffRare'],['boundary','boundary','draw-purpose'],['intro','river','reason','sticky'],['transfer','river','purpose','bluffOften'],['transfer','river','best','noValue'],['course','course','R01:action'],['course','course','R02:action'],['course','course','R03:action']],
 size:[['intro','river','best','sensitive'],['intro','river','reason','sensitive'],['contrast','river','contrast','sensitive'],['contrast','river','best','sticky'],['contrast','river','best','noValue'],['intro','river','best','bluffOften'],['boundary','boundary','wet-size'],['boundary','boundary','size-frequency'],['transfer','river','best','sensitive'],['transfer','river','best','sticky'],['transfer','river','best','bluffRare'],['course','course','I08:size'],['course','course','I09:size'],['course','course','I13:size']],
 hands:[['intro','handmodel','strong'],['contrast','handmodel','middle'],['intro','course','I11:hand:0'],['contrast','course','I11:hand:2'],['intro','course','S05:hand:0'],['contrast','course','S05:hand:4'],['intro','course','S05:hand:3'],['intro','course','S07:hand:1'],['boundary','boundary','size-frequency'],['transfer','handmodel','strong'],['transfer','handmodel','middle'],['transfer','course','I11:hand:1'],['transfer','course','I11:hand:3'],['transfer','course','S05:hand:1'],['transfer','course','S05:hand:2'],['transfer','course','S08:hand:0'],['transfer','course','S08:hand:2'],['transfer','course','S09:hand:0']],
 position:[['intro','position','identify','ip3'],['intro','position','check','ip3'],['contrast','position','check','oop3'],['intro','position','identify','ipSRP'],['contrast','position','identify','oopSRP'],['intro','position','raise','oop3'],['boundary','boundary','position-range'],['transfer','position','check','ipSRP'],['transfer','position','check','oopSRP'],['transfer','position','identify','earlyBTN'],['course','course','O07:action'],['course','course','T08:action']],
 response:[['intro','response','largest','fast'],['intro','response','percent','fast'],['contrast','response','slow','fast'],['contrast','response','largest','slow'],['intro','response','largest','partial','raise'],['boundary','boundary','cap'],['transfer','response','largest','holdout'],['transfer','response','percent','holdout'],['transfer','response','largest','holdout','raise'],['course','course','T07:action']],
 turn:[['intro','turn','facts',0],['intro','turn','facts',1],['intro','turn','facts',3],['intro','turn','weighted'],['contrast','course','T01:size'],['contrast','course','T02:action'],['contrast','course','T03:action'],['intro','course','T04:action'],['boundary','boundary','turn-route'],['transfer','turn','facts',0],['transfer','turn','weighted'],['transfer','turn','facts',2],['transfer','turn','facts',3],['course','course','T05:action'],['course','course','T06:action'],['course','course','R07:action']],
 execution:[['intro','position','identify','ip3'],['intro','course','I04:size'],['intro','course','I11:hand:0'],['contrast','course','I11:hand:2'],['intro','course','O08:frequency'],['contrast','course','O07:action'],['intro','course','T02:action'],['contrast','course','T03:action'],['intro','course','R01:action'],['contrast','course','R02:action'],['boundary','boundary','opponent'],['course','course','T09:action'],['course','course','R05:action']],
};
function stepLabel(kind,query,extra,action){
 if(kind==='course'){
  const c=COURSE_CASES.find(c=>c.id===query),r=rule(c.ruleId),h=r.hands?.[c.handIndex];
  return `${r.id} · ${c.task==='hand'?(h.hand||'指定同花听牌')+'的任务':c.task==='size'?'主尺寸':c.task==='frequency'?'范围频率':'动作路线'}`;
 }
 if(kind==='river')return `${PROFILES[extra].name} · ${{best:'比较收益',purpose:'找收益来源',reason:'解释原因',contrast:'对照回应'}[query]}`;
 if(kind==='range')return {relative:'逐组比较牌力',equity:'合计整个范围',weighted:'只改变范围权重'}[query];
 if(kind==='fact')return {showdown:'摊牌谁赢',outs:'找出所有补牌',odds:'跟注价格',threshold:'诈唬的价格门槛'}[query];
 if(kind==='handmodel')return query==='strong'?'同一模型：强一对':'同一模型：中间一对';
 if(kind==='position')return {identify:'认清座位与底池',check:'过牌后的行动机会',raise:'对手再加注的分支'}[query];
 if(kind==='response')return query==='slow'?'只改变强牌的回应':query==='percent'?'算出行动后的占比':`${action==='raise'?'加注':'跟注'}后哪组最多`;
 if(kind==='turn')return query==='weighted'?'剩余范围遇到转牌':`转牌对照 ${Number(extra)+1}`;
 if(kind==='boundary')return {'missing-range':'信息是否足够','size-frequency':'区分尺寸、手牌与频率','draw-purpose':'当前落后与未来反超','wet-size':'相似牌面能否照搬','cap':'跟注能否排除强牌','turn-route':'前序路线是否相同','position-range':'哪些条件一起变了',opponent:'对手偏差的依据'}[query];
 return stageLabels.intro;
}
export function chapterPlan(topic){if(!plans[topic])throw new Error('未知章节');return plans[topic].map(([phase,kind,query,extra,action],index)=>({phase,kind,query,extra,action,index,id:`${topic}:${index}`,label:stepLabel(kind,query,extra,action)}));}
function generate(topic,spec,pool,rng){
 let q;
 if(spec.kind==='river')q=modelQuestion(topic,{query:spec.query,profile:spec.extra,variant:spec.index%4},pool,rng);
 if(spec.kind==='range')q=rangeQuestion({query:spec.query,variant:spec.index%4},pool,rng);
 if(spec.kind==='handmodel')q=handModelQuestion(spec,pool,rng);
 if(spec.kind==='fact')q=basicsQuestion({query:spec.query},pool,rng);
 if(spec.kind==='boundary')q=boundaryQuestion(topic,spec.query);
 if(spec.kind==='turn')q=spec.query==='weighted'?turnRangeQuestion(pool,rng):turnFactQuestion({variant:spec.extra},pool,rng);
 if(spec.kind==='position')q=positionQuestion({query:spec.query,scenario:spec.extra},pool,rng);
 if(spec.kind==='response')q=responseQuestion({query:spec.query,behavior:spec.extra,action:spec.action,variant:spec.index%4},pool,rng);
 if(spec.kind==='course')q=courseQuestion(spec.query,rng);
 if(!q)throw new Error('无法生成当前任务');q.topic=topic;q.phase=spec.phase;q.phaseLabel=stageLabels[spec.phase];q.pool=pool;q.stepId=spec.id;return finish(q,rng);
}
export function createGuidedQuestion(topic,index=0,rng=Math.random){const spec=chapterPlan(topic)[index];if(!spec)throw new Error('章节步骤越界');return generate(topic,spec,spec.phase==='transfer'?'test':'train',rng);}
export function practiceFamilies(topic){
 const plan=chapterPlan(topic),trained=new Set(plan.filter(s=>s.kind==='course'&&s.phase!=='transfer').map(s=>s.query)),test=plan.filter(s=>s.phase==='transfer');
 const courseSpec=c=>({kind:'course',query:c.id,id:`test:${c.id}`,phase:'transfer',index:0});
 if(topic==='execution')return COURSE_CASES.filter(c=>!trained.has(c.id)).map(courseSpec);
 if(topic==='size')return [...test,...COURSE_CASES.filter(c=>c.task==='size'&&!trained.has(c.id)).map(courseSpec)];
 if(topic==='turn')return [...test,...['T07:action','T08:action','T09:action','T10:action','R05:action','R06:action','R08:action'].map(id=>courseSpec(COURSE_CASES.find(c=>c.id===id)))];
 if(topic==='purpose')return [...test,...MODEL_PROFILES.map((profile,i)=>({kind:'river',query:i%2?'reason':'best',extra:profile,phase:'transfer',id:`test:${profile}`,index:i}))];
 return test;
}
export function createPracticeQuestion(topic,rng=Math.random,specOverride){const spec=specOverride||pick(practiceFamilies(topic),rng),randomized=spec.kind==='river'||spec.kind==='range'?{...spec,index:Math.floor(rng()*4)}:spec.kind==='turn'?{...spec,extra:Math.floor(rng()*4)}:spec;return generate(topic,randomized,'test',rng);}
export function practiceDeck(topic,rng=Math.random){return shuffle(practiceFamilies(topic),rng);}
export function learningScoreKey(topic,mode){return mode==='mixed'?'mixed':`${topic}:${mode}`;}
export function validateQuestion(q){
 assertCards([...(q.board||[]),...(q.hole||[])]);
 for(const g of q.groups||[])assertCards([...(q.board||[]),...(q.hole||[]),...g.cards]);
 if(q.comparisonBoard){assertCards([...q.comparisonBoard,...q.hole]);for(const g of q.groups)assertCards([...q.comparisonBoard,...q.hole,...g.cards]);}
 if(q.options.filter(o=>o.id===q.correct).length!==1||new Set(q.options.map(o=>o.id)).size!==q.options.length)throw new Error('无唯一有效答案');
 if(q.model)validateModel(q.model);if(q.comparison)validateModel(q.comparison);
 if(q.authority==='course'&&!rule(q.sourceId))throw new Error('课程引用未开放节点');
 if(!q.chain?.condition||!q.chain?.change||!q.chain?.result)throw new Error('缺少完整原因解释');
}
