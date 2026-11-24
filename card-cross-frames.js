import goat from './hero-goat-frames-v17.js';
import {stitchFramePath} from './stitch-frame-path.mjs';

// Repeat the approved goat stitch at its rendered size. Whole cells keep
// opposite edges symmetric without stretching any individual cross.
const NS='http://www.w3.org/2000/svg';
const cards=[...document.querySelectorAll('.home-frame501 .project, .case-card-cover .project')];
const hero=document.querySelector('.hero-goat');
const make=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el};
function frame(host,columns,rows,cell){
  const key=`connected/${columns}/${rows}/${cell}`;
  if(host.dataset.stitchFrame===key)return;
  host.dataset.stitchFrame=key;
  const svg=make('svg',{class:'cover-frame',width:columns*cell,height:rows*cell,viewBox:`0 0 ${columns} ${rows}`,fill:goat.color,'aria-hidden':'true','data-cell':cell});
  // Center the complete native frame in its snapped layout box. Its pixels
  // retain the goat's exact rendered size, even when that size is fractional.
  svg.style.cssText=`inset:auto;left:50%;top:50%;width:${columns*cell}px;height:${rows*cell}px;transform:translate(-50%,-50%)`;
  svg.setAttribute('data-stitch-count',2*columns+2*rows-4);
  svg.append(make('path',{'data-frame-contour':'',d:stitchFramePath(goat.glyph,columns,rows)}));
  host.querySelector(':scope > .cover-frame')?.replaceWith(svg);
}
function update(){
  // Case pages use the shared responsive goat stitch scale without rendering a hero.
  const cell=hero ? hero.getBoundingClientRect().width/32 : parseFloat(getComputedStyle(cards[0]).fontSize);
  if(!cell)return;
  const snap4=value=>Math.round(value/4)*4;
  for(const card of cards){
    const css=getComputedStyle(card),available=card.getBoundingClientRect().width-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight);
    const visual=card.querySelector('.project-visual');
    const width=snap4(available),height=snap4(width*346.335846/527.625549);
    const rows=Math.max(4,Math.round(height/cell));
    const phones=[...visual.querySelectorAll('.phone-window')];
    visual.style.setProperty('--frame-cell',`${cell}px`);
    visual.style.width=`${width}px`;visual.style.height=`${height}px`;
    const fit=(host,hostWidth,round=Math.round)=>{
      const columns=Math.max(4,round(hostWidth/cell));
      host.style.setProperty('--frame-inset-x',`${(hostWidth-columns*cell)/2+cell}px`);
      host.style.setProperty('--frame-inset-y',`${(height-rows*cell)/2+cell}px`);
      frame(host,columns,rows,cell);
    };
    if(phones.length){
      // Leave room for at least two complete native cells in each gutter.
      const minGap=Math.ceil(2*cell/4)*4;
      const phoneWidth=Math.max(32,Math.floor((width-2*minGap)/3/8)*8);
      visual.style.gap=`${(width-3*phoneWidth)/2}px`;
      for(const phone of phones){phone.style.width=`${phoneWidth}px`;phone.style.height=`${height}px`;fit(phone,phoneWidth,Math.ceil)}
    }else{
      fit(visual,width);
    }
  }
}
const observer=new ResizeObserver(update);
cards.forEach(card=>observer.observe(card));
if(hero)observer.observe(hero);
if(cards.length){
  update();
  document.fonts.ready.then(update);
}
