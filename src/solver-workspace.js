import snapshot from '../research/nevir-system/sb-bb-qqq-reload-export-v2.json';
import result from '../research/nevir-system/sb-bb-qqq-reference-result-v2.json';

export const SOLVER_NODES = snapshot.nodes;
export const SOLVER_INFO = { fingerprint: snapshot.inputFingerprint, revision: result.engineRevision, errorBB: result.achievedMetricUnits / 100, iterations: result.iterations };
export const seats = ['SB', 'BB'];
export const ranks = 'AKQJT98765432'.split('');
export const holeCards = hand => hand.match(/.{2}/g);
export function handClass(hand) {
  const [a,b] = holeCards(hand); const sorted = [a[0],b[0]].sort((x,y)=>ranks.indexOf(x)-ranks.indexOf(y));
  return sorted.join('') + (a[0]===b[0]?'':a[1]===b[1]?'s':'o');
}
export function actionName(action) {
  if(action==='Check')return '过牌'; if(action==='Call')return '跟注'; if(action==='Fold')return '弃牌';
  const m=/^(Bet|Raise|AllIn)\((\d+)\)$/.exec(action);
  return m ? `${{Bet:'下注到',Raise:'加注到',AllIn:'全下到'}[m[1]]} ${Number(m[2])/100} BB` : action;
}
export const pct = value => `${(value*100).toFixed(1)}%`;
export function nodeTitle(node) {
 const steps=node.historyIndices.map((value,index)=>{
  const parent=SOLVER_NODES.find(n=>JSON.stringify(n.historyIndices)===JSON.stringify(node.historyIndices.slice(0,index)));
  return parent?.actor!==null&&parent?`${seats[parent.actor]} ${actionName(parent.actions[value])}`:null;
 }).filter(Boolean);
 return `${node.board.length===3?'翻牌':node.board.length===4?'转牌':'河牌'} · ${steps.join(' → ')||'SB 首次行动'}`;
}
export function masses(node, weights=node.rawWeights) {
  const holes=node.orderedHands.map(hs=>hs.map(holeCards));
  const joint=weights.map(ws=>ws.map(()=>0)); let total=0;
  for(let i=0;i<holes[0].length;i++)for(let j=0;j<holes[1].length;j++){
    if(holes[0][i].some(c=>holes[1][j].includes(c)))continue;
    const w=weights[0][i]*weights[1][j]; joint[0][i]+=w;joint[1][j]+=w;total+=w;
  }
  return {joint,total};
}
export function transition(node, actionIndex) {
  if(node.actor===null||!node.actions[actionIndex])throw new Error('当前不是可行动节点');
  const weights=node.rawWeights.map(ws=>ws.slice()); const n=weights[node.actor].length;
  weights[node.actor]=weights[node.actor].map((w,i)=>w*node.strategyActionMajor[actionIndex*n+i]);
  const before=masses(node), after=masses(node,weights);
  const history=[...node.historyIndices,actionIndex];
  const next=SOLVER_NODES.find(n=>JSON.stringify(n.historyIndices)===JSON.stringify(history));
  return {weights,before,after,probability:after.total/before.total,next};
}
export function policyFor(node,index) {
  if(node.actor===null)return [];
  const count=node.orderedHands[node.actor].length;
  return node.actions.map((action,a)=>({action,frequency:node.strategyActionMajor[a*count+index],ev:node.actionEV[a*count+index]/100}));
}
export function rangeCells(node,side,joint) {
  const grouped={};node.orderedHands[side].forEach((h,i)=>{const k=handClass(h);grouped[k]=(grouped[k]||0)+joint[side][i];});return grouped;
}
export function drillRows(node) {
  if(node.actor===null)return [];
  return node.orderedHands[node.actor].map((hand,index)=>({hand,index,policy:policyFor(node,index)})).filter(r=>node.compatibleMassWeights[node.actor][r.index]>1e-8);
}
export function frequencyQuestion(node,index) {
  const rows=drillRows(node);const target=rows[index%rows.length];
  const signature=p=>p.map(x=>Math.round(x.frequency*100)).join('/');
  const options=[target.policy];
  for(const row of rows)if(options.every(p=>signature(p)!==signature(row.policy))){options.push(row.policy);if(options.length===3)break;}
  return {target,options:options.map((p,i)=>({id:i,mix:p.map(x=>x.frequency)})).sort((a,b)=>((a.id+index)%3)-((b.id+index)%3)),correct:0};
}
export function focusedQuestion(node,index,type='frequency') {
  const q=frequencyQuestion(node,index);
  if(type==='frequency')return {...q,prompt:'求解策略是哪一组？',explanation:'正确答案是该物理组合的整组行动频率，混合策略保留全部频率。'};
  const hand=holeCards(q.target.hand),actor=node.actor;
  let value,prompt,explanation,actionIndex=null;
  if(type==='retention'){
    actionIndex=index%node.actions.length;
    value=node.rawWeights[actor][q.target.index]*q.target.policy[actionIndex].frequency;
    prompt=`${actionName(node.actions[actionIndex])}后，这个组合的权重是多少？`;
    explanation=`原权重 ${node.rawWeights[actor][q.target.index].toFixed(4)} × 动作频率 ${pct(q.target.policy[actionIndex].frequency)} = ${value.toFixed(4)}。这是整段范围的筛选权重，不是随机要求你这一次必须做某个动作。`;
  }else{
    const supported=node.orderedHands[actor^1].filter((_,i)=>node.rawWeights[actor^1][i]>0);
    const removed=supported.filter(h=>holeCards(h).some(c=>hand.includes(c)));
    value=removed.length;prompt='仅因为你的两张底牌，对手当前范围中有多少个物理组合不可能出现？';
    explanation=`对手当前有权重的 ${supported.length} 个组合中，${removed.length} 个与你底牌重复，必须移除。${removed.slice(0,6).join('、')}${removed.length>6?' 等':''}。这是阻挡的确定性事实；诈唬是否合适还需比较动作频率与EV。`;
  }
  const values=[value,...(type==='retention'?[0,1,.5,.25]:[0,value+3,Math.max(0,value-2)])].filter((x,i,all)=>all.findIndex(y=>y.toFixed(4)===x.toFixed(4))===i).slice(0,3);
  return {...q,prompt,explanation,actionIndex,options:values.map((v,i)=>({id:i,text:type==='retention'?v.toFixed(4):`移除 ${v} 个组合`})).sort((a,b)=>((a.id+index)%3)-((b.id+index)%3))};
}
