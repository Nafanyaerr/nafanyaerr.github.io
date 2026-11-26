(() => {
  const SHOW_AFTER = 1200;
  const DISMISS_AFTER = 10000;
  const hasCopy = () => !!document.querySelector('main h1, main h2, main p, main th')?.textContent.trim();
  if (document.readyState === 'complete' || hasCopy() || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const listeners = new AbortController();
  const options = {signal: listeners.signal};
  const animationUrl = new URL('assets/page-loading-crosses.svg', document.currentScript.src);
  let animation;
  let indicator;
  let showTimer;
  let dismissTimer;
  const content = new MutationObserver(() => { if (hasCopy()) finish(); });

  function finish() {
    clearTimeout(showTimer);
    clearTimeout(dismissTimer);
    listeners.abort();
    content.disconnect();
    indicator?.remove();
    animation?.removeAttribute('src');
  }

  function show() {
    if (!document.body || !animation?.naturalWidth || indicator || listeners.signal.aborted) return;
    if (document.readyState === 'complete' || document.hidden || hasCopy()) {
      finish();
      return;
    }

    indicator = document.createElement('div');
    indicator.id = 'page-loading';
    indicator.setAttribute('role', 'status');
    const shadow = indicator.attachShadow({mode: 'open'});
    shadow.innerHTML = `
      <style>
        :host { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          pointer-events: none; }
        img { display: block; width: clamp(80px, 16vw, 144px); height: auto; }
        span { position: absolute; width: 1px; height: 1px; overflow: hidden;
          clip-path: inset(50%); white-space: nowrap; }
      </style>
      <span>Loading page</span>`;
    shadow.prepend(animation);
    document.body.append(indicator);
  }

  function loadAnimation() {
    if (document.readyState === 'complete' || document.hidden || hasCopy()) {
      finish();
      return;
    }
    animation = new Image(239, 239);
    animation.alt = '';
    animation.addEventListener('load', show, {once: true, ...options});
    animation.addEventListener('error', finish, {once: true, ...options});
    animation.src = animationUrl.href;
  }

  content.observe(document.documentElement, {childList: true, subtree: true, characterData: true});
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
  document.addEventListener('DOMContentLoaded', finish, {once: true, ...options});
})();
