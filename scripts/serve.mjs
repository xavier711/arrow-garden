import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2),preview=args.includes('--preview');
function option(name,fallback){const i=args.indexOf(name);return i<0?fallback:args[i+1];}
const port=Number(option('--port',preview?'4173':'5173'));
const host=option('--host','127.0.0.1');
const base=option('--base','/');
if(!base.startsWith('/')||!base.endsWith('/')||base.includes('..'))throw Error('--base must start and end with /');
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  try{
    const url=new URL(req.url,'http://localhost');
    if(base!=='/'&&url.pathname===base.slice(0,-1)){res.writeHead(302,{Location:base});res.end();return;}
    if(!url.pathname.startsWith(base)){res.writeHead(404);res.end('Not found');return;}
    let relative=decodeURIComponent(url.pathname.slice(base.length))||'index.html';
    if(relative.includes('\\')||relative.split('/').some(p=>p==='..'||p.startsWith('.'))){res.writeHead(403);res.end();return;}
    let file;
    if(preview)file=path.join(root,'dist',relative);
    else if(relative==='index.html'||relative.startsWith('src/'))file=path.join(root,relative);
    else file=path.join(root,'public',relative);
    if(!(await stat(file)).isFile()){res.writeHead(404);res.end('Not found');return;}
    const content=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:content);
  }catch(error){res.writeHead(error.code==='ENOENT'?404:400);res.end('Not found');}
});
server.listen(port,host,()=>console.log(`Arrow Garden: http://${host}:${server.address().port}${base} (${preview?'production preview':'development; offline cache disabled'})`));
process.on('SIGTERM',()=>server.close());
process.on('SIGINT',()=>server.close());
