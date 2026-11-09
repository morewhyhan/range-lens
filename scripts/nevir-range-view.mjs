// Research-only adapter for TWO-PLAYER, factored reach exports with no bunching.
// It does not infer policies, solve strategies or make grading references.
const ranks='AKQJT98765432',suits='shdc';
const deck=[...ranks].flatMap(r=>[...suits].map(s=>r+s));
const key=hole=>[...hole].sort().join('');
function parse(holding){
 if(!(typeof holding==='string'&&holding.length===4)&&!(Array.isArray(holding)&&holding.length===2))throw Error('Exact two-card holding required');
 const hole=Array.isArray(holding)?holding:[holding.slice(0,2),holding.slice(2,4)];
 if(hole.length!==2||hole.some(c=>!deck.includes(c))||hole[0]===hole[1])throw Error('Invalid physical holding');
 return hole;
}
function classOf(hole){
 const [a,b]=hole.map(c=>ranks.indexOf(c[0]));
 if(a===b)return ranks[a]+ranks[b];
 return ranks[Math.min(a,b)]+ranks[Math.max(a,b)]+(hole[0][1]===hole[1][1]?'s':'o');
}
const physical=[];
for(let i=0;i<52;i++)for(let j=i+1;j<52;j++)physical.push({hole:[deck[i],deck[j]],cell:classOf([deck[i],deck[j]])});
const cellKeys=[...ranks].flatMap((a,i)=>[...ranks].map((b,j)=>i===j?a+b:i<j?a+b+'s':b+a+'o'));
const overlap=(a,b)=>a.some(c=>b.includes(c));

export function jointFromFactoredReach(node,board){
 if(!Array.isArray(board)||![3,4,5].includes(board.length)||new Set(board).size!==board.length||board.some(c=>!deck.includes(c)))throw Error('Invalid board');
 if(!node.orderedHands||!node.rawReachWeights||node.orderedHands.length!==2||node.rawReachWeights.length!==2)throw Error('Two-player export required');
 const hands=node.orderedHands.map((hs,p)=>{
  if(hs.length!==node.rawReachWeights[p].length)throw Error('Hand-weight alignment mismatch');
  const parsed=hs.map(parse);
  if(new Set(parsed.map(key)).size!==parsed.length)throw Error('Duplicate physical hand');
  hs.forEach((_,i)=>{const w=node.rawReachWeights[p][i];if(!Number.isFinite(w)||w<0)throw Error('Invalid reach weight');if(w>0&&overlap(parsed[i],board))throw Error('Positive board-conflicting reach');});
  return parsed;
 });
 const pairs=[];
 for(let i=0;i<hands[0].length;i++)for(let j=0;j<hands[1].length;j++){
  const a=hands[0][i],b=hands[1][j];
  if(overlap(a,b)||overlap(a,board)||overlap(b,board))continue;
  const mass=node.rawReachWeights[0][i]*node.rawReachWeights[1][j];
  if(!Number.isFinite(mass))throw Error('Nonfinite joint mass');
  if(mass>0)pairs.push({indices:[i,j],holdings:[a,b],mass});
 }
 const totalMass=pairs.reduce((s,p)=>s+p.mass,0);if(!Number.isFinite(totalMass))throw Error('Nonfinite total mass');
 return {board,hands,rawReachWeights:node.rawReachWeights,pairs,totalMass,scope:'Two-player factored reach; ignores folded-player card-removal/bunching.'};
}

export function rangeView(joint,{owner,viewer='public',knownHolding=null}){
 if(![0,1].includes(owner))throw Error('Unknown range owner');
 const known=knownHolding===null?null:parse(knownHolding);
 if(viewer!=='public'&&![0,1].includes(viewer))throw Error('Unknown viewing seat');
 if(viewer==='public'&&known)throw Error('Public view cannot silently condition on a private hand');
 if(viewer!=='public'&&(!known||owner===viewer))throw Error('Private view requires an opposing range and exact own holding');
 const selected=viewer==='public'?joint.pairs:joint.pairs.filter(p=>key(p.holdings[viewer])===key(known));
 const jointSubsetMass=selected.reduce((s,p)=>s+p.mass,0);
 const knownIndex=known?joint.hands[viewer].findIndex(h=>key(h)===key(known)):-1;
 const ownReach=viewer==='public'?1:knownIndex<0?0:joint.rawReachWeights[viewer][knownIndex];
 // Remove the known player's own reach factor: it is not new evidence about the opponent.
 const denominator=ownReach>0?jointSubsetMass/ownReach:0;
 const byHand=new Map();
 for(const p of selected){const k=key(p.holdings[owner]);byHand.set(k,(byHand.get(k)??0)+p.mass/ownReach);}
 const knownCards=[...joint.board,...(known??[])];
 if(new Set(knownCards).size!==knownCards.length)throw Error('Known hand conflicts with board');
 const rows=physical.map(h=>({hole:h.hole,cell:h.cell,blocked:overlap(h.hole,knownCards),mass:byHand.get(key(h.hole))??0}));
 const matrix=cellKeys.map(cell=>{
  const hs=rows.filter(h=>h.cell===cell),mass=hs.reduce((s,h)=>s+h.mass,0);
  return {cell,legalPhysicalCombos:hs.filter(h=>!h.blocked).length,positiveModelCombos:hs.filter(h=>h.mass>0).length,mass,probability:denominator>0?mass/denominator:null};
 });
 const support=rows.filter(h=>h.mass>0).map(h=>({...h,probability:h.mass/denominator}));
 return {owner,viewer,knownHolding:known,board:joint.board,denominator,jointSubsetMass,
  massMeaning:viewer==='public'?'Compatible joint reach marginal':'Opponent raw reach compatible with exact known own hand; own reach factor removed',
  status:denominator>0?'positive_declared_model_support':'unsupported_under_declared_reference',
  support,matrix,notPokerLegalityRuling:true,gradingReference:false,
  zeroOutsideDeclaredModelIsNotRealWorldImpossibility:true};
}
