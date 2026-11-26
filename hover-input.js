// Touch browsers may synthesize :hover before click. Enable hover styles only
// for a mouse or hovering pen; keyboard focus uses :focus-visible independently.
(() => {
  const root = document.documentElement;
  const primaryPointer = matchMedia('(hover: hover) and (pointer: fine)');
  let hover = primaryPointer.matches;
  root.toggleAttribute('data-hover-input', hover);

  function update(event) {
    const next = event.pointerType === 'mouse' || (event.pointerType === 'pen' && event.buttons === 0);
    if (next === hover) return;
    hover = next;
    root.toggleAttribute('data-hover-input', next);
  }

  for (const type of ['pointerover', 'pointerdown', 'pointermove']) {
    document.addEventListener(type, update, {capture: true, passive: true});
  }
})();
