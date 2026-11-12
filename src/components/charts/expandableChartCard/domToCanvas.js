/**
 * FILE: domToCanvas.js
 *
 * Dependency-free "HTML element → <canvas>" for the custom (non-Vega)
 * charts' Copy / Download buttons (2026-09-27). Same technique html-to-image
 * uses: deep-clone the node, inline every element's computed style (so
 * Tailwind classes survive outside the page's stylesheet), wrap the clone in
 * an SVG <foreignObject>, load that SVG as an image, and draw it to a canvas.
 *
 * Options added 2026-10-14 for the Details flyout PNG, which captures the
 * whole flyout body (title, context copy, map, mini bar, source) rather than
 * just a chart:
 *   - fullHeight:   capture the node's full scrollHeight, not just the part
 *                   currently scrolled into view
 *   - inlineImages: fetch each <img> (e.g. Leaflet basemap tiles) and embed
 *                   it as a data URL — an SVG loaded as an image can't load
 *                   external resources, so tiles would otherwise be blank.
 *                   <canvas> elements are swapped for a snapshot <img>.
 *                   Anything that fails (no CORS) is dropped, not fatal.
 *   - exclude:      CSS selector for elements to drop from the image
 *                   (buttons, map zoom controls, screen-reader-only tables)
 *
 * Limits:
 *   - web fonts inside the node aren't embedded (falls back to system font)
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

const dataUrlCache = new Map();

async function toDataUrl(src) {
  if (!src || src.startsWith('data:')) return src;
  if (dataUrlCache.has(src)) return dataUrlCache.get(src);
  const p = fetch(src, { mode: 'cors', cache: 'force-cache' })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.blob(); })
    .then(blob => new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    }))
    .catch(() => null);
  dataUrlCache.set(src, p);
  return p;
}

async function embedImages(source, clone) {
  // Canvases clone blank — replace each with a snapshot <img>.
  const srcCanvases = source.querySelectorAll('canvas');
  const cloneCanvases = clone.querySelectorAll('canvas');
  srcCanvases.forEach((c, i) => {
    const target = cloneCanvases[i];
    if (!target) return;
    try {
      const img = document.createElement('img');
      img.src = c.toDataURL('image/png');
      img.setAttribute('style', target.getAttribute('style') ?? '');
      target.replaceWith(img);
    } catch {
      target.remove(); // tainted canvas
    }
  });

  // External <img> → data URL
  const srcImgs = source.querySelectorAll('img');
  const cloneImgs = clone.querySelectorAll('img');
  await Promise.all(Array.from(srcImgs).map(async (img, i) => {
    const target = cloneImgs[i];
    if (!target) return;
    const url = await toDataUrl(img.currentSrc || img.src);
    if (url) {
      target.setAttribute('src', url);
      target.removeAttribute('srcset');
    } else {
      target.remove();
    }
  }));
}

export async function domToCanvas(node, {
  pixelRatio = 2,
  backgroundColor = '#ffffff',
  fullHeight = false,
  inlineImages = false,
  exclude = null,
} = {}) {
  const rect = node.getBoundingClientRect();
  const w = Math.ceil(fullHeight ? node.clientWidth || rect.width : rect.width);
  const h = Math.ceil(fullHeight ? Math.max(node.scrollHeight, rect.height) : rect.height);

  const clone = node.cloneNode(true);
  inlineStyles(node, clone);
  if (inlineImages) await embedImages(node, clone);

  // Drop things that shouldn't appear in an exported image
  clone.querySelectorAll('[role="tooltip"]').forEach(el => el.remove());
  if (exclude) clone.querySelectorAll(exclude).forEach(el => el.remove());
  clone.style.margin = '0';
  if (fullHeight) {
    // Unclip the scroll container so the whole body lays out at full height
    clone.style.height = `${h}px`;
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';
    clone.style.border = '0';
    clone.style.width = `${w}px`;
  }

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
