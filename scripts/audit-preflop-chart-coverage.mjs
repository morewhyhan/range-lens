// Read-only audit of the extracted preflop chart inventory.
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve('.');
const charts=JSON.parse(fs.readFileSync(path.join(root,'src/data/ranges.json'),'utf8'));
const byGroup=Object.groupBy(charts,c=>c.group);
const rows=charts.map(chart=>{
  const entries=Object.values(chart.hands);
  const actionSet=[...new Set(entries.flatMap(h=>Object.keys(h.action)))].sort();
  const pure={};
  for(const a of actionSet) pure[a]=entries.filter(h=>Object.keys(h.action).length===1&&h.action[a]===1).length;
  const mixed=entries.filter(h=>Object.keys(h.action).length>1).length;
  const mass={};
  for(const h of entries) for(const [a,w] of Object.entries(h.action)) mass[a]=(mass[a]??0)+w;
  return {id:chart.id,group:chart.group,name:chart.name,source:chart.source,image:chart.image,cells:entries.length,actionSet,pure,mixed,mass};
});
for(const row of rows){
  if(row.cells!==169) throw new Error(`${row.id}: expected 169 cells`);
  if(!fs.existsSync(path.join(root,'public',row.image.replace(/^\//,'')))) throw new Error(`${row.id}: missing ${row.image}`);
}
const output={
  status:'source_inventory_not_strategy_completion',
  sourceWorkbook:'C:/Users/why/Desktop/翻前策略整合版_六工作表.xlsx',
  sourceSheets:['开池图表','频率明细','3bet防守','3bet边缘变化','大盲防守','大盲边缘差异'],
  chartCount:rows.length,
  chartsByGroup:Object.fromEntries(Object.entries(byGroup).map(([k,v])=>[k,v.length])),
  totalCells:rows.reduce((n,r)=>n+r.cells,0),
  physicalComboClassesPerChart:169,
  physicalTwoCardCombosPerChart:1326,
  openTypedFrequencyCrossCheck:'The source-extraction script asserts all 845 typed open-chart rows agree with the simplified SVG frequencies.',
  charts:rows,
  interpretation:{
    open:'Five position charts with raise/fold simplified actions; mixed cells preserve a 50/50 teaching frequency.',
    threebet:'Four position charts with raise/fold simplified actions; no UTG chart is present in this extracted source.',
    bb:'Six opponent-profile charts with raise/call/fold simplified actions; scale/profile identity is part of the input.',
    notProven:['complete response ranges after facing a 3bet','complete squeeze/4bet/call policy','postflop strategy','NL50 quality','learner mastery']
  },
  appChanged:false
};
fs.writeFileSync(path.join(root,'research/nevir-system/preflop-chart-coverage.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({ok:true,chartCount:output.chartCount,chartsByGroup:output.chartsByGroup,totalCells:output.totalCells}));
