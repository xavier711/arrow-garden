import {cp, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(root,'dist');
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
await cp(path.join(root,'public'),out,{recursive:true});
await cp(path.join(root,'src'),path.join(out,'src'),{recursive:true});
let html=await readFile(path.join(root,'index.html'),'utf8');
await writeFile(path.join(out,'index.html'),html);
async function files(dir,prefix=''){
  const result=[];
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const name=prefix+entry.name;
    if(entry.isDirectory())result.push(...await files(path.join(dir,entry.name),name+'/'));
    else result.push(name);
  }
  return result.sort();
}
const all=await files(out),hash=createHash('sha256');
for(const file of all){hash.update(file);hash.update(await readFile(path.join(out,file)));}
const version=hash.digest('hex').slice(0,16);
html=html.replace('name="app-build" content="development"',`name="app-build" content="${version}"`);
await writeFile(path.join(out,'index.html'),html);
const precache=['./',...all.filter(f=>f!=='sw.js'&&f!=='.nojekyll').map(f=>'./'+f)];
let sw=await readFile(path.join(out,'sw.js'),'utf8');
sw=sw.replace('__BUILD_VERSION__',version).replace('/* __PRECACHE__ */',JSON.stringify(precache));
await writeFile(path.join(out,'sw.js'),sw);
console.log(`Built dist/ (${version}), ${precache.length} offline resources.`);
