import sources from './data/sources.json' with { type: 'json' };
import { card, BOARD_NAMES, boardClass } from './poker.js';

export const SCENARIOS = {
  ip3:{name:'有位置 · 3bet底池',position:'BTN',opponent:'CO',history:['CO开池','你在BTN 3bet','CO跟注','CO翻牌过牌'],sheet:'01 有位置3bet'},
  oop3:{name:'没位置 · 3bet底池',position:'SB',opponent:'BTN',history:['BTN开池','你在SB 3bet','BTN跟注','翻牌轮到你先行动'],sheet:'02 没位置3bet'},
  ipSRP:{name:'有位置 · 单加注底池',position:'BTN',opponent:'BB',history:['你在BTN开池','BB跟注','BB翻牌过牌'],sheet:'03 有位置单加注'},
  oopSRP:{name:'没位置 · 单加注底池',position:'SB',opponent:'BB',history:['你在SB开池','BB跟注','翻牌轮到你先行动'],sheet:'04 没位置单加注'},
  earlyBTN:{name:'前位对BTN · 单加注底池',position:'HJ',opponent:'BTN',history:['你在HJ开池','BTN跟注','翻牌轮到你先行动'],sheet:'04 没位置单加注'},
};
export function boardFromNotation(notation) {
  const ranks=[...notation.replace(/r$|tt$|M$/,'')];
  const suits=notation.endsWith('M')?['s','s','s']:notation.endsWith('tt')?['s','h','s']:['s','h','d'];
  return ranks.map((r,i)=>card(r+suits[i]));
}
const sizes={I01:25,I02:67,I03:40,I04:25,I05:33,I06:25,I07:25,I08:67,I09:40,I13:40,I10:25,I11:67,O03:25,O04:50,O05:50,O06:75,S01:25,S02:33,S03:25,S04:33,S05:75,S07:67,S08:67,S09:50,S10:75,P04:25};
const directions={I12:'先整体过牌',O07:'先过牌，面对小注再过牌加注',O08:'以过牌为主',P02:'高频下注',P03:'扩大至范围持续下注',P06:'先整体过牌',P08:'以过牌为主'};
const frequencies={O08:{action:'过牌',value:80},O09:{action:'下注',value:40},S09:{action:'下注',value:40},P05:{action:'过牌',value:55}};
const hands={
  I11:[{hand:'AA',action:'下注67%底池',kind:'价值下注'},{hand:'KK',action:'下注67%底池',kind:'价值下注'},{hand:'77',action:'更多过牌',kind:'保留摊牌'},{hand:'66',action:'更多过牌',kind:'保留摊牌'}],
  S04:[{hand:'KQo',action:'更多过牌',kind:'保留摊牌'}],
  S05:[{hand:'AQo',action:'下注75%底池',kind:'价值下注'},{hand:'QTo',action:'下注75%底池',kind:'价值下注'},{hand:'55',action:'下注75%底池',kind:'价值下注'},{cards:['Js','9s'],action:'下注75%底池',kind:'有效听牌'},{hand:'JJ',action:'更多过牌',kind:'保留摊牌'}],
  S07:[{hand:'77',action:'更多过牌',kind:'保留摊牌'},{hand:'KQo',action:'可进入67%下注端',kind:'诈唬候选'}],
  S08:[{hand:'AJo',action:'可进入67%下注端',kind:'价值下注'},{hand:'KQo',action:'可进入67%下注端',kind:'诈唬候选'},{hand:'KTo',action:'可进入67%下注端',kind:'诈唬候选'}],
  S09:[{hand:'77',action:'可进入50%下注端',kind:'超对兼顺听候选'},{hand:'88',action:'可进入50%下注端',kind:'超对兼顺听候选'}],
};
const conditions={I02:'已观察到对手过牌加注不足。',O07:'BTN面对你的过牌会用弱牌小注，而且对过牌加注弃牌过多。',O09:'对手对过牌加注弃牌过多；本题单独练表中课程基准频率。',S02:'对手弃牌过多，而且加注不足；采用课程小注简化。',S03:'对手弃牌过多，而且加注不足；采用课程的小注替代路线。',P03:'对手弃牌过多，而且加注不足。',P04:'对手对小下注弃牌过多。'};
export const flopRules=sources.postflop.slice(2,6).flatMap((sheet,si)=>sheet.rows.filter(r=>/^[IOSP]\d{2}\n/.test(r.values.B||'')).map(row=>{
  const [id,notation,title]=row.values.B.split('\n');
  const scenario=id==='P08'?'earlyBTN':['ip3','oop3','ipSRP','oopSRP'][si];
  const board=boardFromNotation(notation);
  const pending=(row.values.D||'').includes('【资料待补】');
  const convention=['O04','O05','O06'].includes(id)?'本练习固定取 '+sizes[id]+'%底池，位于表中给定尺寸区间内。':id==='I04'?'使用表中教学取值25%。':'';
  return {id,street:'flop',notation,title,scenario,board:board.map(c=>c.id),category:boardClass(board),size:sizes[id],direction:directions[id],frequency:frequencies[id],hands:hands[id]||[],condition:conditions[id]||'',convention,pending,exploit:(row.values.D||'').includes('【条件剥削】'),text:row.values.D,reason:row.values.E,source:`${sheet.name} · B${row.row} / D${row.row} / E${row.row}`,image:sheet.images.find(im=>im.row===row.row)?.path};
}));
function streetSource(index,id) {
  const sheet=sources.postflop[index],row=sheet.rows.find(r=>(r.values.B||'').startsWith(id+'\n'));
  if(!row) throw new Error('缺少源节点'+id);
  return {title:row.values.B.split('\n').slice(1).join(' · '),text:row.values.D,reason:row.values.E,source:`${sheet.name} · B${row.row} / D${row.row} / E${row.row}`,image:sheet.images.find(im=>im.row===row.row)?.path};
}
const turnSpecs=[
  {id:'T01',scenario:'ip3',board:['Ks','Th','5d','2d'],beforeSize:33,size:75,convention:'课程给70%～100%，练习固定取75%。',direction:'较大第二枪',choices:[{hand:'AA',action:'强价值候选'},{hand:'QQ',action:'中等摊牌，不自动第二枪'}]},
  {id:'T02',scenario:'ip3',board:['9s','6h','2d','Jc'],beforeSize:67,direction:'较大第二枪'},
  {id:'T03',scenario:'ip3',board:['9s','6h','2d','7d'],beforeSize:67,direction:'过牌',turnRanks:['5','6','7','8','T']},
  {id:'T04',scenario:'ip3',board:['9s','6h','2d','2h'],beforeSize:67,direction:'降低第二枪频率，保留更多过牌'},
  {id:'T05',scenario:'ip3',board:['Js','Th','2d','9d'],beforeSize:33,direction:'减少第二枪，下注偏小'},
  {id:'T06',scenario:'ip3',board:['Ks','Ts','5s','9s'],beforeSize:33,direction:'减少进攻，下注偏小'},
  {id:'T07',scenario:'ipSRP',board:['9s','8h','6s','2d'],beforeSize:33,size:125,convention:'本练习把超池固定为125%；这是执行取值，表中只要求大于100%，未给统一125%。',direction:'考虑超池下注',condition:'对手会快玩强牌，跟注后又对大注弃牌过多。转牌是空白牌。',exploit:true},
  {id:'T08',scenario:'oop3',board:['Ts','8h','3d','2c'],line:'xraise',direction:'先更多过牌'},
  {id:'T09',scenario:'oop3',board:['Ts','8h','3d','4c'],line:'xx',size:70,direction:'增加延迟下注',condition:'双方翻牌过牌；有证据表明对手在该线路转牌弃牌过多。',exploit:true},
  {id:'T10',scenario:'oopSRP',board:['Qs','Th','5d','2c'],line:'xx',direction:'增加转牌下注',condition:'双方翻牌过牌；有证据表明对手在该线路转牌弃牌过多。',exploit:true},
];
export const turnRules=turnSpecs.map(s=>({...streetSource(6,s.id),street:'turn',category:boardClass(s.board.slice(0,3).map(card)),...s}));
const riverSpecs=[
  {id:'R01',scenario:'ipSRP',board:['As','7h','2d','Kd','3h'],hole:['Ah','Kc'],direction:'价值下注',condition:'对手过牌，而且AQ、AJ等更差牌会跟你的下注。'},
  {id:'R02',scenario:'ipSRP',board:['Ks','7h','2d','3d','9h'],hole:['Qs','Qc'],direction:'过牌摊牌',condition:'对手过牌；更差对子不跟下注，Kx也不会弃牌。'},
  {id:'R03',scenario:'ipSRP',board:['Ks','Th','4s','2c','2h'],hole:['8s','7s'],direction:'放弃诈唬，过牌',condition:'对手过牌；本题设定他不会弃掉你想赶走的更好牌。'},
  {id:'R04',scenario:'oopSRP',board:['Ks','9h','5d','2c','7h'],hole:['Kh','Qs'],task:'odds'},
  {id:'R05',scenario:'ipSRP',board:['As','Kh','7d','2d','3h'],hole:['Ah','Kc'],direction:'重新评估对手加注范围',condition:'你用两对价值下注，对手加注。'},
  {id:'R06',scenario:'oopSRP',board:['Qs','Th','5d','2d','6h'],direction:'减少机械三枪诈唬',condition:'翻牌和转牌你下注、对手跟注；该对手跟转牌后在河牌很少弃牌。',exploit:true},
  {id:'R07',scenario:'ipSRP',board:['9s','8h','6s','2d','7c'],direction:'重新评估，不自动再超池',condition:'采用表中转牌超池路线并被跟注；河牌使公共牌更连接。'},
  {id:'R08',scenario:'oopSRP',board:['Js','7h','3d','2d','9h'],direction:'增加河牌施压',condition:'前面曾有一街双方过牌，而且有证据表明对手在这条线路河牌弃牌过多。',exploit:true},
];
export const riverRules=riverSpecs.map(s=>({...streetSource(7,s.id),street:'river',category:boardClass(s.board.slice(0,3).map(card)),...s}));
export const allRules=[...flopRules,...turnRules,...riverRules];
export const activeRules=allRules.filter(r=>!r.pending);
export const branches=sources.postflop[1].rows.filter(r=>/^D\d{2}\n/.test(r.values.B||'')).map(r=>({id:r.values.B.split('\n')[0],title:r.values.B.split('\n')[1],text:r.values.D,reason:r.values.E,source:`牌面分支与原因 · D${r.row} / E${r.row}`}));
export const CATEGORY_OPTIONS=Object.entries(BOARD_NAMES).map(([id,label])=>({id,label}));
