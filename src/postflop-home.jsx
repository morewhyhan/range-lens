import React from 'react';
import { ArrowLeft, ArrowRight, Compass, Stack, Target } from '@phosphor-icons/react';
import './postflop-home.css';

const TABS = [['preflop', '翻前'], ['reading', '读牌'], ['postflop', '翻后'], ['combined', '综合']];

function Header({ onSection, scoreLabel = '翻后训练' }) {
  return <header className="app-header postflop-home-header">
    <div className="brand"><strong>扑克练习器</strong></div>
    <nav className="section-tabs" aria-label="训练阶段">
      {TABS.map(([id, label]) => <button type="button" key={id} className={id === 'postflop' ? 'active' : ''} onClick={() => onSection(id)}>{label}</button>)}
    </nav>
    <div className="postflop-home-label">{scoreLabel}</div>
  </header>;
}

export function PostflopHome({ onSection, onGuided, onSpecialized }) {
  return <div className="app-shell postflop-home-shell">
    <Header onSection={onSection} />
    <main className="postflop-home-main">
      <div className="postflop-home-intro">
        <span className="postflop-eyebrow">翻后训练</span>
        <h1>选择今天的练法</h1>
        <p>先选一种方式。专项训练只解决一个问题，连贯训练才沿着一手牌走完整条路线。</p>
      </div>
      <div className="postflop-mode-grid">
        <button type="button" className="postflop-mode-card primary" onClick={onSpecialized}>
          <span className="mode-icon"><Target size={24} /></span>
          <span className="mode-kicker">专项训练</span>
          <strong>一次只练一个能力</strong>
          <p>例如：看懂情境、选择下注大小、判断哪些牌下注、识别转牌变化或完成河牌执行。</p>
          <span className="mode-cta">进入专项列表 <ArrowRight size={17} /></span>
        </button>
        <button type="button" className="postflop-mode-card" onClick={onGuided}>
          <span className="mode-icon"><Compass size={24} /></span>
          <span className="mode-kicker">连贯训练</span>
          <strong>跟着一手牌走完整条路线</strong>
          <p>从桌面、行动历史和翻前图表开始，经过牌力、范围、动作和更新，再到资料边界。</p>
          <span className="mode-cta">开始连贯路线 <ArrowRight size={17} /></span>
        </button>
      </div>
      <div className="postflop-home-note"><Stack size={18} /><span>两种训练共用同一套资料和判分规则；成绩按模式分别记录，不会互相混在一起。</span></div>
    </main>
  </div>;
}

const SPECIALS = [
  { id: 'scenario', icon: '01', title: '看懂情境', detail: '底池类型、位置、谁先行动', module: 'scenario' },
  { id: 'flop-size', icon: '02', title: '翻牌下注大小', detail: '只判断当前资料给出的下注尺度', module: 'flop', task: 'size' },
  { id: 'flop-hand', icon: '03', title: '翻牌哪些牌下注', detail: '按手牌任务进入对应分支', module: 'flop', task: 'hand' },
  { id: 'turn-action', icon: '04', title: '转牌怎么变化', detail: '对照前序，判断第二枪或过牌', module: 'turn', task: 'action' },
  { id: 'river-action', icon: '05', title: '河牌怎么执行', detail: '价值、诈唬和摊牌边界分开练', module: 'river', task: 'action' },
  { id: 'range', icon: '06', title: '范围变化与阻挡牌', detail: '先练已知牌过滤；逐组合行动权重待匹配课包', closed: true },
  { id: 'conditional', icon: '07', title: '条件调整', detail: '只在资料写明前提时练剥削', module: 'exploit', task: 'action' },
];

export function PostflopSpecialized({ onSection, onBack, onStart }) {
  return <div className="app-shell postflop-home-shell">
    <Header onSection={onSection} scoreLabel="专项训练" />
    <main className="postflop-specialized-main">
      <button type="button" className="home-back-button" onClick={onBack}><ArrowLeft size={16} />返回翻后训练选择</button>
      <div className="postflop-home-intro compact">
        <span className="postflop-eyebrow">专项训练</span>
        <h1>你现在只练哪一件事？</h1>
        <p>选一个专项后，题目只围绕这个能力出，不会自动跳到连贯路线。</p>
      </div>
      <div className="specialized-grid">
        {SPECIALS.map(item => <button type="button" disabled={item.closed} className={`specialized-card ${item.closed ? 'closed' : ''}`} key={item.id} onClick={() => !item.closed && onStart(item)}>
          <span className="specialized-number">{item.icon}</span>
          <span className="specialized-title">{item.title}</span>
          <span className="specialized-detail">{item.detail}</span>
          {item.closed && <span className="specialized-status">资料待匹配</span>}
          <ArrowRight size={17} className="specialized-arrow" />
        </button>)}
      </div>
      <div className="postflop-home-note"><Target size={18} /><span>专项训练中仍然可以打开设置，继续细分情境、牌面、单元和题型。</span></div>
    </main>
  </div>;
}

