const crypto=require('node:crypto');
const {sampleFlop,validateFlop,category,ensureCompatibleRanges}=require('./postflop-coverage.cjs');
const RANKS='AKQJT98765432'.split('');
const CLASSES=RANKS.flatMap((r,i)=>RANKS.map((c,j)=>i===j?r+c:i<j?r+c+'s':c+r+'o'));
const SCENES={
 '3bet-ip':{oopSeat:'CO',ipSeat:'BTN',hero:1,dead:1.5},
 '3bet-oop':{oopSeat:'SB',ipSeat:'BTN',hero:0,dead:1},
};
function threebetSpots(){const pre=['UTG','HJ','CO','BTN','SB','BB'],post=['SB','BB','UTG','HJ','CO','BTN'];return pre.flatMap((opener,i)=>pre.slice(i+1).map(bettor=>{const hero=post.indexOf(bettor)<post.indexOf(opener)?0:1,seats=hero===0?[bettor,opener]:[opener,bettor];return {id:opener+'-'+bettor,opener,bettor,hero,oopSeat:seats[0],ipSeat:seats[1],dead:1.5-(seats.includes('SB')?.5:0)-(seats.includes('BB')?1:0),scene:hero?'3bet-ip':'3bet-oop'};}));}
function validateThreebet(input){
 if(!input||!Object.hasOwn(SCENES,input.scene))throw new Error('请选择有效的3bet局面');
 const scene=input.spot?threebetSpots().find(s=>s.id===input.spot&&s.scene===input.scene):threebetSpots().find(s=>s.id===(input.scene==='3bet-ip'?'CO-BTN':'BTN-SB')),size=input.size,open=input.openSize??2.5;
 if(!scene)throw new Error('3bet位置或行动顺序不合法');
 if(!Number.isFinite(open)||open<2||open>50||Math.abs(Math.round(open*100)-open*100)>1e-8)throw new Error('开池须在2至50BB之间，最多两位小数');
 if(!Number.isFinite(size)||size<2*open-1||size>=100||Math.abs(Math.round(size*100)-size*100)>1e-8)throw new Error(`3bet至少须加至${2*open-1}BB，并小于100BB；翻前全下已没有翻后行动题`);
 const ranges={};
 for(const role of ['oop','ip']){
  const weights=input[role];
  if(!weights||typeof weights!=='object'||Array.isArray(weights)||Object.keys(weights).some(h=>!CLASSES.includes(h)))throw new Error('范围含未知牌类');
  const classWeights=Object.fromEntries(CLASSES.map(h=>[h,weights[h]??0]));
  if(Object.values(classWeights).some(v=>![0,.5,1].includes(v)))throw new Error('范围权重只能为0%、50%或100%');
  if(!Object.values(classWeights).some(v=>v>0))throw new Error('双方范围都必须至少包含一个牌类');
  ranges[role]={id:'custom-'+input.scene+'-'+role,source:'用户明确配置的3bet条件范围（非原表跟注答案、非翻前均衡）',action:(scene.hero===(role==='oop'?0:1))?'3bet':'call',classWeights,rangeStringDraft:Object.entries(classWeights).filter(([,v])=>v>0).map(([h,v])=>h+(v===1?'':':'+v)).join(',')};
 }
 let board=input.board?validateFlop(input.board):['As','7h','2d'];
 if(input.randomBoard){for(let trial=0;trial<100;trial++){board=sampleFlop('all');try{ensureCompatibleRanges(ranges,board);break;}catch{}}}
 const deck=RANKS.flatMap(r=>'shdc'.split('').map(s=>r+s));
 const physical=range=>{const out=[];for(let i=0;i<deck.length;i++)for(let j=i+1;j<deck.length;j++){const a=deck[i],b=deck[j];if(board.includes(a)||board.includes(b))continue;const ranks=[a[0],b[0]].sort((a,b)=>RANKS.indexOf(a)-RANKS.indexOf(b));const key=a[0]===b[0]?ranks.join(''):ranks.join('')+(a[1]===b[1]?'s':'o');if(range.classWeights[key]>0)out.push([a,b]);}return out;};
 const oop=physical(ranges.oop),ip=physical(ranges.ip);
 if(!oop.some(a=>ip.some(b=>!a.some(c=>b.includes(c)))))throw new Error('这两个范围在当前翻牌上没有互不冲突的合法底牌对，请调整范围');
 const preflop=`${scene.opener} opens${open}; ${scene.bettor} 3bets${size}; others fold; ${scene.opener} calls`;
 const request={id:input.scene+'-custom-'+board.join('')+'-v2',engineRevision:'9d1509fe5077d019825f833eed04b16d342dfda1',compatibilityFlag:'-A dangerous_implicit_autorefs',context:{playersAtDeal:6,postflopPlayers:2,initialEffectiveBB:100,oopSeat:scene.oopSeat,ipSeat:scene.ipSeat,openToBB:open,threebetToBB:size,preflop,preflopLabel:`${scene.opener} 开池 ${open} → ${scene.bettor} 3bet ${size} → ${scene.opener} 跟注`,flop:board,boardCategory:category(board),turn:null,river:null,firstActor:scene.oopSeat,startingPotBB:2*size+scene.dead,eachStackBB:100-size},ranges,tree:{flopBet:'33%',turnBet:'75%',riverBet:'75%',raises:'a',rakeRate:0,rakeCap:0,addAllinThreshold:0,forceAllinThreshold:0,mergingThreshold:0},unitsPerBB:100,startingPot:Math.round((2*size+scene.dead)*100),effectiveStack:Math.round((100-size)*100),targetExploitabilityUnits:(2*size+scene.dead)*.1,maxIterations:10000,scope:`自定义3bet条件范围；100BB；翻牌${board.join(' ')}；零抽水；三街有限动作树。仅给定输入下的翻后参考，不证明翻前范围为均衡。`};
 request.inputFingerprint=crypto.createHash('sha256').update(JSON.stringify(request)).digest('hex');return request;
}
module.exports={CLASSES,SCENES,threebetSpots,validateThreebet};
