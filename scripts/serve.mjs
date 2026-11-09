import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://127.0.0.1:5173');
    const target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const bytes=await fs.readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(bytes);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(5173,'127.0.0.1');
