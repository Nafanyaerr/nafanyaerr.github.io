import dance from './hero-goat-frames-v17.js';

const goat = document.querySelector('.hero-goat');
const hero = goat?.closest('.hero');
const main = document.querySelector('main');
const isAbout = document.body.classList.contains('about-page');
const aboutOrnament = isAbout ? main?.querySelector('.about-ornament') : null;
const stitchAnchor = main?.querySelector('[data-stitch-anchor]');

if (main && (hero || isAbout || stitchAnchor)) {
  const anchor = goat ?? stitchAnchor ?? main;
  const footer = document.querySelector('.site-footer');
  const holdTime = 2000;
  const lifetime = 3000;
  const eraseSteps = 10;
  const maxCells = 2400;
  const palette = ['#e8b92e', '#eb6b2f', '#d94658', '#6a3b94', '#48afc0', '#76a832'];
  const cellsPerColor = 16;
  const interactive = 'button, input, textarea, select, [contenteditable]:not([contenteditable="false"])';
  const aboutBlocks = '.about-story, .about-photo, .about-ornament';
  const excluded = `.site-header, .site-footer, .project, [data-pattern-footprint], [data-stitch-exclusion], ${aboutBlocks}, ${interactive}`;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const make = tag => document.createElementNS('http://www.w3.org/2000/svg', tag);
  const layer = document.createElement('div');
  layer.className = 'goat-cursor-drawing';
  layer.setAttribute('aria-hidden', 'true');
  layer.dataset.testid = 'goat-cursor-drawing';
  layer.dataset.holdMs = holdTime;
  layer.dataset.ttlMs = lifetime;
  layer.dataset.fadeMs = '0';
  layer.dataset.eraseMs = lifetime - holdTime;
  layer.dataset.eraseSteps = eraseSteps;
  layer.dataset.maxCells = maxCells;
  layer.dataset.palette = palette.join(',');
  layer.dataset.cellsPerColor = cellsPerColor;
  layer.dataset.count = '0';

  const svg = make('svg');
  const definitions = make('defs');
  const glyph = make('path');
  const drawing = make('g');
  const visibleDrawing = make('g');
  const mask = make('mask');
  const allowedArea = make('rect');
  const blockedAreas = make('g');
  svg.setAttribute('focusable', 'false');
  glyph.id = 'goat-cursor-stitch';
  glyph.setAttribute('d', dance.glyph);
  mask.id = 'goat-cursor-background-mask';
  mask.setAttribute('maskUnits', 'userSpaceOnUse');
  mask.setAttribute('maskContentUnits', 'userSpaceOnUse');
  mask.setAttribute('x', '0');
  mask.setAttribute('y', '0');
  mask.setAttribute('style', 'mask-type: luminance');
  allowedArea.setAttribute('fill', 'white');
  blockedAreas.setAttribute('fill', 'black');
  mask.append(allowedArea, blockedAreas);
  visibleDrawing.setAttribute('mask', `url(#${mask.id})`);
  visibleDrawing.append(drawing);
  definitions.append(glyph, mask);
  svg.append(definitions, visibleDrawing);
  layer.append(svg);
  document.body.append(layer);

  // Insertion order is the last-touch order, so the oldest cells are evicted first.
  const cells = new Map();
  let geometry = null;
  let previousCell = null;
  let previousPointer = null;
  let expiryTimer = 0;
  let layoutFrame = 0;
  let colorStep = 0;

  function resetPath() {
    previousCell = previousPointer = null;
  }

  function setState(cell, state) {
    if (cell.state === state) return;
    cell.state = state;
    cell.element.dataset.state = state;
  }

  function removeCell(key, cell) {
    cell.element.remove();
    cells.delete(key);
  }

  // Each complete stitch disappears at a discrete boundary; opacity never fades.
  // Stable spatial staggering also breaks up long strokes drawn in a single event.
  function scheduleExpiry() {
    clearTimeout(expiryTimer);
    const now = performance.now();
    let next = Infinity;
    for (const [key, cell] of cells) {
      const duration = reducedMotion.matches ? lifetime : holdTime + cell.eraseStep * (lifetime - holdTime) / eraseSteps;
      const expiresAt = cell.touchedAt + duration;
      if (now >= expiresAt) {
        removeCell(key, cell);
        continue;
      }
      next = Math.min(next, expiresAt);
    }
    layer.dataset.count = cells.size;
    if (Number.isFinite(next)) {
      expiryTimer = setTimeout(scheduleExpiry, Math.max(1, Math.ceil(next - now)));
    }
  }

  function drawCell(column, row, now) {
    const key = `${column},${row}`;
    let cell = cells.get(key);
    if (cell) {
      cells.delete(key);
    } else {
      const element = make('use');
      element.setAttribute('href', '#goat-cursor-stitch');
      element.setAttribute('x', column);
      element.setAttribute('y', row);
      element.dataset.cell = key;
      element.dataset.col = column;
      element.dataset.row = row;
      const colorIndex = Math.floor(colorStep / cellsPerColor) % palette.length;
      element.setAttribute('fill', palette[colorIndex]);
      element.dataset.colorIndex = colorIndex;
      colorStep++;
      drawing.append(element);
      const eraseStep = ((Math.imul(column, 73856093) ^ Math.imul(row, 19349663)) >>> 0) % eraseSteps + 1;
      cell = {element, state: 'hidden', touchedAt: now, eraseStep};
      element.dataset.eraseStep = eraseStep;
    }
    cell.touchedAt = now;
    setState(cell, 'visible');
    cells.set(key, cell);
    if (cells.size > maxCells) {
      const [oldestKey, oldestCell] = cells.entries().next().value;
      removeCell(oldestKey, oldestCell);
    }
  }

  function isBlocked(column, row) {
    const left = geometry.originX + column * geometry.pitch - geometry.scrollX;
    const top = geometry.originY + row * geometry.pitch - geometry.scrollY;
    if (left < 0 || left + geometry.pitch > geometry.width || top < 0 || top + geometry.pitch > geometry.height) return true;
    const right = left + geometry.pitch;
    const bottom = top + geometry.pitch;
    if (top < geometry.drawingTop || bottom > geometry.drawingBottom) return true;
    // Reject the whole stitch if any of it touches an excluded area.
    return geometry.controls.some(rect => right > rect.left && left < rect.right && bottom > rect.top && top < rect.bottom);
  }

  // Bresenham fills skipped grid cells during fast movement with a one-cell stroke.
  function drawLine(start, end) {
    let {column, row} = start;
    const dx = Math.abs(end.column - column);
    const dy = -Math.abs(end.row - row);
    const stepX = column < end.column ? 1 : -1;
    const stepY = row < end.row ? 1 : -1;
    let error = dx + dy;
    const now = performance.now();
    while (true) {
      if (!isBlocked(column, row)) drawCell(column, row, now);
      if (column === end.column && row === end.row) break;
      const doubledError = 2 * error;
      if (doubledError >= dy) {
        error += dy;
        column += stepX;
      }
      if (doubledError <= dx) {
        error += dx;
        row += stepY;
      }
    }
    scheduleExpiry();
  }

  function measure() {
    layoutFrame = 0;
    resetPath();
    const anchorBounds = anchor.getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    const sizedOrnament = stitchAnchor ?? aboutOrnament;
    const pitch = goat ? anchorBounds.width / 32
      : sizedOrnament ? parseFloat(getComputedStyle(sizedOrnament).fontSize) : 8.25;
    if (!pitch || !width || !height) {
      geometry = null;
      return;
    }
    const mainBounds = main.getBoundingClientRect();
    const drawingTop = mainBounds.top;
    // The whitespace before the footer belongs to the drawing area too.
    const drawingBottom = footer?.getBoundingClientRect().top ?? mainBounds.bottom;
    const controls = [...document.querySelectorAll(excluded)].flatMap(element => {
      const rect = element.getBoundingClientRect();
      const band = element.matches('.site-header, .site-footer');
      if ((!band && !rect.width) || !rect.height) return [];
      return [{left: band ? 0 : rect.left, right: band ? width : rect.right, top: rect.top, bottom: rect.bottom}];
    });
    geometry = {
      originX: anchorBounds.left + window.scrollX,
      originY: anchorBounds.top + window.scrollY,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      pitch,
      width,
      height,
      drawingTop,
      drawingBottom,
      controls
    };
    layer.style.left = '0px';
    layer.style.top = '0px';
    layer.style.width = `${width}px`;
    layer.style.height = `${height}px`;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    mask.setAttribute('width', width);
    mask.setAttribute('height', height);
    allowedArea.setAttribute('x', 0);
    const visibleTop = Math.max(0, drawingTop);
    allowedArea.setAttribute('y', visibleTop);
    allowedArea.setAttribute('width', width);
    allowedArea.setAttribute('height', Math.max(0, Math.min(height, drawingBottom) - visibleTop));
    // Mask existing strokes too, including after scrolling or layout changes.
    blockedAreas.replaceChildren(...controls.map(rect => {
      const cutout = make('rect');
      cutout.setAttribute('x', rect.left);
      cutout.setAttribute('y', rect.top);
      cutout.setAttribute('width', Math.max(0, rect.right - rect.left));
      cutout.setAttribute('height', Math.max(0, rect.bottom - rect.top));
      return cutout;
    }));
    drawing.setAttribute('transform', `translate(${geometry.originX - geometry.scrollX} ${geometry.originY - geometry.scrollY}) scale(${pitch})`);
    layer.dataset.pitch = pitch;
    layer.dataset.originDocX = geometry.originX;
    layer.dataset.originDocY = geometry.originY;
  }

  function requestMeasure() {
    resetPath();
    if (!document.hidden && !layoutFrame) layoutFrame = requestAnimationFrame(measure);
  }

  document.addEventListener('pointermove', event => {
    if (document.documentElement.classList.contains('case-image-open') || document.querySelector('dialog[open]')) {
      clear();
      return;
    }
    if (document.hidden || !['mouse', 'pen'].includes(event.pointerType) || event.shiftKey || event.target.closest?.(excluded)) {
      resetPath();
      return;
    }
    if (layoutFrame) {
      cancelAnimationFrame(layoutFrame);
      measure();
    }
    if (!geometry) measure();
    if (!geometry) return;
    const {clientX: x, clientY: y} = event;
    if (x < 0 || x >= geometry.width || y < 0 || y >= geometry.height) {
      resetPath();
      return;
    }
    if (previousPointer?.x === x && previousPointer?.y === y) return;
    const cell = {
      column: Math.floor((x + geometry.scrollX - geometry.originX) / geometry.pitch),
      row: Math.floor((y + geometry.scrollY - geometry.originY) / geometry.pitch)
    };
    if (isBlocked(cell.column, cell.row)) {
      resetPath();
      return;
    }
    drawLine(previousCell ?? cell, cell);
    previousCell = cell;
    previousPointer = {x, y};
  }, {passive: true});

  function clear() {
    clearTimeout(expiryTimer);
    cancelAnimationFrame(layoutFrame);
    layoutFrame = 0;
    geometry = null;
    resetPath();
    for (const [key, cell] of cells) removeCell(key, cell);
    colorStep = 0;
    layer.dataset.count = '0';
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      clear();
      measure();
    }
    if (event.key === 'Shift') resetPath();
  });
  document.addEventListener('keyup', event => {
    if (event.key === 'Shift') resetPath();
  });
  document.addEventListener('pointerout', event => {
    if (!event.relatedTarget) resetPath();
  });
  document.addEventListener('pointercancel', resetPath);
  window.addEventListener('blur', resetPath);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clear();
    else requestMeasure();
  });
  window.addEventListener('pagehide', clear);
  window.addEventListener('pageshow', requestMeasure);
  window.addEventListener('resize', requestMeasure, {passive: true});
  window.addEventListener('scroll', requestMeasure, {passive: true});
  document.addEventListener('project-pattern-layout', requestMeasure);
  reducedMotion.addEventListener('change', scheduleExpiry);
  const observer = new ResizeObserver(requestMeasure);
  observer.observe(anchor);
  if (hero) observer.observe(hero);
  if (isAbout) main.querySelectorAll(aboutBlocks).forEach(block => observer.observe(block));
  if (stitchAnchor) main.querySelectorAll('[data-stitch-exclusion]').forEach(block => observer.observe(block));
  observer.observe(document.body);
  document.fonts?.ready.then(requestMeasure);
  measure();
}
