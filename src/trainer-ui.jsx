import React from 'react';
import { Spade, Heart, Diamond, Club } from '@phosphor-icons/react';
import { SUIT_LABEL, rankLabel } from './poker.js';
import { actionLabel } from './preflop.js';
import {actionAtSeat} from './context.js';
import './evidence.css';

export function Cards({cards=[],small=false,highlights=[]}) {
  const suits={s:Spade,h:Heart,d:Diamond,c:Club};
  return <div className={'cards '+(small?'small':'')}>{cards.map((c,i)=>{const Suit=suits[c.suit];return <div key={c.id} className={'card '+(['h','d'].includes(c.suit)?'red ':'')+(highlights.includes(c.id)?'highlight':'')} style={{'--i':i}} aria-label={rankLabel(c.rank)+SUIT_LABEL[c.suit]}><div className="corner">{rankLabel(c.rank)}<Suit weight="fill" aria-hidden="true"/></div><Suit className="suit" weight="fill" aria-hidden="true"/></div>;})}</div>;
}

export function TableContext({q}) {
  if(!q||q.kind==='order')return null;
  const positions=['UTG','HJ','CO','BTN','SB','BB'];
  const hero=positions.includes(q.position)?q.position:null,opponent=positions.includes(q.opponent)?q.opponent:null;
  const history=q.history||[];
  function status(p) {
    if(q.kind==='preflop'&&q.group==='open'&&positions.indexOf(p)<positions.indexOf(hero))return '弃牌';
    if(q.kind==='preflop'&&p===opponent)return '开池';
    return actionAtSeat(history,p,hero,opponent);
  }
  return <aside className="table-context" aria-label="六人桌情境"><div className="seat-layout"><div className="table-center"><span>6 MAX</span><small>100 BB</small></div>{positions.map((p,i)=><div key={p} className={'seat seat-'+i+(p===hero?' hero':'')+(p===opponent?' opponent':'')+(status(p)==='弃牌'?' folded':'')}><strong>{p}{p==='BTN'&&<small className="dealer">D</small>}</strong><span>{p===hero?'你':p===opponent?'对手':status(p)||' '}</span>{(p===hero||p===opponent)&&status(p)&&<small>{status(p)}</small>}</div>)}</div><p>{hero?<><span className="hero-dot"/>你 · {hero}{opponent&&<>　<span className="opponent-dot"/>对手 · {opponent}</>}</>:'读牌练习 · 未指定座位'}</p></aside>;
}

export function RangeMap({chart,hand}) {
  const entry=chart.hands[hand];
  const actions=[...new Map(Object.values(chart.hands).map(h=>[actionLabel(h.action,chart.group),h.action])).keys()];
  return <div className="range-map"><div className="range-map-caption"><strong>{chart.name} · {hand}</strong><span>{actionLabel(entry.action,chart.group)}</span></div><div className="range-image"><img src={chart.image} alt={`${chart.name}原范围图，当前手牌${hand}`}/><div className="range-highlight" aria-label={`高亮 ${hand} 第${entry.row+1}行第${entry.col+1}列`} style={{left:`${entry.col/13*100}%`,top:`${entry.row/13*100}%`,width:`${100/13}%`,height:`${100/13}%`}}><span className="range-pointer"/></div></div><p className="range-note">双层光圈标出 {hand}，格子原色保持不变。</p><div className="range-legend">{actions.map(a=><span key={a}>{a}</span>)}</div></div>;
}

export function Stimulus({q,answered=false,replayStep=-1}) {
  return <div className={'card-stage '+(q.kind==='scenario'?'scenario-stage':'')+(q.leftBoard?' comparison-stage':'')}>
    {q.kind==='scenario'?<div className="scenario-prompt"><div className="player-chip">你 · {q.position}</div><p>{replayStep>=0?q.history[replayStep]:'根据行动经过，判断底池和位置。'}</p></div>:q.leftBoard?<div className="board-comparison"><div><span className="card-label">变化前</span><Cards cards={q.leftBoard}/><span className="card-label">底牌</span><Cards cards={q.leftHole} small/></div><span className="comparison-separator">›</span><div><span className="card-label">变化后</span><Cards cards={q.board}/><span className="card-label">底牌</span><Cards cards={q.hole} small/></div></div>:<>
    {q.board.length>0&&<div className="board-area"><span className="card-label">{q.board.length===3?'翻牌':q.board.length===4?'翻牌 · 转牌':'翻牌 · 转牌 · 河牌'}</span><Cards cards={q.board}/></div>}
    {(q.hole.length>0||q.opponentHole?.length>0)&&<div className="hands-area"><div><span className="card-label">{q.kind==='preflop'?'你的底牌':'你'+(q.position&&q.position!=='你'?' · '+q.position:'')}</span><Cards cards={q.hole} small={q.board.length>0} highlights={answered?q.best?.map(c=>c.id)||[]:[]}/></div>{q.opponentHole?.length>0&&<div><span className="card-label">对手</span><Cards cards={q.opponentHole} small highlights={answered?q.opponentBest?.map(c=>c.id)||[]:[]}/></div>}</div>}
    {q.kind==='preflop'&&<p className="preflop-context">{q.subtitle}</p>}
    {!q.hole.length&&q.kind==='strategy'&&<div className="range-prompt">本题不指定底牌，练习该节点的明确规则。</div>}
    </>}
  </div>;
}

const EVIDENCE_LABELS={fact_only:'确定性事实',experiment_only:'给定实验',course_only:'课程规则',matched:'GTO参考',conditional:'条件打法',closed:'资料未开放'};
function EvidencePanel({q}) {
  if(q.kind!=='strategy'||!q.evidenceKind)return null;
  const label=EVIDENCE_LABELS[q.evidenceKind]||q.evidenceKind;
  const range=q.rangeContract?.display==='range_change_closed_until_policy_compiled'?'动作后范围：尚未提供逐组合策略':q.rangeContract?.display||'动作后范围：按课包显示';
  const successor=q.successorContract?.status==='source_boundary'?'后继：到资料边界停止':q.successorContract?.nextNodeId?`后继：${q.successorContract.nextNodeId}`:'后继：当前段结束';
  return <section className={'evidence-panel evidence-'+q.evidenceKind} aria-label="本题证据身份"><div><span>依据身份</span><strong>{label}</strong></div><p>{q.evidenceKind==='matched'?'以下图表可作为匹配配置下的GTO参考。':q.evidenceKind==='conditional'?'本题只在页面前提成立时适用，不是无条件GTO。':q.evidenceKind==='closed'?'资料不足，本节点不开放策略判分。':'本题按课程资料或给定模型判分，不能称为GTO最优。'}</p><small>{range} · {successor}</small></section>;
}

export function Explanation({q,selected,onNext,routeContinues}) {
  return <aside className="feedback bad" aria-live="polite"><div className="feedback-title"><strong>{selected==='__unknown__'?'不知道 · 按错误计分':'答错了'}</strong></div><div className="answer-comparison"><span>你的答案</span><p>{selected==='__unknown__'?'我不知道':q.options.find(o=>o.id===selected)?.label}</p><span>正确答案</span><p className="correct-answer">{q.answer}</p></div><p className="explanation">{q.explanation}</p><EvidencePanel q={q}/>{q.best&&<div className="best-hand"><span>你的最佳五张</span><Cards cards={q.best} small/>{q.opponentBest&&<><span>对手的最佳五张</span><Cards cards={q.opponentBest} small/></>}</div>}{q.outCards?.length>0&&<div className="out-cards"><span>补牌</span><Cards cards={q.outCards} small/></div>}<small className="source-label">{q.source}</small>{routeContinues&&<p className="route-correction">接下来按资料中的正确路线继续。</p>}<button className="primary" onClick={onNext}>{routeContinues?'继续这条路线':'下一题'}<kbd>Enter</kbd></button></aside>;
}
