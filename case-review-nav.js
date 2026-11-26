/* The navigation and all destinations work without JavaScript. */
const sectionNav = document.querySelector('.case-review-links');
if (sectionNav) {
  const links = [...sectionNav.querySelectorAll('a[href^="#"]')];
  const items = links.map(link => ({link, section: document.getElementById(link.hash.slice(1))})).filter(x => x.section);
  const header = sectionNav.closest('header');
  const inner = sectionNav.parentElement;
  const back = inner.querySelector('.case-review-back');
  const compact = window.matchMedia('(max-width:760px), (max-width:1000px) and (max-height:600px) and (pointer:coarse)');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'case-section-toggle';
  sectionNav.id = sectionNav.id || 'case-section-links';
  toggle.setAttribute('aria-controls', sectionNav.id);
  toggle.setAttribute('aria-expanded', 'false');
  sectionNav.before(toggle);
  let currentLink = sectionNav.querySelector('a[aria-current="location"]');

  function closeMenu(restoreFocus = false) {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) toggle.focus({preventScroll: true});
  }

  toggle.addEventListener('click', () => {
    const opening = toggle.getAttribute('aria-expanded') === 'false';
    toggle.setAttribute('aria-expanded', String(opening));
  });
  toggle.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    toggle.setAttribute('aria-expanded', 'true');
    (currentLink || links[0])?.focus();
  });
  header.addEventListener('keydown', event => {
    if (!compact.matches || toggle.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!header.contains(event.target)) closeMenu();
  });
  header.addEventListener('focusout', event => {
    // A touch on a link can blur the toggle with no next focus target in Safari.
    // Outside taps are handled on pointerdown and inside links close on click.
    if (event.relatedTarget && !header.contains(event.relatedTarget)) closeMenu();
  });

  sectionNav.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!compact.matches || !link || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    closeMenu();
    // Keep native anchor navigation and history, then transfer keyboard focus to the chapter.
    const section = document.getElementById(link.hash.slice(1));
    const heading = section?.matches('h1,h2,h3') ? section : section?.querySelector('h1,h2,h3');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      requestAnimationFrame(() => heading.focus({preventScroll: true}));
    }
  });
  compact.addEventListener('change', () => {
    const focused = document.activeElement;
    closeMenu();
    if (compact.matches && sectionNav.contains(focused)) toggle.focus({preventScroll: true});
    if (!compact.matches && focused === toggle) currentLink?.focus({preventScroll: true});
    measure();
    schedule();
  });

  const measure = () => {
    if (compact.matches) {
      inner.classList.remove('is-inline');
    } else {
      const shell = inner.getBoundingClientRect();
      const backWidth = back.getBoundingClientRect().width;
      const menuGap = parseFloat(getComputedStyle(sectionNav).columnGap) || 0;
      const menuWidth = links.reduce((width, link) => width + link.getBoundingClientRect().width, 0)
        + menuGap * (links.length - 1);
      const clearance = parseFloat(getComputedStyle(inner).getPropertyValue('--case-nav-gap'));
      // Reserve equal space on both sides so the section menu stays centered.
      inner.classList.toggle('is-inline', 2 * (backWidth + clearance) + menuWidth <= shell.width);
    }
    const height = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--case-sticky-offset', `${Math.ceil(height / 4) * 4 + 16}px`);
  };
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => requestAnimationFrame(measure));
    for (const element of [header, inner, back, ...links]) observer.observe(element);
  } else {
    window.addEventListener('resize', measure);
  }
  const ornaments={"work":"<span class=\"nav-decoration\" aria-hidden=\"true\"><img class=\"menu-bracket menu-bracket-left\" src=\"assets/menu-refresh/work-left.svg\" width=\"8.66775\" height=\"21.6619\" alt=\"\" aria-hidden=\"true\"><img class=\"menu-bracket menu-bracket-right\" src=\"assets/menu-refresh/work-right.svg\" width=\"8.68338\" height=\"21.2635\" alt=\"\" aria-hidden=\"true\"></span>","history":"<span class=\"nav-decoration\" aria-hidden=\"true\"><img class=\"menu-bracket menu-bracket-left\" src=\"assets/menu-refresh/history-left.svg\" width=\"8.66775\" height=\"21.6619\" alt=\"\" aria-hidden=\"true\"><img class=\"menu-bracket menu-bracket-right\" src=\"assets/menu-refresh/history-right.svg\" width=\"8.68338\" height=\"21.2635\" alt=\"\" aria-hidden=\"true\"></span>","about":"<span class=\"nav-decoration\" aria-hidden=\"true\"><img class=\"menu-bracket menu-bracket-left\" src=\"assets/menu-refresh/about-left.svg\" width=\"8.66775\" height=\"21.6619\" alt=\"\" aria-hidden=\"true\"><img class=\"menu-bracket menu-bracket-right\" src=\"assets/menu-refresh/about-right.svg\" width=\"8.68338\" height=\"21.2635\" alt=\"\" aria-hidden=\"true\"></span>","contact":"<span class=\"nav-decoration\" aria-hidden=\"true\"><img class=\"menu-bracket menu-bracket-left\" src=\"assets/menu-refresh/contact-left.svg\" width=\"8.66775\" height=\"21.6619\" alt=\"\" aria-hidden=\"true\"><img class=\"menu-bracket menu-bracket-right\" src=\"assets/menu-refresh/contact-right.svg\" width=\"8.68338\" height=\"21.2635\" alt=\"\" aria-hidden=\"true\"></span>"};
  const menuLinks=[...sectionNav.querySelectorAll('a')];
  for(const [index,link] of menuLinks.entries()) {
    const key=['work','history','about','contact'][index%4];
    const label=document.createElement('span');label.className='nav-label';
    while(link.firstChild)label.append(link.firstChild);
    label.insertAdjacentHTML('beforeend',ornaments[key]);link.append(label);
  }
  document.fonts.ready.then(measure);
  measure();
  let queued = false;
  const update = () => {
    queued = false;
    const threshold = header.getBoundingClientRect().height + Math.min(110, window.innerHeight * .14);
    let active = items[0];
    for (const item of items) if (item.section.getBoundingClientRect().top <= threshold) active = item;
    // A short closing chapter may not reach the sticky header before the
    // document reaches its bottom scroll limit.
    if (window.scrollY > 0 && document.documentElement.scrollHeight - window.innerHeight - window.scrollY < 3) active = items[items.length - 1];
    if (active && (active.link !== currentLink || !toggle.textContent)) {
      currentLink?.removeAttribute('aria-current');
      currentLink = active.link;
      currentLink.setAttribute('aria-current', 'location');
      const name = currentLink.textContent.trim();
      toggle.textContent = name;
      toggle.setAttribute('aria-label', 'Case sections: ' + name);
    }
  };
  const schedule = () => {if (!queued) {queued = true; requestAnimationFrame(update)}};
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  window.addEventListener('pageshow', schedule);
  window.addEventListener('hashchange', schedule);
  update();
}
