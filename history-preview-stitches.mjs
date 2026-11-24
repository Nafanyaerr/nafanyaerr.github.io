const SOURCE_STITCH = 8.25;

export function previewGrid(frame) {
  const round = pixels => Math.round(pixels / SOURCE_STITCH);
  return {
    columns: round(frame.width), rows: round(frame.height),
    left: round(frame.imageLeft), top: round(frame.imageTop),
    right: round(frame.width - frame.imageLeft - frame.imageWidth),
    bottom: round(frame.height - frame.imageTop - frame.imageHeight),
    cells: new Set(frame.cells.map(([x,y]) => `${round(x)},${round(y)}`))
  };
}

// Keep the border's outer motifs anchored. When the opening changes size,
// repeat or remove only whole cells in the middle of the original grid.
function fitAxis(total, before, after, size, pitch, repeat) {
  const opening = Math.ceil(size / pitch - 1e-8);
  const original = total - before - after;
  const delta = opening - original;
  const added = Math.max(0, delta);
  const middle = before + Math.floor(Math.min(opening, original) / 2);
  const repeated = Math.min(repeat, middle);
  const source = index => {
    if (index < middle) return index;
    if (index >= middle + added) return index - delta;
    return middle - repeated + (index - middle) % repeated;
  };
  return {count: before + opening + after, source, offset: before * pitch + (opening * pitch - size) / 2};
}

export function fitPreviewStitches(grid, imageWidth, imageHeight, pitch, repeat) {
  const x = fitAxis(grid.columns,grid.left,grid.right,imageWidth,pitch,repeat[0]);
  const y = fitAxis(grid.rows,grid.top,grid.bottom,imageHeight,pitch,repeat[1]);
  const cells = [];
  for (let row = 0; row < y.count; row++) {
    for (let col = 0; col < x.count; col++) {
      if (grid.cells.has(`${x.source(col)},${y.source(row)}`)) cells.push([col * pitch,row * pitch]);
    }
  }
  return {width:x.count * pitch,height:y.count * pitch,imageWidth,imageHeight,
    imageLeft:x.offset,imageTop:y.offset,cellSize:pitch,cells};
}
