(() => {
  const links = [...document.querySelectorAll('.case-image-link')];
  if (!links.length || typeof HTMLDialogElement === 'undefined') return;

  const viewer = document.createElement('dialog');
  viewer.className = 'case-lightbox';
  viewer.id = 'case-image-viewer';
  viewer.setAttribute('aria-label', 'Image preview');
  viewer.setAttribute('aria-describedby', 'case-image-caption');
  viewer.innerHTML = `
    <div class="case-lightbox-toolbar">
      <button class="case-lightbox-close secondary-action" data-secondary-label="Close" type="button" aria-label="Close full-screen image" autofocus>
        <span class="secondary-label"><span>Close</span><svg class="ui-stitch-icon" data-stitch-icon="close" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M8.66775 0H7.64206L6.50087 1.15565L5.35963 0H4.33398V1.0256L5.48964 2.16688L4.33398 3.32254V4.33377H5.35963L6.50087 3.19249L7.64206 4.33377H8.66775V3.32254L7.52651 2.16688L8.66775 1.0256V0Z" transform="translate(-3.16841 1.16557)" fill="currentColor" style="--stitch-color:#E8B92E;--stitch-order:0"/><path d="M8.66775 0H7.64206L6.50087 1.15565L5.35963 0H4.33398V1.0256L5.48964 2.16688L4.33398 3.32254V4.33377H5.35963L6.50087 3.19249L7.64206 4.33377H8.66775V3.32254L7.52651 2.16688L8.66775 1.0256V0Z" transform="translate(14.16668 1.16557)" fill="currentColor" style="--stitch-color:#E8B92E;--stitch-order:1"/><path d="M8.66775 0H7.64206L6.50087 1.15565L5.35963 0H4.33398V1.0256L5.48964 2.16688L4.33398 3.32254V4.33377H5.35963L6.50087 3.19249L7.64206 4.33377H8.66775V3.32254L7.52651 2.16688L8.66775 1.0256V0Z" transform="translate(1.16536 5.49934)" fill="currentColor" style="--stitch-color:#EB6B2F;--stitch-order:2"/><path d="M8.66775 0H7.64206L6.50087 1.15565L5.35963 0H4.33398V1.0256L5.48964 2.16688L4.33398 3.32254V4.33377H5.35963L6.50087 3.19249L7.64206 4.33377H8.66775V3.32254L7.52651 2.16688L8.66775 1.0256V0Z" transform="translate(9.8329 5.49934)" fill="currentColor" style="--stitch-color:#EB6B2F;--stitch-order:3"/><path d="M8.66775 0H7.64206L6.50087 1.15565L5.35963 0H4.33398V1.0256L5.48964 2.16688L4.33398 3.32254V4.33377H5.35963L6.50087 3.19249L7.64206 4.33377H8.66775V3.32254L7.52651 2.16688L8.66775 1.0256V0Z" transform="translate(5.49913 9.83311)" fill="currentColor" style="--stitch-color:#D94658;--stitch-order:4"/><path d="M8.66775 0H7.64206L6.50087 1.15565L5.35963 0H4.33398V1.0256L5.48964 2.16688L4.33398 3.32254V4.33377H5.35963L6.50087 3.19249L7.64206 4.33377H8.66775V3.32254L7.52651 2.16688L8.66775 1.0256V0Z" transform="translate(1.16536 14.16688)" fill="currentColor" style="--stitch-color:#6A3B94;--stitch-order:0"/><path d="M8.66775 0H7.64206L6.50087 1.15565L5.35963 0H4.33398V1.0256L5.48964 2.16688L4.33398 3.32254V4.33377H5.35963L6.50087 3.19249L7.64206 4.33377H8.66775V3.32254L7.52651 2.16688L8.66775 1.0256V0Z" transform="translate(9.8329 14.16688)" fill="currentColor" style="--stitch-color:#6A3B94;--stitch-order:1"/><path d="M8.66775 0H7.64206L6.50087 1.15565L5.35963 0H4.33398V1.0256L5.48964 2.16688L4.33398 3.32254V4.33377H5.35963L6.50087 3.19249L7.64206 4.33377H8.66775V3.32254L7.52651 2.16688L8.66775 1.0256V0Z" transform="translate(-3.16841 18.50066)" fill="currentColor" style="--stitch-color:#48AFC0;--stitch-order:2"/><path d="M8.66775 0H7.64206L6.50087 1.15565L5.35963 0H4.33398V1.0256L5.48964 2.16688L4.33398 3.32254V4.33377H5.35963L6.50087 3.19249L7.64206 4.33377H8.66775V3.32254L7.52651 2.16688L8.66775 1.0256V0Z" transform="translate(14.16668 18.50066)" fill="currentColor" style="--stitch-color:#48AFC0;--stitch-order:3"/></svg></span>
      </button>
    </div>
    <div class="case-lightbox-stage">
      <button class="case-lightbox-zoom" type="button" aria-label="View at original size" aria-pressed="false" disabled><img class="case-lightbox-image" alt=""></button>
    </div>
    <p class="case-lightbox-caption" id="case-image-caption"></p>`;
  document.body.append(viewer);

  const image = viewer.querySelector('img');
  const caption = viewer.querySelector('.case-lightbox-caption');
  const closeButton = viewer.querySelector('button');
  const stage = viewer.querySelector('.case-lightbox-stage');
  const zoom = viewer.querySelector('.case-lightbox-zoom');
  let opener = null;
  let pointerStartedOutside = false;

  function resetZoom() {
    zoom.setAttribute('aria-pressed', 'false');
    stage.scrollTo(0, 0);
  }

  function updateZoomAvailability() {
    if (!viewer.open) return;
    zoom.disabled = !(image.naturalWidth > stage.clientWidth || image.naturalHeight > stage.clientHeight);
    if (zoom.disabled) resetZoom();
  }

  image.addEventListener('load', updateZoomAvailability);
  new ResizeObserver(updateZoomAvailability).observe(stage);
  zoom.addEventListener('click', event => {
    if (zoom.getAttribute('aria-pressed') === 'true') {
      resetZoom();
      return;
    }
    const fitted = image.getBoundingClientRect();
    // Anchor a pointer click at the detail under it. Keyboard zoom uses the centre.
    const x = event.detail ? event.clientX : fitted.left + fitted.width / 2;
    const y = event.detail ? event.clientY : fitted.top + fitted.height / 2;
    zoom.setAttribute('aria-pressed', 'true');
    const original = image.getBoundingClientRect();
    stage.scrollBy(original.left + (x - fitted.left) * original.width / fitted.width - x,
                   original.top + (y - fitted.top) * original.height / fitted.height - y);
  });

  function close() { viewer.close(); }
  closeButton.addEventListener('click', close);
  viewer.addEventListener('pointerdown', event => {
    pointerStartedOutside = event.target === viewer || event.target === stage;
  });
  viewer.addEventListener('click', event => {
    if (pointerStartedOutside && (event.target === viewer || (event.target === stage && zoom.getAttribute('aria-pressed') !== 'true'))) close();
    pointerStartedOutside = false;
  });
  // Native dialog handles Escape and keeps keyboard focus inside the overlay.
  viewer.addEventListener('close', () => {
    document.documentElement.classList.remove('case-image-open');
    resetZoom();
    zoom.disabled = true;
    image.removeAttribute('src');
    opener?.focus({ preventScroll: true });
    opener = null;
  });

  for (const link of links) {
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-controls', viewer.id);
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (viewer.open) return;
      opener = link;
      zoom.classList.toggle('notebook-paper', link.classList.contains('notebook-paper'));
      const preview = link.querySelector('img');
      const edgeCrop = preview?.style.clipPath || '';
      const canCropToEdges = CSS.supports('object-view-box', 'inset(0)');
      image.style.objectViewBox = preview?.style.objectViewBox || (canCropToEdges ? edgeCrop : '');
      image.style.clipPath = canCropToEdges ? '' : edgeCrop;
      image.alt = preview?.alt || '';
      caption.hidden = Boolean(link.closest('[data-hide-captions]'));
      caption.textContent = link.closest('figure')?.querySelector('figcaption')?.textContent.trim() || image.alt;
      image.src = link.href;
      viewer.showModal();
      document.documentElement.classList.add('case-image-open');
      closeButton.focus({ preventScroll: true });
    });
  }
})();
