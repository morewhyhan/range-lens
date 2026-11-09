const { app, BrowserWindow, session, protocol, net, dialog, ipcMain } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { assetPath } = require('./assets.cjs');
const { createSolverCatalogue } = require('./solver-service.cjs');
let solver;

const ORIGIN = 'trainer://app';
const tempParent = fs.realpathSync(os.tmpdir());
const profile = fs.mkdtempSync(path.join(tempParent, 'poker-trainer-'));
app.setPath('userData', profile);
app.setPath('sessionData', profile);
app.setAppUserModelId('local.poker.range.trainer');
app.commandLine.appendSwitch('disable-http-cache');
protocol.registerSchemesAsPrivileged([{
  scheme: 'trainer', privileges: { standard: true, secure: true, supportFetchAPI: true },
}]);

const smokeIndex = process.argv.indexOf('--smoke-test');
const smokeDir = smokeIndex >= 0 ? process.argv[smokeIndex + 1] : null;
if (smokeDir) app.disableHardwareAcceleration();
let window;
let finishing = false;

function cleanProfile() {
  // Delete only the fresh profile directory allocated by this launch.
  const resolved = path.resolve(profile);
  if (path.dirname(resolved) === tempParent && path.basename(resolved).startsWith('poker-trainer-')) {
    fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 4, retryDelay: 150 });
  }
}

async function finish() {
  if (finishing) return;
  finishing = true;
  solver?.stop();
  try { await window?.webContents.session.clearStorageData(); } catch {}
  try { await window?.webContents.session.closeAllConnections(); } catch {}
  app.exit(0);
}

async function smokeCheck(win, appSession, getFrame) {
  const output = path.resolve(smokeDir);
  fs.mkdirSync(output, { recursive: true });
  const errors = [];
  let stage = 'render';
  if(process.argv.includes('--postflop-smoke')){
    try{await require('./postflop-smoke.cjs').runPostflopSmoke(win,output);await finish();}
    catch(error){fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'result.json'),JSON.stringify({ok:false,error:error.stack}));solver?.stop();app.exit(1);}
    return;
  }
  win.webContents.on('console-message', (_event, details) => {
    if (details.level === 'error') errors.push(details.message);
  });
  try {
    let page;
    for (let i = 0; i < 150; i++) {
      page = await win.webContents.executeJavaScript(`({
        title: document.title,
        text: document.querySelector('#root')?.textContent || '',
        width: innerWidth,
        height: innerHeight,
        failedImages: [...document.images].filter(img => !img.complete || !img.naturalWidth).map(img => img.src)
      })`);
      if (page.text.includes('这手牌在简化图里怎么打')) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!page.text.includes('这手牌在简化图里怎么打')) throw new Error('React trainer did not render');
    if (page.failedImages.length) throw new Error('Some page images failed to load');
    stage = 'assets';
    const root = path.join(app.getAppPath(), 'dist');
    const assets = fs.readdirSync(path.join(root, 'assets'));
    const source = fs.readdirSync(path.join(root, 'sources')).find(file => file.endsWith('.svg'));
    const checked = [];
    for (const file of ['/index.html', '/favicon.svg', '/sources/' + source, ...assets.map(f => '/assets/' + f)]) {
      const response = await appSession.fetch(ORIGIN + file);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!response.ok || !bytes.length) throw new Error('Bundled asset failed: ' + file);
      checked.push({ file, bytes: bytes.length });
    }
    if (errors.length) throw new Error(errors.join('\n'));
    stage = 'screenshot';
    for (let i = 0; i < 30; i++) {
      const animating = await win.webContents.executeJavaScript("document.getAnimations().some(animation => animation.playState === 'running')");
      if (!animating) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    let frame;
    for (let i = 0; i < 50; i++) {
      frame = getFrame();
      if (frame && !frame.isEmpty()) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!frame || frame.isEmpty()) throw new Error('No offscreen window frame was rendered');
    fs.writeFileSync(path.join(output, 'window.png'), frame.toPNG());
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({
      ok: true, packaged: app.isPackaged, versions: process.versions,
      title: page.title, width: page.width, height: page.height, checked, errors,
      noLocalServer: true, inMemorySession: !appSession.isPersistent(),
    }, null, 2));
    await finish();
  } catch (error) {
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ ok: false, stage, error: error.stack, errors }, null, 2));
    app.exit(1);
  }
}

app.whenReady().then(async () => {
  const rootDir=app.isPackaged?path.join(process.resourcesPath,'solver-data'):path.join(app.getAppPath(),'research');
  const executable=app.isPackaged?path.join(process.resourcesPath,'solver-engine','trainer_engine.exe'):path.join(app.getAppPath(),'research','solver-probe','target','release','trainer_engine.exe');
  solver=createSolverCatalogue({rootDir,executable,workDir:path.join(profile,'solver-work')});
  const trusted=event=>{if(event.senderFrame?.url!==ORIGIN+'/index.html')throw new Error('非法求解器调用来源');};
  ipcMain.handle('solver:info',(event,dataset)=>{trusted(event);return solver.info(dataset);});
  ipcMain.handle('solver:node',(event,dataset,history)=>{trusted(event);return solver.node(dataset,history);});
  ipcMain.handle('solver:solve',(event,input)=>{trusted(event);return solver.solve(input);});
  ipcMain.handle('solver:status',event=>{trusted(event);return solver.solveStatus();});
  ipcMain.handle('solver:cancel',event=>{trusted(event);return solver.cancelSolve();});
  ipcMain.handle('solver:board',(event,input)=>{trusted(event);return solver.solveBoard(input);});
  ipcMain.handle('solver:board-status',event=>{trusted(event);return solver.boardStatus();});
  ipcMain.handle('solver:board-cancel',event=>{trusted(event);return solver.cancelBoard();});
  const appSession = session.fromPartition('poker-trainer', { cache: false });
  appSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  appSession.setPermissionCheckHandler(() => false);
  appSession.protocol.handle('trainer', request => {
    try {
      if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
      const target = assetPath(path.join(app.getAppPath(), 'dist'), request.url);
      return net.fetch(pathToFileURL(target).toString());
    } catch { return new Response('Not found', { status: 404 }); }
  });
  appSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !details.url.startsWith(ORIGIN + '/') });
  });
  appSession.webRequest.onHeadersReceived((details, callback) => callback({
    responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-src 'none'",
    ] },
  }));
  window = new BrowserWindow({
    title: '扑克练习器', width: 1440, height: 1000, minWidth: 800, minHeight: 640,
    show: false, backgroundColor: '#f5f5f7', autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      session: appSession, nodeIntegration: false, contextIsolation: true, sandbox: true, spellcheck: false,
      preload:path.join(__dirname,'preload.cjs'),
      offscreen: Boolean(smokeDir), backgroundThrottling: !smokeDir,
    },
  });
  window.setMenu(null);
  let lastFrame;
  if (smokeDir) window.webContents.on('paint', (_event, _rect, image) => { lastFrame = image; });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(ORIGIN + '/')) event.preventDefault();
  });
  window.on('close', event => {
    if (!finishing) { event.preventDefault(); void finish(); }
  });
  window.once('ready-to-show', () => {
    if (!smokeDir) { window.maximize(); window.show(); }
  });
  await window.loadURL(ORIGIN + '/index.html');
  if (smokeDir) await smokeCheck(window, appSession, () => lastFrame);
}).catch(error => {
  if (smokeDir) {
    fs.mkdirSync(smokeDir, { recursive: true });
    fs.writeFileSync(path.join(smokeDir, 'result.json'), JSON.stringify({ ok: false, error: error.stack }));
  } else dialog.showErrorBox('扑克练习器无法启动', error.message);
  app.exit(1);
});

app.on('window-all-closed', () => { void finish(); });
app.on('quit', () => { try { cleanProfile(); } catch {} });
