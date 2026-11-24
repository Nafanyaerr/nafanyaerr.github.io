(() => {
  if (!('IntersectionObserver' in window) || !CSS.supports('mask-image', 'url("")')) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches) return;

  const main = document.querySelector('main');
  if (!main) return;
  const blocks = main.querySelectorAll([
    '.hero h1', '.selected > h2', '.project-visual', '.project-copy',
    '.experiments > h2', '.side-tile', '.experiment-viewport',
    '.about-story:not(.about-collage)', '.about-collage > :is(.about-photo,.about-ornament)',
    '.about-gallery > .about-photo', '.history-table tbody tr',
    '.contact-ornament', '.contact-title', '.contact-links',
    '.case-intro', '.case-feature-cover', '.report-cover', '.report-brief',
    '.story-section-row', '.report-plates', '.source-image-grid',
    '.source-figure:not(.source-image-grid .source-figure,.report-plates .source-figure)'
  ].join(','));

  // Avoid nesting masks where an image and its surrounding photo group both match.
  const selected = new Set(blocks);
  for (const block of blocks) {
    for (let parent = block.parentElement; parent && parent !== main; parent = parent.parentElement) {
      if (selected.has(parent)) {
        selected.delete(block);
        break;
      }
    }
  }

  const observer = new IntersectionObserver(entries => {
    let index = 0;
    for (const {isIntersecting, target} of entries) {
      if (!isIntersecting) continue;
      observer.unobserve(target);
      if (document.hidden || reducedMotion.matches || target.matches(':focus-within')) continue;
      target.style.setProperty('--pixel-reveal-delay', `${Math.min(index++, 3) * 20}ms`);
      target.classList.add('pixel-revealing');
    }
  });

  const clear = target => {
    target.classList.remove('pixel-revealing');
    target.style.removeProperty('--pixel-reveal-delay');
  };
  main.addEventListener('animationend', event => {
    if (event.animationName === 'pixel-block-reveal') clear(event.target);
  });
  main.addEventListener('focusin', event => {
    // A project link wraps the cover and caption, while case links sit inside a block.
    for (const target of selected) {
      if (target.contains(event.target) || event.target.contains(target)) {
        observer.unobserve(target);
        clear(target);
      }
    }
  });
  reducedMotion.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    main.querySelectorAll('.pixel-revealing').forEach(clear);
  });

  selected.forEach(block => observer.observe(block));
})();
