(() => {
  const SHOW_AFTER = 1200;
  const DISMISS_AFTER = 10000;
  if (document.readyState === 'complete') return;

  const listeners = new AbortController();
  const options = {signal: listeners.signal};
  const animationUrl = new URL('assets/page-loading-crosses.svg', document.currentScript.src);
  let animation;
  let indicator;
  let showTimer;
  let dismissTimer;

  function finish() {
    clearTimeout(showTimer);
    clearTimeout(dismissTimer);
    listeners.abort();
    indicator?.remove();
    animation?.removeAttribute('src');
  }

  function show() {
    if (!document.body || !animation?.naturalWidth || indicator || listeners.signal.aborted) return;
    if (document.readyState === 'complete' || document.hidden) {
      finish();
      return;
    }

    indicator = document.createElement('div');
    indicator.id = 'page-loading';
    indicator.setAttribute('role', 'status');
    const shadow = indicator.attachShadow({mode: 'open'});
    shadow.innerHTML = `
      <style>
        :host { position: fixed; inset: 0; display: grid; place-items: center;
          z-index: 60; background: var(--page, #faf9f5); }
        img { display: block; width: clamp(80px, 16vw, 144px); height: auto; }
        span { position: absolute; width: 1px; height: 1px; overflow: hidden;
          clip-path: inset(50%); white-space: nowrap; }
      </style>
      <span>Loading page</span>`;
    shadow.prepend(animation);
    document.body.append(indicator);
  }

  function loadAnimation() {
    if (document.readyState === 'complete' || document.hidden) {
      finish();
      return;
    }
    animation = new Image(239, 239);
    animation.alt = '';
    animation.addEventListener('load', show, {once: true, ...options});
    animation.addEventListener('error', finish, {once: true, ...options});
    animation.src = animationUrl.href;
  }

  function checkFirstScreen() {
    const pending = [...document.querySelectorAll('main img')].filter(image => {
      if (image.complete) return false;
      const box = image.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight;
    });
    const check = () => {
      if (pending.every(image => image.complete)) finish();
    };
    for (const image of pending) {
      image.addEventListener('load', check, options);
      image.addEventListener('error', check, options);
    }
    check();
    // The SVG may have arrived before the body was available.
    show();
  }

  showTimer = setTimeout(loadAnimation, Math.max(0, SHOW_AFTER - performance.now()));
  dismissTimer = setTimeout(finish, DISMISS_AFTER);
  window.addEventListener('load', finish, options);
  window.addEventListener('pagehide', finish, options);
  // Once the visitor starts using the page, leave it available.
  for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
    window.addEventListener(type, finish, {capture: true, passive: true, ...options});
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) finish();
  }, options);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkFirstScreen, {once: true, ...options});
  } else {
    checkFirstScreen();
  }
})();
