import React,{useEffect,useState} from 'react';
import {charts,bbMap} from './preflop.js';
import {RANKS} from './postflop-model.js';
import {Cards} from './trainer-ui.jsx';
import {card} from './poker.js';
const classes=RANKS.flatMap((r,i)=>RANKS.map((c,j)=>i===j?r+c:i<j?r+c+'s':c+r+'o'));
const empty=()=>Object.fromEntries(classes.map(h=>[h,0]));
const pre=['UTG','HJ','CO','BTN','SB','BB'],post=['SB','BB','UTG','HJ','CO','BTN'];
const spots=pre.flatMap((opener,i)=>pre.slice(i+1).map(bettor=>{const hero=post.indexOf(bettor)<post.indexOf(opener)?0:1;return {id:opener+'-'+bettor,opener,bettor,hero,seats:hero?[opener,bettor]:[bettor,opener],scene:hero?'3bet-ip':'3bet-oop'};}));
const seed=(scene,spot=spots.find(s=>s.id===(scene==='3bet-ip'?'CO-BTN':'BTN-SB')),open=2.5)=>{const c=spot.bettor==='BB'?charts.find(c=>c.group==='bb'&&c.name===bbMap[spot.opener]?.[open]):charts.find(c=>c.group==='threebet'&&c.name===spot.bettor);return Object.fromEntries(classes.map(h=>[h,c?.hands[h]?.action.raise||0]));};
async function call(method,input){if(window.pokerSolver)return window.pokerSolver[method](input);const r=await fetch('/__solver',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method,input})});const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}
export default function ThreebetSetup({scene,onReady,onClose}){
 const [spotId,setSpotId]=useState(scene==='3bet-ip'?'CO-BTN':'BTN-SB'),[openSize,setOpenSize]=useState(2.5),[positions,setPositions]=useState(false);const spot=spots.find(s=>s.id===spotId),hero=spot.hero,caller=hero^1,seats=spot.seats;
 const [ranges,setRanges]=useState(()=>hero===1?[empty(),seed(scene,spot,openSize)]:[seed(scene,spot,openSize),empty()]);
 const [side,setSide]=useState(caller),[size,setSize]=useState(scene==='3bet-ip'?8:11),[status,setStatus]=useState({state:'idle'}),[error,setError]=useState('');
 const working=['solving','verifying'].includes(status.state);
 useEffect(()=>{const panel=document.querySelector('.pf-threebet-dialog'),previous=document.activeElement;const items=()=>[...panel.querySelectorAll('button:not(:disabled),input:not(:disabled)')];items()[0]?.focus();const trap=e=>{if(e.key!=='Tab')return;const list=items(),first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}};document.addEventListener('keydown',trap);return()=>{document.removeEventListener('keydown',trap);previous?.focus();};},[]);
 useEffect(()=>{if(!working)return;let live=true;let pending=false;const timer=setInterval(async()=>{if(pending)return;pending=true;try{const s=await call('status');if(live){setStatus(s);if(s.state==='ready')onReady(scene,hero);}}catch(e){if(live)setError(e.message);}finally{pending=false;}},1000);return()=>{live=false;clearInterval(timer);};},[working,scene,hero,onReady]);
 async function solve(){setError('');try{setStatus(await call('solve',{scene,size,spot:spotId,openSize,randomBoard:true,oop:ranges[0],ip:ranges[1]}));}catch(e){setError(e.message);}}
 async function close(){try{if(working)await call('cancel');onClose();}catch(e){setError(e.message);}}
 useEffect(()=>{const escape=e=>{if(e.key==='Escape'){e.preventDefault();void close();}};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[working]);
 const count=weights=>Object.entries(weights).reduce((s,[h,v])=>s+v*(h.length===2?6:h.endsWith('s')?4:12),0);
 return <div className="pf-overlay" onClick={close}><section className="pf-dialog pf-threebet-dialog" role="dialog" aria-modal="true" aria-label="配置3bet求解" onClick={e=>e.stopPropagation()}><header><h2>{hero===1?'有位置':'没位置'} · 3bet</h2><button className="pf-icon" onClick={close} aria-label="关闭3bet配置">×</button></header>
 <p>确定双方范围，自动抽取合法翻牌并独立求解三街策略。</p>
 <div className="pf-input-boundary">原资料缺少面对3bet的跟注图，请明确设置跟注方。有对应原图时预填3bet方，可编辑。结果仅适用于给定范围，不证明翻前范围为GTO。</div>
 <button className="pf-generator-advanced" disabled={working} onClick={()=>setPositions(!positions)}>{positions?'收起位置设置':'指定其他位置与开池尺度'}</button>
 {positions&&<div className="pf-threebet-positions"><label>位置<select aria-label="3bet位置组合" disabled={working} value={spotId} onChange={e=>{const next=spots.find(s=>s.id===e.target.value);setSpotId(next.id);setSide(next.hero^1);setRanges(next.hero?[empty(),seed(scene,next,openSize)]:[seed(scene,next,openSize),empty()]);}}>{spots.filter(s=>s.scene===scene).map(s=><option value={s.id} key={s.id}>{s.opener} 开池 → {s.bettor} 3bet</option>)}</select></label><label>开池BB<input aria-label="开池总额" type="number" min="2" max="50" step=".5" value={openSize} disabled={working} onChange={e=>setOpenSize(Number(e.target.value))}/></label><small>切换位置会清空并重填对应范围；跟注方仍须明确配置。</small></div>}
 <label className="pf-threebet-size">{spot.opener} 开池{openSize}BB，{spot.bettor} 3bet至<input aria-label="3bet总额" type="number" min={2*openSize-1} max="99.99" step=".5" value={size} disabled={working} onChange={e=>setSize(Number(e.target.value))}/>BB，开池者跟注</label>
 <div className="pf-threebet-tabs">{seats.map((seat,i)=><button key={seat} disabled={working} className={side===i?'active':''} onClick={()=>setSide(i)}>{seat} · {i===hero?'3bet':'跟注'} <small>{count(ranges[i]).toFixed(1)}组合</small></button>)}</div>
 <div className="pf-start-grid pf-edit-grid" aria-label={seats[side]+'范围编辑'}>{classes.map(h=><button disabled={working} key={h} data-hand={h} aria-label={`${h} ${ranges[side][h]*100}%`} style={{background:ranges[side][h]===1?'#91a9c7':ranges[side][h]===.5?'#d1dcea':'#eef0f3'}} onClick={()=>setRanges(old=>old.map((r,i)=>i===side?{...r,[h]:r[h]===0?.5:r[h]===.5?1:0}:r))}>{h}</button>)}</div>
 <div className="pf-threebet-edit-tools"><span>点击轮换：空格0% → 浅色50% → 深色100%</span><button disabled={working} onClick={()=>setRanges(old=>old.map((r,i)=>i===side?empty():r))}>清空这方</button>{side===hero&&<button disabled={working} onClick={()=>setRanges(old=>old.map((r,i)=>i===side?seed(scene,spot,openSize):r))}>恢复原3bet图</button>}</div>
 {working?<div className="pf-solve-progress" role="status">{status.board&&<Cards cards={status.board.map(card)} small/>}<strong>{status.state==='verifying'?'核验求解结果…':'求解三街策略中…'}</strong><p>迭代 {status.iterations} 次{status.errorBB!==null&&` · 当前可利用度 ${status.errorBB.toFixed(5)} BB`} · 目标 {status.targetBB?.toFixed(5)} BB</p><small>所需时间取决于范围大小与电脑；结果仅在本次运行有效。</small><button onClick={async()=>setStatus(await call('cancel'))}>取消求解</button></div>:<button className="pf-primary pf-solve-start" disabled={!count(ranges[0])||!count(ranges[1])} onClick={solve}>用这两个范围求解并练习</button>}
 {(error||status.error)&&<p className="pf-error" role="alert">{error||status.error}</p>}
 <small>100BB起始；零抽水；翻牌33%、转河75%；面对下注可弃牌、跟注或全下加注。尺度与跟注范围是本次模型输入。关闭应用后清除。</small>
 </section></div>;
}
