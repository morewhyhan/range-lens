import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowCounterClockwise,GearSix,Info,X} from '@phosphor-icons/react';
import {Cards} from './trainer-ui.jsx';
import {card} from './poker.js';
import {RANKS,splitHand,classOf,labelAction,publicMass,fixedHandOpponent,mixFor,afterAction,drawWeighted,dealPair,gradeAction,aggregate} from './postflop-model.js';
import {rangeEvidence,focusFactor} from './range-evidence.js';
import {ComboInspector} from './range-inspector.jsx';
import ThreebetSetup from './threebet-setup.jsx';
import {DecisionGuide} from './decision-guide.jsx';
import PostflopGenerator from './postflop-generator.jsx';
import './range-trainer.css';

const PCT=x=>`${(x*100).toFixed(1)}%`;

const colorAction=a=>a==='Fold'?'#bfc5ce':a==='Check'?'#8da5bf':a==='Call'?'#80a89c':a.startsWith('Bet')?'#bd9c72':'#ab8aab';
const RELATION_COLORS={weaker:'#578b92',stronger:'#af8c60',tie:'#969eac'};
const LENSES=[['all','当前谁领先'],['pay','谁会支付我'],['fold','能赶走谁'],['remain','继续面对谁']];
async function rpc(method,history,dataset='btn-bb'){
 if(window.pokerSolver)return method==='info'?window.pokerSolver.info(dataset):window.pokerSolver.node(dataset,history);
 const r=await fetch('/__solver',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method,history,dataset})});const d=await r.json();if(!r.ok)throw new Error(d.error);return d;
}
function RangeChart({node,side,title,weights,baseline,layer,showPolicy,highlight,attempts,onPick,hero,seats,evidence,lens,reply,policyNode}){
 const groups=aggregate(node,side,weights),prior=aggregate(node,side,baseline);const max=Math.max(...Object.values(prior).map(rows=>rows.reduce((s,r)=>s+r.weight,0)),.000001);
 return <section className="pf-range"><div className="pf-range-heading"><h2>{title}</h2><span>{seats[side]}{hero===side?' · 你':' · 对手'}</span></div><div className="pf-grid" aria-label={title}>{RANKS.flatMap((r,i)=>RANKS.map((c,j)=>{
  const key=i===j?r+c:i<j?r+c+'s':c+r+'o',rows=groups[key]||[],old=(prior[key]||[]).reduce((s,x)=>s+x.weight,0),value=rows.reduce((s,x)=>s+x.weight,0);
  const evidenceRows=evidence&&side!==hero?rows.map(row=>({row,fact:evidence.rows[row.index]})):[];
  const factor=value>0?evidenceRows.reduce((s,{row,fact})=>s+row.weight*focusFactor(fact,lens,reply),0)/value:0;
  const relations=['weaker','stronger','tie'].map(kind=>({kind,weight:evidenceRows.filter(x=>x.fact?.kind===kind).reduce((s,x)=>s+x.row.weight,0)}));
  const attempted=rows.filter(x=>attempts[x.hand]),wrong=attempted.some(x=>!attempts[x.hand].correct);
  let background=`color-mix(in srgb,#7997ba ${Math.min(90,value/max*90)}%,#eef0f3)`;
  if(layer==='strategy'&&policyNode?.actor===side&&showPolicy&&value>0){
   const mix=policyNode.actions.map((_,a)=>rows.reduce((s,row)=>s+row.weight*policyNode.strategyActionMajor[a*policyNode.orderedHands[side].length+row.index],0)/value);let cursor=0;
   background=`linear-gradient(90deg,${mix.map((f,a)=>{const start=cursor;cursor+=f*100;return `${colorAction(policyNode.actions[a])} ${start}% ${cursor}%`;}).join(',')})`;
  }
  return <button key={key} disabled={!rows.length} className={`${key===highlight?'highlight':''} ${attempted.length?wrong?'attempt-wrong':'attempt-right':''} ${value<=0?'empty':''} ${side!==hero&&evidence&&lens!=='all'&&factor<=0?'pf-unfocused':''}`} style={{background}} onClick={()=>onPick({side,key})} title={`${key} · 参考权重 ${value.toFixed(3)} · 已练 ${attempted.length}/${rows.length}`}><span>{key}</span>{evidenceRows.length>0&&value>0&&<em className="pf-relation-strip">{relations.map(r=><i key={r.kind} style={{width:PCT(r.weight/value),background:RELATION_COLORS[r.kind]}}/>)}</em>}{side!==hero&&evidence&&lens!=='all'&&factor>0&&<em className="pf-focus-fill" style={{width:PCT(factor)}}/>}{old>0&&layer==='change'&&<i style={{width:`${Math.min(100,value/old*100)}%`}}/>}</button>;
 }))}</div><div className="pf-range-foot"><span>{layer==='strategy'&&policyNode?.actor===side?'底色表示动作频率':'底色深浅表示组合权重'}</span><span>点格子看具体组合</span></div>{layer==='strategy'&&policyNode?.actor===side&&<div className="pf-chart-actions">{policyNode.actions.map(a=><span key={a}><i style={{background:colorAction(a)}}/>{labelAction(a)}</span>)}</div>}</section>;
}
export default function RangeTrainer({onSection}){
 const [datasetId,setDatasetId]=useState('btn-bb');
 const [preflop,setPreflop]=useState(false);
 const [threebetSetup,setThreebetSetup]=useState(null);
 const [study,setStudy]=useState(true),[lens,setLens]=useState('all');
 const [guideStep,setGuideStep]=useState(1),[advanced,setAdvanced]=useState(false);
 const [generator,setGenerator]=useState(true);
 const [previewChild,setPreviewChild]=useState(null),[reply,setReply]=useState(null);
 const [info,setInfo]=useState(null),[node,setNode]=useState(null),[hero,setHero]=useState(1),[pair,setPair]=useState(null),[history,setHistory]=useState([]),[busy,setBusy]=useState(true),[error,setError]=useState(''),[chosen,setChosen]=useState(null),[review,setReview]=useState(null),[unknown,setUnknown]=useState(false),[layer,setLayer]=useState('range'),[stage,setStage]=useState('after'),[perspective,setPerspective]=useState('hand'),[detail,setDetail]=useState(null),[settings,setSettings]=useState(false),[scene,setScene]=useState(false),[source,setSource]=useState(false),[attempts,setAttempts]=useState({}),[scores,setScores]=useState({}),[edgeRatio,setEdgeRatio]=useState(.7);
 const locked=useRef(false),generation=useRef(0);
 const variation=useRef(0);
 const returnFocus=useRef(null);
 useEffect(()=>{
  if(threebetSetup||generator)return;
  if(!detail&&!scene&&!settings&&!source&&!preflop)return;
  returnFocus.current=document.activeElement;
  const panel=document.querySelector('.pf-dialog');const focusables=()=>[...panel.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')];focusables()[0]?.focus();
  const keys=e=>{if(e.key==='Escape'){setDetail(null);setScene(false);setSettings(false);setSource(false);setPreflop(false);}if(e.key==='Tab'){const items=focusables(),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};
  document.addEventListener('keydown',keys);return()=>{document.removeEventListener('keydown',keys);returnFocus.current?.focus();};
 },[detail,scene,settings,source,preflop,threebetSetup,generator]);
 const SEATS=info?[info.request.context.oopSeat,info.request.context.ipSeat]:['BB','BTN'];
 const scope=node?datasetId+':'+info.request.inputFingerprint+':'+JSON.stringify(node.historyIndices):'root',score=scores[scope]||{right:0,wrong:0},marks=attempts[scope]||{};
 const base=useMemo(()=>node?publicMass(node):null,[node]);
 const projected=useMemo(()=>node&&chosen!==null?afterAction(node,chosen):null,[node,chosen]);
 const post=useMemo(()=>projected?publicMass(node,projected):base,[node,projected,base]);
 const heroIndex=node&&pair?node.orderedHands[hero].indexOf(pair.hero):-1;
 const mix=node&&heroIndex>=0?mixFor(node,hero,heroIndex):[];
 const reveal=review!==null||unknown;
 const evidence=useMemo(()=>node&&pair?rangeEvidence(node,hero,pair.hero,previewChild):null,[node,pair,hero,previewChild]);
 useEffect(()=>{
  let cancelled=false;setPreviewChild(null);setReply(null);setLens('all');
  if(!node||chosen===null||!reveal||mix[chosen]?.frequency<=1e-8)return;
  rpc('node',[...node.historyIndices,chosen],datasetId).then(child=>{if(!cancelled&&child.actor===(hero^1))setPreviewChild(child);}).catch(e=>{if(!cancelled)setError('回应预览读取失败：'+e.message);});
  return()=>{cancelled=true;};
 },[node,chosen,reveal,datasetId,hero]);
 const displayWeights=useMemo(()=>{
  if(!node||!pair)return null;const replying=reply!==null&&previewChild;
  const beforeRaw=replying?previewChild.rawWeights:node.rawWeights;
  const afterRaw=replying?afterAction(previewChild,reply):projected;
  const useAfter=layer==='change'&&stage==='after'&&afterRaw;
  const raw=useAfter?afterRaw:beforeRaw;const mass=publicMass(node,raw),beforeMass=publicMass(node,beforeRaw);
  const out=mass.joint.map(ws=>ws.slice());const before=beforeMass.joint.map(ws=>ws.slice());
  if(layer==='strategy'&&previewChild&&perspective==='public'){out[hero^1]=publicMass(previewChild).joint[hero^1];before[hero^1]=out[hero^1];}
  if(perspective==='hand'){
   out[hero^1]=fixedHandOpponent(node,hero,pair.hero,raw).weights;
   before[hero^1]=fixedHandOpponent(node,hero,pair.hero,beforeRaw).weights;
  }return {after:out,before};
 },[node,pair,hero,layer,stage,projected,post,base,perspective,reply,previewChild]);
 function cleanAnswer(){setChosen(null);setReview(null);setUnknown(false);setLayer('range');setStage('after');setDetail(null);setLens('all');setReply(null);setGuideStep(study?1:3);locked.current=false;}
 function previewAction(a){setChosen(a);setReview(gradeAction(node,hero,pair.hero,a,info.result.errorBB));setUnknown(false);setLayer('strategy');setStage('after');setReply(null);setLens('all');}
 function guideTo(step){setGuideStep(step);setPerspective('hand');setLens('all');setReply(null);if(step===3){setStudy(false);cleanAnswer();setGuideStep(3);}else{setStudy(true);if(step===1)setLayer('range');else if(chosen===null){const a=mix.find(p=>p.frequency>0)?.index;if(a!==undefined)previewAction(a);}}}
 function practiceNext(){setStudy(false);nextHand();setGuideStep(3);}
 async function variedSpot(){
  if(busy||!info)return;setBusy(true);setError('');const run=++generation.current,target=[4,5,3][variation.current++%3];
  try{for(let trial=0;trial<16;trial++){
   const holdings=dealPair(info.root,hero);let current=await walk(info.root,holdings,hero,[]);
   for(let i=0;i<24&&!current.node.terminal;i++){
    const n=current.node;if(n.board.length>=target){if(run!==generation.current)return;setNode(n);setPair(holdings);setHistory(current.events);cleanAnswer();return;}
    const index=n.orderedHands[hero].indexOf(holdings.hero),policy=mixFor(n,hero,index),action=drawWeighted(policy.map(p=>p.frequency));
    const next=await rpc('node',[...n.historyIndices,action],datasetId);current=await walk(next,holdings,hero,[...current.events,{node:n,text:`${SEATS[hero]} ${labelAction(n.actions[action])}`,pair:holdings}]);
   }
  }throw new Error('本次抽取的路线均提前结束，请再换一个决策点。');
  }catch(e){if(run===generation.current)setError(e.message);}finally{if(run===generation.current)setBusy(false);}
 }
 async function walk(start,holdings,seat,events=[],dataset=datasetId,seatNames=SEATS){
  let n=start,steps=events.slice();
  for(let i=0;i<64;i++){
   if(n.terminal||(!n.chance&&n.actor===seat))return {node:n,events:steps};
   const before=n;let a,text;
   if(n.chance){const used=[...splitHand(holdings.hero),...splitHand(holdings.opponent)];const choices=n.chanceCards.filter(c=>!used.includes(c.card));if(!choices.length)throw new Error('没有与底牌相容的新公共牌');const c=choices[Math.floor(Math.random()*choices.length)];a=c.id;text=`发出 ${c.card}`;}
   else{const index=n.orderedHands[seat^1].indexOf(holdings.opponent);if(index<0||!(n.rawWeights[seat^1][index]>0))throw new Error('隐藏底牌不在参考后继中');const policy=mixFor(n,seat^1,index);a=drawWeighted(policy.map(x=>x.frequency));text=`${seatNames[seat^1]} ${labelAction(n.actions[a])}`;}
   n=await rpc('node',[...n.historyIndices,a],dataset);steps.push({node:before,text,pair:holdings});
  }throw new Error('行动路线超过限制');
 }
 async function start(seat=hero,loaded=null,dataset=datasetId){
  setBusy(true);setError('');setNode(null);setPair(null);const run=++generation.current;
  try{const data=loaded||await rpc('info',undefined,dataset);if(run!==generation.current)return;setInfo(data);setDatasetId(dataset);const holdings=dealPair(data.root,seat);const next=await walk(data.root,holdings,seat,[],dataset,[data.request.context.oopSeat,data.request.context.ipSeat]);if(run!==generation.current)return;setHero(seat);setPair(holdings);setNode(next.node);setHistory(next.events);cleanAnswer();}
  catch(e){if(run===generation.current)setError(e.message);}finally{if(run===generation.current)setBusy(false);}
 }
 useEffect(()=>{void start();return()=>{generation.current++;};},[]);
 function answer(a){
  if(locked.current||busy||node.actor!==hero)return;locked.current=true;
  const report=a===null?{correct:false,loss:null,mix}:gradeAction(node,hero,pair.hero,a,info.result.errorBB);
  setChosen(a);setReview(report);setUnknown(a===null);setLayer('strategy');
  if(study)return;
  setScores(s=>{const old=s[scope]||{right:0,wrong:0};return {...s,[scope]:{right:old.right+Number(report.correct),wrong:old.wrong+Number(!report.correct)}};});
  setAttempts(s=>({...s,[scope]:{...s[scope],[pair.hero]:{...report,action:a}}}));
 }
 function nextHand(){
  if(busy)return;try{
   // Mix mixed-policy and neighboring-action boundary hands with whole-range sampling.
   const rows=node.orderedHands[hero].map((hand,i)=>({hand,i,mix:mixFor(node,hero,i)})).filter(r=>base.joint[hero][r.i]>0);
   const typical=new Map();for(const row of rows){const key=classOf(row.hand);if(!typical.has(key))typical.set(key,row.mix.reduce((best,x)=>x.frequency>best.frequency?x:best).index);}
   const boundary=rows.filter(r=>{if(r.mix.filter(x=>x.frequency>.1).length>1)return true;const cls=classOf(r.hand),first=RANKS.indexOf(cls[0]),second=RANKS.indexOf(cls[1]);return [[first-1,second],[first+1,second],[first,second-1],[first,second+1]].some(([a,b])=>a>=0&&b>=0&&a<13&&b<13&&typical.has(RANKS[Math.min(a,b)]+RANKS[Math.max(a,b)]+(a===b?'':cls.slice(2)))&&typical.get(RANKS[Math.min(a,b)]+RANKS[Math.max(a,b)]+(a===b?'':cls.slice(2)))!==typical.get(cls));});
   const pool=Math.random()<edgeRatio&&boundary.length?boundary:rows;const unseen=pool.filter(r=>!marks[r.hand]);const choices=unseen.length?unseen:pool;const target=choices[Math.floor(Math.random()*choices.length)];
   const holdings=dealPair(node,hero,Math.random,target.hand);setPair(holdings);setHistory(h=>h.map(step=>({...step,pair:holdings})));cleanAnswer();
  }catch(e){setError(e.message);}
 }
 async function proceed(){
  if(busy||chosen===null||!review||mix[chosen]?.frequency<=1e-8)return;setBusy(true);setError('');const run=++generation.current;
  try{const before=node,next=await rpc('node',[...node.historyIndices,chosen],datasetId);const events=[...history,{node:before,text:`${SEATS[hero]} ${labelAction(node.actions[chosen])}`,pair}];const reached=await walk(next,pair,hero,events);if(run!==generation.current)return;setNode(reached.node);setHistory(reached.events);cleanAnswer();}catch(e){if(run===generation.current)setError(e.message);}finally{if(run===generation.current)setBusy(false);}
 }
 function rewind(index){const item=history[index];generation.current++;setNode(item.node);setPair(item.pair);setHistory(history.slice(0,index));setBusy(false);cleanAnswer();}
 const paid=node?.totalBetAmount.map(x=>x/100),pot=paid?info.request.context.startingPotBB+paid[0]+paid[1]:0;
 const detailRows=detail&&node?aggregate(node,detail.side,displayWeights.after[detail.side])[detail.key]||[]:[];
 return <div className="pf-app" data-learning={study} data-guide={guideStep} data-terminal={Boolean(node?.terminal)}>
  <header className="pf-header"><strong>扑克练习器</strong><nav>{[['preflop','翻前'],['reading','读牌'],['postflop','翻后'],['combined','综合']].map(([id,title])=><button className={id==='postflop'?'active':''} key={id} onClick={()=>id!=='postflop'&&onSection(id)}>{title}</button>)}</nav><button className="pf-icon" aria-label="练习设置" onClick={()=>setSettings(true)}><GearSix size={20}/></button></header>
  <main className="pf-workspace">
   <div className="pf-toolbar"><div className="pf-scene-tools"><button className="pf-scene" onClick={()=>setScene(true)}>{hero===1?'有位置':'没位置'} · {info?.request.context.threebetToBB?'3bet':'单加注'}　{SEATS[hero]} 对 {SEATS[hero^1]} <span>更换局面</span></button><button className="pf-new-board" disabled={busy} onClick={()=>setGenerator(true)}>自动换翻牌</button><button className="pf-other-role" disabled={busy} onClick={()=>start(hero^1,info,datasetId)}>练{SEATS[hero^1]}一方</button><button className="pf-varied" disabled={busy} onClick={variedSpot}>换个决策点</button></div><div className="pf-score"><button className="pf-study-toggle" onClick={()=>{const learning=!study;setStudy(learning);cleanAnswer();setGuideStep(learning?1:3);}}>{study?'先观察 · 不计分':'自己作答 · 计分'}</button><span>{score.right} 对</span><span>{score.wrong} 错</span><button className="pf-icon" aria-label="查看求解依据" onClick={()=>setSource(true)}><Info size={18}/></button></div></div>
   {error&&<div className="pf-error" role="alert">{error}<button onClick={()=>start()}>重试读取</button></div>}
   {!node?<div className="pf-loading">{error?'当前求解数据尚不可用':'正在读取完整求解局面…'}</div>:<>
   <section className="pf-table-state"><div className="pf-status"><span>{node.board.length===3?'翻牌':node.board.length===4?'转牌':'河牌'}</span><h1>{node.terminal?'本手行动结束':`轮到你 · ${SEATS[hero]}`}</h1><p>底池 {pot.toFixed(2)} BB　你剩余 {(info.request.context.eachStackBB-paid[hero]).toFixed(2)} BB　对手剩余 {(info.request.context.eachStackBB-paid[hero^1]).toFixed(2)} BB</p>{!node.terminal&&<small>{paid[hero^1]>paid[hero]?`继续跟注需 ${(paid[hero^1]-paid[hero]).toFixed(2)} BB`:'当前无需跟注'}</small>}</div><Cards cards={node.board.map(card)} small/><div className="pf-hole"><span>你的底牌</span><Cards cards={splitHand(pair.hero).map(card)} small/></div></section>
   <div className="pf-history"><button onClick={()=>setPreflop(true)} title="查看双方翻前起始范围">{info.request.context.preflopLabel||`${info.request.context.oopSeat==='SB'?'SB':'BTN'} 开池 ${info.request.context.openToBB} → BB 跟注`} · 看起点</button>{history.map((step,i)=><button key={i} onClick={()=>rewind(i)} disabled={busy||step.node.actor!==hero} title={step.node.actor===hero?'返回这个决策点':'对手行动或发牌；可回到自己的决策点重练'}>{step.text}</button>)}</div>
   {advanced&&previewChild&&perspective==='hand'&&lens==='remain'&&<div className="pf-response-preview"><span>预览对手回应 · 尚未发生</span><button className={reply===null?'active':''} onClick={()=>setReply(null)}>只看你的动作</button>{previewChild.actions.map((a,index)=>{const dist=fixedHandOpponent(previewChild,hero,pair.hero);const count=previewChild.orderedHands[hero^1].length;const mass=dist.weights.reduce((s,w,i)=>s+w*previewChild.strategyActionMajor[index*count+i],0);return <button key={a} className={reply===index?'active':''} onClick={()=>{setReply(index);setLens('remain');setLayer('change');setStage('after');}}>{labelAction(a)} {PCT(dist.total?mass/dist.total:0)}</button>;})}</div>}
   <button className="pf-more-options" onClick={()=>setAdvanced(!advanced)}>{advanced?'收起图表选项':'更多图表选项'}</button>
   {advanced&&<div className="pf-chart-toolbar"><label className="pf-layer-select">图表内容<select aria-label="图表内容" value={layer} onChange={e=>setLayer(e.target.value)}><option value="range">当前范围</option><option value="strategy" disabled={!reveal}>行动分配</option><option value="change" disabled={chosen===null}>行动前后</option></select></label>{layer==='change'?<div>{[['before','动作前'],['after','动作后']].map(([id,title])=><button key={id} className={stage===id?'active':''} onClick={()=>setStage(id)}>{title}</button>)}</div>:<label><input type="checkbox" checked={perspective==='hand'} onChange={e=>{setPerspective(e.target.checked?'hand':'public');setLens('all');setReply(null);}}/>考虑我的底牌</label>}</div>}
   {advanced&&evidence&&perspective==='hand'&&<div className="pf-thinking"><div className="pf-thinking-controls">{LENSES.map(([id,title])=><button key={id} className={lens===id?'active':''} disabled={id==='remain'?!previewChild:id!=='all'&&!evidence.canFaceBet} onClick={()=>{setLens(id);setReply(null);if(id!=='all'){setLayer('change');setStage('after');}}}>{title}</button>)}</div><div className="pf-relation-legend">{[['weaker','目前比你弱'],['stronger','目前比你强'],['tie','目前打平']].map(([kind,title])=><span key={kind}><i style={{background:RELATION_COLORS[kind]}}/>{title}</span>)}</div>{evidence.canFaceBet&&<div className="pf-response-summary" aria-label="对手回应分布">{evidence.responses.filter(r=>r.frequency>0).map(r=><button key={r.kind} title={'占对手回应前范围 '+PCT(r.frequency)} onClick={()=>{setLens(r.kind==='weaker'?'pay':r.kind==='stronger'?'risk':r.kind==='fold'?'allFold':'remain');setReply(null);setLayer('change');setStage('after');}} style={{flex:r.frequency}}><i style={{background:r.kind==='fold'?'#bfc5ce':RELATION_COLORS[r.kind]}}/><span>{r.label} {PCT(r.frequency)}</span></button>)}</div>}</div>}
   {evidence&&!node.terminal&&<DecisionGuide step={guideStep} onStep={guideTo} study={study} evidence={evidence} lens={lens} onLens={id=>{setLens(id);setPerspective('hand');}} chosen={chosen} node={node} child={previewChild} reply={reply} onReply={id=>{setReply(id);setLens(id===null?'all':'remain');setLayer('change');setStage('after');}} mix={mix} onAction={previewAction} onPractice={practiceNext} tolerance={Math.max(.02,2*info.result.errorBB)}/>}
   <div className="pf-chart-pair">{[hero,hero^1].map(side=><RangeChart key={side} evidence={perspective==='hand'?evidence:null} lens={lens} reply={reply} policyNode={side===hero?node:previewChild} seats={SEATS} node={node} side={side} hero={hero} title={side===hero?'你的整体范围':reply!==null&&previewChild?`预览 · 对手${labelAction(previewChild.actions[reply])}后`:layer==='strategy'&&previewChild?`预览 · 对手面对${labelAction(node.actions[chosen])}`:lens==='pay'?'预览 · 较弱牌继续的部分':lens==='fold'?'预览 · 会弃掉的较强牌':lens==='risk'?'预览 · 较强牌继续的部分':lens==='allFold'?'预览 · 全部弃牌的部分':lens==='remain'?'预览 · 继续参与的范围':perspective==='hand'?'拿着这手时，对手的范围':'对手的整体范围'} weights={displayWeights.after[side]} baseline={displayWeights.before[side]} layer={layer} showPolicy={reveal} highlight={side===hero?classOf(pair.hero):detail?.side===side?detail.key:null} attempts={side===hero?marks:{}} onPick={setDetail}/>)}</div>
   <div className="pf-chart-note">{lens!=='all'?'图中高亮是所选关系的份额，淡底仍保留完整范围；这是预览，不会执行到实际牌局。当前领先不等于最后一定获胜。':reply!==null&&previewChild?`正在预览对手${labelAction(previewChild.actions[reply])}前后；这次回应尚未发生。`:perspective==='hand'?'左图保留你的整体策略范围；右图排除了与你底牌冲突的组合。你的行动本身不提供新的对手底牌信息。':'当前按公开行动历史观察双方整体范围。'}{layer==='change'&&' 前后采用相同刻度；格子底边显示保留比例。'}</div>

   <section className="pf-decision" aria-live="polite">
    {node.terminal?<><h2>{node.board.length<5?'已无后续决策；未发完公共牌的全下结果由剩余牌分布决定。':'已到达真实终局。'}</h2><button className="pf-primary" onClick={()=>setGenerator(true)}>新牌面，开始新一手</button><button className="pf-varied" onClick={()=>start()}>在当前牌面再练一手</button></>:<>
    <h2>{busy?'正在读取真实后继…':study?(reveal?'点上方观察按钮，在图里找变化':'先点一个动作，观察对手怎样回应'):reveal?unknown?'先看这手牌的参考策略':review.correct?'这个动作可以采用':'这个动作损失较多，比较下面的参考策略':'你会怎么打？'}</h2>
    {!reveal?<div className="pf-action-buttons">{node.actions.map((a,i)=><button key={a} disabled={busy} onClick={()=>answer(i)}>{labelAction(a)}</button>)}<button className="pf-unknown" disabled={busy} onClick={()=>answer(null)}>{study?'显示参考策略':'我不知道'}</button></div>:<>
    <div className="pf-answer-mix">{mix.map(p=><button key={p.action} className={chosen===p.index?'selected':''} onClick={()=>{setGuideStep(2);setStudy(true);previewAction(p.index);}}><span>{labelAction(p.action)}</span><b>{PCT(p.frequency)}</b><small>节点EV {p.ev.toFixed(3)} BB</small></button>)}</div>
    {!study&&review.loss!==null&&<p className="pf-regret">本次动作相对最高动作EV少 {review.loss.toFixed(3)} BB。练习接受带宽 {review.toleranceBB.toFixed(3)} BB；这是训练规则，不是逐手误差保证。</p>}
    {chosen!==null&&mix[chosen]?.frequency<=1e-8&&<p className="pf-regret">参考策略中这手牌不进入该分支。可以比较图表，再选择有到达权重的动作继续。</p>}
    <div className="pf-next-buttons"><button onClick={nextHand} disabled={busy}><ArrowCounterClockwise size={17}/>换手牌，练这里</button><button onClick={variedSpot} disabled={busy}>换个决策点</button><button className="pf-primary" onClick={proceed} disabled={busy||chosen===null||mix[chosen]?.frequency<=1e-8}>继续这手牌<ArrowRight size={17}/></button></div>
    </>}
    </>}
   </section>
   </>}
  </main>
  {preflop&&info&&<div className="pf-overlay" onClick={()=>setPreflop(false)}><section className="pf-dialog pf-start-dialog" role="dialog" aria-modal="true" aria-label="翻前起始范围" onClick={e=>e.stopPropagation()}><header><h2>双方从哪些牌开始</h2><button className="pf-icon" aria-label="关闭翻前范围" onClick={()=>setPreflop(false)}><X size={20}/></button></header><p>{info.request.context.threebetToBB?'这是本次明确配置的3bet／跟注条件范围。':'这是你原始简化图中的开池／跟注部分。'}深色100%，浅色50%，空格0%。进入翻后后，再排除公共牌冲突并沿实际行动筛选。</p><div className="pf-start-pair">{['oop','ip'].map((role,side)=>{const range=info.request.ranges[role];return <section key={role}><h3>{SEATS[side]} · {range.action==='call'?'跟注范围':range.action==='3bet'?'3bet范围':'开池范围'}</h3><div className="pf-start-grid">{RANKS.flatMap((r,i)=>RANKS.map((c,j)=>{const label=i===j?r+c:i<j?r+c+'s':c+r+'o';const value=range.classWeights[label]||0;return <span key={label} title={label+' '+PCT(value)} style={{background:value===1?'#91a9c7':value===.5?'#d1dcea':'#eef0f3',color:value?'#344f71':'#b7c0cd'}}>{label}</span>;}))}</div><p>{range.source} · {range.id}</p></section>;})}</div></section></div>}
  {generator&&<PostflopGenerator sourceId="all" currentSourceId={info?.request.sourceId||datasetId} sources={info?.sources||[]} onClose={()=>{setGenerator(false);setError('');if(!node)void start();}} onReady={(dataset,seat)=>{setGenerator(false);void start(seat,null,dataset);}}/>}
  {threebetSetup&&<ThreebetSetup key={threebetSetup} scene={threebetSetup} onClose={()=>setThreebetSetup(null)} onReady={(dataset,seat)=>{setThreebetSetup(null);void start(seat,null,dataset);}}/>}
  {detail&&<div className="pf-overlay" onClick={()=>setDetail(null)}><section className="pf-dialog" role="dialog" aria-modal="true" aria-label="具体组合" onClick={e=>e.stopPropagation()}><header><h2>{detail.key} · {SEATS[detail.side]}</h2><button className="pf-icon" aria-label="关闭组合详情" onClick={()=>setDetail(null)}><X size={20}/></button></header><p>以下为具体物理组合。牌类中的不同花色不一定采用相同策略。</p><div className="pf-combo-rows">{detailRows.map(row=><div key={row.hand}><ComboInspector row={row} node={node} side={detail.side} hero={hero} hand={pair.hero} reveal={reveal}/></div>)}</div></section></div>}
  {(scene||settings||source)&&<div className="pf-overlay" onClick={()=>{setScene(false);setSettings(false);setSource(false);}}><section className="pf-dialog" role="dialog" aria-modal="true" aria-label={scene?'选择局面':settings?'练习设置':'求解依据'} onClick={e=>e.stopPropagation()}><header><h2>{scene?'选择局面':settings?'练习设置':'求解依据'}</h2><button className="pf-icon" aria-label="关闭" onClick={()=>{setScene(false);setSettings(false);setSource(false);}}><X size={20}/></button></header>
   {scene?<><p>单加注可直接练；3bet可设置双方范围后进行真实求解。</p>{[['btn-bb',1,'有位置 · 单加注','你在BTN开池，对手在BB跟注'],['sb-bb',0,'没位置 · 单加注','你在SB开池，对手在BB跟注']].map(([dataset,seat,title,desc])=><button className="pf-scene-option" key={dataset} disabled={!info?.catalogue.find(p=>p.id===dataset)?.ready} onClick={()=>{setScene(false);start(seat,null,dataset);}}><strong>{title}</strong><span>{desc}</span></button>)}{[['3bet-ip',1,'有位置 · 3bet','CO 开池 → BTN 3bet → CO 跟注'],['3bet-oop',0,'没位置 · 3bet','BTN 开池 → SB 3bet → BTN 跟注']].map(([dataset,seat,title,desc])=><button className="pf-scene-option" key={dataset} onClick={()=>{setScene(false);if(info?.catalogue.find(p=>p.id===dataset)?.ready)void start(seat,null,dataset);else setThreebetSetup(dataset);}}><strong>{title}</strong><span>{info?.catalogue.find(p=>p.id===dataset)?.ready?info.catalogue.find(p=>p.id===dataset).title:desc} · {info?.catalogue.find(p=>p.id===dataset)?.ready?'本次求解已就绪':'配置范围并求解'}</span></button>)}</>:settings?<><label className="pf-slider">边界／混合牌优先比例：{Math.round(edgeRatio*100)}%<input type="range" min="0" max="100" value={edgeRatio*100} onChange={e=>setEdgeRatio(Number(e.target.value)/100)}/></label><p>其余从当前完整范围抽取。优先未练过的组合；本次关闭即清空，不保存进度。</p>{datasetId.startsWith('3bet-')&&<button className="pf-primary" onClick={()=>{setSettings(false);setThreebetSetup(info.request.sourceId||datasetId);}}>重新配置3bet范围</button>}</>:info?<><p>{info.request.scope}</p><p>引擎报告可利用度 {info.result.errorBB.toFixed(6)} BB，目标 {info.result.targetBB.toFixed(6)} BB；迭代 {info.result.iterations} 次。</p><p>零抽水；翻牌{info.request.tree.flopBet}、转牌{info.request.tree.turnBet}、河牌{info.request.tree.riverBet}；加注模型{info.request.tree.raises}。当前仅比较声明的尺度。</p><p>双方起始范围来源：{info.request.ranges.oop.source}／{info.request.ranges.oop.id}，{info.request.ranges.ip.source}／{info.request.ranges.ip.id}。不是完整翻前均衡求解。</p><code>{info.request.inputFingerprint}</code><code>{info.result.engineRevision}</code></>:<p>尚未读取求解信息。</p>}
  </section></div>}
 </div>;
}
