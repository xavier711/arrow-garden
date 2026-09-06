import {generate,canExit,DIRS,LEVEL_COUNT,CHAPTERS} from './engine.mjs';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg',colors=['#df7650','#559386','#6f88c4','#b895cf','#d3a642'];
const storage={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
let unlocked=Math.max(1,Math.min(LEVEL_COUNT,Math.floor(Number(storage.get('arrow-unlocked')))||1));
// Continue past the old 30-level cap without resetting a child's progress.
if(storage.get('arrow-progress-version')!=='2'&&unlocked===30){unlocked=31;storage.set('arrow-unlocked',31);storage.set('arrow-level',31);}
storage.set('arrow-progress-version','2');
let completed;
try{const saved=JSON.parse(storage.get('arrow-completed'));completed=new Set(Array.isArray(saved)?saved.filter(n=>Number.isInteger(n)&&n>=1&&n<=LEVEL_COUNT):Array.from({length:unlocked-1},(_,i)=>i+1));}catch{completed=new Set(Array.from({length:unlocked-1},(_,i)=>i+1));}
storage.set('arrow-completed',JSON.stringify([...completed]));
const departing=new Set();
let level=Math.max(1,Math.min(LEVEL_COUNT,Math.floor(Number(storage.get('arrow-level')))||1)),sound=storage.get('arrow-sound')==='true',puzzle,arrows,total,busy=false,epoch=0,audio;
let zoom=1,levelPage=0,viewportWidth=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function svg(tag,attrs){const el=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);return el}
function tone(win=false,blocked=false){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const now=audio.currentTime;const notes=win?[523,659,784,1047]:[blocked?220:660];notes.forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=now+i*.12;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.22);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.24);});}catch{}}
function updateSound(){$('sound').innerHTML=sound?'<svg viewBox="0 0 24 24"><path d="m11 4-6 5H2v6h3l6 5V4ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>':'<svg viewBox="0 0 24 24"><path d="m11 4-6 5H2v6h3l6 5V4Zm5 5 6 6m0-6-6 6"/></svg>';$('sound').setAttribute('aria-label',sound?'关闭声音':'开启声音');$('sound').setAttribute('aria-pressed',String(sound))}
$('sound').onclick=()=>{sound=!sound;storage.set('arrow-sound',sound);updateSound();if(sound)tone()};updateSound();
const point=([x,y])=>[x*64+40,y*64+40];
function pathFor(a){const pts=a.cells.map(point);if(pts.length===1){const [dx,dy]=DIRS[a.dir];pts.unshift([pts[0][0]-dx*21,pts[0][1]-dy*21]);}return pts.map((p,i)=>(i?'L':'M')+p.join(',')).join(' ')}
function headPath(a){const [x,y]=point(a.cells.at(-1)),[dx,dy]=DIRS[a.dir],px=-dy,py=dx;return `M${x-dx*11+px*10},${y-dy*11+py*10} L${x},${y} L${x-dx*11-px*10},${y-dy*11-py*10}`}
function message(text,warning=false){$('feedback').textContent=text;$('feedback').classList.toggle('encourage',warning)}
function progress(){const done=total-arrows.length;$('remaining').textContent=arrows.length;$('count').textContent=`${done} / ${total}`;$('progress').style.width=`${done/total*100}%`;document.querySelector('.progress-track').setAttribute('aria-valuenow',Math.round(done/total*100));$('hint').disabled=!arrows.length;$('shuffle').disabled=busy;}
function render(){const board=$('board');board.replaceChildren();const size=puzzle.size*64+16;board.setAttribute('viewBox',`0 0 ${size} ${size}`);
 for(let y=0;y<puzzle.size;y++)for(let x=0;x<puzzle.size;x++)board.append(svg('circle',{cx:x*64+40,cy:y*64+40,r:2,fill:'#e2eae3'}));
 for(const a of arrows){const g=svg('g',{class:'arrow',id:`arrow-${a.id}`,role:'button',tabindex:'0','aria-label':`${a.shape}，${['向上','向右','向下','向左'][a.dir]}的箭头，第${a.cells.at(-1)[1]+1}行第${a.cells.at(-1)[0]+1}列`});g.append(svg('path',{d:pathFor(a),class:'line',stroke:colors[a.color]}),svg('path',{d:headPath(a),class:'head',stroke:colors[a.color]}),svg('path',{d:pathFor(a),class:'hit'}));g.addEventListener('click',()=>move(a));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();move(a)}});board.append(g);}
 applyZoom(1);progress();
}
function fresh(target=level){epoch++;departing.clear();level=target;busy=false;const seeds=new Uint32Array(1);crypto.getRandomValues(seeds);puzzle=generate(level,seeds[0]);arrows=[...puzzle.arrows];total=arrows.length;storage.set('arrow-level',level);$('level-label').textContent=`第 ${level} 关`;$('difficulty').textContent=CHAPTERS[Math.floor((level-1)/50)];$('win-dialog').close();message('找找看，哪个箭头前面是空的？');render();if(puzzle.size>=8)message('可以放大、拖动棋盘，慢慢找');}
function move(a){if(!arrows.some(b=>b.id===a.id))return;document.querySelectorAll('.hinted').forEach(e=>e.classList.remove('hinted'));const g=$(`arrow-${a.id}`);if(!canExit(a,arrows,puzzle.size)){g.classList.remove('blocked');void g.getBoundingClientRect();g.classList.add('blocked');message('前面有小伙伴，先让它出发吧',true);tone(false,true);return;}
 // Accept the move immediately so subsequent taps see the updated board.
 arrows=arrows.filter(b=>b.id!==a.id);departing.add(a.id);g.style.pointerEvents='none';
 busy=true;progress();tone();message(['出发啦！再找找下一个','真棒！又找到一个','慢慢来，你能做到的'][Math.floor(Math.random()*3)]);
 const activeEpoch=epoch,hadFocus=document.activeElement===g;const finish=()=>{if(activeEpoch!==epoch)return;departing.delete(a.id);g.remove();busy=departing.size>0;progress();if(!arrows.length&&!busy)win();else if(hadFocus&&arrows.length&&(document.activeElement===g||document.activeElement===document.body))$(`arrow-${arrows[0].id}`).focus();};
 if(reduced){finish();return;}
 const line=g.querySelector('.line'),head=g.querySelector('.head');g.querySelector('.hit').remove();g.setAttribute('tabindex','-1');const oldLength=line.getTotalLength(),[dx,dy]=DIRS[a.dir],[hx,hy]=point(a.cells.at(-1)),travel=puzzle.size*64+100;
 line.setAttribute('d',pathFor(a)+` L${hx+dx*travel},${hy+dy*travel}`);line.style.strokeDasharray=`${oldLength} ${oldLength+travel+100}`;const duration=Math.min(320,180+oldLength*.1),start=performance.now();
 function animate(now){if(activeEpoch!==epoch)return;const t=Math.min(1,(now-start)/duration),distance=t*(oldLength+travel);line.style.strokeDashoffset=-distance;const headDistance=Math.min(travel,distance);head.setAttribute('transform',`translate(${dx*headDistance} ${dy*headDistance})`);if(t<1)requestAnimationFrame(animate);else finish();}requestAnimationFrame(animate);
}
function win(){completed.add(level);storage.set('arrow-completed',JSON.stringify([...completed]));unlocked=Math.max(unlocked,Math.min(LEVEL_COUNT,level+1));storage.set('arrow-unlocked',unlocked);storage.set('arrow-level',Math.min(LEVEL_COUNT,level+1));message('所有箭头都出发啦！');tone(true);$('win-text').textContent=`第 ${level} 关完成，你让 ${total} 个箭头顺利出发！`;$('next').innerHTML=level<LEVEL_COUNT?'下一关 <span aria-hidden="true">→</span>':'再挑战一局 <span aria-hidden="true">↻</span>';$('win-dialog').showModal();if(!reduced)for(let i=0;i<28;i++){const el=document.createElement('i');el.className='confetti';el.style.cssText=`left:${Math.random()*100}%;top:0;background:${colors[i%5]};animation-delay:${Math.random()*.4}s`;document.body.append(el);setTimeout(()=>el.remove(),2200)}}
$('hint').onclick=()=>{const a=arrows.find(a=>canExit(a,arrows,puzzle.size));if(a){document.querySelectorAll('.hinted').forEach(e=>e.classList.remove('hinted'));$(`arrow-${a.id}`).classList.add('hinted');revealArrow(a);message('点点发光的箭头，试试看！')}};
$('shuffle').onclick=()=>{if(busy)return;if(arrows.length===total)fresh();else $('shuffle-dialog').showModal()};
$('confirm-shuffle').onclick=()=>{$('shuffle-dialog').close();fresh()};
$('next').onclick=()=>fresh(Math.min(LEVEL_COUNT,level+1));$('again').onclick=()=>fresh();
function showLevelPage(page){
 levelPage=Math.max(0,Math.min(Math.ceil(LEVEL_COUNT/25)-1,page));
 const first=levelPage*25+1,last=Math.min(LEVEL_COUNT,first+24);
 $('level-grid').replaceChildren();
 for(let i=first;i<=last;i++){
  const b=document.createElement('button');b.textContent=i;
  b.className=(completed.has(i)?'completed ':'')+(i===level?'current':'');
  b.setAttribute('aria-label',`第${i}关${completed.has(i)?'，已完成':''}`);
  if(i===level)b.setAttribute('aria-current','true');
  b.onclick=()=>{$('level-dialog').close();fresh(i)};$('level-grid').append(b);
 }
 $('page-label').textContent=`${first}–${last} / ${LEVEL_COUNT}`;
 $('page-prev').disabled=levelPage===0;$('page-next').disabled=last===LEVEL_COUNT;
 $('chapter-select').value=String(Math.floor(levelPage/2));
 $('progress-label').textContent=`当前在第 ${level} 关`;
}
CHAPTERS.forEach((name,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`${i*50+1}–${(i+1)*50} · ${name}`;$('chapter-select').append(option)});
$('levels').onclick=()=>{showLevelPage(Math.floor((level-1)/25));$('level-dialog').showModal()};
$('chapter-select').onchange=e=>showLevelPage(Number(e.target.value)*2);
$('page-prev').onclick=()=>showLevelPage(levelPage-1);
$('page-next').onclick=()=>showLevelPage(levelPage+1);
$('back-progress').onclick=()=>showLevelPage(Math.floor((level-1)/25));
function applyZoom(value=zoom){
 const wrap=$('board-viewport'),board=$('board');
 const space=$('board-space');
 const fitted=getComputedStyle(space).display!=='contents';
 if(!fitted){wrap.style.width='';wrap.style.height='';}
 // The tablet grid reserves actual space for labels and controls first.
 const width=fitted?Math.floor(Math.min(space.clientWidth,space.clientHeight)):wrap.clientWidth;
 if(!width)return;
 const previousWidth=viewportWidth||width,oldWidth=previousWidth*zoom;
 const centerX=(wrap.scrollLeft+previousWidth/2)/oldWidth,centerY=(wrap.scrollTop+previousWidth/2)/oldWidth;
 zoom=Math.min(3,Math.max(1,value));viewportWidth=width;
 wrap.style.width=fitted?`${width}px`:'';wrap.style.height=`${width}px`;board.style.width=`${width*zoom}px`;board.style.height=`${width*zoom}px`;
 wrap.scrollLeft=centerX*width*zoom-width/2;wrap.scrollTop=centerY*width*zoom-width/2;
 $('zoom-out').disabled=zoom<=1;$('zoom-in').disabled=zoom>=3;
 $('zoom-reset').textContent=zoom===1?'全图':`${Math.round(zoom*100)}% · 全图`;
}
function revealArrow(a){
 const wrap=$('board-viewport');
 // Enlarge only enough to keep a highlighted arrow easy to tap on this screen.
 const targetZoom=Math.min(3,Math.max(1,(puzzle.size*64+16)*44/(49*wrap.clientWidth)));
 if(zoom<targetZoom)applyZoom(Math.ceil(targetZoom*2)/2);
 const [x,y]=point(a.cells.at(-1)),scale=wrap.clientWidth*zoom/(puzzle.size*64+16);
 wrap.scrollTo({left:x*scale-wrap.clientWidth/2,top:y*scale-wrap.clientHeight/2,behavior:reduced?'instant':'smooth'});
}
$('zoom-in').onclick=()=>applyZoom(zoom+.5);
$('zoom-out').onclick=()=>applyZoom(zoom-.5);
$('zoom-reset').onclick=()=>{applyZoom(1);$('board-viewport').scrollTo(0,0)};
const boardResizeObserver=new ResizeObserver(()=>applyZoom());
boardResizeObserver.observe($('board-space'));
boardResizeObserver.observe($('board-viewport'));
window.addEventListener('resize',()=>applyZoom());
document.querySelectorAll('dialog .close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('win-dialog').addEventListener('cancel',e=>{e.preventDefault();fresh(Math.min(LEVEL_COUNT,level+1))});
// Suppress browser menus from secondary taps and long presses during play.
document.querySelector('.app').addEventListener('contextmenu',event=>event.preventDefault());
fresh();
