(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const updateHeight = () => {
    const height = Math.ceil(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--site-header-height', `${height}px`);
  };

  updateHeight();
  new ResizeObserver(updateHeight).observe(header, {box: 'border-box'});
})();
