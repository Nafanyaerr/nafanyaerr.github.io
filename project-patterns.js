import { makeHoverField } from './figma-hover-layout.mjs';
import { createStitchReveal } from './stitch-reveal.mjs';
import goat from './hero-goat-frames-v17.js';
// Original layouts use 8.25px stitches. The paired homepage follows the
// rendered goat cell size; responsive layouts repeat the native motifs.
const CELL = 8.25;
const REVEAL_MS = 440;
const NS = 'http://www.w3.org/2000/svg';
const goatStage = document.querySelector('.hero-goat');
const cards = [...document.querySelectorAll('.project')];
const states = new WeakMap();
let motifs;
function element(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);
  return node;
}
function addCross(parent,name,x,y,cell=CELL) {
  const node=element('use',{href:`#card-cross-${name}`,x,y,width:cell,height:cell,'data-cross':''});
  parent.append(node);
  return node;
}
function reveal(card,origin) {
  const state=states.get(card);
  if(!state?.pixels?.length) return;
  card.classList.add('pattern-revealing');
  state.revealer.start(state.pixels,origin,{duration:REVEAL_MS,cellSize:state.cellSize||CELL,instant:reducedMotion.matches});
}
function hide(card) {
  const state=states.get(card);
  state?.revealer.reset();
  card.classList.remove('pattern-revealing');
}
function leave(card) {
  states.get(card).pointerOrigin=null;
  if(!card.matches(':focus-visible')) hide(card);
}
function enter(card,event) {
  if(!hover.matches||event.pointerType==='touch') return;
  const state=states.get(card),rect=card.getBoundingClientRect();
  state.pointerOrigin={x:event.clientX-rect.left,y:event.clientY-rect.top};
  reveal(card,state.pointerOrigin);
}
function replacePattern(layer,svg) {
  layer.replaceChildren(...(svg ? [svg] : []));
  document.dispatchEvent(new Event('project-pattern-layout'));
}
function draw(card) {
  const CELL=goatStage?.getBoundingClientRect().width/32||8.25;
  const state=states.get(card);
  if(!state) return;
  const rect=card.getBoundingClientRect(), width=rect.width, height=rect.height;
  const localBox=target=>{
    const box=(typeof target==='string'?card.querySelector(target):target).getBoundingClientRect();
    return {left:(box.left-rect.left)/CELL,top:(box.top-rect.top)/CELL,right:(box.right-rect.left)/CELL,bottom:(box.bottom-rect.top)/CELL};
  };
  const visual=localBox('.project-visual'),copy=localBox('.project-copy');
  const phones=[...card.querySelectorAll('.phone-window, .mobile-screen-pair img')];
  let mediaBoxes=phones.length>1?phones.map(localBox):[visual];
  const pair=card.querySelector('.mobile-screen-pair');
  if(pair){
    // The two-screen cover zooms as a unit. Exclude the whole path of each
    // phone's edges, even if a resize measures the pair halfway through zoom.
    const box=localBox(pair),style=getComputedStyle(pair);
    const scale=style.transform==='none'?1:new DOMMatrixReadOnly(style.transform).a;
    const zoom=Number(style.getPropertyValue('--cover-zoom'))||1;
    const cx=(box.left+box.right)/2,cy=(box.top+box.bottom)/2;
    const edge=(p,c,choose)=>c+choose((p-c)/scale,(p-c)*zoom/scale);
    mediaBoxes=mediaBoxes.map(b=>({
      left:edge(b.left,cx,Math.min),right:edge(b.right,cx,Math.max),
      top:edge(b.top,cy,Math.min),bottom:edge(b.bottom,cy,Math.max)
    }));
  }
  const drawable=hover.matches||card.matches(':focus-visible');
  const signature=[CELL,width,height,rect.left,document.documentElement.clientWidth,drawable,...Object.values(visual),...Object.values(copy),...mediaBoxes.flatMap(box=>Object.values(box))].join('/');
  if(signature===state.signature) return;
  state.signature=signature;
  // Cancel the previous clock before replacing any SVG nodes on resize.
  hide(card);
  if(!drawable) {
    replacePattern(state.layer);
    state.pixels=[];
    return;
  }
  const motif=motifs[state.name];
  const leftRoom=Math.max(0,Math.floor(rect.left/CELL)-2);
  const rightRoom=Math.max(0,Math.floor((document.documentElement.clientWidth-rect.right)/CELL)-2);
  // Keep the complete native ornament, including over neighbouring captions.
  const pixels=makeHoverField(motif,{width:width/CELL,leftRoom,rightRoom,visual,copy,mediaBoxes})
    .map(([x,y])=>({x:x*CELL,y:y*CELL}));
  state.focusOrigin={x:(visual.left+visual.right)*CELL/2,y:(visual.top+visual.bottom)*CELL/2};
  const svg=element('svg',{width,height,viewBox:`0 0 ${width} ${height}`,fill:motif.colour,overflow:'visible','aria-hidden':'true'});
  const defs=element('defs'),symbol=element('symbol',{id:`card-cross-${state.name}`,viewBox:'0 0 1 1'});
  symbol.append(element('path',{d:goat.glyph}));defs.append(symbol);svg.append(defs);
  // Its bounds include every cross, even before the hover reveal starts.
  const footprint=element('g',{'data-pattern-footprint':''});
  state.cellSize=CELL;
  state.pixels=pixels.map(pixel=>({...pixel,node:addCross(footprint,state.name,pixel.x,pixel.y,CELL)}));
  svg.append(footprint);
  replacePattern(state.layer,svg);
  if(state.pointerOrigin) reveal(card,state.pointerOrigin);
  else if(card.matches(':focus-visible')) reveal(card,state.focusOrigin);
  return true;
}
const observer=new ResizeObserver(entries=>entries.forEach(entry=>draw(entry.target)));
const hover=matchMedia('(hover:hover) and (pointer:fine)');
const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)');
let loading;
function initialize() {
  if(loading) return;
  loading=fetch('assets/patterns/figma-hover.json').then(response=>{
    if(!response.ok) throw new Error('Pattern unavailable');
    return response.json();
  }).then(data=>{
    motifs=data;
    for(const card of cards) {
      const name=[...card.classList].find(value=>value.startsWith('project-')).slice(8);
      if(!motifs[name]) continue;
      const layer=document.createElement('div');
      layer.className='project-pattern';layer.setAttribute('aria-hidden','true');card.prepend(layer);
      card.classList.add('has-ornament');
      card.tabIndex=0;
      states.set(card,{name,layer,pointerOrigin:null,revealer:createStitchReveal()});draw(card);observer.observe(card);
      card.addEventListener('pointerenter',event=>enter(card,event));
      // Also catch the first move if the pointer was already over the card
      // while its SVG assets were loading. Do not restart on every movement.
      card.addEventListener('pointermove',event=>{
        if(!states.get(card).pointerOrigin) enter(card,event);
      });
      card.addEventListener('pointerleave',()=>leave(card));
      card.addEventListener('pointercancel',()=>leave(card));
      card.addEventListener('focus',()=>{
        const rebuilt=draw(card);
        const state=states.get(card);
        if(!rebuilt&&card.matches(':focus-visible')&&!state.pointerOrigin) reveal(card,state.focusOrigin);
      });
      card.addEventListener('blur',()=>{
        if(!states.get(card).pointerOrigin) hide(card);
        draw(card);
      });
    }
  }).catch(()=>{loading=null;});
}
hover.addEventListener('change',()=>cards.forEach(card=>{
  const state=states.get(card);
  if(state&&!hover.matches) state.pointerOrigin=null;
  draw(card);
}));
window.addEventListener('resize',()=>cards.forEach(draw),{passive:true});
reducedMotion.addEventListener('change',()=>{
  cards.forEach(draw);
  if(reducedMotion.matches) for(const card of cards) {
    if(card.classList.contains('pattern-revealing')) states.get(card)?.revealer.finish();
  }
});
initialize();
