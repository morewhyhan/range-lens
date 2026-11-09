import React,{useEffect,useState} from 'react';
import {Cards} from './trainer-ui.jsx';
import {card} from './poker.js';
import {splitHand,labelAction,mixFor} from './postflop-model.js';
const pct=x=>`${(x*100).toFixed(1)}%`;
export function ComboInspector({row,node,side,hero,hand,reveal}){
 const blocked=splitHand(row.hand).some(c=>node.board.includes(c)||(side!==hero&&splitHand(hand).includes(c)));
 const [expanded,setExpanded]=useState(false),[equity,setEquity]=useState(null),[error,setError]=useState('');
 useEffect(()=>{
  if(!expanded||side===hero||row.weight<=0)return;
  const worker=new Worker(new URL('./range-equity.worker.js',import.meta.url),{type:'module'});setEquity(null);setError('');
  worker.onmessage=e=>{if(e.data.error)setError(e.data.error);else setEquity(e.data.result);};worker.onerror=()=>setError('该组合暂时无法计算');
  worker.postMessage({board:node.board,hero:hand,opponent:row.hand});return()=>worker.terminate();
 },[expanded,node,side,hero,hand,row.hand,row.weight]);
 return <div className={`pf-combo-item ${blocked?'pf-combo-blocked':''}`}><Cards cards={splitHand(row.hand).map(card)} small/><span>{blocked?'牌张冲突，不能出现':`当前权重 ${row.weight.toFixed(4)}`}</span>{!blocked&&reveal&&node.actor===side&&mixFor(node,side,row.index).map(p=><small key={p.action}>{labelAction(p.action)} {pct(p.frequency)} · EV {p.ev.toFixed(3)} BB</small>)}
 {side!==hero&&row.weight>0&&<button onClick={()=>setExpanded(!expanded)}>{expanded?'收起后续结果':'假设对手拿这组牌，看后续结果'}</button>}
 {expanded&&<section className="pf-equity-detail">{error?<p>{error}</p>:!equity?<p>枚举合法公共牌中…</p>:<><strong>若发完余牌，不再弃牌</strong><div className="pf-equity-bar"><i style={{width:pct(equity.wins/equity.total),background:'#6a98a3'}}/><i style={{width:pct(equity.ties/equity.total),background:'#a4acb8'}}/><i style={{width:pct(equity.losses/equity.total),background:'#b49a77'}}/></div><p>你赢 {pct(equity.wins/equity.total)}　平分 {pct(equity.ties/equity.total)}　对手赢 {pct(equity.losses/equity.total)}</p><small>枚举 {equity.total} 种合法发牌结果；这是这两组具体底牌的摊牌权益，不含后续下注与弃牌，不是动作EV。</small></>}</section>}
 </div>;
}
