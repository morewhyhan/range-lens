import ranges from './data/ranges.json' with { type: 'json' };
import { pick, holeFromClass } from './poker.js';
export const charts=ranges;
export const actionKey=a=>['raise','call','fold'].filter(k=>a[k]).map(k=>`${k}:${a[k]}`).join('|');
export function actionLabel(a,group) {
  const labels={raise:group==='open'?'加注':'3bet',call:'跟注',fold:'弃牌'};
  return ['raise','call','fold'].filter(k=>a[k]).map(k=>`${labels[k]} ${Math.round(a[k]*100)}%`).join(' / ');
}
export const bbMap={UTG:{2:'普通宽',2.25:'普通中',2.5:'普通紧',3:'普通紧'},HJ:{2:'普通宽',2.25:'普通中',2.5:'普通中',3:'普通紧'},CO:{2:'普通宽',2.25:'普通中',2.5:'普通中',3:'普通紧'},BTN:{2:'普通宽',2.25:'普通宽',2.5:'普通中',3:'普通中'},SB:{2:'小盲宽',2.5:'小盲中',3:'小盲紧',3.5:'小盲紧'}};
export const bbSituations=Object.entries(bbMap).flatMap(([position,map])=>Object.entries(map).map(([size,name])=>({position,size:Number(size),name})));
export function edgeInfo(chart, hand) {
  const h=chart.hands[hand], signature=actionKey(h.action);
  const sameKind=x=>h.row===h.col?x.row===x.col:(h.row<h.col)===(x.row<x.col) && x.row!==x.col;
  const neighbor=Object.values(chart.hands).some(x=>sameKind(x) && (h.row===h.col?Math.abs(x.row-h.row)===1:Math.abs(x.row-h.row)+Math.abs(x.col-h.col)===1) && actionKey(x.action)!==signature);
  const changes=charts.filter(c=>c.group===chart.group && c.id!==chart.id && (chart.group!=='bb' || c.name.startsWith('小盲')===chart.name.startsWith('小盲'))).some(c=>actionKey(c.hands[hand].action)!==signature);
  return {mixed:Object.keys(h.action).length>1,boundary:neighbor,changes,edge:Object.keys(h.action).length>1 || neighbor || changes};
}
export function preflopQuestion(settings, rng=Math.random) {
  const group=settings.module==='open'?'open':settings.module==='threebet'?'threebet':'bb';
  let chart, situation;
  if(group==='bb') {
    let situations=bbSituations.filter(s=>(settings.position==='all' || s.position===settings.position) && (settings.size==='all' || s.size===Number(settings.size)) && (settings.chart==='all' || s.name===settings.chart));
    if(!situations.length) throw new Error('该位置和尺度在资料中没有对应图，请调整筛选。');
    situation=pick(situations,rng); chart=charts.find(c=>c.group==='bb' && c.name===situation.name);
  } else chart=pick(charts.filter(c=>c.group===group && (settings.position==='all' || c.name===settings.position)),rng);
  const entries=Object.entries(chart.hands);
  const enabled=h=>{const e=edgeInfo(chart,h); return (settings.mixed && e.mixed)||(settings.boundary && e.boundary)||(settings.changes && e.changes);};
  const edges=entries.filter(([h])=>enabled(h)),rest=entries.filter(([h])=>!enabled(h));
  const ratio=settings.sampling==='all'?0:settings.sampling==='edge'?100:Number(settings.edgeRatio);
  if(ratio>0&&!edges.length)throw new Error('当前图中没有符合勾选类型的边缘牌，请调整类型或切换全范围。');
  if(settings.sampling==='custom'&&ratio<100&&!rest.length)throw new Error('当前选择把所有牌都归为边缘牌，请调整类型或选择只练边缘牌。');
  const desired=rng()*100<ratio?edges:rest;
  const pool=settings.sampling==='all'?entries:desired;
  const [hand,entry]=pick(pool,rng);
  const patterns=group==='bb'?[{fold:1},{call:1},{raise:1},{raise:.5,fold:.5},{call:.5,fold:.5},{call:.5,raise:.5}]:[{fold:1},{raise:.5,fold:.5},{raise:1}];
  const hole=holeFromClass(hand,[],rng);
  const reason=edgeInfo(chart,hand);
  const context=group==='open'?`${chart.name}，前面所有人弃牌，轮到你开池。`:group==='threebet'?`${chart.name}，面对前位开池。使用本位置的综合简化图。`:`你在BB，${situation.position}开池 ${situation.size}BB，轮到你防守。`;
  return {kind:'preflop',group,chart,hand,hole,board:[],title:'这手牌在简化图里怎么打？',subtitle:context,position:group==='bb'?'BB':chart.name,opponent:situation?.position || (group==='threebet'?{HJ:'UTG',CO:'HJ',BTN:'CO',SB:'BTN'}[chart.name]:null),options:patterns.map(a=>({id:actionKey(a),label:actionLabel(a,group)})),correct:actionKey(entry.action),answer:actionLabel(entry.action,group),explanation:`${chart.name}图的 ${hand} 对应 ${actionLabel(entry.action,group)}。这是直接读取最终简化图的答案。${Object.keys(entry.action).length>1?'两个动作各50%，本题考的是频率分类，不随机指定某一个动作。':''}`,source:`翻前策略整合版 · ${chart.source} · ${chart.name} · ${hand}`,tags:[reason.mixed?'混合牌':null,reason.boundary?'范围边界':null,reason.changes?'情境变化牌':null].filter(Boolean)};
}
