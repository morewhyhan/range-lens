import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowCounterClockwise, Check, Info, Sparkle } from '@phosphor-icons/react';
import { Cards } from './trainer-ui.jsx';
import {
  GOLDEN_BOARD,
  GOLDEN_CHART,
  GOLDEN_FRAMES,
  GOLDEN_HAND,
  GOLDEN_HOLE,
  GOLDEN_TURN_BOARD,
  GOLDEN_ROUTE,
  GOLDEN_TABLE,
  GOLDEN_SUCCESSOR,
  ROUTE_FRAMES,
  HAND_RANK_ORDER,
  advanceGoldenAfterError,
  answerGolden,
  clearGoldenResult,
  createGoldenSession,
  currentGoldenFrame,
  openGoldenChild,
  closeGoldenChild,
  selectGoldenChild,
} from './golden-path.js';
import './golden-path.css';

const EVIDENCE_LABEL = {
  fact_only: '确定性事实',
  course_only: '课程规则',
  closed: '资料边界',
};

const SEATS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

function SeatTable({ actor = GOLDEN_TABLE.actor }) {
  return <div className="golden-table" aria-label="六人现金桌 100BB">
    <div className="golden-table-core"><strong>6 MAX</strong><span>100 BB</span><small>行动：{actor}</small></div>
    {SEATS.map((seat, index) => <div key={seat} className={`golden-seat golden-seat-${index} ${seat === 'BTN' ? 'hero' : ''} ${seat === actor ? 'actor' : ''} ${seat === 'CO' ? 'villain' : ''}`}>
      <strong>{seat}</strong><span>{seat === 'BTN' ? '你' : seat === 'CO' ? '对手' : '已弃牌'}</span>
      {seat === actor && <i>轮到这里</i>}
    </div>)}
  </div>;
}

function HistoryStrip({ after = false }) {
  const history = after ? [...GOLDEN_TABLE.history, 'BTN 下注 6BB', 'CO 跟注'] : GOLDEN_TABLE.history;
  return <div className="golden-history" aria-label="行动历史">{history.map((line, index) => <span key={`${line}-${index}`}><b>{index + 1}</b>{line}</span>)}</div>;
}

function GoldenChart({ onSelect, selected = false }) {
  const entry = GOLDEN_CHART.hands[GOLDEN_HAND];
  return <div className="golden-chart-wrap">
    <div className="golden-chart-heading"><span>{GOLDEN_CHART.name} · 3bet防守</span><small>当前手牌 AKo</small></div>
    <div className="golden-chart-image">
      <img src={GOLDEN_CHART.image} alt="BTN 3bet 防守范围图" />
      <button
        type="button"
        className={`golden-chart-target ${selected ? 'selected' : ''}`}
        style={{ left: `${entry.col / 13 * 100}%`, top: `${entry.row / 13 * 100}%`, width: `${100 / 13}%`, height: `${100 / 13}%` }}
        onClick={onSelect}
        disabled={!onSelect}
        aria-label="选择 AKo 格子"
      ><span>AKo</span></button>
    </div>
    <div className="golden-chart-caption"><span>先看坐标，再看颜色。</span><small>第 {entry.row + 1} 行 · 第 {entry.col + 1} 列</small></div>
  </div>;
}

function EvidencePill({ kind }) {
  return <span className={`golden-evidence evidence-${kind}`}><i />{EVIDENCE_LABEL[kind] || kind}</span>;
}

function MoneyLedger({ after = false }) {
  return <div className="golden-ledger">
    <div><span>底池</span><strong>{after ? '24' : '18'}<small>BB</small></strong></div>
    <b>→</b>
    <div><span>你投入</span><strong>{after ? '6' : '0'}<small>BB</small></strong></div>
    <b>→</b>
    <div><span>你后手</span><strong>{after ? '94' : '100'}<small>BB</small></strong></div>
    <p>{after ? '下注 6BB 后，行动回到 CO。' : '当前没有待补金额。'}</p>
  </div>;
}

function RouteMap({ compact = false }) {
  const labels = ['定位', '行动线', '翻前图', '动作', '范围桥', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', '迁移'];
  return <div className={`golden-route-map ${compact ? 'compact' : ''}`} aria-label="首遍双层路线">
    <div className="route-map-line" />
    {labels.map((label, index) => <span key={label} className={index < 5 ? 'outer' : index === 12 ? 'transfer' : 'inner'}><b>{index + 1}</b>{label}</span>)}
  </div>;
}

function Scene({ frame, onChartSelect, child }) {
  if (child) return <ChildExercise />;
  if (frame.kind === 'table') return <><SeatTable /><div className="golden-scene-note">先只记住：6人、100BB、这一次沿固定路线走。</div></>;
  if (frame.kind === 'turn') return <div className="golden-hand-scene"><div><span className="golden-label">转牌公共牌</span><Cards cards={frame.board || GOLDEN_TURN_BOARD} /></div><div><span className="golden-label">你的底牌</span><Cards cards={frame.hole || GOLDEN_HOLE} small /></div><div className="best-five"><span className="golden-label">前序</span><strong>翻牌 B33 被跟<br />转牌对手过牌</strong></div></div>;
  if (frame.kind === 'context') return <><SeatTable actor={GOLDEN_TABLE.actor} /><HistoryStrip after={frame.id === 'G10_p6_update'} /><MoneyLedger after={frame.id === 'G10_p6_update'} /></>;
  if (frame.kind === 'chart' || frame.kind === 'action') return <><GoldenChart onSelect={onChartSelect} selected={frame.id === 'G3_preflop_action'} /><div className="golden-action-legend"><span className="raise">3bet · 100%</span><span className="fold">弃牌 · 0%</span><span>只读当前格</span></div></>;
  if (frame.id === 'G4_range_bridge' || frame.id === 'G7_p3_range') return <><GoldenChart onSelect={onChartSelect} selected={false} /><div className="golden-range-bridge"><div><strong>动作前</strong><span>AKo · 课程图表</span></div><div className="bridge-arrow">→</div><div className="removed"><strong>已知牌过滤</strong><span>AhKc 从对手候选中移除</span></div><div className="closed"><EvidencePill kind="closed" /><span>动作后逐组合权重：未提供</span></div></div></>;
  if (frame.kind === 'hand') return <div className="golden-hand-scene"><div><span className="golden-label">公共牌 · 翻牌</span><Cards cards={GOLDEN_BOARD} /></div><div><span className="golden-label">你的底牌</span><Cards cards={GOLDEN_HOLE} small /></div><div className="best-five"><span className="golden-label">最佳五张</span><div className="best-five-cards"><Cards cards={[GOLDEN_BOARD[0], GOLDEN_HOLE[1], GOLDEN_HOLE[0], GOLDEN_BOARD[1], GOLDEN_BOARD[2]]} small /></div><strong>一对K · A踢脚</strong></div></div>;
  if (frame.kind === 'policy') return <div className="golden-policy-card"><EvidencePill kind={frame.evidenceKind || 'course_only'} /><strong>{frame.policyTitle || '课程路线：小注'}</strong><div className="policy-size">{frame.policySize ?? 33}<small>% pot</small></div><p>{frame.explanation}</p><span className="policy-warning"><Info size={16} />没有逐组合求解器频率，不能称为精确 GTO。</span></div>;
  if (frame.kind === 'hand-task') return <div className="golden-policy-card"><EvidencePill kind="course_only" /><strong>手牌任务分层</strong><div className="golden-task-pairs"><span>AA · 强价值候选</span><span>QQ · 中等摊牌，不自动第二枪</span></div><p>{frame.explanation}</p></div>;
  if (frame.kind === 'money') return <div className="golden-money-scene"><MoneyLedger after /><div className="action-chain"><span className="selected">下注 6BB</span><span>→ CO行动</span></div></div>;
  if (frame.kind === 'update') return <div className="golden-update-card"><div className="update-before"><span>动作前</span><Cards cards={GOLDEN_BOARD} small /><small>翻牌 · CO跟注</small></div><ArrowRight size={24} /><div className="update-after"><span>只改变</span><Cards cards={GOLDEN_TURN_BOARD} small /><small>转牌 2♦ · 进入 {GOLDEN_SUCCESSOR.nextNodeId}</small></div><div className="closed-note"><EvidencePill kind="closed" /> 动作后逐组合范围仍不开放</div></div>;
  if (frame.kind === 'close') return <div className="golden-close-card"><div className="stop-icon">∥</div><strong>{frame.id === 'T01_3_boundary' ? '在资料边界收束' : '在教学段边界收束'}</strong><p>{frame.id === 'T01_3_boundary' ? '保留已确认的转牌课程动作；逐组合频率和后继响应未提供，停止在这里。' : '保留已确认的牌、钱、行动和课程动作；下一段从 T01 转牌节点继续。'}</p><div className="decision-result"><span>决策依据</span><b>{frame.id === 'T01_3_boundary' ? 'T01 节点登记' : 'T01 前序合同'}</b><span>下一段</span><b>{frame.id === 'T01_3_boundary' ? '返回首遍或选择其他已开放节点' : 'T01 · 75%课程动作'}</b></div></div>;
  if (frame.kind === 'recall') return <div className="golden-recall"><RouteMap /><p>外层先定位，内层按 p1 → p7；只改变一个变量时回到对应父层。</p></div>;
  return null;
}

function ChildExercise() {
  const [selected, setSelected] = useState([]);
  const next = HAND_RANK_ORDER[selected.length];
  return <div className="golden-child" aria-label="牌力顺序短练">
    <div className="child-header"><span>嵌套短练 · 牌力顺序</span><small>完成后回到当前牌面</small></div>
    <h2>{next ? `下一种更大的牌型是？（第 ${selected.length + 1} 个）` : '牌力顺序完成'}</h2>
    <div className="child-ranks">{HAND_RANK_ORDER.map((rank, index) => <button type="button" key={rank} className={selected.includes(rank) ? 'picked' : ''} onClick={() => index === selected.length && setSelected([...selected, rank])} disabled={index !== selected.length && !selected.includes(rank)}>{index + 1}. {rank}</button>)}</div>
    <p>从高牌开始，依次点到同花顺；这是牌力事实短练，不混入下注答案。</p>
    {selected.length === HAND_RANK_ORDER.length && <button type="button" className="golden-secondary" onClick={() => setSelected([])}><ArrowCounterClockwise size={16} />再练一遍</button>}
  </div>;
}

function AnswerPanel({ frame, session, onAnswer, onUnknown, onContinueError, onSuccessor }) {
  const wrong = session.lastResult && !session.lastResult.correct;
  if (wrong) return <section className="golden-feedback negative" aria-live="polite">
    <span>这次答错了{session.lastResult.answer === '__unknown__' ? ' · 我不知道按错误计分' : ''}</span>
    <h2>正确答案：{frame.options.find(option => option.id === frame.answer)?.label || frame.answer}</h2>
    <p>{frame.explanation}</p>
    <button type="button" className="golden-primary" onClick={onContinueError}>看懂了，继续 <ArrowRight size={17} /></button>
  </section>;
  if (session.status === 'complete') return <section className="golden-feedback positive" aria-live="polite"><Check size={24} /><div><strong>{session.route === 't01' ? 'T01 转牌段完成' : '首遍路线完成'}</strong><p>本次只记录当前会话成绩，刷新或退出后清空。</p><button type="button" className="golden-primary" onClick={() => onSuccessor(session.route === 't01' ? 'golden' : 't01')}>{session.route === 't01' ? '返回首遍路线' : '进入 T01 转牌练习'} <ArrowRight size={17} /></button></div></section>;
  return <div className="golden-answers"><div className="golden-options">{frame.options.map((option, index) => <button type="button" key={option.id} className="golden-option" onClick={() => onAnswer(option.id)}><span>{option.label}</span><kbd>{index + 1}</kbd></button>)}</div><div className="golden-answer-bottom"><span>一次只回答当前问题</span><button type="button" className="golden-unknown" onClick={onUnknown}>我不知道 <kbd>0</kbd></button></div></div>;
}

export default function GoldenPath({ active, route = 'golden', onSection, onLegacy, onSuccessor }) {
  const [session, setSession] = useState(() => createGoldenSession(route));
  const [showSource, setShowSource] = useState(false);
  const frame = currentGoldenFrame(session);
  const frameNumber = Math.min(session.frameIndex + 1, ROUTE_FRAMES[route]?.length || GOLDEN_FRAMES.length);
  const answer = value => setSession(previous => answerGolden(previous, value));
  const continueAfterError = () => setSession(previous => advanceGoldenAfterError(previous));
  const reset = () => setSession(createGoldenSession(route));
  const child = session.child;
  useEffect(() => {
    const listener = event => {
      if (!active || child || event.repeat || ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target?.tagName)) return;
      if (event.key === '0') { event.preventDefault(); answer('__unknown__'); return; }
      if (session.lastResult && !session.lastResult.correct && event.key === 'Enter') { event.preventDefault(); continueAfterError(); return; }
      if (event.key === 'Enter' && session.status === 'complete') { event.preventDefault(); reset(); return; }
      const index = Number(event.key) - 1;
      if (/^[1-9]$/.test(event.key) && frame.options[index] && !session.lastResult) { event.preventDefault(); answer(frame.options[index].id); }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  });
  useEffect(() => {
    setSession(createGoldenSession(route));
    setShowSource(false);
  }, [route]);
  return <div hidden={!active} className="app-shell curriculum golden-first-pass">
    <header className="app-header"><div className="brand"><strong>扑克练习器</strong></div><nav className="section-tabs" aria-label="训练阶段">{[['preflop', '翻前'], ['reading', '读牌'], ['postflop', '翻后'], ['combined', '综合']].map(([id, label]) => <button type="button" key={id} className={id === 'postflop' ? 'active' : ''} onClick={() => onSection(id)}>{label}</button>)}</nav><div className="header-actions"><div className="score-block"><small>{route === 't01' ? 'T01 转牌段 · 当前会话' : '首遍路线 · 当前会话'}</small><div className="session-score" aria-label="当前练习成绩"><span className="score-right">{session.score.right} 对</span><span>·</span><span className="score-wrong">{session.score.wrong} 错</span></div></div><button type="button" className="icon-btn" aria-label="重新开始当前练习" onClick={reset}><ArrowCounterClockwise size={21} /></button></div></header>
    <main className="golden-main">
      <div className="golden-topline"><span>{route === 't01' ? 'T01 转牌段' : '首遍'} · {frameNumber}/{ROUTE_FRAMES[route]?.length || GOLDEN_FRAMES.length}</span><RouteMap compact /><button type="button" className="golden-source-toggle" onClick={() => setShowSource(value => !value)}><Info size={16} />依据</button></div>
      <div className="golden-layout">
        <aside className="golden-side golden-side-left"><span className="golden-eyebrow">当前层</span><strong>{frame.title}</strong><p>看清现在 → 比较选择 → 做出动作 → 更新后再看</p><div className="golden-side-fact"><span>桌面</span><b>6人 · 100BB</b><span>位置</span><b>你 BTN · 对手 CO</b></div></aside>
        <section className="golden-center"><div className="golden-question"><EvidencePill kind={frame.evidenceKind} /><h1>{frame.question}</h1><p>{frame.primaryAction}</p></div><div className="golden-scene"><Scene frame={frame} onChartSelect={frame.id === 'G2_preflop_chart' ? () => answer('cell') : undefined} child={child} /></div>{frame.id === 'G6_p2_hand' && !child && <button type="button" className="golden-child-button" onClick={() => setSession(previous => openGoldenChild(previous))}><Sparkle size={17} />练牌力顺序</button>}<AnswerPanel frame={frame} session={session} onAnswer={answer} onUnknown={() => answer('__unknown__')} onContinueError={continueAfterError} onSuccessor={onSuccessor} />{showSource && <div className="golden-source-card"><span>本帧依据</span><p>{frame.source}</p><small>证据身份：{EVIDENCE_LABEL[frame.evidenceKind]}</small></div>}</section>
        <aside className="golden-side golden-side-right">{child ? <button type="button" className="golden-secondary" onClick={() => setSession(previous => closeGoldenChild(previous))}><ArrowLeft size={16} />返回当前牌面</button> : <><span className="golden-eyebrow">这一帧只看</span><p>{frame.explanation}</p><div className="golden-side-rule">答错时显示这一栏；没有资料的地方会停下来，不会猜。</div></>}</aside>
      </div>
      <footer className="golden-footer"><button type="button" className="golden-secondary" onClick={reset}><ArrowCounterClockwise size={15} />重练当前段</button><span>当前会话独立计分 · 退出不保存</span><button type="button" className="golden-secondary" onClick={onLegacy}>选择专项训练 <ArrowRight size={15} /></button></footer>
    </main>
  </div>;
}

export { GOLDEN_ROUTE };

