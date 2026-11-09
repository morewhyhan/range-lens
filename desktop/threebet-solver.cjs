const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {validateThreebet}=require('./threebet-config.cjs');
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function createThreebetSolver({workDir,executable,createService,onReady,prepareRequest=validateThreebet}){
 let job=null,child=null,sequence=0,disposed=false,verifying=false,verificationService=null;
 const status=()=>job?{id:job.id,scene:job.scene,state:job.state,board:job.board,iterations:job.iterations||0,errorBB:job.errorBB??null,targetBB:job.targetBB,error:job.error||null}:{state:'idle'};
 async function verify(dir,request){
  const service=createService({dataDir:dir,executable,requireVerification:false});
  verificationService=service;
  let edges=0;
  try{
   const root=await service.node([]);
   for(let side=0;side<2;side++)root.orderedHands[side].forEach((h,i)=>{
    const a=h.slice(0,2),b=h.slice(2),r='AKQJT98765432';const ranks=[a[0],b[0]].sort((x,y)=>r.indexOf(x)-r.indexOf(y));const key=a[0]===b[0]?a[0]+b[0]:ranks.join('')+(a[1]===b[1]?'s':'o');
    if(Math.abs(root.rawWeights[side][i]-request.ranges[side?'ip':'oop'].classWeights[key])>1e-5)throw new Error('起始范围核验失败');
   });
   async function check(n,a){const c=await service.node([...n.historyIndices,a]);edges++;const count=n.actor===null?0:n.orderedHands[n.actor].length;
    for(let s=0;s<2;s++)for(let i=0;i<n.rawWeights[s].length;i++){
     const expected=n.rawWeights[s][i]*(n.chance?(n.orderedHands[s][i].includes(c.board.at(-1))?0:1):s===n.actor?n.strategyActionMajor[a*count+i]:1);
     if(Math.abs(expected-c.rawWeights[s][i])>1e-4)throw new Error('行动筛选权重核验失败');
    }
    if(c.actor!==null){const count=c.orderedHands[c.actor].length;for(let i=0;i<count;i++)if(c.compatibleMassWeights[c.actor][i]>0){let sum=0;for(let j=0;j<c.actions.length;j++)sum+=c.strategyActionMajor[j*count+i];if(Math.abs(sum-1)>1e-4)throw new Error('策略归一化核验失败');}}
    return c;
   }
   for(let a=0;a<root.actions.length;a++){const c=await check(root,a);if(c.actor!==null)for(let b=0;b<c.actions.length;b++)await check(c,b);}
   for(const betting of [false,true]){let n=root;for(let step=0;!n.terminal&&step<32;step++){
    let a;if(n.chance)a=n.chanceCards.find(c=>c.card===(n.board.length===3?'Kc':'Qc'))?.id??n.chanceCards[0].id;
    else if(betting)a=n.actions.findIndex(a=>a.startsWith('Bet('));
    else a=n.actions.indexOf('Check');
    if(a<0)a=n.actions.indexOf('Call');if(a<0&&betting)a=n.actions.findIndex(a=>a.startsWith('AllIn'));if(a<0)throw new Error('缺少核验路线动作：'+JSON.stringify(n.actions)+' at '+JSON.stringify(n.historyIndices));n=await check(n,a);
   }if(!n.terminal||n.board.length!==5)throw new Error('三街路线核验未完成');}
   const result=JSON.parse(fs.readFileSync(path.join(dir,'result.json')));
   if(result.targetReached!==true)throw new Error('尚未达到设定的求解精度');
   const report={ok:true,inputFingerprint:request.inputFingerprint,rootAndFirstResponsesChecked:true,threeStreetCheckAndBetCall:true,edges,independentSecondSolver:false,customInputs:!request.sourceId||request.sourceId.startsWith('3bet-'),inputAuthority:request.sourceId?'explicit source-root transformation':'explicit caller-provided configuration',engineSHA256:digest(executable),files:Object.fromEntries(['request.json','result.json','strategy.bin'].map(f=>[f,digest(path.join(dir,f))]))};
   fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2));
  }finally{service.stop();if(verificationService===service)verificationService=null;}
 }
 function start(input){
  if(disposed)throw new Error('求解器已关闭');
  if(child||verifying)throw new Error('已有求解正在进行，请等待或取消');
  const request=prepareRequest(input);
  fs.mkdirSync(workDir,{recursive:true});const dir=fs.mkdtempSync(path.join(workDir,'threebet-'));
  const id=++sequence;job={id,scene:input.scene,board:request.context.flop,state:'solving',targetBB:request.targetExploitabilityUnits/100};
  fs.writeFileSync(path.join(dir,'request.json'),JSON.stringify(request,null,2));
  child=spawn(executable,['solve',dir],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,RAYON_NUM_THREADS:'2'}});
  const processRef=child;
  let buffer='',stderr='';child.stdout.on('data',chunk=>{buffer+=chunk;let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);try{const p=JSON.parse(line);if(job.id===id&&p.iterations){job.iterations=p.iterations;job.errorBB=p.metricUnits/100;}}catch{}}});
  child.stderr.on('data',c=>{stderr=(stderr+c).slice(-1600);});
  child.on('error',e=>{if(job.id===id){job.state='error';job.error=e.message;}if(child===processRef)child=null;});
  child.on('exit',async code=>{
   if(child===processRef)child=null;if(disposed||job.id!==id||job.state==='cancelled')return;
   if(code!==0){job.state='error';job.error=/memory guard|low free memory/i.test(stderr)?'当前可用内存不足以计算这个动作模型。请减少下注／加注档位，或释放内存后重试；没有使用未完成结果判分。':'求解未完成：'+stderr;return;}
   job.state='verifying';verifying=true;
   try{await verify(dir,request);if(disposed||job.id!==id||job.state==='cancelled')return;onReady(input.scene,dir);job.state='ready';}
   catch(e){if(job.id===id&&job.state!=='cancelled'){job.state='error';job.error=e.message;}}
   finally{verifying=false;}
  });return status();
 }
 function cancel(){if(job&&['solving','verifying'].includes(job.state)){job.state='cancelled';child?.kill();child=null;}return status();}
 return {start,status,cancel,stop:()=>{disposed=true;cancel();verificationService?.stop();}};
}
module.exports={createThreebetSolver};
