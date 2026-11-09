// Current-memory practice scopes. Sampling controls do not change the scoring scope.
export function scopeKey(s) {
  const fields=['module'];
  if(['open','threebet','bb'].includes(s.module))fields.push('position',...(s.module==='bb'?['size','chart']:[]));
  else if(s.module==='ranking')fields.push('orderDirection');
  else if(['flop','turn','river','exploit'].includes(s.module))fields.push('scenario','category','unit','task');
  else if(s.module==='scenario')fields.push('scenario');
  else if(s.module==='mixed')fields.push('scenario','category','mixPre','mixReading','mixPost');
  else if(['sequence','branch'].includes(s.module))fields.push('unit');
  else fields.push('category','readingType','street');
  return JSON.stringify(fields.map(f=>[f,s[f]??'all']));
}
export function incrementScore(scores,key,correct) {
  const current=scores[key]||{right:0,wrong:0};
  return {...scores,[key]:{...current,[correct?'right':'wrong']:current[correct?'right':'wrong']+1}};
}
export function settingsIssue(s) {
  if(['open','threebet','bb'].includes(s.module)&&s.sampling!=='all'&&!s.mixed&&!s.boundary&&!s.changes&&(s.sampling==='edge'||Number(s.edgeRatio)>0))return '请至少选择一种边缘牌类型，或切换到全范围。';
  if(s.module==='mixed'&&!s.mixPre&&!s.mixReading&&!s.mixPost)return '请至少选择一种综合练习内容。';
  return '';
}
