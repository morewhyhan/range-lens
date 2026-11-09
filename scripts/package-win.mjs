import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dirOnly = process.argv.includes('--dir');
const verification=JSON.parse(fs.readFileSync(path.join(root,'research/postflop-pilot/verification.json'),'utf8'));
if(verification.ok!==true)throw new Error('普通牌面求解课包尚未通过核验，禁止打包');
const sbVerification=JSON.parse(fs.readFileSync(path.join(root,'research/postflop-pilot-sb/verification.json'),'utf8'));
if(sbVerification.ok!==true)throw new Error('SB–BB课包尚未通过核验，禁止打包');
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const engineDigest=digest(path.join(root,'research/solver-probe/target/release/trainer_engine.exe'));
for(const [folder,report] of [['postflop-pilot',verification],['postflop-pilot-sb',sbVerification]]){
 if(report.engineSHA256!==engineDigest)throw new Error('引擎已变更，必须重新核验');
 for(const [file,expected] of Object.entries(report.files))if(digest(path.join(root,'research',folder,file))!==expected)throw new Error(`课包文件已变更：${folder}/${file}`);
}
const outputOverride = process.argv.find(arg => arg.startsWith('--out='))?.slice('--out='.length);
const persistedToolCache = path.join(root, '.build-cache/electron-builder');
const builderCache = path.join(process.env.USERPROFILE || root, 'AppData', 'Local', 'poker-range-trainer-electron-builder-v1');
const env = { ...process.env,
  electron_config_cache: path.join(root, '.build-cache/electron'),
  ELECTRON_CACHE: path.join(root, '.build-cache/electron'),
  // Documents is scanned aggressively on this machine; keep the builder's
  // atomic extraction cache in the OS temp area so tool unpacking can rename
  // its .tmp directory reliably. The persisted 7za binary below remains local.
  ELECTRON_BUILDER_CACHE: builderCache,
};
delete env.ELECTRON_RUN_AS_NODE;
// Prefer completed local tool caches. On Windows a scanner can retain handles
// on a freshly extracted .tmp directory and prevent its atomic rename.
function cachedTool(folder,required){
  const base=path.join(persistedToolCache,folder);
  if(!fs.existsSync(base))return null;
  for(const entry of fs.readdirSync(base,{withFileTypes:true})){
    if(!entry.isDirectory()||entry.name.endsWith('.tmp'))continue;
    const candidate=path.join(base,entry.name);
    if(required.every(name=>fs.existsSync(path.join(candidate,name))))return candidate;
  }
  return null;
}
const seven=cachedTool('7zip@1.0.0',['bin/7za.exe']);
if(seven&&!env.ELECTRON_BUILDER_7ZIP_PATH)env.ELECTRON_BUILDER_7ZIP_PATH=path.join(seven,'bin/7za.exe');
for (const args of [
  ['scripts/stage-postflop-coverage.mjs'],
  ['scripts/stage-solver-source.mjs'],
  ['node_modules/electron/install.js'],
  ['node_modules/vite/bin/vite.js', 'build'],
  dirOnly
    ? ['node_modules/electron-builder/cli.js', '--config', 'electron-builder.cjs', '--dir', ...(outputOverride ? [`--config.directories.output=${outputOverride}`] : [])]
    : ['node_modules/electron-builder/cli.js', '--config', 'electron-builder.cjs', '--win', 'portable', '--x64', '--publish', 'never', ...(outputOverride ? [`--config.directories.output=${outputOverride}`] : [])],
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
