import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const out=path.resolve('.build-cache/solver-release-source');
fs.mkdirSync(out,{recursive:true});
function copyTree(from,target){const stat=fs.lstatSync(from);if(stat.isSymbolicLink())return;if(stat.isDirectory()){if(['.git','target','node_modules'].includes(path.basename(from)))return;fs.mkdirSync(target,{recursive:true});for(const name of fs.readdirSync(from))copyTree(path.join(from,name),path.join(target,name));}else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,fs.readFileSync(from));}}
const copy=(from,to=from)=>copyTree(from,path.join(out,to));
for(const dir of ['src','desktop','public','scripts','tests'])copy(dir);
for(const file of ['package.json','package-lock.json','index.html','vite.config.js','electron-builder.cjs','THIRD_PARTY_NOTICES.md'])copy(file);
copy('research/solver-source');copy('research/solver-probe/Cargo.toml');copy('research/solver-probe/Cargo.lock');copy('research/solver-probe/src/bin/trainer_engine.rs');
for(const file of ['reference-request-btn-bb-a72.json','reference-request-sb-bb-qqq.json','tiny-river-matched-package-v1.json','sb-bb-qqq-reload-export-v2.json','sb-bb-qqq-reference-result-v2.json'])copy('research/nevir-system/'+file);
for(const file of ['request.json','result.json','preflight.json','verification.json'])copy('research/postflop-pilot/'+file);
for(const file of ['request.json','result.json','preflight.json','verification.json'])copy('research/postflop-pilot-sb/'+file);
const coverageManifest='.build-cache/coverage-release/manifest.json';if(fs.existsSync(coverageManifest)){copy(coverageManifest,'research/postflop-coverage/manifest.json');for(const entry of JSON.parse(fs.readFileSync(coverageManifest)).entries)for(const file of ['request.json','result.json','verification.json'])copy('.build-cache/coverage-release/'+entry.folder+'/'+file,'research/postflop-coverage/'+entry.folder+'/'+file);}
copy('research/solver-source/LICENSE','SOLVER-LICENSE.txt');
for(const [module,file] of [['react','LICENSE'],['react-dom','LICENSE'],['@phosphor-icons/react','LICENSE']])copy(`node_modules/${module}/${file}`,`licenses/${module.replaceAll('/','-')}.txt`);
const config=path.join(out,'research/solver-probe/.cargo/config.toml');fs.mkdirSync(path.dirname(config),{recursive:true});fs.writeFileSync(config,'[source.crates-io]\nreplace-with = "vendored-sources"\n\n[source.vendored-sources]\ndirectory = "../../vendor"\n');
const seven=process.env.ELECTRON_BUILDER_7ZIP_PATH||path.resolve('.build-cache/electron-builder/7zip@1.0.0/7zip-win-x64-me3aj/bin/7za.exe');
const archived=spawnSync(seven,['a','-tzip','-mx=5','-y',path.join(out,'vendor-sources.zip'),'vendor'],{cwd:out,windowsHide:true,encoding:'utf8'});
if(archived.status!==0)throw new Error(archived.stderr||archived.error?.message||'依赖源码归档失败');
fs.writeFileSync(path.join(out,'BUILD.md'),`# 对应源码构建\n\n引擎提交：9d1509fe5077d019825f833eed04b16d342dfda1。\n\n先解压vendor-sources.zip，恢复本目录下的vendor文件夹。\n\n1. 在research/solver-probe中使用Rust/Cargo，设置RUSTFLAGS为 -A dangerous_implicit_autorefs，执行 cargo build --release --locked --bin trainer_engine。\n2. 回到本目录，执行 npm ci 和 npm run build。\n3. 将目录版resources/solver-data下两套配置的strategy.bin分别复制到research/postflop-pilot和research/postflop-pilot-sb，可直接复用已核验策略。另将resources/solver-data/postflop-coverage完整复制到research/postflop-coverage，保留manifest及各缓存目录中的strategy.bin。也可以从request.json用trainer_engine solve重新求解；重求解前必须选择新输出目录，不覆盖现有策略。\n4. 执行 npm run verify:postflop-pilot，以及 node scripts/verify-postflop-pilot.mjs research/postflop-pilot-sb，然后 npm run package:win:dir:current。\n\n源码和只读求解数据一起构成本次可检查交付。依赖版本由Cargo.lock与package-lock.json固定。\n`);
console.log(out);
