import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync,spawn} from 'node:child_process';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
execFileSync(process.execPath,['scripts/build.mjs'],{cwd:root});
const sw=await readFile(path.join(root,'dist/sw.js'),'utf8');
assert.ok(!sw.includes('__BUILD_VERSION__')&&!sw.includes('__PRECACHE__'));
execFileSync(process.execPath,['scripts/build.mjs'],{cwd:root});
assert.equal(await readFile(path.join(root,'dist/sw.js'),'utf8'),sw,'Build must be deterministic');
const manifest=JSON.parse(await readFile(path.join(root,'dist/manifest.webmanifest'),'utf8'));
assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.display,'fullscreen');assert.equal(manifest.orientation,'any');
for(const icon of manifest.icons){const data=await readFile(path.join(root,'dist',icon.src));assert.equal(`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`,icon.sizes);}
for(const scope of ['https://example.test/','https://example.test/arrow-garden/']){
  const handlers={},stores=new Map();let offline=false,claims=0;
  const caches={
    async open(name){
      if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);
      return {async addAll(requests){for(const request of requests){const rel=new URL(request.url).pathname.slice(new URL(scope).pathname.length)||'index.html';data.set(request.url,new Response(await readFile(path.join(root,'dist',rel))));}},async match(url){return data.get(url)?.clone();}};
    },async keys(){return [...stores.keys()]},async delete(name){return stores.delete(name)}
  };
  stores.set(`arrow-garden:${scope}@old`,new Map());stores.set('unrelated-app-cache',new Map());
  vm.runInNewContext(sw,{URL,Request,caches,fetch:async()=>{if(offline)throw Error('offline');return new Response('network')},self:{registration:{scope},clients:{claim:async()=>claims++},addEventListener:(type,handler)=>handlers[type]=handler}});
  let pending;
  handlers.install({waitUntil:p=>pending=p});await pending;
  handlers.activate({waitUntil:p=>pending=p});await pending;
  assert.equal(claims,1);assert.ok(stores.has('unrelated-app-cache'));assert.ok(!stores.has(`arrow-garden:${scope}@old`));
  offline=true;
  for(const file of ['', 'index.html','src/main.mjs','src/pwa.mjs','src/engine.mjs','src/styles.css','manifest.webmanifest','icons/arrow-192.png']){
    let answer;handlers.fetch({request:new Request(scope+file+'?test=1'),respondWith:p=>answer=p});
    assert.ok(answer);assert.ok((await (await answer).arrayBuffer()).byteLength>0,`offline ${scope+file}`);
  }
  let intercepted=false;
  handlers.fetch({request:new Request('https://other.example/api'),respondWith:()=>intercepted=true});assert.equal(intercepted,false);
}
async function serverCheck(preview,base){
  const child=spawn(process.execPath,['scripts/serve.mjs',...(preview?['--preview']:[]),'--port','0','--base',base],{cwd:root,stdio:['ignore','pipe','pipe']});
  try{
    const origin=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Server startup timeout')),5000);
      child.once('error',error=>{clearTimeout(timer);reject(error)});
      child.stdout.on('data',data=>{const m=data.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0])}});
    });
    for(const file of ['','src/main.mjs','src/pwa.mjs','src/engine.mjs','src/styles.css','manifest.webmanifest','icons/arrow-512.png']){
      const response=await fetch(origin+base+file);assert.equal(response.status,200,file);
      if(file.endsWith('.mjs'))assert.match(response.headers.get('content-type'),/javascript/);
    }
    assert.equal((await fetch(origin+base+'missing.mjs')).status,404);
    assert.equal((await fetch(origin+base+'package.json')).status,404);
  }finally{child.kill();}
}
await serverCheck(false,'/');await serverCheck(true,'/');await serverCheck(true,'/arrow-garden/');
console.log('PASS: deterministic build; root/subpath resources; PWA icons; offline cache; safe cache upgrades; development/preview HTTP servers.');
