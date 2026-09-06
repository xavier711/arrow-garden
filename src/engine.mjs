export const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
export function seeded(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
export const LEVEL_COUNT = 500;
export const CHAPTERS = ['弯弯小路','折线探险','回弯迷宫','交错森林','长线挑战','层层解锁','曲折山谷','箭头迷阵','耐心高手','终极探险'];
export function config(level) {
  level=Math.max(1,Math.min(LEVEL_COUNT,Math.floor(level)||1));
  return {size:level<=5?4:level<=15?5:level<=30?6:Math.min(14,8+Math.floor((level-31)/45)),
    density:Math.min(.96,.68+level*.001),maxLength:level<=5?3:level<=15?4:Math.min(18,5+Math.floor(level/35)),
    pool:level<=5?12:Math.min(96,24+Math.floor(level/6)),kinds:level<8?1:level<18?2:level<35?3:level<65?4:5};
}
const key = ([x,y]) => `${x},${y}`;
export function canExit(arrow, arrows, size) {
  const occupied=new Set(arrows.filter(a=>a.id!==arrow.id).flatMap(a=>a.cells.map(key)));
  const [dx,dy]=DIRS[arrow.dir]; let [x,y]=arrow.cells.at(-1);
  while((x+=dx)>=0 && x<size && (y+=dy)>=0 && y<size) if(occupied.has(`${x},${y}`)) return false;
  return true;
}
export function solve(arrows,size) {
  return analyze(arrows,size)?.order??null;
}
export function analyze(arrows,size) {
  const occupied=new Map(arrows.flatMap(a=>a.cells.map(p=>[key(p),a.id])));
  const blockers=new Map(),dependents=new Map(arrows.map(a=>[a.id,[]]));let edges=0;
  for(const a of arrows){
    const blocked=new Set(),[dx,dy]=DIRS[a.dir];let[x,y]=a.cells.at(-1);
    while((x+=dx)>=0&&x<size&&(y+=dy)>=0&&y<size){const id=occupied.get(`${x},${y}`);if(id!==undefined)blocked.add(id);}
    if(blocked.has(a.id))return null;
    blockers.set(a.id,blocked.size);edges+=blocked.size;
    blocked.forEach(id=>dependents.get(id).push(a.id));
  }
  let layer=arrows.filter(a=>!blockers.get(a.id)).map(a=>a.id);const free=layer.length,order=[];let rounds=0;
  while(layer.length){const next=[];rounds++;for(const id of layer){order.push(id);for(const child of dependents.get(id)){blockers.set(child,blockers.get(child)-1);if(!blockers.get(child))next.push(child);}}layer=next;}
  return order.length===arrows.length?{order,rounds,free,edges}:null;
}
export function shapeOf(cells) {
  const turns=[];let last;
  for(let i=1;i<cells.length;i++){
    const d=DIRS.findIndex(([dx,dy])=>cells[i][0]-cells[i-1][0]===dx&&cells[i][1]-cells[i-1][1]===dy);
    if(last!==undefined&&last!==d)turns.push((d-last+4)%4);last=d;
  }
  if(!turns.length)return cells.length>=5?'长直线':'直线';
  if(turns.length===1)return 'L 形';
  if(turns.length===2&&turns[0]===turns[1])return '回弯';
  if(turns.length>=3&&turns.every(t=>t===turns[0]))return '盘绕';
  return '多折线';
}
export function generate(level,seed) {
  const random=seeded(seed), {size,density,maxLength,pool,kinds}=config(level);
  const arrows=[], occupied=new Set(), rays=[], available=new Set();let nextLimit=maxLength;
  const inside=([x,y])=>x>=0&&y>=0&&x<size&&y<size;
  function candidate(head,dir,allowSingle=false) {
    if(occupied.has(key(head)))return null;
    const [dx,dy]=DIRS[dir],ray=new Set();let [x,y]=head;
    while(inside([x+=dx,y+=dy])){if(occupied.has(`${x},${y}`))return null;ray.add(`${x},${y}`);}
    const cells=[head],local=new Set([key(head)]),kind=Math.floor(random()*kinds);
    const length=2+Math.floor(Math.pow(random(),1.6)*(nextLimit-1));
    let direction=(dir+2)%4,run=0,turns=0,side=random()<.5?1:3;
    for(let step=1;step<length;step++){
      const tail=cells[0];
      const options=[direction,(direction+side)%4,(direction+4-side)%4].filter(d=>{
        if(step===1&&d!==direction)return false;
        if(kind===0&&d!==direction)return false;
        if(kind===1&&turns>=1&&d!==direction)return false;
        if(kind===3&&turns>=2&&d!==direction)return false;
        const p=[tail[0]+DIRS[d][0],tail[1]+DIRS[d][1]];
        return inside(p)&&!occupied.has(key(p))&&!local.has(key(p))&&!ray.has(key(p));
      });
      if(!options.length)break;
      const shouldTurn=step>1&&kind>0&&run>=(kind===4?2:Math.max(1,Math.floor(length/(kind===1?2:3))));
      const preferred=shouldTurn?(direction+side)%4:direction;
      const nextDir=options.includes(preferred)?preferred:options[0];
      if(nextDir!==direction){turns++;run=0;if(kind===2)side=4-side;}
      direction=nextDir;run++;
      const next=[tail[0]+DIRS[direction][0],tail[1]+DIRS[direction][1]];cells.unshift(next);local.add(key(next));
    }
    if(cells.length===1&&!allowSingle)return null;
    const blocked=[];let score=cells.length*.45+turns*.9+random()*2;
    for(let id=0;id<rays.length;id++)if(cells.some(p=>rays[id].has(key(p)))){
      blocked.push(id);score+=available.has(id)?18:1;
    }
    return {cells,dir,ray,blocked,score};
  }
  while(occupied.size<Math.ceil(size*size*density)){
    nextLimit=arrows.length%4===0?maxLength:Math.min(maxLength,3+Math.floor(random()*3));
    let best=null;
    for(let attempt=0;attempt<pool*4;attempt++){
      const c=candidate([Math.floor(random()*size),Math.floor(random()*size)],Math.floor(random()*4));
      if(c&&(!best||c.score>best.score))best=c;
    }
    if(!best){
      // Exhaustive legal one-cell fallback closes tiny gaps without creating cycles.
      for(let y=0;y<size;y++)for(let x=0;x<size;x++)for(let d=0;d<4;d++){
        const c=candidate([x,y],d,true);if(c&&(!best||c.score>best.score))best=c;
      }
    }
    if(!best)break;
    const id=arrows.length;
    arrows.push({id,cells:best.cells,dir:best.dir,color:Math.floor(random()*5),shape:shapeOf(best.cells)});
    best.cells.forEach(p=>occupied.add(key(p)));rays.push(best.ray);
    best.blocked.forEach(id=>available.delete(id));available.add(id);
  }
  // Reverse construction is solvable. Carefully reverse endpoints only when the
  // resulting dependency graph remains acyclic and requires more unlocking.
  if(level>=16){
    const quality=m=>m.rounds*3-m.free*5+m.edges*.35;
    let rating=quality(analyze(arrows,size));
    for(let pass=0;pass<(level>=100?2:1);pass++)for(let i=arrows.length-1;i>=0;i--){
      const original=arrows[i];const cells=[...original.cells].reverse();
      const directions=cells.length===1?[0,1,2,3]:[DIRS.findIndex(([dx,dy])=>cells.at(-1)[0]-cells.at(-2)[0]===dx&&cells.at(-1)[1]-cells.at(-2)[1]===dy)];
      let selected=original;
      for(const dir of directions){
        arrows[i]={...original,cells,dir};const metrics=analyze(arrows,size);
        if(metrics&&quality(metrics)>rating){rating=quality(metrics);selected=arrows[i];}
      }
      arrows[i]=selected;
    }
  }
  if(!arrows.length||!solve(arrows,size))throw new Error('Invalid puzzle');
  return {size,arrows,seed,level};
}
