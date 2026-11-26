(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches || !CSS.supports('mask-image', 'url("")') || document.hidden) return;
  if (location.hash || window.scrollY !== 0 || performance.getEntriesByType('navigation')[0]?.type === 'back_forward') return;

  const main = document.querySelector('main');
  if (!main) return;
  const selector = [
    '.hero h1', '.selected > h2', '.project-visual', '.project-copy',
    '.experiments > h2', '.side-tile', '.experiment-viewport',
    '.about-story:not(.about-collage)', '.about-collage > :is(.about-photo,.about-ornament)',
    '.about-gallery > .about-photo', '.history-table tbody tr',
    '.contact-ornament', '.contact-title', '.contact-links',
    '.case-intro', '.case-feature-cover', '.report-cover', '.report-brief',
    '.story-section-row', '.report-plates', '.source-image-grid',
    '.source-figure:not(.source-image-grid .source-figure,.report-plates .source-figure)'
  ].join(',');

  // Snapshot the opening viewport once. Content farther down is always readable.
  const height = window.visualViewport?.height ?? window.innerHeight;
  const width = window.visualViewport?.width ?? window.innerWidth;
  const blocks = [...main.querySelectorAll(selector)].filter(block => {
    if (block.parentElement.closest(selector) || block.matches(':focus-within')) return false;
    const rect = block.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top < height && rect.bottom > 0 &&
      rect.left < width && rect.right > 0;
  });
  if (!blocks.length) return;

  const listeners = new AbortController();
  const options = {signal: listeners.signal, passive: true};
  function finish() {
    for (const block of blocks) {
      block.classList.remove('pixel-revealing');
      block.style.removeProperty('--pixel-reveal-delay');
    }
    listeners.abort();
  }

  for (const type of ['scroll', 'wheel', 'touchmove', 'pointerdown', 'keydown', 'focusin', 'pagehide']) {
    window.addEventListener(type, finish, {...options, capture: true});
  }
  reducedMotion.addEventListener('change', finish, options);
  document.addEventListener('visibilitychange', finish, options);
  const last = blocks[blocks.length - 1];
  last.addEventListener('animationend', event => {
    if (event.target === last && event.animationName === 'pixel-block-reveal') finish();
  }, options);

  blocks.forEach((block, index) => {
    block.style.setProperty('--pixel-reveal-delay', `${Math.min(index, 3) * 20}ms`);
    block.classList.add('pixel-revealing');
  });
})();
