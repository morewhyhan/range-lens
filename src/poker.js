export const RANKS = '23456789TJQKA';
export const SUITS = ['s', 'h', 'd', 'c'];
export const SUIT_LABEL = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const HAND_NAMES = ['高牌', '一对', '两对', '三条', '顺子', '同花', '葫芦', '四条', '同花顺'];
export const DECK = [...RANKS].flatMap((r, i) => SUITS.map(s => ({ id: r+s, rank: i+2, suit: s })));
export const card = id => {
  const c = DECK.find(c => c.id === id);
  if (!c) throw new Error('无效扑克牌：'+id);
  return c;
};
export const rankLabel = r => RANKS[r-2];
export const pick = (items, rng = Math.random) => {
  if (!items.length) throw new Error('没有可出题的条目');
  return items[Math.floor(rng()*items.length)];
};
export function shuffle(items, rng = Math.random) {
  const a = [...items];
  for (let i = a.length-1; i>0; i--) { const j = Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
export const deal = (n, excluded = [], rng = Math.random) => shuffle(DECK.filter(c => !excluded.some(x => x.id === c.id)), rng).slice(0,n);
export function assertCards(cards) {
  if (new Set(cards.map(c => c.id)).size !== cards.length || cards.some(c => !DECK.some(d=>d.id===c.id && d.rank===c.rank && d.suit===c.suit))) throw new Error('重复或无效的实体牌');
}
export function compare(a,b) {
  const av = a.value || a, bv = b.value || b;
  for (let i=0;i<Math.max(av.length,bv.length);i++) { const d=(av[i]||0)-(bv[i]||0); if(d) return Math.sign(d); }
  return 0;
}
export function straightHigh(cards) {
  const rs=new Set(cards.map(c=>c.rank)); if(rs.has(14)) rs.add(1);
  for(let h=14;h>=5;h--) if([0,1,2,3,4].every(d=>rs.has(h-d))) return h;
  return 0;
}
export function evaluateFive(cards) {
  if(cards.length!==5) throw new Error('五张牌才能比较');
  const ranks=cards.map(c=>c.rank).sort((a,b)=>b-a);
  const counts=new Map(); ranks.forEach(r=>counts.set(r,(counts.get(r)||0)+1));
  const groups=[...counts].sort((a,b)=>b[1]-a[1] || b[0]-a[0]);
  const flush=cards.every(c=>c.suit===cards[0].suit), straight=straightHigh(cards);
  let value;
  if(flush && straight) value=[8,straight];
  else if(groups[0][1]===4) value=[7,groups[0][0],groups[1][0]];
  else if(groups[0][1]===3 && groups[1][1]===2) value=[6,groups[0][0],groups[1][0]];
  else if(flush) value=[5,...ranks];
  else if(straight) value=[4,straight];
  else if(groups[0][1]===3) value=[3,groups[0][0],...groups.slice(1).map(g=>g[0])];
  else if(groups[0][1]===2 && groups[1][1]===2) value=[2,Math.max(groups[0][0],groups[1][0]),Math.min(groups[0][0],groups[1][0]),groups[2][0]];
  else if(groups[0][1]===2) value=[1,groups[0][0],...groups.slice(1).map(g=>g[0])];
  else value=[0,...ranks];
  return { value, name:HAND_NAMES[value[0]], cards };
}
export function evaluate(cards) {
  assertCards(cards);
  if(cards.length<5 || cards.length>7) throw new Error('需五至七张牌');
  let best;
  for(let a=0;a<cards.length-4;a++) for(let b=a+1;b<cards.length-3;b++) for(let c=b+1;c<cards.length-2;c++) for(let d=c+1;d<cards.length-1;d++) for(let e=d+1;e<cards.length;e++) {
    const v=evaluateFive([cards[a],cards[b],cards[c],cards[d],cards[e]]);
    if(!best || compare(v,best)>0) best=v;
  }
  return best;
}
export function boardClass(board) {
  if(board.length!==3) throw new Error('翻牌分类需要三张牌');
  if(new Set(board.map(c=>c.suit)).size===1) return 'M';
  if(new Set(board.map(c=>c.rank)).size<3) return 'P';
  const high=Math.max(...board.map(c=>c.rank));
  return high===14?'A':high>=12?'KQ':high>=10?'JT':'L';
}
export const BOARD_NAMES = {M:'三同花',P:'对子／三条面',A:'A高',KQ:'K／Q高',JT:'J／T高',L:'9高及以下'};
export function boardTexture(board) {
  const unique=new Set(board.map(c=>c.rank));
  if(unique.size===1) return '三条公共牌';
  if(unique.size===2) { const repeated=board.find(c=>board.filter(d=>d.rank===c.rank).length===2).rank; return repeated===Math.max(...board.map(c=>c.rank))?'高点成对':'低点成对'; }
  return new Set(board.map(c=>c.suit)).size===1?'三同花':new Set(board.map(c=>c.suit)).size===2?'两同花':'彩虹';
}
export function possibleBoardStraight(board) {
  for(let i=0;i<DECK.length;i++) for(let j=i+1;j<DECK.length;j++) {
    if(board.some(c=>c.id===DECK[i].id || c.id===DECK[j].id)) continue;
    if(straightHigh([...board,DECK[i],DECK[j]])) return true;
  }
  return false;
}
export function draws(hole,board) {
  const cards=[...hole,...board]; assertCards(cards);
  const straightTop=straightHigh(cards), madeStraight=straightTop>0;
  const straightCards=madeStraight?[0,1,2,3,4].map(d=>cards.find(c=>c.rank===(straightTop-d===1?14:straightTop-d))):[];
  const bySuit=SUITS.map(s=>({suit:s,count:cards.filter(c=>c.suit===s).length}));
  const madeFlush=bySuit.some(s=>s.count>=5);
  const available=DECK.filter(c=>!cards.some(d=>d.id===c.id));
  const straightOuts=!madeStraight && board.length<5 ? available.filter(c=>straightHigh([...cards,c])>0):[];
  const straightRanks=[...new Set(straightOuts.map(c=>c.rank))].sort((a,b)=>a-b);
  let straightType=madeStraight?'已成顺':straightRanks.length===1?'卡顺':straightRanks.length>=2?'双卡顺':'无直接顺听';
  if(straightRanks.length===2) {
    const lo=straightRanks[0],hi=straightRanks[1];
    if(hi-lo===5 && [lo+1,lo+2,lo+3,lo+4].every(r=>cards.some(c=>c.rank===r))) straightType='两头顺';
  }
  const flushSuit=bySuit.find(s=>s.count===4)?.suit;
  const flushOuts=!madeFlush && board.length<5 && flushSuit ? available.filter(c=>c.suit===flushSuit):[];
  const backdoorFlush=board.length===3 && !madeFlush && !flushSuit ? bySuit.filter(s=>s.count===3).map(s=>s.suit):[];
  return { madeStraight,straightCards,madeFlush,straightType,straightOuts,straightRanks,flushOuts,flushSuit,backdoorFlush };
}
export function holeFromClass(hand, excluded=[], rng=Math.random) {
  const a=RANKS.indexOf(hand[0])+2,b=RANKS.indexOf(hand[1])+2;
  const pairs=[];
  for(const x of DECK.filter(c=>c.rank===a)) for(const y of DECK.filter(c=>c.rank===b)) {
    if(x.id===y.id || excluded.some(c=>c.id===x.id || c.id===y.id)) continue;
    if(hand.endsWith('s') && x.suit!==y.suit || hand.endsWith('o') && x.suit===y.suit) continue;
    pairs.push([x,y]);
  }
  return pick(pairs,rng);
}
// Keep course ranks and suit relationships; vary physical suits, never invent a new strategy board.
export function suitVariant(cards, rng=Math.random) {
  const perm=shuffle(SUITS,rng), map=Object.fromEntries(SUITS.map((s,i)=>[s,perm[i]]));
  return cards.map(c=>card(rankLabel(c.rank)+map[c.suit]));
}
export const potOdds = (potIncludingBet, callAmount) => {
  if(!(potIncludingBet>0 && callAmount>0)) throw new Error('底池与跟注金额必须为正数');
  return callAmount/(potIncludingBet+callAmount);
};
