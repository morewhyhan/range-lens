import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve('research/postflop-coverage'),out=path.resolve('.build-cache/coverage-release');fs.mkdirSync(out,{recursive:true});
const digest=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),engine=digest('research/solver-probe/target/release/trainer_engine.exe');
const manifest=fs.existsSync(path.join(root,'manifest.json'))?JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))):{entries:[]},entries=[];
for(const entry of manifest.entries){
 if(!/^[a-zA-Z0-9.-]+$/.test(entry.folder))throw new Error('非法缓存目录');const dir=path.join(root,entry.folder),file=path.join(dir,'verification.json');if(!fs.existsSync(file))continue;
 const report=JSON.parse(fs.readFileSync(file)),request=JSON.parse(fs.readFileSync(path.join(dir,'request.json'))),result=JSON.parse(fs.readFileSync(path.join(dir,'result.json')));
 if(!report.ok||!result.targetReached||report.inputFingerprint!==request.inputFingerprint||result.inputFingerprint!==request.inputFingerprint||report.engineSHA256!==engine)throw new Error('缓存未通过核验：'+entry.id);
 for(const [f,hash] of Object.entries(report.files))if(!['request.json','result.json','strategy.bin'].includes(f)||digest(path.join(dir,f))!==hash)throw new Error('缓存文件已变化：'+entry.id+'/'+f);
 const folder=entry.folder+'-'+request.inputFingerprint.slice(0,12),target=path.join(out,folder);fs.mkdirSync(target,{recursive:true});
 for(const f of ['request.json','result.json','strategy.bin','verification.json']){const destination=path.join(target,f);if(fs.existsSync(destination)&&digest(destination)===digest(path.join(dir,f)))continue;fs.copyFileSync(path.join(dir,f),destination);}
 entries.push({...entry,folder});
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({version:1,cacheOnly:true,unrestrictedRuntimeFlops:true,entries},null,2));console.log(JSON.stringify({verifiedCachedModels:entries.length,allOtherFlops:'on-demand independent solve'}));
