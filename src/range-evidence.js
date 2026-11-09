import {card,DECK,evaluate,compare,assertCards} from './poker.js';
import {splitHand,fixedHandOpponent,mixFor} from './postflop-model.js';

export function compareHoldings(board,heroHand,opponentHand){
 const own=splitHand(heroHand),other=splitHand(opponentHand);
 if([...board,...own].some(c=>other.includes(c)))return 'blocked';
 const result=compare(evaluate([...board,...own].map(card)),evaluate([...board,...other].map(card)));
 return result>0?'weaker':result<0?'stronger':'tie';
}
export function rangeEvidence(node,hero,hand,child=null){
 const reference=child?.actor===(hero^1)?child:node;
 const dist=fixedHandOpponent(reference,hero,hand);
 const rows=reference.orderedHands[hero^1].map((opponentHand,index)=>{
  const weight=dist.weights[index],kind=weight>0?compareHoldings(reference.board,hand,opponentHand):'blocked';
  const policy=child?mixFor(child,hero^1,index):[];
  const fold=policy.filter(p=>p.action==='Fold').reduce((s,p)=>s+p.frequency,0);
  return {hand:opponentHand,index,weight,kind,fold,continue:1-fold,policy};
 });
 const total=dist.total;
 const current=['weaker','stronger','tie'].map(kind=>({kind,mass:rows.filter(r=>r.kind===kind).reduce((s,r)=>s+r.weight,0)}));
 const responses=child?[
  {kind:'weaker',label:'较弱牌继续',mass:rows.filter(r=>r.kind==='weaker').reduce((s,r)=>s+r.weight*r.continue,0)},
  {kind:'stronger',label:'较强牌继续',mass:rows.filter(r=>r.kind==='stronger').reduce((s,r)=>s+r.weight*r.continue,0)},
  {kind:'tie',label:'同牌力继续',mass:rows.filter(r=>r.kind==='tie').reduce((s,r)=>s+r.weight*r.continue,0)},
  {kind:'fold',label:'弃牌',mass:rows.reduce((s,r)=>s+r.weight*r.fold,0)},
 ].map(r=>({...r,frequency:total?r.mass/total:0})):[];
 return {rows,total,current:current.map(r=>({...r,frequency:total?r.mass/total:0})),responses,canFaceBet:Boolean(child?.actions.includes('Call'))};
}
export function focusFactor(row,lens,reply=null){
 if(['weaker','stronger','tie'].includes(lens))return row.kind===lens?1:0;
 if(lens==='tieContinue')return row.kind==='tie'?row.continue:0;
 if(lens==='pay')return row.kind==='weaker'?row.continue:0;
 if(lens==='risk')return row.kind==='stronger'?row.continue:0;
 if(lens==='fold')return row.kind==='stronger'?row.fold:0;
 if(lens==='allFold')return row.fold;
 if(lens==='remain')return reply===null?row.continue:1;
 return row.kind==='blocked'?0:1;
}
// Exact physical runouts for one hypothetical pair. No future betting or fold equity.
export function showdownRunouts(board,heroHand,opponentHand){
 const known=[...board,...splitHand(heroHand),...splitHand(opponentHand)].map(card);assertCards(known);
 if(board.length<3||board.length>5)throw new Error('公共牌数量无效');
 const deck=DECK.filter(c=>!known.some(k=>k.id===c.id));let wins=0,ties=0,losses=0;
 function settle(extra){const b=[...board.map(card),...extra];const result=compare(evaluate([...b,...splitHand(heroHand).map(card)]),evaluate([...b,...splitHand(opponentHand).map(card)]));if(result>0)wins++;else if(result<0)losses++;else ties++;}
 if(board.length===5)settle([]);
 else if(board.length===4)for(const c of deck)settle([c]);
 else for(let i=0;i<deck.length;i++)for(let j=i+1;j<deck.length;j++)settle([deck[i],deck[j]]);
 const total=wins+ties+losses;return {wins,ties,losses,total,heroEquity:(wins+ties/2)/total,currentRelation:compareHoldings(board,heroHand,opponentHand)};
}
