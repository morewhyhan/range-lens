import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const url='http://127.0.0.1:5173/';
const ready=async()=>{try{const r=await fetch(url,{signal:AbortSignal.timeout(800)});return r.ok && (await r.text()).includes('id="root"');}catch{return false;}};
if(!await ready()){
  const child=spawn(process.execPath,[fileURLToPath(new URL('./serve.mjs',import.meta.url))],{detached:true,windowsHide:true,stdio:'ignore'});child.unref();
  for(let i=0;i<30&&!await ready();i++) await new Promise(r=>setTimeout(r,200));
}
if(await ready()) spawn('powershell.exe',['-NoProfile','-Command',"Start-Process 'http://127.0.0.1:5173/'"],{windowsHide:true,stdio:'ignore'}).unref();
else {console.error('启动失败，请确认5173端口未被其他应用占用，并先运行 npm run build。');process.exitCode=1;}
