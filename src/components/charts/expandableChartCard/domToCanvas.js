/**
 * FILE: domToCanvas.js
 *
 * Dependency-free "HTML element → <canvas>" for the custom (non-Vega)
 * charts' Copy / Download buttons (2026-09-27). Same technique html-to-image
 * uses: deep-clone the node, inline every element's computed style (so
 * Tailwind classes survive outside the page's stylesheet), wrap the clone in
 * an SVG <foreignObject>, load that SVG as an image, and draw it to a canvas.
 *
 * Limits (fine for these charts, which are plain divs/spans/text):
 *   - external images/fonts inside the node aren't embedded
 *   - pseudo-elements (::before/::after) aren't copied
 */

function inlineStyles(source, target) {
  const computed = window.getComputedStyle(source);
  let css = '';
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    css += `${prop}:${computed.getPropertyValue(prop)};`;
  }
  target.setAttribute('style', css);
  const srcKids = source.children;
  const tgtKids = target.children;
  for (let i = 0; i < srcKids.length; i++) {
    if (tgtKids[i]) inlineStyles(srcKids[i], tgtKids[i]);
  }
}

export async function domToCanvas(node, { pixelRatio = 2, backgroundColor = '#ffffff' } = {}) {
  const { width, height } = node.getBoundingClientRect();
  const w = Math.ceil(width);
  const h = Math.ceil(height);

  const clone = node.cloneNode(true);
  inlineStyles(node, clone);
  // Drop things that shouldn't appear in an exported image
  clone.querySelectorAll('[role="tooltip"]').forEach(el => el.remove());
  clone.style.margin = '0';

  const xhtml = new XMLSerializer().serializeToString(clone);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml">${xhtml}</div>` +
    `</foreignObject></svg>`;

  const img = new Image();
  img.decoding = 'sync';
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('domToCanvas: SVG image failed to load'));
  });

  const canvas = document.createElement('canvas');
  canvas.width = w * pixelRatio;
  canvas.height = h * pixelRatio;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(pixelRatio, pixelRatio);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}
