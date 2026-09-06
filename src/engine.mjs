export const DIRS = [[0,-1],[1,0],[0,1],[-1,0]];
export function seeded(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
export const LEVEL_COUNT = 500;
export const CHAPTERS = ['弯弯小路','折线探险','回弯迷宫','交错森林','长线挑战','层层解锁','曲折山谷','箭头迷阵','耐心高手','终极探险'];
export function config(level) {
  level=Math.max(1,Math.min(LEVEL_COUNT,Math.floor(level)||1));
  return {size:level<=5?4:level<=15?5:level<=30?6:Math.min(14,8+Math.floor((level-31)/45)),
    density:1,maxLength:level<=5?3:level<=15?4:Math.min(18,5+Math.floor(level/35))};
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
  const random=seeded(seed),{size,maxLength}=config(level);
  // Tile first, then peel connected tiles into arrows. Every cell belongs to
  // exactly one tile, and no tile has fewer than two cells.
  const tiles=new Map(),occupied=new Map();let nextId=0;
  const add=cells=>{const id=nextId++;tiles.set(id,cells);for(const p of cells)occupied.set(key(p),id);};
  for(let y=0;y<size;y++)for(let x=0;x<size;){
    const length=size-x===3?3:2;
    add(Array.from({length},(_,i)=>[x+i,y]));x+=length;
  }
  // Flip pairs of dominoes to remove the initial row pattern without gaps.
  for(let step=0;step<size*size*8;step++){
    const x=Math.floor(random()*(size-1)),y=Math.floor(random()*(size-1));
    const square=[[x,y],[x+1,y],[x,y+1],[x+1,y+1]],ids=new Set(square.map(p=>occupied.get(key(p))));
    if(ids.size!==2||[...ids].some(id=>tiles.get(id).length!==2))continue;
    const horizontal=tiles.get([...ids][0])[0][1]===tiles.get([...ids][0])[1][1];
    for(const id of ids)tiles.delete(id);
    if(horizontal){add([square[0],square[2]]);add([square[1],square[3]]);}
    else{add([square[0],square[1]]);add([square[2],square[3]]);}
  }
  const inside=([x,y])=>x>=0&&y>=0&&x<size&&y<size;
  const direction=(a,b)=>DIRS.findIndex(([dx,dy])=>b[0]-a[0]===dx&&b[1]-a[1]===dy);
  const clear=(cells,dir)=>{
    const [dx,dy]=DIRS[dir];let [x,y]=cells.at(-1);
    while(inside([x+=dx,y+=dy]))if(occupied.has(`${x},${y}`))return false;
    return true;
  };
  const arrows=[];
  while(tiles.size){
    const starts=[];
    for(const [id,tile] of tiles)for(const cells of [tile,[...tile].reverse()]){
      const dir=direction(cells.at(-2),cells.at(-1));
      if(clear(cells,dir))starts.push({id,cells,dir});
    }
    // An extreme tile always has an endpoint facing out of the remaining cells.
    if(!starts.length)throw new Error('No removable tile');
    const start=starts[Math.floor(random()*starts.length)],used=new Set([start.id]);
    let cells=[...start.cells];
    const limit=level<16?maxLength:Math.min(maxLength,4+Math.floor(random()*7));
    while(cells.length<limit){
      const tail=cells[0],options=[];
      for(const [dx,dy] of DIRS){
        const neighbor=[tail[0]+dx,tail[1]+dy],id=occupied.get(key(neighbor));
        if(id===undefined||used.has(id))continue;
        const tile=tiles.get(id);
        if(cells.length+tile.length>limit)continue;
        for(const extension of [tile,[...tile].reverse()]){
          if(key(extension.at(-1))!==key(neighbor))continue;
          const combined=[...extension,...cells];
          // Keep the introductory boards straight; later levels favor bends.
          const turns=combined.slice(2).reduce((n,p,i)=>n+(direction(combined[i],combined[i+1])!==direction(combined[i+1],p)?1:0),0);
          if(level<8&&turns)continue;
          options.push({id,cells:combined,score:turns*(level>=65?3:1)+random()*2});
        }
      }
      if(!options.length)break;
      options.sort((a,b)=>b.score-a.score);const best=options[0];
      used.add(best.id);cells=best.cells;
    }
    // This head can leave before every still-unassigned tile, so the generated
    // order is itself a solution, including when an arrow bends back on itself.
    for(const id of used){for(const p of tiles.get(id))occupied.delete(key(p));tiles.delete(id);}
    arrows.push({id:arrows.length,cells,dir:start.dir,color:Math.floor(random()*5),shape:shapeOf(cells)});
  }
  // Add dependencies without changing coverage, lengths, or solvability.
  if(level>=16){
    const quality=m=>m.rounds*3-m.free*5+m.edges*.35;
    let rating=quality(analyze(arrows,size));
    for(let pass=0;pass<(level>=100?2:1);pass++)for(let i=arrows.length-1;i>=0;i--){
      const original=arrows[i],cells=[...original.cells].reverse();
      arrows[i]={...original,cells,dir:direction(cells.at(-2),cells.at(-1))};
      const metrics=analyze(arrows,size);
      if(metrics&&quality(metrics)>rating)rating=quality(metrics);
      else arrows[i]=original;
    }
  }
  // Rotate/reflect the whole puzzle so odd-sized boards do not share a seam.
  const rotation=Math.floor(random()*4),reflect=random()<.5;
  const transform=([x,y])=>{if(reflect)x=size-1-x;for(let i=0;i<rotation;i++)[x,y]=[size-1-y,x];return [x,y];};
  for(const a of arrows){a.cells=a.cells.map(transform);a.dir=direction(a.cells.at(-2),a.cells.at(-1));a.shape=shapeOf(a.cells);}
  if(!solve(arrows,size))throw new Error('Invalid puzzle');
  return {size,arrows,seed,level};
}
