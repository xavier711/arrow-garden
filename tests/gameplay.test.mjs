import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as engine from '../src/engine.mjs';
const source=(await readFile(new URL('../src/main.mjs',import.meta.url),'utf8')).replace(/^import .*?;\n/,'');
function setup(saved={}){
 const nodes=new Map(),frames=[],data=new Map(Object.entries(saved));
 class Element {
  constructor(){this.children=[];this.style={};this.attrs={};this.handlers={};this.clientWidth=400;this.clientHeight=400;this.scrollLeft=0;this.scrollTop=0;this.classList={add(){},remove(){},toggle(){}};}
  setAttribute(k,v){this.attrs[k]=v;if(k==='id')nodes.set(v,this);}
  append(...els){this.children.push(...els);}
  replaceChildren(){this.children=[];}
  addEventListener(k,fn){this.handlers[k]=fn;}
  querySelector(selector){return this.children.find(c=>c.attrs.class===selector.slice(1));}
  getTotalLength(){return 128;}
  getBoundingClientRect(){return {};}
  remove(){this.removed=true;}
  focus(){document.activeElement=this;}
  close(){this.open=false;}
  showModal(){this.open=true;}
  scrollTo(){this.scrollLeft=this.scrollTop=0;}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
 const document={body:new Element(),activeElement:null,getElementById:get,createElement:()=>new Element(),createElementNS:()=>new Element(),querySelector:get,querySelectorAll:()=>[]};
 vm.runInNewContext(source,{...engine,document,localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))},matchMedia:()=>({matches:false}),window:{addEventListener(){}},crypto:{getRandomValues:a=>a.fill(42)},Uint32Array,getComputedStyle:()=>({display:'block'}),ResizeObserver:class{observe(){}},performance:{now:()=>0},requestAnimationFrame:fn=>frames.push(fn),setTimeout:()=>0});
 const click=id=>get(id).handlers.click?.();
 const flush=()=>{for(const frame of frames.splice(0))frame(1000);};
 const pick=level=>{get('levels').onclick();get('chapter-select').onchange({target:{value:String(Math.floor((level-1)/50))}});if((level-1)%50>=25)get('page-next').onclick();get('level-grid').children.find(b=>Number(b.textContent)===level).onclick();};
 return {get,data,click,flush,pick,frames};
}
const game=setup();
game.get('levels').onclick();
assert.ok(game.get('level-grid').children.every(b=>!b.disabled),'Fresh browser must allow every visible level');
const puzzle=engine.generate(1,42),order=engine.solve(puzzle.arrows,puzzle.size);
game.click(`arrow-${order[0]}`);
assert.equal(game.get('remaining').textContent,puzzle.arrows.length-1,'Progress responds before animation finishes');
game.click(`arrow-${order[0]}`);
assert.equal(game.get('remaining').textContent,puzzle.arrows.length-1,'Repeated taps cannot remove an arrow twice');
game.click(`arrow-${order[1]}`);
assert.equal(game.get('remaining').textContent,puzzle.arrows.length-2,'Next legal arrow responds while first is moving');
for(const id of order.slice(2))game.click(`arrow-${id}`);
assert.equal(game.get('win-dialog').open,false,'Wait for departures before showing completion');
game.flush();assert.equal(game.get('win-dialog').open,true);
assert.deepEqual(JSON.parse(game.data.get('arrow-completed')),[1]);
game.pick(500);assert.equal(game.get('level-label').textContent,'第 500 关');
const restored=setup(Object.fromEntries(game.data));
assert.equal(restored.get('level-label').textContent,'第 500 关','Reload must restore freely selected high level');
restored.pick(1);const first=engine.solve(engine.generate(1,42).arrows,4)[0];restored.click(`arrow-${first}`);
restored.pick(350);const count=restored.get('remaining').textContent;restored.flush();
assert.equal(restored.get('remaining').textContent,count,'Old animation callbacks must not modify a newly selected level');
assert.equal(restored.get('win-dialog').open,false);
restored.get('levels').onclick();assert.ok(restored.get('level-grid').children.every(b=>!b.className.includes('completed')),'Skipped levels are not completed');
const legacy=setup({'arrow-unlocked':'4','arrow-level':'3'});
assert.deepEqual(JSON.parse(legacy.data.get('arrow-completed')),[1,2,3],'Preserve historical sequential completion');
console.log('PASS: free level selection/restoration; immediate consecutive moves; duplicate taps; win timing; stale animations; completion migration.');
