(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches || !CSS.supports('mask-image', 'url("")') || document.hidden) return;
  if (performance.getEntriesByType('navigation')[0]?.type === 'back_forward') return;

  const main = document.querySelector('main');
  if (!main) return;
  const home = document.body.classList.contains('home-frame501');
  const work = home && location.hash === '#selected-work' && document.getElementById('selected-work');
  if (!work && (location.hash || window.scrollY !== 0)) return;
  const selector = [
    '.hero h1', '.home-frame501 .hero-art', '.selected > h2', '.project-visual', '.project-copy',
    '.experiments > h2', '.side-tile', '.experiment-viewport',
    '.about-story:not(.about-collage)', '.about-collage > :is(.about-photo,.about-ornament)',
    '.about-gallery > .about-photo', '.history-table tbody tr',
    '.contact-ornament', '.contact-title', '.contact-links',
    '.case-intro', '.case-feature-cover', '.report-cover', '.report-brief',
    '.story-section-row', '.report-plates', '.source-image-grid',
    '.source-figure:not(.source-image-grid .source-figure,.report-plates .source-figure)'
  ].join(',');

  const listeners = new AbortController();
  const options = {signal: listeners.signal, passive: true};
  let blocks = [];
  let frame;
  function finish() {
    cancelAnimationFrame(frame);
    for (const block of blocks) {
      block.classList.remove('pixel-revealing');
      block.style.removeProperty('--pixel-reveal-delay');
    }
    listeners.abort();
  }

  for (const type of ['wheel', 'touchmove', 'pointerdown', 'keydown', 'focusin', 'pagehide', 'hashchange']) {
    window.addEventListener(type, finish, {...options, capture: true});
  }
  reducedMotion.addEventListener('change', finish, options);
  document.addEventListener('visibilitychange', finish, options);
  function reveal(scope) {
    // Select only the blocks on the opening screen, once per page navigation.
    const height = window.visualViewport?.height ?? window.innerHeight;
    const width = window.visualViewport?.width ?? window.innerWidth;
    blocks = [...scope.querySelectorAll(selector)].filter(block => {
      if (block.parentElement.closest(selector) || block.matches(':focus-within')) return false;
      const rect = block.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.top < height && rect.bottom > 0 &&
        rect.left < width && rect.right > 0;
    });
    if (!blocks.length) return finish();

    window.addEventListener('scroll', finish, {...options, capture: true});
    let remaining = blocks.length;
    function done() {
      if (--remaining === 0) finish();
    }
    main.addEventListener('animationend', event => {
      if (event.animationName === 'pixel-block-reveal' && blocks.includes(event.target)) done();
    }, options);
    blocks.forEach((block, index) => {
      function start() {
        block.style.setProperty('--pixel-reveal-delay', `${Math.min(index, 3) * 20}ms`);
        block.classList.add('pixel-revealing');
      }
      // Let a cold-cache illustration reveal when it can actually be painted.
      const image = home && block.querySelector('.hero-goat-still, .project-image img');
      if (image && !image.complete) {
        image.addEventListener('load', start, {...options, once: true});
        image.addEventListener('error', done, {...options, once: true});
      } else {
        start();
      }
    });
  }

  if (!work) {
    reveal(main);
    return;
  }

  // Work links open the homepage at its project grid. Let the native fragment
  // scroll settle before sampling that screen, even on a slow page load.
  const landingEvents = ['scroll', 'resize', 'pageshow'];
  let previousTop;
  function atWork() {
    const top = work.getBoundingClientRect().top;
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    if (top < -1 || top > padding + 1) return;
    if (top !== previousTop) {
      previousTop = top;
      afterLayout();
      return;
    }
    for (const type of landingEvents) window.removeEventListener(type, afterLayout);
    reveal(work);
  }
  function afterLayout() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(atWork);
  }
  for (const type of landingEvents) window.addEventListener(type, afterLayout, options);
  afterLayout();
})();
