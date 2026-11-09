import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const electronPackage = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', 'electron', 'package.json'), 'utf8'));
const artifacts = [
  { id: 'portable', path: path.join(root, 'release', '扑克练习器.exe'), minBytes: 50_000_000 },
  { id: 'unpacked-exe', path: path.join(root, 'release', 'win-unpacked', '扑克练习器.exe'), minBytes: 100_000_000 },
  { id: 'asar', path: path.join(root, 'release', 'win-unpacked', 'resources', 'app.asar'), minBytes: 1_000_000 },
  { id: 'unpacked-exe-current', path: path.join(root, 'release', 'postflop-solver-v7', 'win-unpacked', '扑克练习器.exe'), minBytes: 100_000_000 },
  { id: 'asar-current', path: path.join(root, 'release', 'postflop-solver-v7', 'win-unpacked', 'resources', 'app.asar'), minBytes: 1_000_000 },
  { id: 'solver-engine', path: path.join(root, 'release', 'postflop-solver-v7', 'win-unpacked', 'resources', 'solver-engine','trainer_engine.exe'), minBytes: 100_000 },
  ...['postflop-pilot','postflop-pilot-sb'].map(folder=>({id:folder,path:path.join(root,'release','postflop-solver-v7','win-unpacked','resources','solver-data',folder,'strategy.bin'),minBytes:100_000_000})),
];

function sha256(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex').toUpperCase();
}

const checked = artifacts.map(item => {
  if (!fs.existsSync(item.path)) throw new Error(`交付文件不存在：${path.relative(root, item.path)}`);
  const stat = fs.statSync(item.path);
  if (!stat.isFile() || stat.size < item.minBytes) throw new Error(`交付文件大小异常：${path.relative(root, item.path)}`);
  return { id: item.id, path: path.relative(root, item.path).replaceAll('\\', '/'), bytes: stat.size, sha256: sha256(item.path), lastWriteTime: stat.mtime.toISOString() };
});
const byId = Object.fromEntries(checked.map(item => [item.id, item]));
const coverageDir=path.join(root,'release','postflop-solver-v7','win-unpacked','resources','solver-data','postflop-coverage');
const coverageManifest=JSON.parse(fs.readFileSync(path.join(coverageDir,'manifest.json'),'utf8'));
const verifiedCoverage=coverageManifest.entries.map(entry=>{
 if(!/^[a-zA-Z0-9.-]+$/.test(entry.folder))throw new Error('缓存目录不合法');
 const dir=path.join(coverageDir,entry.folder),verification=JSON.parse(fs.readFileSync(path.join(dir,'verification.json'),'utf8'));
 if(!verification.ok||verification.engineSHA256.toUpperCase()!==byId['solver-engine'].sha256)throw new Error('缓存引擎核验不匹配：'+entry.id);
 for(const [file,expected] of Object.entries(verification.files)){if(!['request.json','result.json','strategy.bin'].includes(file)||sha256(path.join(dir,file))!==expected.toUpperCase())throw new Error('缓存完整性核验失败：'+entry.id+'/'+file);}
 return {id:entry.id,board:entry.board,inputFingerprint:verification.inputFingerprint,errorBB:verification.solverReportedExploitabilityBB,filesVerified:true};
});
const portableFresh = new Date(byId.portable.lastWriteTime).getTime() >= new Date(byId['asar-current'].lastWriteTime).getTime();
const failedPortableArchive = path.join(root, 'release', 'poker-range-trainer-1.1.0-x64.nsis.7z');
const portableAttempt = fs.existsSync(failedPortableArchive)
  ? (() => { const stat = fs.statSync(failedPortableArchive); return { path: path.relative(root, failedPortableArchive).replaceAll('\\', '/'), bytes: stat.size, sha256: sha256(failedPortableArchive), lastWriteTime: stat.mtime.toISOString() }; })()
  : null;

const runtimeFile=path.join(root,'research/runtime/postflop-packaged-general-current/result.json');
const runtime=fs.existsSync(runtimeFile)?JSON.parse(fs.readFileSync(runtimeFile,'utf8')):null;
const runtimeFresh=runtime?.ok===true&&runtime?.packaged===true&&fs.statSync(runtimeFile).mtimeMs>=new Date(byId['asar-current'].lastWriteTime).getTime();
const report = {
  reportId: 'desktop-package-verification-current',
  generatedAt: new Date().toISOString(),
  package: 'poker-range-trainer@1.1.0',
  electron: electronPackage.version,
  builder: 'electron-builder 26.15.3 · NSIS 1.2.1',
  artifacts: checked,
  packaging: portableFresh
    ? { status: 'current_directory_and_portable_current', portableFresh: true }
    : { status: 'current_directory_portable_not_rebuilt', portableFresh: false, currentDirectory: 'release/postflop-solver-v7/win-unpacked', reason: '便携版早于当前真实求解快照工作区；当前主交付使用独立目录版，避免旧目录文件锁覆盖新包。', portableAttempt },
  offlineAssets: true,
  verifiedCoverage,
  runtimeDomain:{physicalFlopInputs:22100,sourceBackedOpeningSituations:20,configurableThreebetPositionPairs:15,roles:2,onDemandIndependentSolve:true,allEquilibriaPrecomputed:false,finiteDeclaredActionModel:true},
  persistence: 'in-memory session only',
  runtimeProbe: {status:runtimeFresh?'packaged_runtime_verified':'packaged_runtime_pending',evidence:runtimeFresh?'research/runtime/postflop-packaged-general-current/result.json':null,note:'本机运行需要允许的执行环境。打包版验证包括原生IPC、真实求解后继和两种窗口尺寸；不代表学习效果已验证。'},
};

const out = path.join(root, 'research', 'nevir-system', 'desktop-package-verification-current.json');
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
