/* A single native-grid pose is visible at a time. Direction changes reuse
   the current playhead, so rapid pointer/focus changes cannot stack players. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fineHover = matchMedia('(hover: hover)');
  for (const footer of document.querySelectorAll('.site-footer')) {
    const box = footer.querySelector('.back-top');
    const links = [
      ...footer.querySelectorAll('.footer-link.email,.footer-link.linkedin'),
      ...document.querySelectorAll('[data-footer-goat-trigger]')
    ];
    if (!box || !links.length || !window.footerGoatTurnSVG) continue;
    const art = document.createElement('span');
    art.className = 'footer-goat-turn';
    art.setAttribute('aria-hidden', 'true');
    art.innerHTML = window.footerGoatTurnSVG;
    box.append(art);
    const frames = [...art.querySelectorAll('[data-turn-frame]')];
    let progress = 0, target = 0, raf = 0, last = 0, shown = 0;
    let hovered = null;
    const paint = () => {
      const next = Math.min(frames.length - 1, Math.round(progress));
      if (next !== shown) {
        frames[shown].style.display = 'none';
        frames[next].style.display = '';
        shown = next;
      }
      // Restore the original rhythmic idle only when the return completes.
      box.classList.toggle('is-turning', progress > 0 || target > 0);
      box.dataset.turnFrame = String(shown);
    };
    function tick(now) {
      raf = 0;
      const delta = Math.min(64, now - last) / 35;
      last = now;
      progress += Math.sign(target - progress) * Math.min(Math.abs(target - progress), delta);
      paint();
      if (progress !== target) raf = requestAnimationFrame(tick);
    }
    function update() {
      const keyboardFocus = links.includes(document.activeElement) && document.activeElement.matches(':focus-visible');
      target = hovered || keyboardFocus ? frames.length - 1 : 0;
      if (reduced.matches) {
        cancelAnimationFrame(raf); raf = 0; progress = target; paint();
      } else if (!raf && progress !== target) {
        last = performance.now(); raf = requestAnimationFrame(tick);
      }
    }
    for (const link of links) {
      link.addEventListener('pointerenter', event => {
        if (fineHover.matches && event.pointerType !== 'touch') { hovered = link; update(); }
      });
      link.addEventListener('pointerleave', () => { hovered = null; update(); });
      link.addEventListener('focus', update);
      link.addEventListener('blur', () => queueMicrotask(update));
    }
    reduced.addEventListener('change', update);
    fineHover.addEventListener('change', () => { hovered = null; update(); });
    window.addEventListener('blur', () => { hovered = null; update(); });
    paint();
  }
})();
