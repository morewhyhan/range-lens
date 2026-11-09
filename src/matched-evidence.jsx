import React, { useState } from 'react';
import { ArrowRight, Check, ShieldCheck, X } from '@phosphor-icons/react';
import { Cards } from './trainer-ui.jsx';
import { MATCHED_LAYERS, createMatchedEvidenceView, formatMatchedNumber } from './matched-evidence.js';
import tinyPackage from '../research/nevir-system/tiny-river-matched-package-v1.json';
import './evidence-curriculum.css';

function RangeOwner({ range, title }) {
  return <div className="matched-range-owner">
    <span className="matched-owner-label">{title}</span>
    <div className="matched-range-grid">
      {range.entries.map(entry => <div className="matched-combo" key={entry.hole.join(',')}>
        <Cards cards={entry.cards} small />
        <span>{entry.weight}</span>
      </div>)}
    </div>
  </div>;
}

function PolicyLayer({ view }) {
  return <div className="matched-layer-body">
    <p className="matched-lead">先看这个节点每个动作的总体频率，再回到具体组合。频率由逐组合权重和策略重新计算。</p>
    <div className="matched-policy-bars">{view.actions.map(action => <div className="matched-policy-row" key={action.id}>
      <span>{action.label}</span><div><i style={{ width: `${action.frequency * 100}%` }} /></div><strong>{action.frequencyLabel}</strong>
      <small>加权 EV {formatMatchedNumber(action.weightedEV)}</small>
    </div>)}</div>
    <div className="matched-combo-policy">
      <span className="matched-owner-label">逐组合策略 · 行动者 {view.actor}</span>
      {view.policyRows.map(row => <div className="matched-policy-combo" key={row.id}>
        <Cards cards={row.cards} small /><span>{row.weight} 权重</span>
        {view.actions.map(action => <em key={action.id}>{action.label} {Math.round(row.mix[action.id] * 100)}%</em>)}
      </div>)}
    </div>
  </div>;
}

function RangeLayer({ view, after }) {
  const ranges = after ? view.rangeAfter : view.rangeBefore;
  return <div className="matched-layer-body">
    <p className="matched-lead">{after ? `${view.selectedActionLabel}之后的到达权重；同一物理组合分母保持不变。` : '动作前的给定范围，作为动作后变化的基准。'}</p>
    <div className="matched-range-owners">{ranges.map(range => <RangeOwner key={range.owner} range={range} title={range.owner === 0 ? 'OOP · 行动者' : 'IP · 对手'} />)}</div>
  </div>;
}

function DeltaLayer({ view }) {
  return <div className="matched-layer-body">
    <p className="matched-lead">把一个动作拆回到具体组合，直接看到哪些牌留下、哪些牌被移除，以及该组合的 EV。</p>
    <div className="matched-delta-table">
      <div className="matched-delta-head"><span>组合</span><span>动作频率</span><span>EV</span><span>动作后权重</span></div>
      {view.policyRows.map(row => {
        const afterWeight = view.rangeAfter[0]?.entries.find(entry => entry.hole.join(',') === row.hole.join(','))?.weight ?? 0;
        return <div className="matched-delta-row" key={row.id}><Cards cards={row.cards} small/><span>{Math.round(row.mix[view.selectedAction] * 100)}%</span><span>{formatMatchedNumber(row.ev[view.selectedAction])}</span><span>{afterWeight}</span></div>;
      })}
    </div>
    {view.differences.length === 0 && <small className="matched-muted">该校准包没有额外的差异注释；差异由上面的逐组合数据直接计算。</small>}
  </div>;
}

function SuccessorLayer({ view }) {
  return <div className="matched-layer-body">
    <p className="matched-lead">动作不是孤立答案。每个动作都必须指向真实后继节点或明确停止点。</p>
    <div className="matched-successors">{view.successor.map(edge => <div key={edge.action} className={edge.action === view.selectedAction ? 'current' : ''}><span>{edge.label}</span><ArrowRight size={16}/><strong>{edge.nextNodeId || '终止'}</strong></div>)}</div>
  </div>;
}

export function MatchedEvidencePanel({ packageData = tinyPackage, nodeId = 'calibration-river-K7329-root', onClose }) {
  const initial = createMatchedEvidenceView(packageData, nodeId);
  const [layer, setLayer] = useState('policy');
  const [action, setAction] = useState(initial.selectedAction);
  const view = createMatchedEvidenceView(packageData, nodeId, action);
  const layerBody = layer === 'policy' ? <PolicyLayer view={view} />
    : layer === 'reach_before' ? <RangeLayer view={view} after={false} />
      : layer === 'reach_after' ? <RangeLayer view={view} after />
        : layer === 'delta' ? <DeltaLayer view={view} />
          : <SuccessorLayer view={view} />;
  return <section className="matched-evidence-panel" aria-label="匹配GTO证据图表">
    <header className="matched-evidence-header">
      <div><span className="matched-kicker"><ShieldCheck size={15}/> MATCHED · 作者侧校准</span><h2>从动作到范围的完整证据链</h2><p>{view.scope}</p></div>
      {onClose && <button className="icon-btn" aria-label="关闭GTO参考图表" onClick={onClose}><X size={19}/></button>}
    </header>
    <div className="matched-config">
      <div><span>公共牌</span><Cards cards={view.config.boardCards} small /></div>
      <dl><div><dt>行动者</dt><dd>{view.actor}</dd></div><div><dt>有效后手</dt><dd>{view.config.stackBb} BB</dd></div><div><dt>底池</dt><dd>{view.config.potBb} BB</dd></div></dl>
    </div>
    <div className="matched-action-select"><label>选择要追踪的动作<select value={action} onChange={e => setAction(e.target.value)}>{view.actions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><small>配置指纹：{view.config.configFingerprint}</small></div>
    <nav className="matched-layer-tabs" aria-label="GTO图表层">{MATCHED_LAYERS.map(([id, label]) => <button key={id} className={layer === id ? 'active' : ''} onClick={() => setLayer(id)}><span>{label}</span>{view.layers.find(item => item.id === id)?.available && <Check size={13}/>}</button>)}</nav>
    {layerBody}
    <footer className="matched-evidence-footer"><span>求解器：{view.solver.name} · {view.solver.commit.slice(0, 8)}</span><span>独立校验：{view.independentValidation?.allActiveStrategiesBestResponse ? '通过最佳响应检查' : '未通过'}</span></footer>
  </section>;
}

