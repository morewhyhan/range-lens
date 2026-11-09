const fs=require('node:fs');
const path=require('node:path');
async function runPostflopSmoke(win,output){
 fs.mkdirSync(output,{recursive:true});const errors=[];win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
 const js=code=>win.webContents.executeJavaScript(code);
 async function wait(condition,label,tries=300){for(let i=0;i<tries;i++){const error=await js("document.querySelector('.pf-threebet-dialog .pf-error')?.textContent");if(error)throw new Error('3bet求解失败：'+error);if(await js(condition))return;await new Promise(r=>setTimeout(r,100));}fs.writeFileSync(path.join(output,'failure-state.json'),JSON.stringify(await js("({text:document.querySelector('.pf-app')?.innerText,error:document.querySelector('.pf-error')?.textContent,active:document.querySelector('.pf-guide-actions .active')?.textContent})"),null,2));await screenshot('failure');throw new Error('等待超时：'+label);}
 async function screenshot(name){await new Promise(r=>setTimeout(r,180));const capture=await win.webContents.capturePage();if(capture.isEmpty())throw new Error('空截图');fs.writeFileSync(path.join(output,name+'.png'),capture.toPNG());}
 await wait("Boolean(document.querySelector('.app-header'))",'首页');
 await js("[...document.querySelectorAll('.section-tabs button')].find(b=>b.textContent==='翻后').click()");
 await wait("Boolean(document.querySelector('.pf-generator'))",'默认自动生成新牌面');
 await js("document.querySelector('[aria-label=\"关闭新局面\"]').click()");await wait("!document.querySelector('.pf-generator')",'取消新求解返回已有数据');
 await wait("document.querySelectorAll('.pf-grid').length===2 && !document.querySelector('.pf-error') && document.querySelectorAll('.pf-action-buttons button').length>0",'真实求解局面');
 const initial=await js("({hand:document.querySelector('.pf-hole').textContent,history:document.querySelector('.pf-history').textContent,grids:document.querySelectorAll('.pf-grid button').length})");
 if(initial.grids!==338)throw new Error('双方矩阵不是338格');
 await js("[...document.querySelectorAll('.pf-guide-groups button[data-relation]')].find(b=>!b.disabled).click()");
 await wait("document.querySelectorAll('.pf-guide-examples .card').length>0 && document.querySelectorAll('.pf-unfocused').length>0",'具体底牌与图表同步');await screenshot('postflop-guide-strength');
 await js("document.querySelectorAll('.pf-guide-nav button')[1].click()");await wait("document.querySelectorAll('.pf-guide-actions button').length>1",'动作比较引导');
 await js("const b=[...document.querySelectorAll('.pf-answer-mix button')].find(b=>b.querySelector('span').textContent.startsWith('下注')&&parseFloat(b.querySelector('b').textContent)>0)||[...document.querySelectorAll('.pf-answer-mix button')].sort((a,b)=>parseFloat(b.querySelector('b').textContent)-parseFloat(a.querySelector('b').textContent))[0];document.querySelectorAll('.pf-guide-actions button')[[...b.parentNode.children].indexOf(b)].click()");await wait("document.querySelectorAll('.pf-guide-responses button').length>0 || ['过牌','跟注','弃牌'].includes(document.querySelector('.pf-guide-actions .active span')?.textContent)",'真实回应比较');await screenshot('postflop-guide-comparison');
 if(await js("document.querySelector('.pf-history').textContent")!==initial.history)throw new Error('引导预览改变了实际历史');
 win.setContentSize(1366,768);await new Promise(r=>setTimeout(r,250));
 if(!await js("[...document.querySelectorAll('.pf-grid')].every(g=>g.getBoundingClientRect().height>=130 && g.getBoundingClientRect().bottom<=document.querySelector('.pf-decision').getBoundingClientRect().top) && document.documentElement.scrollWidth<=innerWidth"))throw new Error('小屏引导图表被遮挡或过小');
 await screenshot('postflop-guide-compact');
 await js("document.querySelectorAll('.pf-guide-nav button')[0].click()");
 await js("document.querySelector('.pf-study-toggle').click()");await wait("document.querySelector('.pf-app').dataset.learning==='false'",'独立模式');
 await js("document.querySelector('.pf-study-toggle').click()");await wait("document.querySelector('.pf-app').dataset.learning==='true'",'观察模式');
 await js("document.querySelector('.pf-action-buttons button').click()");await wait("Boolean(document.querySelector('.pf-answer-mix'))",'观察动作');
 if(!await js("document.querySelector('.pf-score').textContent.includes('0 对') && document.querySelector('.pf-score').textContent.includes('0 错')"))throw new Error('观察模式不应计分');
 await js("document.querySelector('.pf-study-toggle').click()");await wait("Boolean(document.querySelector('.pf-action-buttons'))",'切换独立作答');
 await js("document.querySelector('.pf-history button').click()");await wait("document.querySelectorAll('.pf-start-grid span').length===338",'翻前范围桥接');
 await screenshot('postflop-starting-ranges');
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");await wait("!document.querySelector('.pf-dialog')",'返回当前局面');
 for(const [width,height] of [[1920,1080],[1366,768]]){
  win.setContentSize(width,height);await new Promise(r=>setTimeout(r,250));
  const layout=await js("({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,covered:[...document.querySelectorAll('.pf-grid')].some(g=>g.getBoundingClientRect().bottom>document.querySelector('.pf-decision').getBoundingClientRect().top),buttons:[...document.querySelectorAll('.pf-action-buttons button')].map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,x:r.x,y:r.y,bottom:r.bottom}})})");
  if(layout.overflow||layout.covered||layout.buttons.some(b=>b.bottom>height||b.y<0))throw new Error('布局溢出：'+JSON.stringify(layout));
  await screenshot(`postflop-${width}x${height}`);
 }
 await js("document.querySelector('.pf-unknown').click()");await wait("Boolean(document.querySelector('.pf-answer-mix'))",'答后策略');
 if(!await js("document.querySelector('.pf-score').textContent.includes('1 错')"))throw new Error('不知道没有计错');
 await screenshot('postflop-answer');
 await js("document.querySelector('.pf-next-buttons button').click()");
 await wait("Boolean(document.querySelector('.pf-action-buttons'))",'换手牌');
 const after=await js("document.querySelector('.pf-history').textContent");if(after!==initial.history)throw new Error('换手牌意外改变行动历史');
 await js("document.querySelector('.pf-unknown').click()");
 await wait("Boolean(document.querySelector('.pf-answer-mix'))",'第二次答后');
 await js("[...document.querySelectorAll('.pf-answer-mix button')].sort((a,b)=>parseFloat(b.querySelector('b').textContent)-parseFloat(a.querySelector('b').textContent))[0].click()");
 await js("document.querySelector('.pf-next-buttons .pf-primary').click()");
 await wait("!document.querySelector('.pf-error') && !document.querySelector('.pf-decision').textContent.includes('正在读取') && (document.querySelector('.pf-history').textContent!=="+JSON.stringify(initial.history)+")",'真实后继');
 await screenshot('postflop-successor');
 await js("document.querySelector('.pf-varied').click()");
 {
  await wait("!document.querySelector('.pf-error') && !document.querySelector('.pf-decision').textContent.includes('正在读取') && document.querySelectorAll('.pf-table-state>.cards .card').length>=4",'随机转牌决策点');await screenshot('postflop-varied-spot');
 }
 await js("document.querySelector('[aria-label=\"练习设置\"]').click()");await wait("Boolean(document.querySelector('.pf-dialog input'))",'设置');
 const focus=await js("document.querySelector('.pf-dialog').contains(document.activeElement)");if(!focus)throw new Error('设置没有获取焦点');
 await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");await wait("!document.querySelector('.pf-dialog')",'关闭设置');
 await js("document.querySelector('.pf-scene').click()");await wait("Boolean(document.querySelector('.pf-scene-option:not(:disabled)'))",'局面选择');
 const sbReady=await js("!document.querySelectorAll('.pf-scene-option')[1].disabled");
 let visualEvidenceChecked=false,threebetChecked=[];
 if(sbReady){
  await js("document.querySelectorAll('.pf-scene-option')[1].click()");await wait("document.querySelector('.pf-scene').textContent.includes('SB 对 BB') && document.querySelectorAll('.pf-action-buttons button').length>0",'SB真实求解配置');
  if(!await js("document.querySelector('.pf-history').textContent.includes('SB 开池 3')"))throw new Error('SB前序或位置未切换');
  await screenshot('postflop-sb');
  await js("document.querySelector('.pf-unknown').click()");await wait("Boolean(document.querySelector('.pf-answer-mix'))",'SB策略');
  // Verify the default guided interface rather than advanced controls.
  let canPreview=false;
  for(let tries=0;tries<30;tries++){
   canPreview=await js("[...document.querySelectorAll('.pf-answer-mix button')].some(b=>b.querySelector('span').textContent.startsWith('下注') && parseFloat(b.querySelector('b').textContent)>0)");
   if(canPreview){await js("[...document.querySelectorAll('.pf-answer-mix button')].find(b=>b.querySelector('span').textContent.startsWith('下注')).click()");await wait("Boolean(document.querySelector('.pf-guide-outcomes'))",'下注回应');canPreview=await js("[...document.querySelectorAll('.pf-guide-outcomes button')].some(b=>b.textContent.startsWith('较弱牌继续'))");if(canPreview)break;}
   await js("document.querySelector('.pf-next-buttons button').click()");await wait("Boolean(document.querySelector('.pf-action-buttons'))",'换观察手牌');await js("document.querySelector('.pf-unknown').click()");await wait("Boolean(document.querySelector('.pf-answer-mix'))",'新的观察策略');
  }
  if(!canPreview)throw new Error('未取得可验证的较弱牌继续局面');
  if(canPreview){
   const beforePreview=await js("document.querySelector('.pf-history').textContent");
   await wait("Boolean(document.querySelector('.pf-guide-outcomes'))",'对手回应预览');
   await js("[...document.querySelectorAll('.pf-guide-outcomes button')].find(b=>b.textContent.startsWith('较弱牌继续')).click()");await wait("document.querySelectorAll('.pf-focus-fill').length>0 && document.querySelectorAll('.pf-unfocused').length>0",'支付关系高亮');
   await screenshot('postflop-payment-highlight');
   if(await js("document.querySelector('.pf-history').textContent")!==beforePreview)throw new Error('观察筛选意外执行了行动');
   await js("document.querySelectorAll('.pf-chart-pair .pf-range')[1].querySelector('.pf-grid button:not(:disabled):not(.empty):not(.pf-unfocused)').click()");await wait("Boolean(document.querySelector('.pf-combo-item button'))",'具体对手组合');
   await js("document.querySelector('.pf-combo-item button').click()");await wait("Boolean(document.querySelector('.pf-equity-bar'))",'独立枚举摊牌权益');
   await screenshot('postflop-combo-equity');
   visualEvidenceChecked=true;
   await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  }
 }
 for(const [index,seat] of [[2,'BTN'],[3,'SB']]){
  await js("document.querySelector('.pf-scene').click()");await wait("document.querySelectorAll('.pf-scene-option').length===4",'四类场景');await js(`document.querySelectorAll('.pf-scene-option')[${index}].click()`);await wait("Boolean(document.querySelector('.pf-threebet-dialog'))",'3bet配置');
  if(!await js("document.querySelector('.pf-solve-start').disabled"))throw new Error('缺少跟注范围时仍允许求解');
  await js("document.querySelector('[data-hand=QQ]').click();document.querySelector('[data-hand=QQ]').click();document.querySelectorAll('.pf-threebet-tabs button')["+(index===2?1:0)+"].click()");
  await js("[...document.querySelectorAll('.pf-threebet-edit-tools button')].find(b=>b.textContent.includes('清空')).click();document.querySelector('[data-hand=AA]').click();document.querySelector('[data-hand=AA]').click();document.querySelector('[data-hand=AKs]').click()");
  await screenshot(index===2?'postflop-3bet-ip-setup':'postflop-3bet-oop-setup');
  await js("document.querySelector('.pf-solve-start').click()");
  await wait("!document.querySelector('.pf-threebet-dialog') && Boolean(document.querySelector('.pf-action-buttons')) && document.querySelector('.pf-history').textContent.includes('3bet')",'真实3bet求解与练习',3000);
  if(!await js("document.querySelector('.pf-status').textContent.includes('"+seat+"')"))throw new Error('3bet位置错误');
  await js("document.querySelector('.pf-history button').click()");await wait("document.querySelectorAll('.pf-start-grid span').length===338",'3bet起始双范围');
  if(!await js("document.querySelector('.pf-start-dialog').textContent.includes('条件范围')"))throw new Error('自定义3bet未标注条件输入');
  await js("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  await js("document.querySelector('.pf-unknown').click()");await wait("Boolean(document.querySelector('.pf-answer-mix'))",'3bet真实动作频率与EV');
  await screenshot(index===2?'postflop-3bet-ip':'postflop-3bet-oop');
  threebetChecked.push(index===2?'3bet-ip':'3bet-oop');
 }
 await js("document.querySelector('.pf-new-board').click()");await wait("Boolean(document.querySelector('.pf-generator .pf-solve-progress button'))",'独立牌面入口');
 await js("document.querySelector('.pf-generator .pf-solve-progress button').click()");await wait("Boolean(document.querySelector('[aria-label=\"任意翻牌\"]'))",'设置任意合法翻牌');
 await js("(()=>{const s=document.querySelector('[aria-label=\"新局面情境\"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'srp-BTN-2.5');s.dispatchEvent(new Event('change',{bubbles:true}));const b=document.querySelector('[aria-label=\"任意翻牌\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(b,'Ks 9s 4s');b.dispatchEvent(new Event('input',{bubbles:true}));})()");
 await js("document.querySelector('.pf-generator>.pf-primary').click()");await wait("!document.querySelector('.pf-generator') && document.querySelector('.pf-scene').textContent.includes('BTN 对 BB') && document.querySelector('.pf-table-state>.cards').textContent.includes('9')",'独立翻牌策略进入训练',3000);
 const independent=await js("window.pokerSolver.info('btn-bb-Ks9s4s-multi').then(d=>({board:d.root.board,betCount:d.root.actions.filter(a=>a.startsWith('Bet')).length,fingerprint:d.request.inputFingerprint}))");if(independent.board.slice().sort().join('')!==['Ks','9s','4s'].sort().join('')||independent.betCount!==2)throw new Error('新牌面没有独立双尺度求解数据');await screenshot('postflop-independent-flop');
 await js("document.querySelector('.pf-other-role').click()");await wait("document.querySelector('.pf-status h1').textContent.includes('BB') && document.querySelectorAll('.pf-grid').length===2",'同一模型练防守方');await screenshot('postflop-defender-role');
 if(errors.length)throw new Error(errors.join('\n'));
 const result={ok:true,packaged:require('electron').app.isPackaged,twoRangeCharts:338,unknownCountsWrong:true,changingHandKeepsNode:true,realSuccessor:true,settingsFocusAndEscape:true,sbProfileSwitched:sbReady,visualEvidenceChecked,threebetChecked,automaticIndependentFlopEntry:true,nonA72IndependentStrategy:true,multipleFlopSizes:true,defenderRole:true,viewports:[[1920,1080],[1366,768]],errors};
 fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(result,null,2));return result;
}
module.exports={runPostflopSmoke};
