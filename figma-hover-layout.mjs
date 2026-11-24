// Layout dimensions are counts of the shared stitch, including at breakpoints.
export function makeHoverField(motif,{width,leftRoom,rightRoom,visual,copy,mediaBoxes=[visual]}) {
  if(motif.layout) return makeSourceBorder(motif,{width,leftRoom,rightRoom,visual,copy});
  const visualWidth=visual.right-visual.left;
  const targetWidth=visualWidth+motif.side*2;
  const sideRoom=Math.min(visual.left+leftRoom,width+rightRoom-visual.right);
  const repeatCount=(targetWidth-motif.cols)/motif.repeatX+1;
  let columns=Math.max(2,Math.round(repeatCount));
  if(motif.pairedDiamonds){
    // Keep complete pairs centered when the viewport constrains the outer edge.
    const available=visualWidth+2*sideRoom;
    const fittingPairs=1+Math.floor((available-motif.cols)/motif.repeatX);
    columns=Math.max(1,Math.min(Math.ceil(repeatCount),fittingPairs));
  }
  const fieldWidth=motif.spreadX?Math.round(targetWidth):(columns-1)*motif.repeatX+motif.cols;
  const stepX=motif.spreadX?(fieldWidth-motif.cols)/(columns-1):motif.repeatX;
  const centeredX=(visual.left+visual.right-fieldWidth)/2;
  const originX=motif.pairedDiamonds?centeredX:Math.round(centeredX);
  const originY=Math.round(visual.top-motif.top);
  const rows=Math.ceil((visual.bottom-originY)/motif.repeatY);
  const fieldLeft=motif.pairedDiamonds?visual.left-sideRoom:-leftRoom;
  const fieldRight=motif.pairedDiamonds?visual.right+sideRoom:width+rightRoom;
  const exclusions=[...mediaBoxes,copy];
  const result=new Map();
  for(let row=0;row<rows;row++) {
    for(let col=0;col<columns;col++) {
      for(const [cx,cy] of motif.cells) {
        const cellX=motif.alternateMirror&&col%2?motif.cols-1-cx:cx;
        const cellY=motif.alternateMirror&&row%2?motif.rows-1-cy:cy;
        const x=originX+Math.round(col*stepX)+cellX;
        const y=originY+row*motif.repeatY+cellY;
        // Keep whole stitches outside each screen. Multi-screen covers expose
        // the original repeating field in their internal gutters as well.
        if(x < fieldLeft || x+1 > fieldRight || y+1 > visual.bottom) continue;
        if(exclusions.some(b=>x<b.right&&x+1>b.left&&y<b.bottom&&y+1>b.top)) continue;
        result.set(`${x},${y}`,[x,y]);
      }
    }
  }
  return [...result.values()];
}

// Preserve native stitch groups rather than rebuilding both borders out of a
// single generic repeat. All coordinates are counts of the same 8.25px cross.
function makeSourceBorder(motif,{width,leftRoom,rightRoom,visual,copy}) {
  const cells=new Map();
  const add=(part,ox,oy)=>{
    for(const [cx,cy] of part) {
      const x=ox+cx,y=oy+cy;
      if(x < -leftRoom || x+1 > width+rightRoom) continue;
      if(y+1 > visual.bottom+.01) continue;
      if([visual,copy].some(b=>x<b.right&&x+1>b.left&&y<b.bottom&&y+1>b.top)) continue;
      cells.set(`${x.toFixed(3)},${y.toFixed(3)}`,[x,y]);
    }
  };
  if(motif.layout==='academy-source') {
    const columns=Math.max(3,Math.ceil((visual.right-visual.left+18)/9));
    const ox=Math.round((visual.left+visual.right-columns*9)/2);
    // The reference has a 24-row opening followed by three 6-row diamond
    // bands. On a shorter image remove complete repeated bands, not sprigs
    // or individual stitches. The lower cap remains the original SVG piece.
    const bands=Math.max(1,Math.round((visual.bottom-visual.top+10-24)/6));
    const height=24+bands*6;
    const oy=visual.bottom-height;
    for(let col=1;col<columns-1;col++) {
      add(motif.parts.imgGroup,ox+col*9,oy);
      add(motif.parts.imgGroup1,ox+col*9+1,oy+6);
    }
    for(const side of [0,1]) {
      const originalX=side?63:0;
      const sideX=ox+(side?(columns-1)*9:0);
      for(const occurrence of motif.sideOccurrences) {
        if((occurrence.x>=63)!==Boolean(side)) continue;
        if(occurrence.y>=24) continue;
        add(motif.parts[occurrence.part],sideX+occurrence.x-originalX,oy+occurrence.y);
      }
      for(let band=0;band<bands;band++) {
        add(motif.parts[band%2?'imgGroup':'imgGroup4'],sideX,oy+24+band*6);
      }
      add(motif.parts[side?'imgGroup5':'imgGroup7'],sideX+(side?4:0),oy+height-6);
    }
  } else if(motif.layout==='city-source') {
    const targetWidth=visual.right-visual.left+motif.side*2;
    const pairs=Math.max(2,Math.ceil((targetWidth+1)/motif.repeatX));
    const columns=2*pairs-1;
    const medallionWidth=(motif.cols+1)/2;
    const strip=motif.cells.filter(([x])=>x<medallionWidth);
    // The two medallions within a Figma pair share an edge; adjacent pairs
    // have a one-stitch gap. Mirror those intervals around the middle column.
    const sharedStep=medallionWidth-1;
    const offsets=[0];
    for(let col=1;col<columns;col++) {
      const fromEdge=Math.min(col,columns-col);
      const step=fromEdge%2?sharedStep:motif.repeatX-sharedStep;
      offsets.push(offsets[col-1]+step);
    }
    const fieldWidth=offsets.at(-1)+medallionWidth;
    const ox=(visual.left+visual.right-fieldWidth)/2,oy=visual.top-motif.top;
    const rows=Math.ceil((visual.bottom-oy)/motif.repeatY);
    for(let row=0;row<rows;row++) {
      const stagger=row>=2&&row===rows-1?Math.round(motif.bottomRowOffset):0;
      offsets.forEach((x,col)=>{
        const inset=Math.sign(pairs-1-col)*stagger;
        add(strip,ox+x+inset,oy+row*motif.repeatY);
      });
    }
  }
  return [...cells.values()];
}
