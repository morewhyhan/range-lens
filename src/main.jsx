import React, {useState,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {GearSix,X} from '@phosphor-icons/react';
import {BOARD_NAMES} from './poker.js';
import {charts,bbMap} from './preflop.js';
import {MODULES,DEFAULTS,generateQuestion,sequenceQuestions,eligibleRules,ruleTasks,TASK_NAMES,ROUTES,readingTypesFor} from './questions.js';
import {SCENARIOS,allRules,branches} from './rules.js';
import {POSTFLOP_REGISTRY} from './postflop-registry.js';
import {scopeKey,incrementScore,settingsIssue} from './session.js';
import {Cards,TableContext,RangeMap,Stimulus,Explanation} from './trainer-ui.jsx';
import GoldenPath from './golden-path.jsx';
import {PostflopHome,PostflopSpecialized} from './postflop-home.jsx';
import RangeTrainer from './range-trainer.jsx';
import './style.css';
const sections=[['preflop','翻前'],['reading','读牌'],['postflop','翻后'],['combined','综合']];
const prettyModule=id=>MODULES.find(m=>m.id===id)?.label;
const optionsOf=xs=>xs.map(x=>[x,x]);
const allOption=['all','全部随机'];
const Select=({label,value,onChange,options})=><label className="select-label"><span>{label}</span><select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{options.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>;
const isPre=m=>['open','threebet','bb'].includes(m);
const isStrategy=m=>['flop','turn','river','exploit'].includes(m);
function App(){
 const [learning,setLearning]=useState(false);
 const [learningRoute,setLearningRoute]=useState('golden');
 const [postflopMode,setPostflopMode]=useState('home');
 const [settings,setSettings]=useState(DEFAULTS),[draft,setDraft]=useState(DEFAULTS),[question,setQuestion]=useState(()=>generateQuestion(DEFAULTS)),[selected,setSelected]=useState(null),[scores,setScores]=useState({}),[showSettings,setShowSettings]=useState(false),[coverage,setCoverage]=useState(false),[error,setError]=useState(''),[route,setRoute]=useState([]),[routeIndex,setRouteIndex]=useState(0),[replayStep,setReplayStep]=useState(-1),[orderClicks,setOrderClicks]=useState([]),[viewport,setViewport]=useState(()=>({w:innerWidth,h:innerHeight}));
 const dialog=useRef(null),replayTimer=useRef(null),autoTimer=useRef(null),locked=useRef(false);
 const key=scopeKey(settings),score=scores[key]||{right:0,wrong:0};
 const pre=isPre(settings.module),strategy=isStrategy(settings.module),reading=settings.section==='reading',ranking=settings.module==='ranking';
 const q=question,answered=selected!==null,correct=answered&&selected===q?.correct,wrong=answered&&!correct;
 function cancelTimers(){clearTimeout(autoTimer.current);clearTimeout(replayTimer.current);}
 function resetAnswer(){setSelected(null);setOrderClicks([]);locked.current=false;setReplayStep(-1);}
 function begin(s){
  cancelTimers();resetAnswer();setError('');
  try{const issue=settingsIssue(s);if(issue)throw new Error(issue);let nextQuestion;
   if(s.module==='sequence'){const qs=sequenceQuestions(s);setRoute(qs);setRouteIndex(0);nextQuestion=qs[0];}
   else{setRoute([]);setRouteIndex(0);nextQuestion=generateQuestion(s);}
   setQuestion(nextQuestion);
  }catch(e){setError(e.message);setQuestion(null);setRoute([]);}
 }
 function update(patch){const s={...settings,...patch};setSettings(s);begin(s);}
 function changeModule(module){const section=MODULES.find(m=>m.id===module).section;update({...DEFAULTS,module,section,edgeRatio:settings.edgeRatio,sampling:settings.sampling,mixed:settings.mixed,boundary:settings.boundary,changes:settings.changes,orderDirection:settings.orderDirection||'ascending'});}
 function next(){cancelTimers();if(route.length&&routeIndex+1<route.length){setRouteIndex(routeIndex+1);setQuestion(route[routeIndex+1]);resetAnswer();}else begin(settings);}
 function finish(id){if(locked.current||!q)return;locked.current=true;setSelected(id);const ok=id===q.correct;setScores(v=>incrementScore(v,key,ok));if(ok)autoTimer.current=setTimeout(next,380);}
 function answer(id){
  if(locked.current||!q||replayStep>=0)return;
  if(q.kind==='order'&&id!=='__unknown__'){
   if(orderClicks.includes(id))return;
   if(id!==q.order[orderClicks.length]){finish(id);return;}
   const clicks=[...orderClicks,id];setOrderClicks(clicks);
   if(clicks.length===q.order.length)finish(q.correct);
  }else finish(id);
 }
 function openSettings(){cancelTimers();if(correct)next();setDraft(settings);setShowSettings(true);}
 function closeDialog(){setShowSettings(false);setCoverage(false);}
 function applySettings(){if(settingsIssue(draft))return;setSettings(draft);begin(draft);closeDialog();}
 function replay(){clearTimeout(replayTimer.current);const run=i=>{if(i>=(q?.history?.length||0)){setReplayStep(-1);return;}setReplayStep(i);replayTimer.current=setTimeout(()=>run(i+1),650);};run(0);}
 useEffect(()=>{const resize=()=>setViewport({w:innerWidth,h:innerHeight});window.addEventListener('resize',resize);return()=>{window.removeEventListener('resize',resize);cancelTimers();};},[]);
 useEffect(()=>{if(showSettings||coverage)dialog.current?.showModal();else dialog.current?.close();},[showSettings,coverage]);
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[question,wrong]);
 useEffect(()=>{const listener=e=>{if(settings.section==='postflop'||learning||showSettings||coverage||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.repeat)return;
  if(e.key==='Enter'&&answered){e.preventDefault();next();return;}
  if((e.key==='0'||e.key==='?')&&!answered){e.preventDefault();answer('__unknown__');return;}
  const i=Number(e.key)-1;if(/^[1-9]$/.test(e.key)&&q?.options[i]&&!answered){e.preventDefault();answer(q.options[i].id);}
 };window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);});
 const candidates=strategy?eligibleRules({...settings,unit:'all',task:'all'}):[];
 const coverageRows=POSTFLOP_REGISTRY.map(node=>({...node,title:allRules.find(r=>r.id===node.id)?.title||node.id}));
 const units=strategy?candidates.map(r=>[r.id,r.id+' · '+r.title.replace(/\n/g,' ')]):settings.module==='branch'?branches.map(b=>[b.id,b.id+' · '+b.title]):settings.module==='sequence'?ROUTES.map(r=>[r.id,r.label]):[];
 const draftCandidates=isStrategy(draft.module)?eligibleRules({...draft,unit:'all',task:'all'}):[];
 const relevantTasks=[...new Set(draftCandidates.filter(r=>draft.unit==='all'||r.id===draft.unit).flatMap(ruleTasks))];
 const readingTypes=readingTypesFor(draft),issue=settingsIssue(draft),scale=Math.min(1.85,Math.max(1,Math.min(viewport.w/1440,viewport.h/1000)));
 const routeContinues=route.length>0&&routeIndex+1<route.length;
 const patchDraft=p=>setDraft(v=>({...v,...p}));
 const history=<>{q?.history&&<div className={'history '+(replayStep>=0?'replaying':'')}><div className="history-steps">{q.history.map((h,i)=><span key={i} className={replayStep===i?'current':''}>{i>0&&<i>›</i>}{h}</span>)}</div><button className="plain-btn replay" onClick={replay} disabled={answered} aria-label="快速回放行动">回放</button></div>}{q?.condition&&<p className="condition"><span>前提</span>{q.condition}</p>}</>;
 function chooseSection(id){
  cancelTimers();
  setLearning(false);
  if(id==='postflop'){
   setLearning(false);setLearningRoute('golden');setPostflopMode('home');
   update({...DEFAULTS,module:'scenario',section:'postflop'});
   return;
  }
  setPostflopMode('practice');
  changeModule(MODULES.find(m=>m.section===id).id);
 }
 function openGuided(){cancelTimers();setPostflopMode('guided');setLearningRoute('golden');setLearning(true);}
 function openSpecializedHub(){cancelTimers();setLearning(false);setPostflopMode('specialized');}
 function openSpecializedPractice(item){cancelTimers();setPostflopMode('practice');setLearning(false);update({...DEFAULTS,module:item.module,section:'postflop',task:item.task||'all'});}
 function openPostflopHome(){cancelTimers();setLearning(false);setPostflopMode('home');}
 function openSuccessor(route){cancelTimers();if(route==='golden'||route==='t01'){setPostflopMode('guided');setLearningRoute(route);setLearning(true);return;}setPostflopMode('practice');setLearning(false);update({...DEFAULTS,module:'turn',section:'postflop',unit:route,task:'size'});}
 const showPostflopHome=!learning&&settings.section==='postflop'&&postflopMode==='home';
 const showSpecializedHub=!learning&&settings.section==='postflop'&&postflopMode==='specialized';
 const showPractice=!learning&&!showPostflopHome&&!showSpecializedHub;
 if(settings.section==='postflop')return <RangeTrainer onSection={chooseSection}/>;
 return <><GoldenPath active={learning} route={learningRoute} onSection={chooseSection} onLegacy={openSpecializedHub} onSuccessor={openSuccessor}/><div hidden={!showPostflopHome}><PostflopHome onSection={chooseSection} onGuided={openGuided} onSpecialized={openSpecializedHub}/></div><div hidden={!showSpecializedHub}><PostflopSpecialized onSection={chooseSection} onBack={openPostflopHome} onStart={openSpecializedPractice}/></div><div hidden={!showPractice} className="app-shell" style={{'--ui-scale':scale}}>
  <header className="app-header"><div className="brand"><strong>扑克练习器</strong></div><nav className="section-tabs" aria-label="训练阶段">{sections.map(([id,name])=><button key={id} className={settings.section===id?'active':''} onClick={()=>chooseSection(id)}>{name}</button>)}</nav><div className="header-actions"><div className="score-block"><small>{prettyModule(settings.module)} · 当前范围</small><div className="session-score" aria-live="polite" aria-label="当前练习成绩"><span className="score-right">{score.right} 对</span><span className="score-dot">·</span><span className="score-wrong">{score.wrong} 错</span></div></div><button className="icon-btn" onClick={openSettings} aria-label="打开练习设置"><GearSix size={22}/></button></div></header>
  <TableContext q={q}/>
  <main className={'trainer '+(pre?'preflop-trainer':'')+(wrong?' reviewing':'')}><div className="practice-toolbar">{settings.section==='postflop'&&<><span className="practice-mode-badge">专项训练</span><button className="primary" onClick={openPostflopHome}>训练选择</button><button className="plain-btn" onClick={openGuided}>连贯训练</button></>}<div className="module-tabs" role="group" aria-label="练习单元">{MODULES.filter(m=>m.section===settings.section).map(m=><button className={settings.module===m.id?'active':''} onClick={()=>changeModule(m.id)} key={m.id}>{m.label}</button>)}</div><div className="scope-bar">
   {pre&&<Select label={settings.module==='bb'?'对手位置':'位置'} value={settings.position} onChange={position=>update({position,size:'all',chart:'all'})} options={[allOption,...optionsOf(settings.module==='threebet'?['HJ','CO','BTN','SB']:['UTG','HJ','CO','BTN','SB'])]}/>}
   {settings.module==='bb'&&<Select label="开池" value={settings.size} onChange={size=>update({size,chart:'all'})} options={[allOption,...(settings.position==='all'?[2,2.25,2.5,3,3.5]:Object.keys(bbMap[settings.position])).map(x=>[String(x),x+' BB'])]}/>}
   {(strategy||['scenario','mixed'].includes(settings.module))&&<Select label="情境" value={settings.scenario} onChange={scenario=>update({scenario,unit:'all',task:'all'})} options={[allOption,...Object.entries(SCENARIOS).filter(([id])=>settings.module!=='scenario'||id!=='earlyBTN').map(([id,s])=>[id,s.name])]}/>}
   {(strategy||(reading&&!['ranking','branch'].includes(settings.module))||settings.module==='mixed')&&<Select label="翻牌类别" value={settings.category} onChange={category=>update({category,unit:'all',task:'all',readingType:'all'})} options={[allOption,...Object.entries(BOARD_NAMES)]}/>}
   {units.length>0&&<Select label="单元" value={settings.unit} onChange={unit=>update({unit,task:'all'})} options={[allOption,...units]}/>}
   {ranking&&<Select label="排序方向" value={settings.orderDirection||'ascending'} onChange={orderDirection=>update({orderDirection})} options={[['ascending','从弱到强'],['descending','从强到弱']]}/>}
   <button className="plain-btn settings-shortcut" onClick={openSettings}>练习设置</button>
  </div></div>
  {error?<section className="empty-state"><h2>当前设置没有可用题目</h2><p>{error}</p><button className="primary" onClick={openSettings}>调整设置</button><button className="plain-btn" onClick={()=>changeModule(settings.module)}>恢复默认设置</button></section>:q&&<section className={'exercise '+(wrong&&q.chart?'chart-review':'')+(wrong&&!q.chart?'general-review':'')} aria-label="当前练习">
   <div className="exercise-meta"><span>{q.route?`${q.route} · ${q.step}/${q.steps}`:prettyModule(settings.module)}</span>{q.kind==='preflop'&&q.position&&<span>{q.position}</span>}<span>{ranking?'九种标准牌型':pre?'100 BB':'6人现金桌 · 100 BB'}</span></div>
   {wrong&&q.chart?<div className="review-grid"><aside className="review-question"><span className="card-label">当前手牌 · {q.hand}</span><Cards cards={q.hole} small/><h1>{q.title}</h1><p>{q.subtitle}</p><p className="review-tags">{q.tags.join(' · ')}</p></aside><RangeMap chart={q.chart} hand={q.hand}/><Explanation q={q} selected={selected} onNext={next} routeContinues={routeContinues}/></div>:<>
    <div className="question-workspace"><div className="question-main">{history}
     {q.kind==='order'?<div className="ranking-progress"><p>已完成 {orderClicks.length} / 9 · {settings.orderDirection==='descending'?'强 → 弱':'弱 → 强'}</p><div className="ordered-list">{orderClicks.map((name,i)=><span key={name}><small>{i+1}</small>{name}</span>)}</div></div>:<Stimulus q={q} answered={answered} replayStep={replayStep}/>}
     <div className="decision"><div className="question-text">{q.kind!=='preflop'&&q.kind!=='scenario'&&<p>{q.subtitle}</p>}<h1>{q.title}</h1></div><div className={'answer-grid '+(q.options.length>=5?'many':'')+(q.kind==='order'?' ranking-options':'')}>{q.options.map((o,i)=><button key={o.id} disabled={answered||replayStep>=0||orderClicks.includes(o.id)} className={'answer-btn '+(orderClicks.includes(o.id)?'ordered':answered?(o.id===q.correct&&q.kind!=='order'?'correct':o.id===selected&&!correct?'incorrect':'muted'):'')} onClick={()=>answer(o.id)}><span>{o.label}</span><kbd>{i+1}</kbd></button>)}</div>
     {!answered&&<div className="answer-bottom"><p className="answer-hint">{q.kind==='order'?'按顺序逐个点击 · 完成整轮计 1 次':'数字键作答 · 答对自动下一题'}</p><button className="unknown-btn" onClick={()=>answer('__unknown__')} disabled={replayStep>=0}>我不知道<kbd>0</kbd></button></div>}
     {correct&&<div className="correct-toast" role="status">{q.kind==='order'?'排序正确':'答对了'} · 自动下一题</div>}
     </div>
    </div>{wrong&&<Explanation q={q} selected={selected} onNext={next} routeContinues={routeContinues}/>}</div>
   </>}
  </section>}
  <div className="trainer-footer"><span>{settings.section==='postflop'?'专项训练 · ':''}{prettyModule(settings.module)} · 当前筛选独立计分 · 刷新清空</span><button className="plain-btn" onClick={()=>{setScores(v=>({...v,[key]:{right:0,wrong:0}}));begin(settings);}}>重新开始本项</button><button className="plain-btn" onClick={()=>{cancelTimers();if(correct)next();setCoverage(true);}}>资料范围</button></div>
  </main>
  <dialog ref={dialog} onCancel={closeDialog} onClick={e=>{if(e.target===dialog.current)closeDialog();}}><div className="dialog-header"><h2>{coverage?'资料范围':'练习设置'}</h2><button className="icon-btn" aria-label="关闭" onClick={closeDialog}><X size={20}/></button></div>{coverage?<div className="coverage"><p>翻前使用15张最终简化图。翻后只开放资料明确的规则；读牌练习按标准牌型计算。</p>{coverageRows.map(node=><div className="coverage-row" key={node.id}><span>{node.id}</span><span>{node.title}<small>{node.source}</small></span><span className={node.available?'available':'unavailable'}>{node.available?`${node.authority==='conditional'?'条件':'课程'} · ${node.tasks.map(t=>TASK_NAMES[t]).join('、')}`:`未开放 · ${node.closedReason}`}</span></div>)}</div>:<div className="settings-content">
  {isPre(draft.module)&&<><Select label="抽样模式" value={draft.sampling} onChange={sampling=>patchDraft({sampling})} options={[['custom','自定义边缘比例'],['all','全范围 · 169类等权'],['edge','只练边缘牌']]}/>{draft.sampling==='custom'&&<label className="slider-label"><span>出题比例：边缘牌 {draft.edgeRatio}% · 非边缘牌 {100-draft.edgeRatio}%</span><input aria-label="边缘牌占比" type="range" min="0" max="100" step="5" value={draft.edgeRatio} onChange={e=>patchDraft({edgeRatio:Number(e.target.value)})}/></label>}{draft.sampling!=='all'&&<><p className="setting-caption">哪些牌算作边缘牌？</p><p className="setting-note">勾选定义边缘池，不分配比例；同一手牌命中多个类型也只计算一次。</p>{[['mixed','50%混合牌'],['boundary','范围边界内外的牌'],['changes','不同位置／尺度动作变化的牌']].map(([id,text])=><label className="check-label" key={id}><input type="checkbox" checked={draft[id]} onChange={e=>patchDraft({[id]:e.target.checked})}/>{text}</label>)}<p className="setting-note">边缘池为空会明确提示，不会自动改出其他题。{draft.sampling==='edge'?'当前只从边缘池抽题。':'其余题目从未命中所选类型的牌中抽取。'}</p></>}{draft.sampling==='all'&&<p className="setting-note">所有169类手牌等权抽取，不使用边缘比例或边缘类型设置。</p>}{draft.module==='bb'&&<Select label="简化图分组" value={draft.chart} onChange={chart=>patchDraft({chart,position:'all',size:'all'})} options={[allOption,...charts.filter(c=>c.group==='bb').map(c=>[c.name,c.name])]}/>}</>}
  {isStrategy(draft.module)&&<><Select label="练习任务" value={draft.task} onChange={task=>patchDraft({task})} options={[allOption,...relevantTasks.map(t=>[t,TASK_NAMES[t]])]}/><p className="setting-note">只考当前节点有明确依据的任务，不生成资料空缺部分。</p></>}
  {draft.section==='reading'&&readingTypes.length>0&&<Select label="针对性练习" value={draft.readingType} onChange={readingType=>patchDraft({readingType})} options={[allOption,...optionsOf(readingTypes)]}/>}
  {['straight','flush','made'].includes(draft.module)&&<Select label="街道" value={draft.street} onChange={street=>patchDraft({street,readingType:'all'})} options={[['all','翻牌'],['turn','转牌'],...(draft.module==='made'?[['river','河牌']]:[])]}/>}
  {draft.module==='ranking'&&<><Select label="排序方向" value={draft.orderDirection||'ascending'} onChange={orderDirection=>patchDraft({orderDirection})} options={[['ascending','从弱到强'],['descending','从强到弱']]}/><p className="setting-note">九种牌型随机排列。按顺序点击，每轮完整排序记一次对错；点错或不知道，展示完整顺序。</p></>}
  {draft.module==='mixed'&&<><p className="setting-caption">综合随机包含：</p>{[['mixPre','翻前范围'],['mixReading','读牌与摊牌'],['mixPost','翻后明确规则']].map(([id,text])=><label key={id} className="check-label"><input type="checkbox" checked={draft[id]} onChange={e=>patchDraft({[id]:e.target.checked})}/>{text}</label>)}</>}
  {draft.module==='sequence'&&<p className="setting-note">只连接资料明确的路线。答对自动继续，答错解析后按正确路线继续。</p>}
  {draft.module==='scenario'&&<p className="setting-note">根据行动经过判断情境。可以点回放重新观看。</p>}
  {draft.section==='reading'&&!readingTypes.length&&draft.module!=='ranking'&&<p className="setting-note">使用页面上的类别或单元筛选进行专项练习。</p>}
  {issue&&<p className="settings-error" role="alert">{issue}</p>}<div className="settings-bottom"><span>设置不保存。</span><button className="primary" disabled={!!issue} onClick={applySettings}>应用并练习</button></div>
  </div>}</dialog>
 </div></>;
}
createRoot(document.getElementById('root')).render(<App/>);
