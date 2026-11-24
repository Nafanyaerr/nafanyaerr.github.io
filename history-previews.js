import dance from './hero-goat-frames-v17.js';
import {fitPreviewStitches, previewGrid} from './history-preview-stitches.mjs';

(() => {
  'use strict';

  const REFERENCE_STITCH = 8.25;
  const WEB_COVER = { width:432, height:280 };
  const MOBILE_COVER = { width:188, height:188 * 581.39453125 / 261.931640625 };
  const FADE_MS = 220;
  const MARGIN = 12;
  const ROW_GAP = 8;
  const NS = 'http://www.w3.org/2000/svg';
  const PROJECTS = {
    callgrid: { src:'assets/history-previews/callgrid.png', repeat:[11,11] },
    academy: { src:'assets/home-refresh/academy-cover.png', repeat:[9,14] },
    reports: { src:'assets/project-reports.png', repeat:[8,6] },
    crm: { src:'assets/history-previews/crm.png', repeat:[12,12] },
    mobile: { src:'assets/project-mobile.png', repeat:[12,21] },
    city: { src:'assets/project-city.png', underlay:'assets/project-reports.png', repeat:[18,18] }
  };

  function initialize() {
    const rows = [...document.querySelectorAll('.history-table tbody tr[data-project]')]
      .filter(row => PROJECTS[row.dataset.project]);
    if (!rows.length || document.querySelector('.history-preview')) return;

    const enabled = matchMedia('(min-width:651px) and (hover:hover) and (pointer:fine)');
    const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');
    const header = document.querySelector('.site-header');
    const stitchGrid = document.querySelector('.history-drawing-grid');
    const overlay = document.createElement('div');
    overlay.className = 'history-preview';
    overlay.setAttribute('aria-hidden','true');
    document.body.append(overlay);

    let pointerRow = null;
    let pointer = null;
    let placementFrame = null;
    let requestedRow = null;
    let active = null;
    let outgoing = null;
    let removalTimer = null;
    let animationFrame = null;
    let revision = 0;
    let serial = 0;
    const assets = new Map();
    let patternsPromise = null;

    function loadPatterns() {
      if (!patternsPromise) {
        patternsPromise = fetch('assets/patterns/history-previews.json')
          .then(response => {
            if (!response.ok) throw new Error('Preview patterns unavailable');
            return response.json();
          })
          .then(frames => Object.fromEntries(Object.entries(frames).map(([key,frame]) => [key,{
            colour:frame.colour,grid:previewGrid(frame)
          }])))
          .catch(() => {
            patternsPromise = null;
            return null;
          });
      }
      return patternsPromise;
    }

    function loadImage(src) {
      if (assets.has(src)) return assets.get(src);
      const image = new Image();
      image.decoding = 'async';
      const loaded = new Promise(resolve => {
        image.onload = async () => {
          try { await image.decode(); } catch { /* A loaded image is still usable. */ }
          resolve(image.naturalWidth > 0);
        };
        image.onerror = () => resolve(false);
        image.src = src;
      });
      assets.set(src,loaded);
      return loaded;
    }

    function preload(key) {
      return loadImage(PROJECTS[key].src);
    }

    function cancelAnimation() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    function removeOutgoing() {
      if (removalTimer !== null) clearTimeout(removalTimer);
      removalTimer = null;
      outgoing?.remove();
      outgoing = null;
    }

    function retireActive(immediate = false) {
      cancelAnimation();
      removeOutgoing();
      if (!active) return;
      const old = active;
      active = null;
      // Finish the frame before fading so an interrupted reveal leaves no holes.
      old.crosses.forEach(cross => cross.node.setAttribute('opacity','1'));
      old.node.classList.remove('is-visible');
      if (immediate || reducedMotion.matches) old.node.remove();
      else {
        outgoing = old.node;
        removalTimer = setTimeout(() => {
          old.node.remove();
          if (outgoing === old.node) outgoing = null;
          removalTimer = null;
        },FADE_MS);
      }
    }

    function clearInteraction(immediate = false) {
      pointerRow = null;
      pointer = null;
      if (placementFrame !== null) cancelAnimationFrame(placementFrame);
      placementFrame = null;
      requestedRow = null;
      revision++;
      retireActive(immediate);
    }

    function svgElement(tag,attributes = {}) {
      const node = document.createElementNS(NS,tag);
      for (const [name,value] of Object.entries(attributes)) node.setAttribute(name,value);
      return node;
    }

    function verticalSpace(row) {
      const rowBox = row.getBoundingClientRect();
      const top = Math.max(MARGIN,header?.getBoundingClientRect().bottom ?? 0);
      const bottom = document.documentElement.clientHeight - MARGIN;
      return {
        above:rowBox.top - ROW_GAP - top,
        below:bottom - rowBox.bottom - ROW_GAP,
        after:rowBox.bottom + ROW_GAP,
        before:rowBox.top - ROW_GAP
      };
    }

    function minimumVerticalSpace(row) {
      const viewport = document.documentElement;
      const bounds = row.getBoundingClientRect();
      const top = Math.max(MARGIN,header?.getBoundingClientRect().height ?? 0);
      const bottom = viewport.clientHeight - MARGIN;
      const centeredTop = (top + bottom - bounds.height) / 2;
      const documentTop = bounds.top + window.scrollY;
      const maxScroll = viewport.scrollHeight - viewport.clientHeight;
      // The centered row offers the least room on either side. Use the nearest
      // position it can reach so the shared web size stays stable while scrolling.
      const rowTop = Math.max(documentTop - maxScroll,Math.min(documentTop,centeredTop));
      return Math.max(rowTop - top,bottom - rowTop - bounds.height) - ROW_GAP;
    }

    function geometry(key,patterns,row) {
      const cover = key === 'mobile' ? MOBILE_COVER : WEB_COVER;
      const cellSize = (stitchGrid && parseFloat(getComputedStyle(stitchGrid).fontSize)) || REFERENCE_STITCH;
      const maxWidth = Math.min(720,document.documentElement.clientWidth - MARGIN * 2);
      // Use a shared fit for web covers so switching rows cannot change their size.
      const isMobile = key === 'mobile';
      const fitRows = isMobile ? [row] : rows.filter(item => item.dataset.project !== 'mobile');
      const fit = Math.min(1,...fitRows.map(item => {
        const {grid} = patterns[item.dataset.project];
        const {above,below} = verticalSpace(item);
        const availableHeight = isMobile ? Math.max(above,below) : minimumVerticalSpace(item);
        const maxHeight = Math.min(560,availableHeight);
        return Math.min(
          (Math.floor(maxWidth / cellSize) - grid.left - grid.right) * cellSize / cover.width,
          (Math.floor(maxHeight / cellSize) - grid.top - grid.bottom) * cellSize / cover.height
        );
      }));
      const imageWidth = cover.width * fit, imageHeight = cover.height * fit;
      if (imageWidth < 64) return null;
      return fitPreviewStitches(patterns[key].grid,imageWidth,imageHeight,cellSize,PROJECTS[key].repeat);
    }

    function build(key,patterns,row) {
      const project = PROJECTS[key];
      const box = geometry(key,patterns,row);
      if (!box) return null;
      const node = document.createElement('div');
      node.className = 'history-preview-card';
      node.dataset.project = key;
      node.style.width = `${box.width}px`;
      node.style.height = `${box.height}px`;
      const viewport = document.createElement('div');
      viewport.className = 'history-preview-image';
      Object.assign(viewport.style,{
        width:`${box.imageWidth}px`,height:`${box.imageHeight}px`,
        left:`${box.imageLeft}px`,top:`${box.imageTop}px`
      });
      for (const src of project.underlay ? [project.underlay,project.src] : [project.src]) {
        const image = document.createElement('img');
        image.src = src;
        image.alt = '';
        image.decoding = 'async';
        image.draggable = false;
        if (src === project.underlay) image.className = 'history-preview-underlay';
        viewport.append(image);
      }

      const svg = svgElement('svg',{
        class:'history-preview-frame',width:box.width,height:box.height,
        viewBox:`0 0 ${box.width} ${box.height}`,fill:patterns[key].colour,
        'aria-hidden':'true',focusable:'false'
      });
      const id = `history-preview-cross-${++serial}`;
      const defs = svgElement('defs');
      const symbol = svgElement('symbol',{ id,viewBox:'0 0 1 1' });
      symbol.append(svgElement('path',{ d:dance.glyph }));
      defs.append(symbol);
      svg.append(defs);
      const cells = box.cells;
      const crosses = cells.map(([x,y],index) => {
        const cross = svgElement('use',{
          href:`#${id}`,x,y,width:box.cellSize,height:box.cellSize,
          opacity:reducedMotion.matches ? 1 : 0
        });
        svg.append(cross);
        return { node:cross,delay:Math.round(index / Math.max(1,cells.length - 1) * 112),blink:index % 7 === 3 };
      });
      node.append(svg,viewport);
      return { node,crosses,key,box };
    }

    function place() {
      placementFrame = null;
      if (!active || !pointerRow || !pointer) return;
      const {width,height} = active.box;
      const {below,after,before} = verticalSpace(pointerRow);
      const vw = document.documentElement.clientWidth;
      const gap = 16;
      let x = pointer.x + gap;
      if (x + width > vw - MARGIN) x = pointer.x - gap - width;
      // Keep the active project name and the rest of its row unobstructed.
      const y = height <= below ? after : before - height;
      x = Math.max(MARGIN,Math.min(vw-width-MARGIN,x));
      overlay.style.transform = 'translate3d('+Math.round(x)+'px,'+Math.round(y)+'px,0)';
    }

    function reveal(state,token) {
      if (reducedMotion.matches) {
        state.node.classList.add('is-visible');
        state.crosses.forEach(cross => cross.node.setAttribute('opacity','1'));
        return;
      }
      // Establish the hidden state before the image's one opacity transition.
      state.node.getBoundingClientRect();
      const start = performance.now();
      const tick = now => {
        if (token !== revision || active !== state) return;
        state.node.classList.add('is-visible');
        const elapsed = now - start;
        for (const cross of state.crosses) {
          const age = elapsed - cross.delay;
          const opacity = age < 0 ? 0 : cross.blink && age >= 38 && age < 66 ? .35 : 1;
          cross.node.setAttribute('opacity',opacity);
        }
        if (elapsed < FADE_MS) animationFrame = requestAnimationFrame(tick);
        else {
          state.crosses.forEach(cross => cross.node.setAttribute('opacity','1'));
          animationFrame = null;
        }
      };
      animationFrame = requestAnimationFrame(tick);
    }

    async function show(row,force = false) {
      if (!enabled.matches || document.hidden) {
        clearInteraction(true);
        return;
      }
      if (!force && requestedRow === row) return;
      requestedRow = row;
      const token = ++revision;
      retireActive(true);
      if (!row) return;
      const key = row.dataset.project;
      const [ready,patterns] = await Promise.all([preload(key),loadPatterns()]);
      if (!ready || !patterns?.[key] || token !== revision || requestedRow !== row || !enabled.matches || document.hidden) return;
      const state = build(key,patterns,row);
      if (!state) return;
      active = state;
      overlay.append(state.node);
      place();
      reveal(state,token);
    }

    const update = () => show(pointerRow);
    for (const row of rows) {
      const enter = event => {
        if (!enabled.matches || event.pointerType === 'touch') return;
        pointer = {x:event.clientX,y:event.clientY};
        if (pointerRow === row) {
          if (placementFrame === null && active) placementFrame = requestAnimationFrame(place);
          return;
        }
        pointerRow = row;
        update();
      };
      row.addEventListener('pointerenter',enter);
      // Re-arm after scrolling or returning to the window without a new enter.
      row.addEventListener('pointermove',enter);
      row.addEventListener('pointerleave',() => {
        if (pointerRow === row) { pointerRow = null; update(); }
      });
      row.addEventListener('pointercancel',() => {
        if (pointerRow === row) { pointerRow = null; update(); }
      });
    }
    window.addEventListener('scroll',() => clearInteraction(true),{ passive:true,capture:true });
    window.addEventListener('blur',() => clearInteraction(true));
    window.addEventListener('pagehide',() => clearInteraction(true));
    window.addEventListener('resize',() => {
      if (!enabled.matches) clearInteraction(true);
      else if (requestedRow) show(requestedRow,true);
    },{ passive:true });
    document.addEventListener('visibilitychange',() => { if (document.hidden) clearInteraction(true); });
    document.addEventListener('keydown',event => { if (event.key === 'Escape') clearInteraction(); });
    enabled.addEventListener('change',() => {
      clearInteraction(true);
      if (enabled.matches) {
        Object.keys(PROJECTS).forEach(preload);
        loadPatterns();
      }
    });
    reducedMotion.addEventListener('change',() => {
      if (!reducedMotion.matches) return;
      cancelAnimation();
      removeOutgoing();
      if (active) {
        active.node.classList.add('is-visible');
        active.crosses.forEach(cross => cross.node.setAttribute('opacity','1'));
      }
    });
    if (enabled.matches) {
      Object.keys(PROJECTS).forEach(preload);
      loadPatterns();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',initialize,{ once:true });
  else initialize();
})();
