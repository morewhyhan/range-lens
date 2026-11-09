const fs=require('node:fs');
const path=require('node:path');
const readline=require('node:readline');
const {spawn}=require('node:child_process');

function validateHistory(history){
 if(!Array.isArray(history)||history.length>512||history.some(x=>!Number.isInteger(x)||x<0||x>100))throw new Error('无效的行动历史');
 return history;
}
function createSolverService({dataDir,executable,requireVerification=true}){
 let child=null,nextId=1,stderr='',closed=false;const pending=new Map();
 function stop(error=new Error('求解器已关闭')){closed=true;for(const task of pending.values()){clearTimeout(task.timer);task.reject(error);}pending.clear();child?.kill();child=null;}
 function info(){
  const request=JSON.parse(fs.readFileSync(path.join(dataDir,'request.json'),'utf8'));
  const result=JSON.parse(fs.readFileSync(path.join(dataDir,'result.json'),'utf8'));
  if(request.inputFingerprint!==result.inputFingerprint||result.targetReached!==true)throw new Error('求解配置不匹配或尚未达到目标精度');
  if(requireVerification){const verified=JSON.parse(fs.readFileSync(path.join(dataDir,'verification.json'),'utf8'));if(verified.ok!==true||verified.inputFingerprint!==request.inputFingerprint)throw new Error('求解结果尚未通过范围与路线核验');}
  return {request:{id:request.id,sourceId:request.sourceId,inputFingerprint:request.inputFingerprint,context:request.context,tree:request.tree,scope:request.scope,ranges:Object.fromEntries(Object.entries(request.ranges).map(([k,v])=>[k,{id:v.id,source:v.source,action:v.action,classWeights:v.classWeights}]))},result:{engineRevision:result.engineRevision,iterations:result.iterations,errorBB:result.achievedMetricUnits/100,targetBB:result.targetMetricUnits/100},root:result.root};
 }
 function start(){
  if(closed)throw new Error('求解器会话已关闭');if(child)return;info();
  child=spawn(executable,['serve',dataDir],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,RAYON_NUM_THREADS:'2'}});
  child.stderr.on('data',b=>{stderr=(stderr+b).slice(-3000);});
  const lines=readline.createInterface({input:child.stdout});
  lines.on('line',line=>{try{const response=JSON.parse(line),task=pending.get(response.requestId);if(!task)return;pending.delete(response.requestId);clearTimeout(task.timer);response.error?task.reject(new Error(response.error)):task.resolve(response.node);}catch{stop(new Error('求解器返回了无效数据'));}});
  child.on('error',e=>stop(e));child.on('exit',code=>{if(!closed)stop(new Error(`求解器退出 ${code}：${stderr}`));});
 }
 function node(history){validateHistory(history);start();if(pending.size>=32)return Promise.reject(new Error('请求过多，请稍后重试'));return new Promise((resolve,reject)=>{const requestId=nextId++;const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('读取求解节点超时'));},60000);pending.set(requestId,{resolve,reject,timer});child.stdin.write(JSON.stringify({requestId,history})+'\n');});}
 return {info,node,stop,isClosed:()=>closed};
}
function createSolverCatalogue({rootDir,executable,workDir}){
 const coverage=require('./postflop-coverage.cjs');
 const profiles={'btn-bb':{folder:'postflop-pilot',title:'BTN 对 BB · 有位置单加注'},'sb-bb':{folder:'postflop-pilot-sb',title:'SB 对 BB · 没位置单加注'},'3bet-ip':{title:'CO 对 BTN · 有位置3bet'},'3bet-oop':{title:'SB 对 BTN · 没位置3bet'}};
 let activeId=null,active=null;
 const coverageRoot=path.join(rootDir,'postflop-coverage'),manifestFile=path.join(coverageRoot,'manifest.json');
 if(fs.existsSync(manifestFile))for(const entry of JSON.parse(fs.readFileSync(manifestFile)).entries){if(!/^[a-zA-Z0-9.-]+$/.test(entry.folder))throw new Error('无效的覆盖数据目录');profiles[entry.id]={dataDir:path.join(coverageRoot,entry.folder),title:entry.id,scene:entry.scene,category:entry.category,board:entry.board};}
 const directory=p=>p.dataDir||(p.folder?path.join(rootDir,p.folder):null);
 const catalogue=()=>Object.entries(profiles).map(([id,p])=>({id,title:p.title,scene:p.scene,category:p.category,board:p.board,ready:Boolean(directory(p)&&fs.existsSync(path.join(directory(p),'verification.json')))}));
 const custom=workDir?require('./threebet-solver.cjs').createThreebetSolver({workDir,executable,createService:createSolverService,onReady:(id,dir)=>{if(activeId===id){active?.stop();active=null;activeId=null;}const request=JSON.parse(fs.readFileSync(path.join(dir,'request.json')));profiles[id].dataDir=dir;profiles[id].title=request.context.preflopLabel;const key='3bet-config-'+require('node:crypto').createHash('sha256').update(JSON.stringify([request.context.oopSeat,request.context.ipSeat,request.context.openToBB,request.context.threebetToBB,request.ranges])).digest('hex').slice(0,20);profiles[key]={dataDir:dir,title:request.context.preflopLabel,kind:'configured-threebet',hero:request.ranges.oop.action==='3bet'?0:1};}}):null;
 let generatedId=null,generalMeta={},cachedReady=false,cachedStatus={};const seen=new Map(),rotation=new Map();
 const generatedCache=[];
 const general=workDir?require('./threebet-solver.cjs').createThreebetSolver({workDir,executable,createService:createSolverService,prepareRequest:input=>input.request,onReady:(_id,dir)=>{const request=JSON.parse(fs.readFileSync(path.join(dir,'request.json')));profiles[generatedId]={dataDir:dir,title:request.context.preflopLabel,scene:request.sourceId,category:request.context.boardCategory,board:request.context.flop};generatedCache.push(generatedId);
  while(generatedCache.length>6){const index=generatedCache.findIndex(id=>id!==activeId&&id!==generatedId);if(index<0)break;const [id]=generatedCache.splice(index,1),target=profiles[id]?.dataDir;if(target){const resolved=fs.realpathSync(target),parent=fs.realpathSync(workDir);if(path.dirname(resolved)!==parent||!path.basename(resolved).startsWith('threebet-'))throw new Error('临时求解缓存路径不合法');fs.rmSync(resolved,{recursive:true,force:true,maxRetries:4,retryDelay:150});delete profiles[id];}}
 }}):null;
 function solveBoard(input={}){
  if(!general)throw new Error('当前环境不支持动态求解');if(['solving','verifying'].includes(custom?.status().state)||['solving','verifying'].includes(general.status().state))throw new Error('已有求解正在进行');
  const sourceChoices=coverage.openingSources().concat(Object.entries(profiles).filter(([,p])=>p.kind==='configured-threebet').map(([id])=>({id}))),cycle=rotation.get('source')??Math.floor(Math.random()*sourceChoices.length*12),plan=coverage.samplingPlan(cycle,sourceChoices.length);
  const sourceId=input.sourceId==='all'?sourceChoices[plan.source].id:input.sourceId||'btn-bb';if(input.sourceId==='all')rotation.set('source',cycle+1);let source;
  if(sourceId.startsWith('srp-'))source=coverage.openingRequest(sourceId);else{if(!Object.hasOwn(profiles,sourceId)||!directory(profiles[sourceId]))throw new Error('该情境尚缺双方范围');source=JSON.parse(fs.readFileSync(path.join(directory(profiles[sourceId]),'request.json')));}
  const key=sourceId,used=seen.get(key)||new Set(),kinds=Object.keys(coverage.CATEGORIES),count=input.sourceId==='all'?plan.category:rotation.get(key)||0;
  const kind=input.category&&input.category!=='all'?input.category:kinds[count%kinds.length];
  const board=input.board?coverage.validateFlop(input.board):coverage.sampleFlop(kind,used);
  const baseSourceId=source.sourceId||profiles[sourceId]?.scene||sourceId;
  const request=coverage.preparePostflopRequest(source,board,{sourceId:baseSourceId,multiSize:input.multiSize!==false,betSizes:input.betSizes});request.sourceId=baseSourceId;delete request.inputFingerprint;request.inputFingerprint=require('node:crypto').createHash('sha256').update(JSON.stringify(request)).digest('hex');
  used.add(coverage.canonical(board));seen.set(key,used);rotation.set(key,count+1);generatedId=request.id;
  if(input.hero!==undefined&&![0,1].includes(input.hero))throw new Error('无效的练习角色');
  generalMeta={sourceId:baseSourceId,hero:input.hero??(input.sourceId==='all'?plan.hero:['raise','3bet'].includes(source.ranges.oop.action)?0:1),board,category:coverage.category(board)};
  cachedReady=false;
  for(const [id,p] of Object.entries(profiles)){const dir=directory(p);if(!dir||!fs.existsSync(path.join(dir,'verification.json')))continue;const prior=JSON.parse(fs.readFileSync(path.join(dir,'request.json')));if(coverage.modelKey(prior)===coverage.modelKey(request)){const info=createSolverService({dataDir:dir,executable}).info();active?.stop();generatedId=id;cachedReady=true;cachedStatus={state:'ready',iterations:info.result.iterations,errorBB:info.result.errorBB,targetBB:info.result.targetBB,error:null};return {...cachedStatus,datasetId:id,...generalMeta};}}
  active?.stop();return {...general.start({scene:generatedId,request}),datasetId:generatedId,...generalMeta};
 }
 function select(id='btn-bb'){
  if(!Object.hasOwn(profiles,id))throw new Error('未知的求解配置');
  if(!directory(profiles[id]))throw new Error('该3bet局面尚未设置双方范围并求解');
  if(activeId!==id||active?.isClosed()){active?.stop();active=createSolverService({dataDir:directory(profiles[id]),executable});activeId=id;}
  return active;
 }
 return {info:(id='btn-bb')=>({...select(id).info(),datasetId:id,catalogue:catalogue(),sources:coverage.openingSources().concat(Object.entries(profiles).filter(([,p])=>p.kind==='configured-threebet').map(([id,p])=>({id,title:p.title,hero:p.hero})))}),node:(id,history)=>select(id).node(history),solve:input=>{if(!custom)throw new Error('当前环境不支持临时求解');if(['solving','verifying'].includes(general?.status().state))throw new Error('已有求解正在进行');active?.stop();return custom.start(input);},solveBoard,boardStatus:()=>({...general?.status(),...(cachedReady?cachedStatus:{}),datasetId:generatedId,...generalMeta}),cancelBoard:()=>general?.cancel(),solveStatus:()=>custom?.status()||{state:'idle'},cancelSolve:()=>custom?.cancel(),stop:()=>{active?.stop();custom?.stop();general?.stop();}};
}
module.exports={createSolverService,createSolverCatalogue,validateHistory};
