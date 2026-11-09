// Optional cache warming only. Runtime coverage is every legal flop, not this list.
const fs=require('node:fs'),path=require('node:path'),{spawnSync,spawn}=require('node:child_process');
const {preparePostflopRequest,category}=require('../desktop/postflop-coverage.cjs');
const engine=path.resolve('research/solver-probe/target/release/trainer_engine.exe');
const boards=[['Ks','9s','4s'],['Qh','Qs','4d'],['Ah','Td','6h'],['Ks','Qh','Jd'],['Jh','Th','6c'],['9s','8h','6d']];
const root=path.resolve('research/postflop-coverage');fs.mkdirSync(root,{recursive:true});const entries=[];
for(const [scene,folder] of [['btn-bb','postflop-pilot'],['sb-bb','postflop-pilot-sb']])for(const board of boards){
 const source=JSON.parse(fs.readFileSync(path.join('research',folder,'request.json'))),request=preparePostflopRequest(source,board,{sourceId:scene,multiSize:true});
 const dir=path.join(root,request.id);fs.mkdirSync(dir,{recursive:true});if(!fs.existsSync(path.join(dir,'strategy.bin')))fs.writeFileSync(path.join(dir,'request.json'),JSON.stringify(request,null,2));
 entries.push({id:request.id,scene,category:category(board),board,folder:request.id});
}
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({version:1,cacheOnly:true,unrestrictedRuntimeFlops:true,entries},null,2));
async function run(){for(const e of entries){const dir=path.join(root,e.folder);if(fs.existsSync(path.join(dir,'strategy.bin'))){console.log('exists '+e.id);continue;}
 const preflight=spawnSync(engine,['probe',dir],{encoding:'utf8',windowsHide:true,env:{...process.env,RAYON_NUM_THREADS:'2'}});if(preflight.status!==0)throw new Error(preflight.stderr);const p=JSON.parse(fs.readFileSync(path.join(dir,'preflight.json')));console.log(JSON.stringify({id:e.id,...p}));if(!p.fits)throw new Error('Memory guard: '+e.id);
 if(process.argv.includes('--probe-only'))continue;
 await new Promise((resolve,reject)=>{const child=spawn(engine,['solve',dir],{windowsHide:true,env:{...process.env,RAYON_NUM_THREADS:'2'},stdio:['ignore','pipe','pipe']});const out=fs.createWriteStream(path.join(dir,'solve.log'));child.stdout.pipe(out);child.stderr.pipe(out);child.on('exit',code=>code===0?resolve():reject(new Error(e.id+' exit '+code)));child.on('error',reject);});console.log('solved '+e.id);
 }}run().catch(e=>{console.error(e);process.exitCode=1;});
