// All coordinates are cross cells. The renderer alone supplies the 8.25px glyph.
export const FRAME_BAND = 7;

const LAST = FRAME_BAND - 1;
const MIDDLE = LAST / 2;

const DIAMOND = [];
for (let y = 0; y < FRAME_BAND; y++) {
  for (let x = 0; x < FRAME_BAND; x++) {
    if (Math.abs(x - MIDDLE) + Math.abs(y - MIDDLE) === MIDDLE) DIAMOND.push([x,y]);
  }
}

// A stepped ring with a short stitch pointing out from each cardinal point.
const RING = [
  [3,0],
  [2,1],[3,1],[4,1],
  [1,2],[5,2],
  [0,3],[1,3],[5,3],[6,3],
  [1,4],[5,4],
  [2,5],[3,5],[4,5],
  [3,6]
];

const LARGE_CROSS = [
  [3,0],
  [3,1],
  [2,2],[3,2],[4,2],
  [0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],
  [2,4],[3,4],[4,4],
  [3,5],
  [3,6]
];
const SMALL_CROSS = [[3,2],[3,4]];
for (let x = 0; x < FRAME_BAND; x++) SMALL_CROSS.push([x,3]);

const LATTICE_X = [];
for (let x = 0; x < 5; x++) LATTICE_X.push([x,x + 1],[x,5 - x]);
const LADDER_PAIR = [[0,2],[1,2],[0,4],[1,4]];

/**
 * Return a complete four-sided embroidery border, never clipped motif fragments.
 * Integer grid dimensions below two corner widths cannot hold this border.
 */
export function frameCells(columns,rows,pattern = 'diamonds') {
  if (!Number.isInteger(columns) || !Number.isInteger(rows) ||
      columns < FRAME_BAND * 2 || rows < FRAME_BAND * 2) return [];

  const cells = new Map();
  function add(x,y) {
    if (x < 0 || y < 0 || x >= columns || y >= rows) return;
    if (x >= FRAME_BAND && x < columns - FRAME_BAND &&
        y >= FRAME_BAND && y < rows - FRAME_BAND) return;
    cells.set(`${x},${y}`,[x,y]);
  }

  // Each side owns only its straight run; four separate 7x7 corners join them.
  const edges = [
    { length:columns - FRAME_BAND * 2,point:(u,v) => [FRAME_BAND + u,v] },
    { length:rows - FRAME_BAND * 2,point:(u,v) => [columns - 1 - v,FRAME_BAND + u] },
    { length:columns - FRAME_BAND * 2,point:(u,v) => [columns - 1 - FRAME_BAND - u,rows - 1 - v] },
    { length:rows - FRAME_BAND * 2,point:(u,v) => [v,rows - 1 - FRAME_BAND - u] }
  ];
  function stampEdge(edge,motif,offset) {
    for (const [u,v] of motif) add(...edge.point(offset + u,v));
  }
  function stampCorners(motif) {
    for (const [x,y] of motif) {
      add(x,y);
      add(columns - 1 - x,y);
      add(columns - 1 - x,rows - 1 - y);
      add(x,rows - 1 - y);
    }
  }

  function linkedMotifs(motif,gap,alternate = false) {
    stampCorners(motif);
    for (const edge of edges) {
      let count = Math.floor((edge.length + gap) / (FRAME_BAND + gap));
      // Large corner crosses meet a small cross at both ends of each side.
      if (alternate && count > 0 && count % 2 === 0) count--;
      const occupied = count > 0 ? count * FRAME_BAND + (count - 1) * gap : 0;
      const start = Math.floor((edge.length - occupied) / 2);
      let cursor = 0;
      for (let index = 0; index < count; index++) {
        const offset = start + index * (FRAME_BAND + gap);
        while (cursor < offset) add(...edge.point(cursor++,MIDDLE));
        stampEdge(edge,alternate && index % 2 === 0 ? SMALL_CROSS : motif,offset);
        cursor = offset + FRAME_BAND;
      }
      while (cursor < edge.length) add(...edge.point(cursor++,MIDDLE));
    }
  }

  function rectangleRail(inset) {
    for (let x = inset; x < columns - inset; x++) {
      add(x,inset);
      add(x,rows - 1 - inset);
    }
    for (let y = inset + 1; y < rows - 1 - inset; y++) {
      add(inset,y);
      add(columns - 1 - inset,y);
    }
  }

  function railedMotifs(motif,width,gap,corner) {
    // Both rails turn continuously; their corner joins are nested L shapes.
    rectangleRail(0);
    rectangleRail(LAST);
    stampCorners(corner);
    for (const edge of edges) {
      const count = Math.floor((edge.length + gap) / (width + gap));
      const occupied = count > 0 ? count * width + (count - 1) * gap : 0;
      const start = Math.floor((edge.length - occupied) / 2);
      for (let index = 0; index < count; index++) stampEdge(edge,motif,start + index * (width + gap));
    }
  }

  switch (pattern) {
    case 'rings':
      linkedMotifs(RING,2);
      break;
    case 'crosses':
      linkedMotifs(LARGE_CROSS,2,true);
      break;
    case 'lattice': {
      const corner = [];
      for (let step = 1; step < LAST; step++) corner.push([step,step],[step,LAST - step]);
      railedMotifs(LATTICE_X,5,1,corner);
      break;
    }
    case 'ladder':
      railedMotifs(LADDER_PAIR,2,5,[[2,2],[4,2],[2,4],[4,4]]);
      break;
    case 'diamonds':
    default:
      linkedMotifs(DIAMOND,1);
      break;
  }
  return [...cells.values()];
}
