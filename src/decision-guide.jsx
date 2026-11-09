import React,{useMemo} from 'react';
import {Cards} from './trainer-ui.jsx';
import {card} from './poker.js';
import {splitHand,labelAction,classOf} from './postflop-model.js';
import {guideDistribution,exampleHoldings,compareActions} from './decision-guide.js';
const pct=x=>`${(100*x).toFixed(1)}%`;
const names={weaker:'我目前能赢的牌',stronger:'目前能赢我的牌',tie:'目前打平的牌',pay:'较弱但会继续的牌',risk:'较强且会继续的牌',tieContinue:'打平但会继续的牌',fold:'较强但会弃掉的牌',allFold:'会弃掉的牌'};
export function DecisionGuide({step,onStep,study,evidence,lens,onLens,chosen,node,child,reply,onReply,mix,onAction,onPractice,tolerance}){
 const dist=useMemo(()=>guideDistribution(evidence,step===2?reply:null),[evidence,step,reply]);
 const selected=Object.hasOwn(names,lens)?lens:'all';
 const examples=useMemo(()=>exampleHoldings(dist,selected),[dist,selected]);
 const actions=compareActions(mix,tolerance);
 return <section className="pf-guide" aria-label="看图做决定">
 <div className="pf-guide-nav">{['看我在和谁打','比较我的选择','收起提示，自己打'].map((title,i)=><button key={title} className={step===i+1?'active':''} aria-current={step===i+1?'step':undefined} onClick={()=>onStep(i+1)}><b>{i+1}</b>{title}</button>)}</div>
 {step===1?<><p className="pf-guide-question">左图圈出你这手牌；右图里，哪些牌现在赢你？点一组，看图与具体底牌一起变化。</p><div className="pf-guide-groups">{dist.groups.map(g=><button key={g.kind} data-relation={g.kind} className={lens===g.kind?'active':''} disabled={!g.frequency} onClick={()=>onLens(lens===g.kind?'all':g.kind)}><i className={g.kind}/>{names[g.kind]} <b>{pct(g.frequency)}</b></button>)}<button onClick={()=>onLens('all')}>看完整范围</button></div></>:step===2?<><p className="pf-guide-question">点一个动作，右图预览对手怎样回应；再换另一个动作，比较范围和长期平均收益。</p><div className="pf-guide-actions">{actions.map(p=><button key={p.index} data-action={p.index} className={chosen===p.index?'active':''} onClick={()=>onAction(p.index)}><span>{labelAction(p.action)}</span><b>{p.ev.toFixed(3)} BB</b><small>{p.nearBest?'接近本节点最高收益':`比最高少 ${p.loss.toFixed(3)} BB`}</small></button>)}</div>
 {chosen!==null&&<div className="pf-guide-responses"><span>假如你{labelAction(node.actions[chosen])} →</span>{child?child.actions.map((a,i)=>{const mass=evidence.rows.reduce((s,r)=>s+r.weight*(r.policy[i]?.frequency||0),0);return <button key={a} className={reply===i?'active':''} onClick={()=>onReply(reply===i?null:i)} disabled={!mass}>对手{labelAction(a)} {pct(evidence.total?mass/evidence.total:0)}</button>;}):<small>{node.actions[chosen]==='Fold'?'你弃牌，这手牌结束。':'读取后继中，或此动作直接进入发牌／终局。'}</small>}{reply!==null&&<button onClick={()=>onReply(null)}>回到回应前</button>}{mix[chosen]?.frequency<=1e-8&&<small>参考策略不会让你这手牌进入该分支；回应仅供观察整体策略，不能据此继续这手牌。</small>}</div>}
 {child&&evidence.canFaceBet&&reply===null&&<div className="pf-guide-outcomes"><span>占回应前范围</span>{evidence.responses.map(r=><button key={r.kind} disabled={!r.frequency} className={lens===(r.kind==='weaker'?'pay':r.kind==='stronger'?'risk':r.kind==='fold'?'allFold':'tieContinue')?'active':''} onClick={()=>onLens(r.kind==='weaker'?'pay':r.kind==='stronger'?'risk':r.kind==='fold'?'allFold':'tieContinue')}>{r.label} {pct(r.frequency)}</button>)}<button onClick={()=>onLens('all')}>看全部</button></div>}
 </>:<><p className="pf-guide-question">先想：我能赢谁？对手怎样回应？再在下方选动作。答后可回到第1、2步核对。</p>{study&&<button className="pf-guide-practice" onClick={onPractice}>换一手，独立作答</button>}</>}
 {step!==3&&<div className="pf-guide-examples"><span>{reply!==null&&step===2?'这个回应后':'当前'}{selected==='all'?'对手可能有的牌':names[selected]}<small>举例，不是对手真实底牌</small></span>{examples.map(r=><button key={r.hand} onClick={()=>onLens(r.kind)} title={classOf(r.hand)+' · '+names[r.kind]}><Cards cards={splitHand(r.hand).map(card)} small/><small>{r.kind==='weaker'?'目前输给你':r.kind==='stronger'?'目前赢你':'目前打平'}</small></button>)}{!examples.length&&<small>这个分支没有相容组合。</small>}</div>}
 <div className="pf-guide-footer"><small>{step===1?'目前领先不代表最后一定赢。':step===2?'这是预览，牌局尚未执行。收益包含后续策略，不等于本手一定赢钱；仅比较当前求解树内动作。':'实战时用这些问题思考，图表在答后帮助复盘。'}</small>{step===1&&<button onClick={()=>onStep(2)}>接着看：我该怎么选 →</button>}{step===2&&<button onClick={onPractice}>换一手，试着自己选 →</button>}</div>
 </section>;
}
