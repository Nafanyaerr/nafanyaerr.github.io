(() => {
  if (!('IntersectionObserver' in window)) return;
  const videos = [...document.querySelectorAll('.side-video video')];

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const playback = new Map(videos.map(video => [video, {visible: false, userPaused: false}]));
  const update = video => {
    const {visible, userPaused} = playback.get(video);
    if (!visible || document.hidden) video.pause();
    else if (!reducedMotion.matches && !userPaused) video.play().catch(() => {});
  };
  const observer = new IntersectionObserver(entries => {
    for (const {target, intersectionRatio} of entries) {
      playback.get(target).visible = intersectionRatio >= .35;
      update(target);
    }
  }, {threshold: .35});

  for (const video of videos) {
    const state = playback.get(video);
    const surface = video.closest('.side-video-surface');
    const title = surface.getAttribute('aria-label');
    const updateLabel = () => {
      const action = video.paused ? 'Play' : 'Pause';
      surface.setAttribute('aria-label', `${action} ${title}`);
    };
    surface.addEventListener('click', () => {
      state.userPaused = !video.paused;
      if (state.userPaused) video.pause();
      else video.play().catch(() => {});
    });
    video.addEventListener('play', updateLabel);
    video.addEventListener('pause', updateLabel);
    updateLabel();
    observer.observe(video);
  }
  document.addEventListener('visibilitychange', () => videos.forEach(update));
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) videos.forEach(video => video.pause());
    else videos.forEach(update);
  });
})();
