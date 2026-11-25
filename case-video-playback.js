(() => {
  const videos = document.querySelectorAll('.case-video video');
  if (!videos.length || !('IntersectionObserver' in window)) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const playback = new Map();

  function play(video) {
    video.play().catch(() => {
      // Browsers may require a gesture. Native controls remain available.
    });
  }

  function pauseForPage(video, state) {
    if (!video.paused) {
      state.pagePauses++;
      video.pause();
    }
  }

  function update(video, state) {
    if (document.hidden || !state.visible) {
      pauseForPage(video, state);
    } else if (state.prepared && video.paused && !motion.matches && !state.readerPaused && video.muted) {
      play(video);
    }
  }

  async function prepare(video, state) {
    const source = video.querySelector('source[type="video/mp4"]');
    let resume = false;
    try {
      if (!source) return;
      // A range-capable host streams directly. Some hosts return the entire
      // MP4 with 200 instead, leaving the browser's native seek range at 0–0.
      let response = await fetch(source.src, { headers: { Range: 'bytes=0-0' } });
      if (response.status === 206 && /^bytes 0-0\/\d+$/i.test(response.headers.get('Content-Range') || '')) {
        await response.body?.cancel();
        return;
      }
      if (response.status === 206 || response.status === 416) {
        await response.body?.cancel();
        response = await fetch(source.src);
      }
      if (response.status !== 200) return;
      const file = await response.blob();
      if (!file.size || file.type.startsWith('text/')) return;
      const blob = file.type === 'video/mp4' ? file : file.slice(0, file.size, 'video/mp4');
      const url = URL.createObjectURL(blob);
      const position = video.currentTime;
      resume = !video.paused;
      pauseForPage(video, state);
      if (position > 0) {
        video.addEventListener('loadedmetadata', () => {
          video.currentTime = Math.min(position, video.duration);
        }, { once: true });
      }
      video.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        video.removeAttribute('src');
        video.load();
        update(video, state);
      }, { once: true });
      video.src = url;
    } catch {
      // Leave the original HTML source playable if a fetch cannot complete.
    } finally {
      state.prepared = true;
      video.preload = 'metadata';
      if (resume && state.visible && !document.hidden) play(video);
      else update(video, state);
    }
  }

  const preload = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      preload.unobserve(entry.target);
      prepare(entry.target, playback.get(entry.target));
    }
  }, { rootMargin: '600px 0px' });

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = playback.get(entry.target);
      state.visible = entry.isIntersecting && entry.intersectionRatio >= 0.05;
      update(entry.target, state);
    }
  }, { threshold: 0.05 });

  for (const video of videos) {
    const state = { visible: false, readerPaused: false, pagePauses: 0, prepared: false };
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
    preload.observe(video);
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
