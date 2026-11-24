import dance from './hero-goat-frames-v17.js';

const goat = document.querySelector('.hero-goat');
const playbackRate = 0.85; // Homepage speed; the standalone preview keeps its own rate.
if (goat) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = goat.querySelector('.hero-goat-motion').attachShadow({mode:'open'});
  const make = tag => document.createElementNS('http://www.w3.org/2000/svg',tag);
  const svg = make('svg'), defs = make('defs'), glyph = make('path'), body = make('g');
  svg.setAttribute('viewBox','15 5 32 45');
  svg.style.cssText = 'display:block;width:100%;height:100%;overflow:visible';
  glyph.setAttribute('id','goat-stitch'); glyph.setAttribute('d',dance.glyph);
  defs.append(glyph); body.setAttribute('fill',dance.color); svg.append(defs,body);

  const poses = dance.poses.map(s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)));
  const stamps = Array.from({length:Math.max(...poses.map(p=>p.length/2))},()=>{
    const stamp = make('use'); stamp.setAttribute('href','#goat-stitch');
    body.append(stamp); return stamp;
  });
  let frame = -1, mode = null, timer, epoch = 0;
  const entry = dance.firstMotion, offset = dance.starts[entry];

  function draw(next) {
    if (frame === next) return;
    const pose=poses[next], previous=poses[frame];
    for (let i=0;i<stamps.length;i++) {
      const pos=2*i, stamp=stamps[i];
      if (pos>=pose.length) {
        if (!previous || pos<previous.length) stamp.setAttribute('display','none');
        continue;
      }
      if (!previous || pos>=previous.length) stamp.removeAttribute('display');
      if (previous?.[pos]!==pose[pos]) stamp.setAttribute('x',pose[pos]);
      if (previous?.[pos+1]!==pose[pos+1]) stamp.setAttribute('y',pose[pos+1]);
    }
    frame=next;
  }
  draw(entry);
  stage.append(svg);

  function stop() {
    clearTimeout(timer);
    mode=null;
    goat.removeAttribute('data-playing');
  }
  function tick() {
    if (!mode) return;
    const elapsed=offset+(performance.now()-epoch)*playbackRate;
    if (mode==='once' && elapsed>=dance.duration) {stop(); return}
    const phase=elapsed%dance.duration;
    let index=0;
    while (index+1<dance.starts.length && dance.starts[index+1]<=phase) index++;
    draw(index);
    const end=dance.starts[index+1]??dance.duration;
    timer=setTimeout(tick,Math.max(1,(end-phase)/playbackRate));
  }
  function play(trigger) {
    if (reduced.matches || document.hidden) return;
    clearTimeout(timer);
    mode=trigger;
    epoch=performance.now();
    // The approved rest hold still exists at the loop boundary. On entry,
    // expose the first moving pose synchronously in the pointer event.
    draw(entry);
    goat.setAttribute('data-playing','');
    tick();
  }
  goat.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch') play('hover')});
  goat.addEventListener('pointerleave',()=>{if(mode==='hover') stop()});
  goat.addEventListener('click',()=>{if(mode!=='hover') play('once')});
  goat.addEventListener('keydown',e=>{if(e.key==='Escape') stop()});
  goat.addEventListener('blur',()=>{if(mode==='once') stop()});
  goat.addEventListener('pointercancel',stop);
  window.addEventListener('blur',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden) stop()});
  reduced.addEventListener('change',()=>{if(reduced.matches) stop()});
  if (matchMedia('(any-hover:hover)').matches && goat.matches(':hover')) play('hover');
}
