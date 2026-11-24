(() => {
  if (!CSS.supports('clip-path', 'inset(0)')) return;

  function icon(name) {
    const [width, height] = name === 'slide' ? [32, 16] : [24, 24];
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false"><use href="assets/comparison-stitches.svg#${name}"/></svg>`;
  }

  const dialog = document.createElement('dialog');
  if (typeof dialog.showModal !== 'function') return;
  dialog.className = 'compare-dialog';
  dialog.id = 'sketch-comparison-viewer';
  dialog.innerHTML = `<div class="compare-dialog-content">
    <div class="compare-originals">
      <a target="_blank" rel="noopener">Open full sketch</a>
      <a target="_blank" rel="noopener">Open full final design</a>
    </div>
  </div>`;
  const content = dialog.firstElementChild;
  const originals = [...content.querySelectorAll('a')];
  let active;

  function setToggle(button, name, expanded) {
    const label = expanded ? 'Close expanded comparison' : 'Expand comparison: ' + name;
    button.innerHTML = icon(expanded ? 'close' : 'expand');
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  function bindDrag(stage, range, update) {
    let gesture = null;

    function setFromX(x) {
      const bounds = stage.getBoundingClientRect();
      range.value = Math.round((x - bounds.left) / bounds.width * 100);
      update();
    }

    stage.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: event.pointerType === 'mouse' };
      stage.setPointerCapture(event.pointerId);
      if (gesture.dragging) {
        event.preventDefault();
        range.focus({ preventScroll: true });
        setFromX(event.clientX);
      }
    });
    stage.addEventListener('pointermove', event => {
      if (event.pointerId !== gesture?.id) return;
      if (!gesture.dragging) {
        const dx = Math.abs(event.clientX - gesture.x);
        const dy = Math.abs(event.clientY - gesture.y);
        if (Math.max(dx, dy) < 6) return;
        if (dy > dx) {
          gesture = null;
          return;
        }
        gesture.dragging = true;
      }
      setFromX(event.clientX);
    });
    stage.addEventListener('pointerup', event => {
      if (event.pointerId !== gesture?.id) return;
      setFromX(event.clientX);
      gesture = null;
    });
    stage.addEventListener('lostpointercapture', event => {
      if (event.pointerId === gesture?.id) gesture = null;
    });
  }

  document.body.append(dialog);
  dialog.addEventListener('close', () => {
    if (!active) return;
    const { pair, placeholder, button, name } = active;
    placeholder.replaceWith(pair);
    setToggle(button, name, false);
    button.focus({ preventScroll: true });
    active = null;
  });

  for (const figure of document.querySelectorAll('.sketch-compare')) {
    const stage = figure.querySelector('.compare-stage');
    const layers = [...stage.querySelectorAll('.compare-layer')];
    const urls = layers.map(layer => layer.href);
    const name = figure.querySelector('figcaption').textContent.trim();
    const pair = document.createElement('div');
    pair.className = 'compare-pair';
    stage.replaceWith(pair);
    pair.append(stage);

    // Keep the sketches and final screens as ordinary image links without JS.
    layers.forEach(layer => {
      layer.removeAttribute('href');
      layer.removeAttribute('aria-label');
    });
    stage.classList.add('is-interactive');
    stage.insertAdjacentHTML('beforeend', `
      <span class="compare-seam" aria-hidden="true"></span>
      <span class="compare-grip" aria-hidden="true">${icon('slide')}</span>
      <input class="compare-range" type="range" min="0" max="100" step="1" value="50">`);

    const range = stage.querySelector('.compare-range');
    const sketchLabel = stage.querySelector('.compare-sketch .compare-label');
    const finalLabel = stage.querySelector('.compare-final .compare-label');
    range.setAttribute('aria-label', 'Compare sketch and final design: ' + name);
    function fitLabels() {
      const split = stage.clientWidth * range.valueAsNumber / 100;
      const sketchFits = sketchLabel.offsetLeft + sketchLabel.offsetWidth <= split;
      const finalFits = finalLabel.offsetLeft >= split;
      sketchLabel.classList.toggle('is-obscured', !sketchFits);
      finalLabel.classList.toggle('is-obscured', !finalFits);
    }
    function update() {
      fitLabels();
      stage.style.setProperty('--compare-split', range.value + '%');
      range.setAttribute('aria-valuetext', range.value + '% sketch, ' + (100 - range.valueAsNumber) + '% final design');
    }
    const labelObserver = new ResizeObserver(fitLabels);
    [stage, sketchLabel, finalLabel].forEach(element => labelObserver.observe(element));
    range.addEventListener('input', update);
    bindDrag(stage, range, update);
    update();

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'compare-toggle';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', dialog.id);
    setToggle(button, name, false);
    pair.prepend(button);
    button.addEventListener('click', () => {
      if (dialog.open) {
        dialog.close();
        return;
      }
      // A responsive placeholder preserves scroll position if the viewport
      // rotates while the comparison is in the dialog.
      const placeholder = pair.cloneNode(false);
      placeholder.inert = true;
      placeholder.append(button.cloneNode(true), stage.cloneNode(false));
      pair.replaceWith(placeholder);
      content.prepend(pair);
      originals.forEach((link, index) => { link.href = urls[index]; });
      dialog.setAttribute('aria-label', name + ' — sketch and final design');
      active = { pair, placeholder, button, name };
      setToggle(button, name, true);
      dialog.showModal();
      dialog.scrollTop = 0;
      button.focus({ preventScroll: true });
    });
  }
})();
