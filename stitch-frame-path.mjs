// Paint touching stitches in one SVG fill operation. Separate symbol/use
// elements can antialias the shared edges twice and leave pale hairlines.
export function stitchFramePath(glyph,columns,rows){
  const edge=n=>Math.abs(n-1)<.00002?1:Math.abs(n)<.00002?0:n;
  const points=[...glyph.matchAll(/([ML])\s*([-\d.]+)[ ,]+([-\d.]+)/g)]
    .map(([,command,x,y])=>({command,x:edge(+x),y:edge(+y)}));
  if(!points.length)throw new Error('Native stitch contour is empty');
  const contours=[];
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
    if(x&&y&&x!==columns-1&&y!==rows-1)continue;
    contours.push(points.map(p=>`${p.command}${x+p.x} ${y+p.y}`).join(' ')+'Z');
  }
  return contours.join(' ');
}
