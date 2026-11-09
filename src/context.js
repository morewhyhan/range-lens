export function actionAtSeat(history,seat,hero,opponent){
 const clauses=history.flatMap(line=>line.split(/[，,；;→]/));
 for(const text of [...clauses].reverse()){
  if(/轮到|可以|准备|还要|需要/.test(text))continue;
  if(!text.includes(seat)&&!(seat===hero&&text.includes('你'))&&!(seat===opponent&&text.includes('对手')))continue;
  if(/弃牌/.test(text))return '弃牌';
  if(/3bet/i.test(text))return '3bet';
  if(/加注/.test(text))return '加注';
  if(/跟注/.test(text))return '跟注';
  if(/过牌/.test(text))return '过牌';
  if(/下注|小注|大注/.test(text))return '下注';
  if(/开池/.test(text))return '开池';
 }
 return '';
}
