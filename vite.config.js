import {defineConfig} from 'vite';
import {createRequire} from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
const {createSolverCatalogue}=createRequire(import.meta.url)('./desktop/solver-service.cjs');
export default defineConfig({plugins:[{
 name:'local-solver-development',
 configureServer(server){
  const workDir=fs.mkdtempSync(path.join(os.tmpdir(),'poker-dev-solver-'));
  const engine=createSolverCatalogue({rootDir:path.resolve('research'),executable:path.resolve('research/solver-probe/target/release/trainer_engine.exe'),workDir});
  server.httpServer?.once('close',()=>{engine.stop();const resolved=path.resolve(workDir);if(path.dirname(resolved)===path.resolve(os.tmpdir())&&path.basename(resolved).startsWith('poker-dev-solver-'))fs.rmSync(resolved,{recursive:true,force:true,maxRetries:4,retryDelay:150});});
  server.middlewares.use('/__solver',async(req,res)=>{
   try{
    if(req.method!=='POST')throw new Error('仅允许本机POST');
    if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)throw new Error('非法来源');
    let body='';for await(const chunk of req){body+=chunk;if(body.length>16000)throw new Error('请求过长');}
    const input=JSON.parse(body);const data=input.method==='info'?engine.info(input.dataset):input.method==='node'?await engine.node(input.dataset,input.history):input.method==='solve'?engine.solve(input.input):input.method==='status'?engine.solveStatus():input.method==='cancel'?engine.cancelSolve():input.method==='board'?engine.solveBoard(input.input):input.method==='boardStatus'?engine.boardStatus():input.method==='boardCancel'?engine.cancelBoard():null;
    if(!data)throw new Error('无效方法');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));
   }catch(e){res.statusCode=400;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e.message}));}
  });
 }
}]});
