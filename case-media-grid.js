/* A single tall image and two stacked images share one baseline in these plates.
   Read the real caption height after wrapping, including at the user's font size. */
(() => {
  if (!window.ResizeObserver || !CSS.supports('width', 'round(nearest, 100%, 4px)')) return;

  for (const plate of document.querySelectorAll('.call-log-collage, .callgrid-flow-collage, .report-comparison-art')) {
    const single = plate.querySelector(':scope > figure > .case-media-slot, :scope > .report-comparison-after > .case-media-slot');
    const stack = plate.querySelector(':scope > .source-image-grid, :scope > .report-comparison-before');
    const last = stack?.querySelector(':scope > :last-child > .case-media-slot');
    if (!single || !last) continue;

    function align() {
      const firstBox = single.getBoundingClientRect();
      const lastBox = last.getBoundingClientRect();
      const sideBySide = lastBox.right <= firstBox.left || firstBox.right <= lastBox.left;
      if (!sideBySide) {
        single.style.removeProperty('--aligned-media-height');
        return;
      }
      const height = Math.round((lastBox.bottom - firstBox.top) / 4) * 4;
      if (height > 0 && height !== firstBox.height) {
        single.style.setProperty('--aligned-media-height', height + 'px');
      }
    }

    let scheduled = 0;
    const observer = new ResizeObserver(() => {
      if (scheduled) return;
      scheduled = requestAnimationFrame(() => {
        scheduled = 0;
        align();
      });
    });
    observer.observe(plate);
    observer.observe(stack);
    observer.observe(last);
    align();
  }
})();
