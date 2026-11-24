/* The navigation and all destinations work without JavaScript. */
const sectionNav = document.querySelector('.case-review-links');
if (sectionNav) {
  const links = [...sectionNav.querySelectorAll('a[href^="#"]')];
  const items = links.map(link => ({link, section: document.getElementById(link.hash.slice(1))})).filter(x => x.section);
  const header = sectionNav.closest('header');
  const inner = sectionNav.parentElement;
  const back = inner.querySelector('.case-review-back');
  const measure = () => {
    const shell = inner.getBoundingClientRect();
    const backWidth = back.getBoundingClientRect().width;
    const menuGap = parseFloat(getComputedStyle(sectionNav).columnGap) || 0;
    const menuWidth = links.reduce((width, link) => width + link.getBoundingClientRect().width, 0)
      + menuGap * (links.length - 1);
    const clearance = parseFloat(getComputedStyle(inner).getPropertyValue('--case-nav-gap'));
    // Reserve equal space on both sides so the section menu stays centered.
    inner.classList.toggle('is-inline', 2 * (backWidth + clearance) + menuWidth <= shell.width);
    const height = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--case-sticky-offset', `${Math.ceil(height / 4) * 4 + 16}px`);
  };
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(measure);
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
    for (const {link} of items) {
      if (link === active?.link) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };
  const schedule = () => {if (!queued) {queued = true; requestAnimationFrame(update)}};
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  window.addEventListener('pageshow', schedule);
  update();
}
