// One clock owns the whole reveal. Crosses switch directly from hidden to
// visible; SVG/CSS animation fill states cannot leave individual holes behind.
const BURSTS=[.05,.14,.18,.34,.50,.56,.80,.91];
function noise(x,y,seed) {
  let value=Math.imul(Math.round(x*16)^seed,0x45d9f3b);
  value=Math.imul(value^Math.round(y*16),0x45d9f3b);
  return ((value^(value>>>16))>>>0)/4294967296;
}
export function createStitchReveal({
  requestFrame=callback=>requestAnimationFrame(callback),
  cancelFrame=id=>cancelAnimationFrame(id),
  now=()=>performance.now(),
  random=()=>Math.random()
}={}) {
  let ordered=[],shown=0,frame=null,run=0;

  function cancel() {
    run++;
    if(frame!==null) cancelFrame(frame);
    frame=null;
  }
  function showThrough(count) {
    while(shown<count) ordered[shown++].node.classList.add('is-visible');
  }
  function reset() {
    cancel();
    for(const pixel of ordered) pixel.node.classList.remove('is-visible');
    ordered=[];shown=0;
  }
  function finish() {
    cancel();
    showThrough(ordered.length);
  }
  function start(pixels,origin,{duration=440,cellSize=8.25,instant=false}={}) {
    reset();
    ordered=pixels.map(pixel=>({
      ...pixel,distance:Math.hypot(pixel.x+cellSize/2-origin.x,pixel.y+cellSize/2-origin.y)
    })).sort((a,b)=>a.distance-b.distance||a.y-b.y||a.x-b.x);
    if(!ordered.length) return;
    if(instant||duration<=0) {finish();return;}
    const nearest=ordered[0],min=nearest.distance;
    const span=Math.max(cellSize,ordered.at(-1).distance-min);
    const seed=Math.floor(random()*4294967296);
    // A coherent cursor-led front with a little scattered texture. Noise is
    // sampled once per entry; the reduced outliers keep the motion calmer.
    ordered=ordered.map(pixel=>{
      const speckle=noise(pixel.x,pixel.y,seed);
      const patch=noise(Math.floor(pixel.x/cellSize/3),Math.floor(pixel.y/cellSize/3),seed^0x5bd1e995);
      let score=.82*(pixel.distance-min)/span+.13*speckle+.05*patch;
      if(speckle<.03) score*=.75;
      return {...pixel,score:pixel===nearest?-1:score,speckle};
    }).sort((a,b)=>a.score-b.score||a.distance-b.distance||a.y-b.y||a.x-b.x);
    ordered=ordered.map((pixel,index)=>({
      ...pixel,due:index===0?0:index===ordered.length-1?duration:
        duration*(.82*index/Math.max(1,ordered.length-1)+.18*(BURSTS[Math.min(BURSTS.length-1,Math.floor(index/ordered.length*BURSTS.length))]+pixel.speckle*.012))
    })).sort((a,b)=>a.due-b.due||a.score-b.score);
    const token=run,started=now();
    showThrough(1);
    function tick(time) {
      // A canceled callback must never mutate a later hover's stitches.
      if(token!==run) return;
      frame=null;
      const elapsed=Math.max(0,time-started);
      if(elapsed>=duration) showThrough(ordered.length);
      else while(shown<ordered.length&&ordered[shown].due<=elapsed) showThrough(shown+1);
      if(shown<ordered.length) frame=requestFrame(tick);
    }
    if(shown<ordered.length) frame=requestFrame(tick);
  }
  return {start,reset,finish};
}
