// The two dimensions of every ornament are counts of fixed 8.25 px stitches.
// Corner placement moves complete glyphs; it never scales the artwork.
const CORNERS={
  callgrid:{side:'right',inset:.46},
  mobile:{side:'right',inset:.63,top:16},
  reports:{side:'left',inset:.52},
  crm:{side:'left',inset:.48},
  academy:{side:'right',inset:.52},
  city:{side:'left',inset:.55}
};

export function makeOrnamentField(name,motif,{width,leftRoom,rightRoom,visual,copy,compact=false}) {
  const corner=CORNERS[name];
  const preferred=corner.side==='right'
    ?visual.right-motif.cols*corner.inset
    :visual.left-motif.cols*corner.inset;
  const minX=Math.ceil(-leftRoom),maxX=Math.floor(width+rightRoom-motif.cols);
  const originX=Math.max(minX,Math.min(maxX,Math.round(preferred)));
  const originY=Math.floor(visual.top)-(compact?8:corner.top||8);
  const masks=[visual,copy];
  return motif.cells.map(([x,y])=>[x+originX,y+originY]).filter(([x,y])=>
    x>=-leftRoom&&x+1<=width+rightRoom&&
    // Drop a whole stitch if a foreground surface would cover part of it.
    !masks.some(r=>x<r.right&&x+1>r.left&&y<r.bottom&&y+1>r.top));
}
