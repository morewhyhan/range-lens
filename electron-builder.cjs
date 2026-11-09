const fs=require('node:fs'),path=require('node:path');
const manifest='.build-cache/coverage-release/manifest.json';
const coverage=fs.existsSync(manifest)?JSON.parse(fs.readFileSync(manifest)).entries:[];
module.exports = {
  appId: 'local.poker.range.trainer',
  productName: '扑克练习器',
  directories: { output: 'release' },
  files: ['desktop/**/*.cjs', 'desktop/icon.ico', 'src/data/ranges.json', 'dist/**/*', 'package.json', '!node_modules/**/*'],
  asar: true,
  extraResources:[
    {from:'research/solver-probe/target/release/trainer_engine.exe',to:'solver-engine/trainer_engine.exe'},
    {from:'research/postflop-pilot',to:'solver-data/postflop-pilot',filter:['request.json','result.json','strategy.bin','verification.json','preflight.json']},
    {from:'research/postflop-pilot-sb',to:'solver-data/postflop-pilot-sb',filter:['request.json','result.json','strategy.bin','verification.json','preflight.json']},
    {from:manifest,to:'solver-data/postflop-coverage/manifest.json'},
    ...coverage.map(e=>({from:path.join('.build-cache/coverage-release',e.folder),to:'solver-data/postflop-coverage/'+e.folder,filter:['request.json','result.json','strategy.bin','verification.json']})),
    {from:'.build-cache/solver-release-source',to:'source',filter:['**/*','!vendor{,/**/*}']},
    {from:'THIRD_PARTY_NOTICES.md',to:'THIRD_PARTY_NOTICES.md'},
  ],
  electronDist: 'node_modules/electron/dist',
  npmRebuild: false,
  toolsets: { nsis: '1.2.1' },
  win: {
    target: [{ target: 'portable', arch: ['x64'] }],
    icon: 'desktop/icon.ico',
    signAndEditExecutable: true,
    signExecutable: false,
    requestedExecutionLevel: 'asInvoker',
  },
  portable: { artifactName: '扑克练习器.exe', unpackDirName: false },
  publish: null,
};
