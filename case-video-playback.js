(() => {
  const videos = document.querySelectorAll('.case-video video');
  if (!videos.length || !('IntersectionObserver' in window)) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const playback = new Map();

  function pauseForPage(video, state) {
    if (!video.paused) {
      state.pagePauses++;
      video.pause();
    }
  }

  function update(video, state) {
    if (document.hidden || !state.visible) {
      pauseForPage(video, state);
    } else if (video.paused && !motion.matches && !state.readerPaused && video.muted) {
      video.play().catch(() => {
        // Browsers may require a gesture. Native controls remain available.
      });
    }
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = playback.get(entry.target);
      state.visible = entry.isIntersecting && entry.intersectionRatio >= 0.05;
      update(entry.target, state);
    }
  }, { threshold: 0.05 });

  for (const video of videos) {
    const state = { visible: false, readerPaused: false, pagePauses: 0 };
    playback.set(video, state);
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.controls = true;
    video.addEventListener('pause', () => {
      // pause() dispatches asynchronously. A viewport pause should resume on
      // return, while a pause from the native controls should stay paused.
      if (state.pagePauses > 0) state.pagePauses--;
      else state.readerPaused = true;
    });
    video.addEventListener('play', () => { state.readerPaused = false; });
    observer.observe(video);
  }

  document.addEventListener('visibilitychange', () => {
    playback.forEach((state, video) => update(video, state));
  });
  motion.addEventListener('change', () => {
    playback.forEach((state, video) => {
      if (motion.matches) pauseForPage(video, state);
      else update(video, state);
    });
  });
})();
