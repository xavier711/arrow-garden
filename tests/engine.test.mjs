import assert from 'node:assert/strict';
import {generate,seeded,DIRS,canExit,LEVEL_COUNT} from '../src/engine.mjs';
let games=0,moves=0,minArrows=Infinity,maxArrows=0;const types=new Set(),stats=[];
// Independent occupancy scan, including the arrow's own body in its forward ray.
function free(a,remaining,size){
 const head=a.cells.at(-1),d=DIRS[a.dir];
 for(let step=1;step<=size;step++){
  const x=head[0]+step*d[0],y=head[1]+step*d[1];
  if(x<0||y<0||x>=size||y>=size)return true;
  if(remaining.some(b=>b.cells.some(c=>c[0]===x&&c[1]===y)))return false;
 }
 throw new Error('Ray did not leave board');
}
for(let level=1;level<=LEVEL_COUNT;level++)for(let seed=1;seed<=4;seed++){
 const p=generate(level,seed*7919),r=seeded(seed),occupied=new Set();
 assert.ok(p.arrows.length>=3);
 for(const a of p.arrows){
  assert.ok(a.cells.length>=2,`Single-cell arrow at level ${level} seed ${seed}`);
  for(let i=0;i<a.cells.length;i++){
   const [x,y]=a.cells[i],k=`${x},${y}`;assert.ok(x>=0&&x<p.size&&y>=0&&y<p.size);assert.ok(!occupied.has(k));occupied.add(k);
   if(i)assert.equal(Math.abs(x-a.cells[i-1][0])+Math.abs(y-a.cells[i-1][1]),1);
  }
  if(a.cells.length>1){const h=a.cells.at(-1),b=a.cells.at(-2),d=DIRS[a.dir];assert.deepEqual([h[0]-b[0],h[1]-b[1]],d);}
 }
 assert.equal(occupied.size,p.size*p.size,`Unfilled cells at level ${level} seed ${seed}`);
 p.arrows.forEach(a=>types.add(a.shape));
 minArrows=Math.min(minArrows,p.arrows.length);maxArrows=Math.max(maxArrows,p.arrows.length);
 let remaining=[...p.arrows];
 while(remaining.length){
  const candidates=remaining.filter(a=>free(a,remaining,p.size));
  for(const a of remaining)assert.equal(canExit(a,remaining,p.size),free(a,remaining,p.size));
  assert.ok(candidates.length,`Deadlock at level ${level} seed ${seed}`);
  const selected=candidates[Math.floor(r()*candidates.length)];remaining=remaining.filter(a=>a.id!==selected.id);moves++;
 }
 stats.push({level,arrows:p.arrows.length,size:p.size,curved:p.arrows.filter(a=>!['直线','长直线'].includes(a.shape)).length});games++;
}
assert.deepEqual(generate(10,7),generate(10,7));
assert.notDeepEqual(generate(10,7).arrows,generate(10,8).arrows);
const left={id:0,cells:[[0,0]],dir:1},right={id:1,cells:[[1,0]],dir:3};
assert.equal(canExit(left,[left,right],2),false);assert.equal(canExit(right,[left,right],2),false);
assert.ok(types.has('盘绕')&&types.has('回弯')&&types.has('多折线')&&types.has('L 形')&&types.has('长直线'));
assert.ok(stats.filter(p=>p.level>=400).reduce((s,p)=>s+p.arrows,0)/stats.filter(p=>p.level>=400).length>25);
const hard=stats.filter(p=>p.level>=100);
assert.ok(hard.reduce((n,p)=>n+p.curved,0)/hard.reduce((n,p)=>n+p.arrows,0)>.65,'Hard levels should favor curved arrows');
console.log(JSON.stringify({games,moves,minArrows,maxArrows,types:[...types],status:'All valid, all cleared using random legal moves'}));
