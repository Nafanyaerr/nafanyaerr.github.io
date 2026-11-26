(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const navigation = performance.getEntriesByType('navigation')[0];
  if (motion.matches || document.hidden || navigation?.type === 'back_forward' ||
      !CSS.supports('mask-image', 'url("")')) return;

  const main = document.querySelector('main');
  if (!main) return;
  const contentImages = '.hero-goat-still, .project-image img, .case-image-link img, .compare-layer img, .contact-ornament > img';
  const images = [...main.querySelectorAll(contentImages)];
  const slowMs = 700;
  const connection = navigator.connection;
  const slowNetwork = ['slow-2g', '2g', '3g'].includes(connection?.effectiveType) || connection?.rtt >= 400;
  let slowOpening = slowNetwork;
  const lifetime = new AbortController();
  const opening = new AbortController();
  const events = {signal: lifetime.signal, passive: true};
  const entryEvents = {signal: opening.signal, passive: true};
  const openingImages = new WeakSet();
  const revealedImages = new WeakSet();
  const waitingSince = new WeakMap();
  let frame;

  function visible(element) {
    const r = element.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.top < (window.visualViewport?.height ?? innerHeight) &&
      r.bottom > 0 && r.left < (window.visualViewport?.width ?? innerWidth) && r.right > 0;
  }
  function clearOpening(element) {
    element.classList.remove('pixel-revealing');
    element.style.removeProperty('--pixel-reveal-delay');
  }
  function stopOpening() {
    opening.abort();
    cancelAnimationFrame(frame);
    main.querySelectorAll('.pixel-revealing').forEach(clearOpening);
  }
  function mosaic(element, index = 0) {
    if (opening.signal.aborted) return;
    element.style.setProperty('--pixel-reveal-delay', `${Math.min(index, 3) * 20}ms`);
    element.classList.add('pixel-revealing');
  }

  // Native lazy loading decides when to fetch. Visibility timestamps are only
  // a timing fallback for browsers without a resource entry for an image.
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      waitingSince.set(entry.target, entry.time);
      observer.unobserve(entry.target);
    }
  }) : null;
  function mediaReady(image) {
    observer?.unobserve(image);
    const target = image.closest('.source-image-viewport, .experiment-viewport') || image;
    const timing = performance.getEntriesByName(image.currentSrc, 'resource').at(-1);
    const now = performance.now();
    const elapsed = Math.max(timing?.duration || 0, now - (waitingSince.get(image) ?? now));
    const directional = slowNetwork || elapsed >= slowMs ||
      (slowOpening && openingImages.has(image) && !opening.signal.aborted);
    const show = () => {
      image.classList.remove('media-pending');
      if (lifetime.signal.aborted || revealedImages.has(image) || !image.naturalWidth || !visible(target)) return;
      if (directional) {
        revealedImages.add(image);
        target.classList.add('pixel-down');
      } else if (openingImages.has(image) && !opening.signal.aborted) {
        revealedImages.add(image);
        mosaic(target);
      }
    };
    if (directional && visible(target) && image.decode) image.decode().then(show, show);
    else show();
  }
  for (const image of images) {
    if (image.complete) continue;
    image.classList.add('media-pending');
    if (image.loading !== 'lazy' || visible(image)) waitingSince.set(image, performance.now());
    else observer?.observe(image);
    image.addEventListener('load', () => mediaReady(image), {once: true, ...events});
    image.addEventListener('error', () => {
      image.classList.remove('media-pending');
      observer?.unobserve(image);
    }, {once: true, ...events});
  }
  function finished(event) {
    if (event.animationName === 'pixel-block-reveal') clearOpening(event.target);
    if (event.animationName === 'pixel-media-down') event.target.classList.remove('pixel-down');
  }
  main.addEventListener('animationend', finished, events);
  main.addEventListener('animationcancel', finished, events);
  function stop() {
    stopOpening();
    lifetime.abort();
    observer?.disconnect();
    main.querySelectorAll('.media-pending, .pixel-down').forEach(el => el.classList.remove('media-pending', 'pixel-down'));
  }
  window.addEventListener('pagehide', stop, events);
  motion.addEventListener('change', stop, events);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, events);
  for (const type of ['wheel', 'touchmove', 'pointerdown', 'keydown', 'focusin', 'hashchange']) {
    window.addEventListener(type, stopOpening, {...entryEvents, capture: true});
  }

  const work = document.body.classList.contains('home-frame501') && location.hash === '#selected-work' &&
    document.getElementById('selected-work');
  if (!work && (location.hash || window.scrollY !== 0)) return;
  const blocks = [
    '.hero h1', '.home-frame501 .hero-art', '.selected > h2', '.project-visual', '.project-copy',
    '.experiments > h2', '.side-tile', '.experiment-viewport',
    '.about-story:not(.about-collage)', '.about-collage > :is(.about-photo,.about-ornament)',
    '.about-gallery > .about-photo', '.history-table tbody tr',
    '.contact-ornament', '.contact-title', '.contact-links',
    '.case-intro', '.case-feature-cover', '.report-cover', '.report-brief',
    '.story-section-row', '.report-plates', '.source-image-grid',
    '.source-figure:not(.source-image-grid .source-figure,.report-plates .source-figure)'
  ].join(',');
  function reveal(scope) {
    window.addEventListener('scroll', stopOpening, {...entryEvents, capture: true});
    const visibleMedia = images.filter(img => scope.contains(img) && visible(img));
    if (slowOpening) {
      // CSS and scripts can arrive after the pictures. Include those already on
      // the first screen, but keep every word and caption independently readable.
      for (const img of visibleMedia) {
        openingImages.add(img);
        if (img.complete && img.naturalWidth) mediaReady(img);
      }
      return;
    }
    const pending = images.filter(img => scope.contains(img) && !img.complete &&
      (img.loading !== 'lazy' || visibleMedia.includes(img)));
    const sampled = performance.now();
    const initial = [...scope.querySelectorAll(blocks)].filter(block =>
      !block.parentElement.closest(blocks) && !block.matches(':focus-within') && visible(block));
    initial.forEach((block, index) => {
      const pictures = visibleMedia.filter(img => block.contains(img));
      if (pictures.some(img => !img.complete)) {
        for (const img of pictures) openingImages.add(img);
        return;
      }
      // Text paints immediately. Only give it the original opening mosaic
      // when all accompanying pictures arrive within the first few frames.
      const hero = block.closest('.hero');
      const companions = hero ? pending.filter(img => hero.contains(img)) : pending;
      if (block.textContent.trim() && companions.length) {
        let remaining = companions.length;
        const copyReady = () => {
          if (--remaining === 0 && performance.now() - sampled < 100) mosaic(block, index);
        };
        for (const img of companions) img.addEventListener('load', copyReady, {once: true, ...entryEvents});
      } else mosaic(block, index);
    });
  }
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
  function open() {
    if (opening.signal.aborted) return;
    if (!work && window.scrollY !== 0) return stopOpening();
    // Some engines run deferred scripts before all styles have been applied.
    // Decide at the first styled frame, when the viewport geometry is reliable.
    slowOpening = slowNetwork || performance.now() >= slowMs;
    if (!work) return reveal(main);
    for (const type of landingEvents) window.addEventListener(type, afterLayout, entryEvents);
    afterLayout();
  }
  const styles = [...document.querySelectorAll('link[rel="stylesheet"]')].filter(link => !link.sheet);
  let remainingStyles = styles.length;
  if (!remainingStyles) frame = requestAnimationFrame(open);
  else {
    const settled = () => { if (--remainingStyles === 0) frame = requestAnimationFrame(open); };
    for (const link of styles) {
      link.addEventListener('load', settled, {once: true, ...entryEvents});
      link.addEventListener('error', settled, {once: true, ...entryEvents});
    }
  }
})();
